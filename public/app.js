// API 基础 URL - 后端服务器地址
const API_BASE_URL = 'http://localhost:3000';

const video = document.getElementById('video');
const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
const deviceSelect = document.getElementById('deviceSelect');
const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
const statusSpan = document.getElementById('status');
const intervalInput = document.getElementById('intervalInput');
const fpsInput = document.getElementById('fpsInput');
const historyDiv = document.getElementById('history');
const promptSelect = document.getElementById('promptSelect');
const customPrompt = document.getElementById('customPrompt');
const apiUrlInput = document.getElementById('apiUrlInput');
const modelNameInput = document.getElementById('modelNameInput');

// 洞察相关元素
const insightIntervalInput = document.getElementById('insightIntervalInput');
const fifteenIntervalInput = document.getElementById('fifteenIntervalInput');
const hourIntervalInput = document.getElementById('hourIntervalInput');
const dayIntervalInput = document.getElementById('dayIntervalInput');
const insightApiUrlInput = document.getElementById('insightApiUrlInput');
const insightModelInput = document.getElementById('insightModelInput');
const insightSystemPromptSelect = document.getElementById('insightSystemPromptSelect');
const customInsightSystemPrompt = document.getElementById('customInsightSystemPrompt');

// 多层级洞察显示元素
const minuteInsightHistory = document.getElementById('minuteInsightHistory');
const fifteenInsightHistory = document.getElementById('fifteenInsightHistory');
const hourInsightHistory = document.getElementById('hourInsightHistory');
const dayInsightHistory = document.getElementById('dayInsightHistory');

const minuteCountSpan = document.getElementById('minuteCount');
const fifteenCountSpan = document.getElementById('fifteenCount');
const hourCountSpan = document.getElementById('hourCount');
const dayCountSpan = document.getElementById('dayCount');

let stream = null;
let localCaptureTimer = null; // 用于从本地 video 捕获最新帧
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');
let captureIntervalId = null; // 持续采样的定时器
let analyzeIntervalId = null; // 定期分析的定时器
let insightIntervalId = null; // 自动洞察的定时器
let frameBuffer = []; // 帧缓存数组
let historyCount = 0;
let analysisHistory = []; // 存储分析历史的完整文本
let latestFrame = null; // 最新的帧数据
let isStreamActive = false; // 视频流是否活跃
let isAnalyzing = false; // 是否正在分析

// 多层级洞察存储
let insightLevels = {
  minute: [],      // 60秒洞察
  fifteen: [],     // 15分钟洞察
  hour: [],        // 1小时洞察
  day: []          // 每日洞察
};

let insightCounts = {
  minute: 0,
  fifteen: 0,
  hour: 0,
  day: 0
};

const PROMPT_TEMPLATES = {
  'describe': '请描述这些时序图片中的内容,不要逐个描述，请整体简要描述。',
  'objects': '请识别所有图片中的所有物体和人物。',
  'action': '请分析这些时序图片中正在发生的动作和活动。',
  'safety': '请分析这些时序图片体现的这个场景的安全状况，指出任何潜在风险或异常情况。'
};

// 洞察系统提示词模板
const INSIGHT_SYSTEM_PROMPTS = {
  'summary': '你是一个专业的信息综合分析专家。你的任务是对已有的信息进行二次总结和提炼，压缩关键信息，识别重要模式。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。',
  'trend': '你是一个趋势分析专家。你的任务是基于已有的视频分析文本报告，识别时间序列中的变化趋势、发展方向和规律。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。',
  'security': '你是一个安全监控专家。你的任务是基于已有的视频分析文本报告，识别和评估安全隐患、异常行为和潜在风险。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。',
  'anomaly': '你是一个异常检测专家。你的任务是从已有的视频分析文本报告中识别异常模式、不寻常事件或偏离常态的情况。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。'
};

