const path = require('path');
const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const cors = require('cors');
const WebSocket = require('ws');
const NodeWebcam = require('node-webcam');
const fs = require('fs');
const os = require('os');

// 检测操作系统
const isMacOS = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

console.log(`Operating System: ${os.platform()}`);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WebSocket 服务器
let wss = null;

// 摄像头配置（根据操作系统调整）
const webcamOpts = {
  width: 640,
  height: 480,
  quality: 70,
  delay: 0,
  saveShots: true,
  output: 'jpeg',
  device: false, // 使用默认设备，Linux下会是 /dev/video0
  callbackReturn: 'buffer',
  verbose: false
};

// Linux特定配置
if (isLinux) {
  // node-webcam在Linux上使用FSWebcam
  webcamOpts.device = false; // 默认使用 /dev/video0
}

let webcam = null;
let captureInterval = null;
let captureClients = new Set();

// 获取可用的摄像头设备列表
function getAvailableDevices(callback) {
  const { exec } = require('child_process');
  
  if (isMacOS) {
    // macOS: 使用 imagesnap
    exec('/opt/homebrew/bin/imagesnap -l', (error, stdout, stderr) => {
      if (error) {
        console.error('Error listing devices:', error);
        callback([{ id: 'default', name: '默认设备' }]);
        return;
      }
      
      // 解析 imagesnap -l 的输出
      const lines = stdout.split('\n');
      const devices = [];
      let captureDevices = false;
      
      for (let line of lines) {
        line = line.trim();
        if (line.includes('Video Devices:')) {
          captureDevices = true;
          continue;
        }
        if (captureDevices && line) {
          if (line.startsWith('=>')) {
            let deviceName = line.substring(2).trim();
            // 移除首尾的引号
            if (deviceName.startsWith('"') && deviceName.includes('"')) {
              deviceName = deviceName.substring(1);
              const endQuoteIndex = deviceName.indexOf('"');
              if (endQuoteIndex !== -1) {
                deviceName = deviceName.substring(0, endQuoteIndex) + deviceName.substring(endQuoteIndex + 1);
              }
            }
            if (deviceName) {
              devices.push({ id: deviceName, name: deviceName });
            }
          }
        }
      }
      
      if (devices.length === 0) {
        devices.push({ id: 'default', name: '默认设备' });
      }
      
      console.log('Available devices:', devices);
      callback(devices);
    });
  } else if (isLinux) {
    // Linux: 使用 v4l2-ctl 列出设备
    exec('v4l2-ctl --list-devices', (error, stdout, stderr) => {
      if (error) {
        console.error('Error listing devices:', error);
        // 尝试列出 /dev/video* 设备
        exec('ls -1 /dev/video* 2>/dev/null', (err2, stdout2) => {
          if (err2 || !stdout2.trim()) {
            callback([{ id: '/dev/video0', name: '默认摄像头 (video0)' }]);
          } else {
            const devices = stdout2.trim().split('\n').map((device, index) => ({
              id: device,
              name: `摄像头 ${index} (${path.basename(device)})`
            }));
            callback(devices);
          }
        });
        return;
      }
      
      // 解析 v4l2-ctl 输出
      const lines = stdout.split('\n');
      const devices = [];
      let currentDevice = null;
      
      for (let line of lines) {
        line = line.trim();
        // 设备名称行（不以空格开头）
        if (line && !line.startsWith('/dev/') && line.includes(':')) {
          currentDevice = line.replace(/:$/, '').trim();
        }
        // 设备路径行（以制表符或空格开头）
        else if (line.startsWith('/dev/video')) {
          const devicePath = line.trim();
          const deviceName = currentDevice || `摄像头 (${path.basename(devicePath)})`;
          devices.push({
            id: devicePath,
            name: deviceName
          });
        }
      }
      
      if (devices.length === 0) {
        devices.push({ id: '/dev/video0', name: '默认摄像头 (video0)' });
      }
      
      console.log('Available devices:', devices);
      callback(devices);
    });
  } else {
    // 其他平台：返回默认设备
    console.warn('Unsupported platform:', os.platform());
    callback([{ id: 'default', name: '默认设备' }]);
  }
}

// 使用 memory storage，避免写文件
const upload = multer({ storage: multer.memoryStorage() });

const MODEL_URL = process.env.MODEL_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL_NAME = process.env.MODEL_NAME || 'qwen-vl-plus';
const SUMMARY_PROMPT = process.env.SUMMARY_PROMPT || '请分析以下所有历史观察记录，提供综合洞察和总结：';

// 采集状态和历史记录
let isCollecting = false;
let analysisHistory = [];

