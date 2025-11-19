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

const MODEL_URL = process.env.MODEL_URL || 'http://192.168.0.113:8000/v1/chat/completions';
const MODEL_NAME = process.env.MODEL_NAME || 'RM-01 LLM';

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
    
    // 获取API URL和模型名称，如果没有则使用默认值
    const apiUrl = req.body.apiUrl || MODEL_URL;
    const modelName = req.body.modelName || MODEL_NAME;

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
      stream: true  // 启用流式输出
    };

    console.log(`[${new Date().toISOString()}] Analyzing ${frames.length} frames with prompt: "${userPrompt}"`);
    console.log(`[${new Date().toISOString()}] Using API: ${apiUrl}, Model: ${modelName}`);

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送到 vllm 服务，启用流式响应
    const resp = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
      responseType: 'stream'
    });

    // 将 vllm 的流式响应转发给前端
    resp.data.on('data', (chunk) => {
      res.write(chunk);
    });

    resp.data.on('end', () => {
      res.end();
    });

    resp.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });
  } catch (err) {
    console.error('Proxy error:', err && err.message ? err.message : err);
    if (err.response) {
      console.error('Response data:', err.response.data);
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ error: err.message || 'proxy error' });
    }
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

const port = process.env.PORT || 3000;
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