// 连接WebSocket并启动视频流
async function startVideoStream() {
  try {
    // 使用浏览器本地摄像头（UVC）作为信号源
    const selectedDevice = deviceSelect.value;
    const constraints = (selectedDevice && selectedDevice !== 'default')
      ? { video: { deviceId: { exact: selectedDevice } }, audio: false }
      : { video: true, audio: false };

    // 停止已有流（如果存在）
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.style.display = 'block';

    // 启动本地帧捕获，定期把 video -> canvas -> base64 存入 latestFrame
    if (localCaptureTimer) clearInterval(localCaptureTimer);
    localCaptureTimer = setInterval(() => {
      try {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        captureCanvas.width = w;
        captureCanvas.height = h;
        captureCtx.drawImage(video, 0, 0, w, h);
        const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.8);
        latestFrame = dataUrl.split(',')[1];
      } catch (e) {
        // video 可能尚未准备好
      }
    }, 200);

    isStreamActive = true;
    // toggleStreamBtn.textContent = '⏸️ 停止视频流';
    // toggleStreamBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    deviceSelect.disabled = true;
    // startBtn.disabled = false;
    statusSpan.textContent = '本地视频流已启动';
  } catch (err) {
    console.error(err);
    statusSpan.textContent = '启动本地视频流失败 - ' + (err.message || err);
  }
}

// 停止视频流
function stopVideoStream() {
  // 停止本地捕获计时器
  if (localCaptureTimer) {
    clearInterval(localCaptureTimer);
    localCaptureTimer = null;
  }

  // 停止媒体流
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  latestFrame = null;
  video.srcObject = null;
  video.style.display = 'block';
  const previewImg = document.getElementById('preview-img');
  if (previewImg) previewImg.remove();

  // 如果正在分析，先停止分析
  if (isAnalyzing) stopAnalysis();

  isStreamActive = false;
  // toggleStreamBtn.textContent = '📹 启动视频流';
  // toggleStreamBtn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  deviceSelect.disabled = false;
  // startBtn.disabled = true;
  statusSpan.textContent = '本地视频流已停止';
}

// 更新设备列表
function updateDeviceList(devices) {
  const currentValue = deviceSelect.value;
  deviceSelect.innerHTML = '';
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name;
    deviceSelect.appendChild(option);
  });
  // 尝试恢复之前的选择
  if (currentValue && Array.from(deviceSelect.options).some(opt => opt.value === currentValue)) {
    deviceSelect.value = currentValue;
  }
}

// 请求本地摄像头设备列表（使用 navigator.mediaDevices）
async function requestDeviceList() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      deviceSelect.innerHTML = '<option value="default">设备枚举不可用</option>';
      return;
    }

    let devices = await navigator.mediaDevices.enumerateDevices();
    let videoDevices = devices.filter(d => d.kind === 'videoinput');

    // 如果标签为空（未授权），请求一次权限以便获取设备标签
    if (videoDevices.length > 0 && videoDevices.every(d => !d.label)) {
      try {
        const tmpStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tmpStream.getTracks().forEach(t => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(d => d.kind === 'videoinput');
      } catch (e) {
        // 用户拒绝权限或其他错误，继续使用无标签设备列表
      }
    }

    if (videoDevices.length === 0) {
      deviceSelect.innerHTML = '<option value="default">无视频设备</option>';
      return;
    }

    const list = videoDevices.map((d, i) => ({ id: d.deviceId, name: d.label || `摄像头 ${i + 1}` }));
    updateDeviceList(list);
  } catch (err) {
    console.error('无法枚举设备', err);
    deviceSelect.innerHTML = '<option value="default">无法获取设备</option>';
  }
}