// 静态页面
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// 创建一个灵活的 upload 中间件，接受 frames 字段
const uploadMiddleware = upload.fields([
  { name: 'frames', maxCount: 20 }
]);

// 接收前端传来的多张帧（name=frames），再转发给模型服务
app.post('/analyze', uploadMiddleware, async (req, res) => {
  try {
    const frames = req.files?.frames || [];
    
    if (frames.length === 0) {
      return res.status(400).json({ error: 'no frames uploaded' });
    }

    // 将所有图片转换为 base64
    const imageContents = frames.map(file => {
      const base64Image = file.buffer.toString('base64');
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      };
    });
    
    // 获取自定义prompt，如果没有则使用默认
    const userPrompt = req.body.prompt || '请描述这些图片中的内容。';
    
    // 获取API URL、模型名称和API Key，如果没有则使用默认值
    const apiUrl = req.body.apiUrl || MODEL_URL;
    const modelName = req.body.modelName || MODEL_NAME;
    const apiKey = req.body.apiKey || '';  // API Key，留空表示本地模型

    // 构建 OpenAI 兼容的请求体（vllm 多模态格式）
    // 多图片格式：先放所有图片，然后是文本
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }
      ],
      temperature: 0.7,
      stream: true,  // 启用流式输出
      stream_options: {
        include_usage: true  // vLLM 需要这个选项来在流式响应中包含 usage
      }
    };

    console.log(`[${new Date().toISOString()}] Analyzing ${frames.length} frames with prompt: "${userPrompt}"`);
    console.log(`[${new Date().toISOString()}] Using API: ${apiUrl}, Model: ${modelName}`);

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 收集完整的响应文本用于历史记录
    let fullResponse = '';

    // 构建请求头
    const requestHeaders = { 'Content-Type': 'application/json' };
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    // 发送到 vllm 服务或 OpenAI 兼容服务，启用流式响应
    const resp = await axios.post(apiUrl, requestBody, {
      headers: requestHeaders,
      timeout: 120000,
      responseType: 'stream'
    });

    // 将 vllm 的流式响应转发给前端，同时收集完整文本
    resp.data.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      
      // 解析SSE格式的数据块，提取实际文本内容
      if (isCollecting) {
        const lines = chunkStr.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      res.write(chunk);
    });

    resp.data.on('end', () => {
      // 如果正在采集，保存到历史记录
      if (isCollecting && fullResponse.trim()) {
        analysisHistory.push({
          timestamp: new Date().toISOString(),
          prompt: userPrompt,
          response: fullResponse.trim()
        });
        console.log(`[${new Date().toISOString()}] Saved analysis to history. Total: ${analysisHistory.length}`);
      }
      res.end();
    });

    resp.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });
  } catch (err) {
    console.error('Proxy error:', err && err.message ? err.message : err);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response statusText:', err.response.statusText);
      // 避免循环引用，只发送关键信息
      res.status(err.response.status).json({ 
        error: 'API request failed',
        status: err.response.status,
        statusText: err.response.statusText,
        message: err.message
      });
    } else {
      res.status(500).json({ error: err.message || 'proxy error' });
    }
  }
});