// 开始分析（自动启动视频流）
async function startAnalysis() {
  // 如果视频流未启动，先启动
  if (!isStreamActive) {
    await startVideoStream();
    // 等待视频流稳定
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  try {
    const analyzeInterval = parseInt(intervalInput.value) || 12; // 分析间隔（秒）
    const totalFrames = parseInt(fpsInput.value) || 4; // 总帧数
    
    toggleAnalysisBtn.textContent = '⏹️ 停止分析';
    toggleAnalysisBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    intervalInput.disabled = true;
    fpsInput.disabled = true;
    deviceSelect.disabled = true;
    
    isAnalyzing = true;
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.classList.add('active');
    
    frameBuffer = []; // 清空缓存
    
    // 计算采样间隔：在分析间隔内均匀采集totalFrames帧
    const captureIntervalMs = (analyzeInterval * 1000) / totalFrames;
    const actualFps = (1000 / captureIntervalMs).toFixed(2);
    statusSpan.textContent = `正在采集，每 ${analyzeInterval}秒 采集 ${totalFrames}帧 (${actualFps} fps)`;
    
    // 1. 启动持续采样：按计算的间隔持续捕获帧到缓存
    captureIntervalId = setInterval(async () => {
      if (latestFrame) {
        // 将 base64 转换为 Blob
        const byteString = atob(latestFrame);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/jpeg' });
        
        // 存储帧和对应的时间戳
        frameBuffer.push({
          blob: blob,
          timestamp: new Date()
        });
        statusSpan.textContent = `已缓存 ${frameBuffer.length}/${totalFrames} 帧`;
      }
    }, captureIntervalMs);
    
    // 2. 启动定期分析：每N秒发送所有缓存的帧
    analyzeIntervalId = setInterval(async () => {
      if (frameBuffer.length > 0) {
        await sendFramesForAnalysis();
      }
    }, analyzeInterval * 1000);
    
    // 3. 启动自动洞察：每当有新的分析时检查是否需要生成洞察
    checkAndGenerateInsight();
    
  } catch (err) {
    console.error(err);
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.classList.add('error');
    statusSpan.textContent = '启动分析失败 - ' + err.message;
  }
}

// 停止分析
function stopAnalysis() {
  console.log('stopAnalysis called, isAnalyzing:', isAnalyzing);
  
  if (captureIntervalId) clearInterval(captureIntervalId);
  if (analyzeIntervalId) clearInterval(analyzeIntervalId);
  if (insightIntervalId) clearInterval(insightIntervalId);
  captureIntervalId = null;
  analyzeIntervalId = null;
  insightIntervalId = null;
  frameBuffer = []; // 清空缓存
  
  isAnalyzing = false;
  
  // 停止视频流
  stopVideoStream();
  
  // 确保按钮元素存在
  if (toggleAnalysisBtn) {
    toggleAnalysisBtn.textContent = '▶️ 开始分析';
    toggleAnalysisBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    console.log('Button updated to:', toggleAnalysisBtn.textContent);
  } else {
    console.error('toggleAnalysisBtn not found!');
  }
  
  intervalInput.disabled = false;
  fpsInput.disabled = false;
  deviceSelect.disabled = false;
  const statusContainer = document.getElementById('statusContainer');
  statusContainer.classList.remove('active', 'error');
  statusSpan.textContent = '已停止';
}

async function sendFramesForAnalysis() {
  if (frameBuffer.length === 0) return;
  
  const framesWithTimestamps = [...frameBuffer]; // 复制当前缓存（包含时间戳）
  frameBuffer = []; // 清空缓存，准备下一轮采集
  
  // 提取第一帧和最后一帧的时间戳
  const firstFrameTime = framesWithTimestamps[0].timestamp.toLocaleString('zh-CN');
  const lastFrameTime = framesWithTimestamps[framesWithTimestamps.length - 1].timestamp.toLocaleString('zh-CN');
  const frameTimeRange = framesWithTimestamps.length > 1 
    ? `${firstFrameTime} ~ ${lastFrameTime}` 
    : firstFrameTime;
  
  try {
    const form = new FormData();
    
    // 添加所有帧（只添加 blob，不添加时间戳）
    framesWithTimestamps.forEach((frame, index) => {
      form.append('frames', frame.blob, `frame_${index}.jpg`);
    });
    
    // 添加prompt参数
    const promptType = promptSelect.value;
    const promptText = promptType === 'custom' 
      ? (customPrompt.value || PROMPT_TEMPLATES['describe'])
      : PROMPT_TEMPLATES[promptType];
    form.append('prompt', promptText);
    
    // 添加 API URL 和模型名称
    form.append('apiUrl', apiUrlInput.value);
    form.append('modelName', modelNameInput.value);

    statusSpan.textContent = `正在分析 ${framesWithTimestamps.length} 帧...`;
    
    // 生成缩略图 HTML
    const thumbnailsPromises = framesWithTimestamps.map((frame, index) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const timestamp = frame.timestamp.toLocaleString('zh-CN');
          resolve(`<img src="${e.target.result}" 
                       alt="Frame ${index + 1}" 
                       style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; cursor: pointer; transition: transform 0.2s;" 
                       title="帧 ${index + 1}: ${timestamp}"
                       onclick="openImageModal('${e.target.result}', '帧 ${index + 1}', '${timestamp}')"
                       onmouseover="this.style.transform='scale(1.1)'"
                       onmouseout="this.style.transform='scale(1)'">`);
        };
        reader.readAsDataURL(frame.blob);
      });
    });
    
    const thumbnails = await Promise.all(thumbnailsPromises);
    const thumbnailsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 6px;">${thumbnails.join('')}</div>`;
    
    // 添加到历史记录（先创建空内容，后续流式更新）
    historyCount++;
    const replyTimestamp = new Date().toLocaleString('zh-CN');
    
    const entry = document.createElement('div');
    entry.className = 'history-item';
    entry.innerHTML = `
      <div class="history-header">
        <span class="history-number">#${historyCount} (${framesWithTimestamps.length}帧)</span>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <span class="history-time" style="font-size: 0.85rem;">📹 帧时间: ${frameTimeRange}</span>
          <span class="history-time" style="font-size: 0.85rem;">💬 回复时间: ${replyTimestamp}</span>
        </div>
      </div>
      ${thumbnailsHtml}
      <div class="history-content" id="history-content-${historyCount}">
        <em style="color: #999;">正在生成...</em>
      </div>
    `;
    historyDiv.insertBefore(entry, historyDiv.firstChild);
    
    const contentDiv = document.getElementById(`history-content-${historyCount}`);
    let fullText = '';
    
    // 使用 fetch 接收流式响应
    const resp = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: form });
    
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta) {
              const content = json.choices[0].delta.content || '';
              if (content) {
                fullText += content;
                // 实时渲染 Markdown
                contentDiv.innerHTML = marked.parse(fullText);
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 保存分析历史到数组
    analysisHistory.push({
      timestamp: replyTimestamp,
      frameTimeRange: frameTimeRange,
      content: fullText,
      frameCount: framesWithTimestamps.length
    });
    
    // 检查是否需要自动生成洞察
    checkAndGenerateInsight();
    
    const totalFrames = parseInt(fpsInput.value) || 4;
    statusSpan.textContent = `已缓存 0/${totalFrames} 帧 - 已发送分析 #${historyCount}`;
  } catch (err) {
    console.error(err);
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.classList.add('error');
    statusSpan.textContent = '发送或接收失败 - ' + (err.message || err);
  }
}