// 开始采集 - 启用历史记录收集
app.post('/collection/start', (req, res) => {
  try {
    if (isCollecting) {
      return res.json({ status: 'already collecting', historyCount: analysisHistory.length });
    }
    
    isCollecting = true;
    analysisHistory = []; // 清空历史记录
    console.log(`[${new Date().toISOString()}] Started collection`);
    
    res.json({ 
      status: 'started',
      historyCount: 0
    });
  } catch (err) {
    console.error('Collection start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 停止采集 - 生成汇总分析
app.post('/collection/stop', async (req, res) => {
  try {
    if (!isCollecting) {
      return res.json({ 
        status: 'not collecting',
        historyCount: analysisHistory.length
      });
    }
    
    isCollecting = false;
    // 立即保存历史记录的快照,避免在汇总过程中被清空
    const historySnapshot = [...analysisHistory];
    const historyCount = historySnapshot.length;
    
    console.log(`[${new Date().toISOString()}] Stopped collection. Total entries: ${historyCount}`);
    
    // 如果没有历史记录，直接返回
    if (historyCount === 0) {
      return res.json({
        status: 'stopped',
        historyCount: 0,
        summary: null
      });
    }
    
    // 获取自定义汇总提示词（如果提供）
    const summaryPrompt = req.body.summaryPrompt || SUMMARY_PROMPT;
    const apiUrl = req.body.apiUrl || MODEL_URL;
    const modelName = req.body.modelName || MODEL_NAME;
    const apiKey = req.body.apiKey || '';  // API Key，留空表示本地模型
    
    // 构建历史记录文本
    let historyText = '';
    historySnapshot.forEach((entry, index) => {
      historyText += `\n=== 记录 ${index + 1} (${entry.timestamp}) ===\n`;
      historyText += `提示词: ${entry.prompt}\n`;
      historyText += `分析结果: ${entry.response}\n`;
    });
    
    // 构建汇总请求
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: `${summaryPrompt}\n\n${historyText}`
        }
      ],
      temperature: 0.7,
      stream: true
    };
    
    console.log(`[${new Date().toISOString()}] Generating summary for ${historyCount} entries`);
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 发送元数据
    res.write(`data: ${JSON.stringify({ 
      type: 'metadata', 
      historyCount, 
      status: 'stopped' 
    })}\n\n`);
    
    // 构建请求头
    const requestHeaders = { 'Content-Type': 'application/json' };
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // 发送到 vllm 服务或 OpenAI 兼容服务
    const resp = await axios.post(apiUrl, requestBody, {
      headers: requestHeaders,
      timeout: 120000,
      responseType: 'stream'
    });
    
    // 转发流式响应
    resp.data.on('data', (chunk) => {
      res.write(chunk);
    });
    
    resp.data.on('end', () => {
      res.end();
    });
    
    resp.data.on('error', (err) => {
      console.error('Summary stream error:', err);
      res.end();
    });
    
  } catch (err) {
    console.error('Collection stop error:', err);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response statusText:', err.response.statusText);
      // 避免循环引用，只发送关键信息
      res.status(err.response.status).json({ 
        error: 'API request failed',
        status: err.response.status,
        statusText: err.response.statusText,
        message: err.message
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// 获取采集状态
app.get('/collection/status', (req, res) => {
  res.json({
    isCollecting,
    historyCount: analysisHistory.length,
    summaryPrompt: SUMMARY_PROMPT
  });
});

// 更新汇总提示词配置
app.post('/collection/config', (req, res) => {
  try {
    const { summaryPrompt } = req.body;
    
    if (summaryPrompt) {
      // 注意：这里只是临时更新，重启后会恢复默认值
      // 如果需要持久化，应该保存到配置文件或数据库
      process.env.SUMMARY_PROMPT = summaryPrompt;
      console.log(`[${new Date().toISOString()}] Updated summary prompt`);
    }
    
    res.json({
      status: 'updated',
      summaryPrompt: process.env.SUMMARY_PROMPT || SUMMARY_PROMPT
    });
  } catch (err) {
    console.error('Config update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 全局历史数据存储
let globalHistoryData = {
  lastUpdate: null,
  analysisHistory: [],
  insights: {
    minute: [],
    fifteen: [],
    hour: [],
    day: []
  },
  summary: null,
  tasks: [],
  tokenStats: null,
  workDuration: null
};

// 同步客户端历史数据到服务器
app.post('/history/sync', (req, res) => {
  try {
    const historyData = req.body;
    
    // 更新全局历史数据
    globalHistoryData = {
      lastUpdate: new Date().toISOString(),
      analysisHistory: historyData.analysisHistory || [],
      insights: historyData.insights || { minute: [], fifteen: [], hour: [], day: [] },
      summary: historyData.summary || null,
      tasks: historyData.tasks || [],
      tokenStats: historyData.tokenStats || null,
      workDuration: historyData.workDuration || null
    };
    
    console.log(`[${new Date().toISOString()}] History data synced: ${globalHistoryData.analysisHistory.length} analysis records`);
    
    res.json({
      status: 'synced',
      recordCount: globalHistoryData.analysisHistory.length,
      timestamp: globalHistoryData.lastUpdate
    });
  } catch (err) {
    console.error('History sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取历史数据 (API接口)
app.get('/history/export', (req, res) => {
  try {
    const exportData = {
      exportTime: new Date().toISOString(),
      exportTimeLocal: new Date().toLocaleString('zh-CN'),
      lastUpdate: globalHistoryData.lastUpdate,
      totalAnalysis: globalHistoryData.analysisHistory.length,
      summary: globalHistoryData.summary,
      analysisHistory: globalHistoryData.analysisHistory,
      insights: globalHistoryData.insights,
      insightCounts: {
        minute: globalHistoryData.insights.minute.length,
        fifteen: globalHistoryData.insights.fifteen.length,
        hour: globalHistoryData.insights.hour.length,
        day: globalHistoryData.insights.day.length
      },
      tasks: globalHistoryData.tasks,
      tokenStats: globalHistoryData.tokenStats,
      workDuration: globalHistoryData.workDuration
    };
    
    res.json(exportData);
  } catch (err) {
    console.error('History export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: 开始分析与采集 (触发前端UI操作)
app.post('/api/start-analysis', (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] API: Start analysis triggered`);
    
    // 广播消息给所有连接的WebSocket客户端
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'start_analysis',
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
    
    res.json({ 
      status: 'triggered',
      message: 'Start analysis command sent to all clients',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Start analysis API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: 停止分析与采集 (触发前端UI操作)
app.post('/api/stop-analysis', (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] API: Stop analysis triggered`);
    
    // 广播消息给所有连接的WebSocket客户端
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'stop_analysis',
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
    
    res.json({ 
      status: 'triggered',
      message: 'Stop analysis command sent to all clients',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Stop analysis API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 启动/停止视频流采集
app.post('/camera/start', (req, res) => {
  try {
    if (captureInterval) {
      return res.json({ status: 'already running' });
    }
    
    // 初始化摄像头
    if (!webcam) {
      webcam = NodeWebcam.create(webcamOpts);
    }
    
    console.log('Starting camera capture...');
    res.json({ status: 'started' });
    
  } catch (err) {
    console.error('Camera start error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/camera/stop', (req, res) => {
  try {
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }
    
    captureClients.clear();
    console.log('Stopped camera capture');
    res.json({ status: 'stopped' });
    
  } catch (err) {
    console.error('Camera stop error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 捕获单帧并返回
app.get('/camera/capture', async (req, res) => {
  try {
    if (!webcam) {
      webcam = NodeWebcam.create(webcamOpts);
    }
    
    webcam.capture('temp_frame', (err, data) => {
      if (err) {
        console.error('Capture error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // data 是 Buffer
      res.set('Content-Type', 'image/jpeg');
      res.send(data);
    });
    
  } catch (err) {
    console.error('Capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 43003;
const server = app.listen(port, () => {
  console.log(`Proxy server running on http://0.0.0.0:${port}`);
  console.log(`Forwarding to: ${MODEL_URL}`);
  console.log(`Model: ${MODEL_NAME}`);
});

// WebSocket 服务器用于推送视频流
wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  captureClients.add(ws);
  
  // 监听来自客户端的控制消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start_stream') {
        console.log('Received start stream command, device:', data.device || 'default');
        // 如果需要切换设备，重新创建webcam实例
        if (data.device && data.device !== 'default') {
          webcamOpts.device = data.device;
          webcam = null; // 重置webcam以使用新设备
        } else {
          webcamOpts.device = false; // 使用默认设备
          webcam = null;
        }
        startCameraStream();
        ws.send(JSON.stringify({ type: 'stream_started' }));
      } else if (data.type === 'stop_stream') {
        console.log('Received stop stream command');
        stopCameraStream();
        ws.send(JSON.stringify({ type: 'stream_stopped' }));
      } else if (data.type === 'list_devices') {
        // 获取并返回真实的设备列表
        getAvailableDevices((devices) => {
          ws.send(JSON.stringify({ 
            type: 'devices', 
            devices: devices
          }));
        });
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    captureClients.delete(ws);
    
    // 如果没有客户端了，停止采集
    if (captureClients.size === 0 && captureInterval) {
      stopCameraStream();
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    captureClients.delete(ws);
  });
});

// 启动摄像头流
function startCameraStream() {
  if (captureInterval) {
    console.log('Camera stream already running');
    return;
  }
  
  if (!webcam) {
    webcam = NodeWebcam.create(webcamOpts);
  }
  
  console.log('Starting camera stream...');
  
  // 每隔一定时间捕获并推送帧
  captureInterval = setInterval(() => {
    if (captureClients.size === 0) return;
    
    webcam.capture('stream_frame', (err, data) => {
      if (err) {
        console.error('Stream capture error:', err);
        return;
      }
      
      // 推送给所有连接的客户端
      const base64Image = data.toString('base64');
      const message = JSON.stringify({
        type: 'frame',
        data: base64Image,
        timestamp: new Date().toISOString()
      });
      
      captureClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  }, 200); // 每200ms捕获一帧（约5fps），降低频率提升性能
}

// 停止摄像头流
function stopCameraStream() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log('Camera stream stopped');
  }
}

// 优雅退出处理
const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully');
  
  stopCameraStream();

  if (wss) {
    wss.clients.forEach((client) => {
      try {
        client.terminate();
      } catch (e) {
        console.error('Error terminating ws client:', e);
      }
    });
    wss.close(() => {
      console.log('WebSocket server closed');
    });
  }

  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // 强制退出超时
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