// 分析控制按钮（联动视频流）
toggleAnalysisBtn.addEventListener('click', () => {
  console.log('Toggle button clicked, current isAnalyzing:', isAnalyzing);
  if (isAnalyzing) {
    console.log('Calling stopAnalysis...');
    stopAnalysis();
  } else {
    console.log('Calling startAnalysis...');
    startAnalysis();
  }
});

// 刷新设备列表按钮
refreshDevicesBtn.addEventListener('click', () => {
  refreshDevicesBtn.textContent = '⏳';
  refreshDevicesBtn.disabled = true;
  requestDeviceList();
  setTimeout(() => {
    refreshDevicesBtn.textContent = '🔄';
    refreshDevicesBtn.disabled = false;
  }, 1000);
});

// 页面加载时获取设备列表
window.addEventListener('DOMContentLoaded', () => {
  requestDeviceList();
});

// 如果页面被关闭，停止视频流
window.addEventListener('beforeunload', () => {
  if (isAnalyzing) {
    stopAnalysis();
  }
  if (isStreamActive) {
    stopVideoStream();
  }
});

// 图片模态框功能
function openImageModal(imageSrc, frameLabel, timestamp) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  const modalInfo = document.getElementById('modalInfo');
  
  modal.classList.add('active');
  modalImg.src = imageSrc;
  modalInfo.textContent = `${frameLabel} - 拍摄时间: ${timestamp}`;
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('active');
}

// 点击模态框背景关闭
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('imageModal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeImageModal();
    }
  });
  
  // ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageModal();
    }
  });
});

// 检查并自动生成洞察
function checkAndGenerateInsight() {
  const interval = parseInt(insightIntervalInput.value) || 5;
  
  // 1. 生成60秒洞察：基于原始分析历史
  if (analysisHistory.length > 0 && analysisHistory.length % interval === 0) {
    generateMinuteInsight();
  }
}

// 检查并触发下一级洞察（在洞察生成完成后调用）
function checkNextLevelInsight(currentLevel) {
  const fifteenInterval = parseInt(fifteenIntervalInput.value) || 15;
  const hourInterval = parseInt(hourIntervalInput.value) || 4;
  const dayInterval = parseInt(dayIntervalInput.value) || 24;
  
  // 根据当前级别，只检查下一级
  switch(currentLevel) {
    case 'minute':
      // 60秒洞察完成 → 检查是否触发15分钟洞察
      if (insightLevels.minute.length > 0 && insightLevels.minute.length % fifteenInterval === 0) {
        setTimeout(() => generateFifteenInsight(), 500);
      }
      break;
      
    case 'fifteen':
      // 15分钟洞察完成 → 检查是否触发1小时洞察
      if (insightLevels.fifteen.length > 0 && insightLevels.fifteen.length % hourInterval === 0) {
        setTimeout(() => generateHourInsight(), 500);
      }
      break;
      
    case 'hour':
      // 1小时洞察完成 → 检查是否触发每日洞察
      if (insightLevels.hour.length > 0 && insightLevels.hour.length % dayInterval === 0) {
        setTimeout(() => generateDayInsight(), 500);
      }
      break;
      
    case 'day':
      // 每日洞察是最高级，无需触发下一级
      break;
  }
}

// 生成60秒洞察（基于原始分析历史）
async function generateMinuteInsight() {
  const interval = parseInt(insightIntervalInput.value) || 5;
  
  if (analysisHistory.length < interval) {
    console.log(`分析历史不足 ${interval} 条，跳过60秒洞察生成`);
    return;
  }
  
  // 获取最近N条分析历史
  const recentHistory = analysisHistory.slice(-interval);
  
  // 获取上一条60秒洞察（如果存在）
  const previousInsight = insightLevels.minute.length > 0 
    ? insightLevels.minute[insightLevels.minute.length - 1] 
    : null;
  
  // 构建提示词
  const systemPrompt = getSystemPrompt();
  let userPrompt = '';
  
  if (previousInsight) {
    userPrompt += `【上一个60秒洞察】（作为历史上下文参考）\n${previousInsight.content}\n\n`;
  }
  
  userPrompt += `【本次分析数据】（${interval}条视频分析报告）\n\n`;
  recentHistory.forEach((item, index) => {
    userPrompt += `[分析报告 ${index + 1}] 时间: ${item.timestamp}, 帧数: ${item.frameCount}\n${item.content}\n\n`;
  });
  
  userPrompt += `\n请基于上述分析报告的文本内容，生成简洁的60秒洞察摘要（提取和压缩关键信息、重要事件、显著变化）。${previousInsight ? '注意：【上一个60秒洞察】是历史上下文，请参考新数据生成本次洞察。' : ''}`;
  
  await generateInsight('minute', userPrompt, systemPrompt, interval);
}

// 生成15分钟洞察（基于60秒洞察）
async function generateFifteenInsight() {
  const fifteenInterval = parseInt(fifteenIntervalInput.value) || 15;
  const recentMinutes = insightLevels.minute.slice(-fifteenInterval);
  const previousFifteen = insightLevels.fifteen.length > 0
    ? insightLevels.fifteen[insightLevels.fifteen.length - 1]
    : null;
  
  const systemPrompt = getSystemPrompt();
  let userPrompt = '';
  
  if (previousFifteen) {
    userPrompt += `【上一个15分钟洞察】（作为历史上下文参考）\n${previousFifteen.content}\n\n`;
  }
  
  userPrompt += `【本次60秒洞察汇总】（${fifteenInterval}条文本摘要）\n\n`;
  recentMinutes.forEach((insight, index) => {
    userPrompt += `[60秒洞察 ${index + 1}] ${insight.timestamp}\n${insight.content}\n\n`;
  });
  
  userPrompt += `\n请对上述${fifteenInterval}条60秒洞察文本进行压缩和提炼，生成15分钟洞察摘要。重点关注：趋势变化、重复出现的关键信息、重要事件链。${previousFifteen ? '注意：【上一个15分钟洞察】是历史上下文，请参考新数据生成本次洞察。' : ''}`;
  
  await generateInsight('fifteen', userPrompt, systemPrompt, fifteenInterval);
}

// 生成1小时洞察（基于15分钟洞察）
async function generateHourInsight() {
  const hourInterval = parseInt(hourIntervalInput.value) || 4;
  const recentFifteens = insightLevels.fifteen.slice(-hourInterval);
  const previousHour = insightLevels.hour.length > 0
    ? insightLevels.hour[insightLevels.hour.length - 1]
    : null;
  
  const systemPrompt = getSystemPrompt();
  let userPrompt = '';
  
  if (previousHour) {
    userPrompt += `【上一个1小时洞察】（作为历史上下文参考）\n${previousHour.content}\n\n`;
  }
  
  userPrompt += `【本次15分钟洞察汇总】（${hourInterval}条文本摘要）\n\n`;
  recentFifteens.forEach((insight, index) => {
    userPrompt += `[15分钟洞察 ${index + 1}] ${insight.timestamp}\n${insight.content}\n\n`;
  });
  
  userPrompt += `\n请对上述${hourInterval}条15分钟洞察文本进行压缩和提炼，生成1小时洞察摘要。聚焦：整体趋势、关键转折点、持续性问题或模式。${previousHour ? '注意：【上一个1小时洞察】是历史上下文，请参考新数据生成本次洞察。' : ''}`;
  
  await generateInsight('hour', userPrompt, systemPrompt, hourInterval);
}

// 生成每日洞察（基于1小时洞察）
async function generateDayInsight() {
  const dayInterval = parseInt(dayIntervalInput.value) || 24;
  const recentHours = insightLevels.hour.slice(-dayInterval);
  const previousDay = insightLevels.day.length > 0
    ? insightLevels.day[insightLevels.day.length - 1]
    : null;
  
  const systemPrompt = getSystemPrompt();
  let userPrompt = '';
  
  if (previousDay) {
    userPrompt += `【上一个每日洞察】（作为历史上下文参考）\n${previousDay.content}\n\n`;
  }
  
  userPrompt += `【本次1小时洞察汇总】（${dayInterval}条文本摘要）\n\n`;
  recentHours.forEach((insight, index) => {
    userPrompt += `[1小时洞察 ${index + 1}] ${insight.timestamp}\n${insight.content}\n\n`;
  });
  
  userPrompt += `\n请对上述${dayInterval}条1小时洞察文本进行压缩和提炼，生成全天（每日）洞察摘要。提供：全天概览、主要事件、异常情况、整体评估。${previousDay ? '注意：【上一个每日洞察】是历史上下文，请参考新数据生成本次洞察。' : ''}`;
  
  await generateInsight('day', userPrompt, systemPrompt, dayInterval);
}

// 获取系统提示词
function getSystemPrompt() {
  const systemPromptType = insightSystemPromptSelect.value;
  return systemPromptType === 'custom' 
    ? (customInsightSystemPrompt.value || INSIGHT_SYSTEM_PROMPTS['summary'])
    : INSIGHT_SYSTEM_PROMPTS[systemPromptType];
}

// 通用洞察生成函数
async function generateInsight(level, userPrompt, systemPrompt, sourceCount) {
  const levelConfig = {
    minute: { emoji: '⏱️', label: '60秒', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', container: minuteInsightHistory, countSpan: minuteCountSpan },
    fifteen: { emoji: '⏰', label: '15分钟', color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', container: fifteenInsightHistory, countSpan: fifteenCountSpan },
    hour: { emoji: '🕐', label: '1小时', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', container: hourInsightHistory, countSpan: hourCountSpan },
    day: { emoji: '📅', label: '每日', color: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', container: dayInsightHistory, countSpan: dayCountSpan }
  };
  
  const config = levelConfig[level];
  if (!config) return;
  
  try {
    // 创建洞察历史条目
    insightCounts[level]++;
    const timestamp = new Date().toLocaleString('zh-CN');
    const currentCount = insightCounts[level];
    
    const entry = document.createElement('div');
    entry.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      border-left: 4px solid #667eea;
      font-size: 0.85rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;
    entry.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #667eea;">${config.emoji} #${currentCount}</strong>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button onclick="togglePrompt('${level}', ${currentCount})" style="background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer;">查看提示词</button>
          <span style="font-size: 0.75rem; color: #999;">${new Date().toLocaleTimeString('zh-CN')}</span>
        </div>
      </div>
      <div id="${level}-prompt-${currentCount}" style="display: none; background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 0.75rem; max-height: 200px; overflow-y: auto; white-space: pre-wrap; color: #555;">
        <strong>系统提示词：</strong>\n${systemPrompt}\n\n<strong>用户提示词：</strong>\n${userPrompt}
      </div>
      <div id="${level}-content-${currentCount}" style="color: #666; line-height: 1.4;">
        <em style="color: #999;">正在生成...</em>
      </div>
    `;
    config.container.insertBefore(entry, config.container.firstChild);
    
    // 更新计数
    config.countSpan.textContent = `(${insightCounts[level]})`;
    
    const contentDiv = document.getElementById(`${level}-content-${currentCount}`);
    let fullText = '';
    
    // 调用洞察 API
    const requestBody = {
      model: insightModelInput.value || 'RM-01 LLM',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      stream: true
    };
    
    const resp = await fetch(insightApiUrlInput.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta) {
              const content = json.choices[0].delta.content || '';
              if (content) {
                fullText += content;
                contentDiv.innerHTML = marked.parse(fullText);
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 保存到对应层级的历史中
    insightLevels[level].push({
      timestamp: timestamp,
      content: fullText,
      sourceCount: sourceCount
    });
    
    console.log(`✅ ${config.label}洞察 #${currentCount} 生成完成`);
    
    // 检查是否需要触发下一级洞察（逐级触发）
    checkNextLevelInsight(level);
    
  } catch (err) {
    console.error(`生成${config?.label || level}洞察失败:`, err);
  }
}

// 切换提示词显示
function togglePrompt(level, count) {
  const promptDiv = document.getElementById(`${level}-prompt-${count}`);
  if (promptDiv) {
    promptDiv.style.display = promptDiv.style.display === 'none' ? 'block' : 'none';
  }
}

// 切换洞察选项卡
function switchInsightTab(level) {
  // 移除所有选项卡的激活状态
  document.querySelectorAll('.insight-tab').forEach(tab => {
    tab.style.color = '#999';
    tab.style.borderBottom = '3px solid transparent';
    tab.classList.remove('active');
  });
  
  // 隐藏所有内容
  document.querySelectorAll('.insight-tab-content').forEach(content => {
    content.style.display = 'none';
    content.classList.remove('active');
  });
  
  // 激活当前选项卡
  const tabMap = {
    'minute': 0,
    'fifteen': 1,
    'hour': 2,
    'day': 3
  };
  const tabs = document.querySelectorAll('.insight-tab');
  tabs[tabMap[level]].style.color = '#667eea';
  tabs[tabMap[level]].style.borderBottom = '3px solid #667eea';
  tabs[tabMap[level]].classList.add('active');
  
  // 显示对应内容
  const contentId = level + 'Tab';
  const content = document.getElementById(contentId);
  content.style.display = 'block';
  content.classList.add('active');
}

// 将函数暴露到全局作用域
window.switchInsightTab = switchInsightTab;

// 配置面板控制
function openConfig() {
  const modal = document.getElementById('configModal');
  modal.classList.add('active');
  
  // 初始化提示词预览
  setTimeout(() => {
    updatePromptPreview();
    updateInsightPromptPreview();
  }, 50);
}

// 更新分析提示词预览
function updatePromptPreview() {
  const promptSelect = document.getElementById('promptSelect');
  const customPrompt = document.getElementById('customPrompt');
  const promptPreview = document.getElementById('promptPreview');
  const customRow = document.getElementById('customPromptRow');
  
  if (promptSelect.value === 'custom') {
    customRow.style.display = 'grid';
    promptPreview.value = customPrompt.value || '(请输入自定义提示词)';
  } else {
    customRow.style.display = 'none';
    promptPreview.value = PROMPT_TEMPLATES[promptSelect.value] || '';
  }
}

// 更新洞察系统提示词预览
function updateInsightPromptPreview() {
  const insightSelect = document.getElementById('insightSystemPromptSelect');
  const customInsightPrompt = document.getElementById('customInsightSystemPrompt');
  const insightPreview = document.getElementById('insightPromptPreview');
  const customRow = document.getElementById('customInsightPromptRow');
  
  if (insightSelect.value === 'custom') {
    customRow.style.display = 'grid';
    insightPreview.value = customInsightPrompt.value || '(请输入自定义系统提示词)';
  } else {
    customRow.style.display = 'none';
    insightPreview.value = INSIGHT_SYSTEM_PROMPTS[insightSelect.value] || '';
  }
}

// 监听提示词选择变化
document.getElementById('promptSelect').addEventListener('change', updatePromptPreview);
document.getElementById('customPrompt').addEventListener('input', updatePromptPreview);

document.getElementById('insightSystemPromptSelect').addEventListener('change', updateInsightPromptPreview);
document.getElementById('customInsightSystemPrompt').addEventListener('input', updateInsightPromptPreview);

// 初始化提示词预览
document.addEventListener('DOMContentLoaded', () => {
  updatePromptPreview();
  updateInsightPromptPreview();
});

// 配置选项卡切换函数
function switchConfigTab(tabName) {
  // 移除所有按钮的激活状态
  document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.style.color = '#999';
    btn.style.borderBottom = '3px solid transparent';
    btn.style.background = 'none';
    btn.classList.remove('active');
  });
  
  // 隐藏所有配置面板
  document.querySelectorAll('.config-tab-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // 激活当前选项卡
  const tabMap = {
    'analysis': 0,
    'prompt': 1,
    'insight': 2,
    'interval': 3,
    'insightPrompt': 4
  };
  const tabs = document.querySelectorAll('.config-tab-btn');
  const currentTab = tabs[tabMap[tabName]];
  if (currentTab) {
    currentTab.style.color = '#667eea';
    currentTab.style.borderBottom = '3px solid #667eea';
    currentTab.style.background = 'white';
    currentTab.classList.add('active');
  }
  
  // 显示对应配置面板
  const panelId = tabName + 'ConfigTab';
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.style.display = 'block';
  }
}

// 暴露函数到全局
window.switchConfigTab = switchConfigTab;
window.switchInsightTab = switchInsightTab;
