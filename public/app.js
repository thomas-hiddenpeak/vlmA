// API 基础 URL - 后端服务器地址
// 本地开发使用 localhost:43003，生产环境使用当前域名(已配置反向代理)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:43003'
    : `${window.location.protocol}//${window.location.host}`;

const video = document.getElementById('video');
const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
const deviceSelect = document.getElementById('deviceSelect');
const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
const statusSpan = document.getElementById('status');
const intervalInput = document.getElementById('intervalInput');
const fpsInput = document.getElementById('fpsInput');
const historyDiv = document.getElementById('history');
const apiUrlInput = document.getElementById('apiUrlInput');
const modelNameInput = document.getElementById('modelNameInput');

// 采集控制相关元素
const summaryCard = document.getElementById('summaryCard');
const summaryResult = document.getElementById('summaryResult');
const summaryHistoryCount = document.getElementById('summaryHistoryCount');
const summaryTimestamp = document.getElementById('summaryTimestamp');
const summaryPromptInput = document.getElementById('summaryPromptInput');
const saveSummaryPromptBtn = document.getElementById('saveSummaryPromptBtn');

// 洞察相关元素
const insightIntervalInput = document.getElementById('insightIntervalInput');
const fifteenIntervalInput = document.getElementById('fifteenIntervalInput');
const hourIntervalInput = document.getElementById('hourIntervalInput');
const dayIntervalInput = document.getElementById('dayIntervalInput');
const insightApiUrlInput = document.getElementById('insightApiUrlInput');
const insightModelInput = document.getElementById('insightModelInput');

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
let isCollecting = false; // 是否正在采集历史记录

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

// Tokens 统计
let tokenStats = {
  analysis: {
    input: 0,
    output: 0,
    total: 0
  },
  insight: {
    input: 0,
    output: 0,
    total: 0
  }
};

// 工作时长统计
let workDuration = {
  startTime: null,      // 开始工作的时间戳
  totalSeconds: 0,      // 累计工作秒数
  timerInterval: null   // 定时器
};

// 任务列表
let taskList = [];
const TASK_STORAGE_KEY = 'vlmA_task_list';

// 从 localStorage 加载任务列表
function loadTasks() {
  try {
    const saved = localStorage.getItem(TASK_STORAGE_KEY);
    if (saved) {
      taskList = JSON.parse(saved);
      updateTaskDisplay();
    }
  } catch (err) {
    console.error('加载任务列表失败:', err);
  }
}

// 保存任务列表到 localStorage
function saveTasks() {
  try {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskList));
  } catch (err) {
    console.error('保存任务列表失败:', err);
  }
}

// 从 localStorage 加载 token 统计
function loadTokenStats() {
  try {
    const saved = localStorage.getItem('vlmA_token_stats');
    if (saved) {
      tokenStats = JSON.parse(saved);
      updateTokenStatsDisplay();
    }
    
    // 加载工作时长
    const savedDuration = localStorage.getItem('vlmA_work_duration');
    if (savedDuration) {
      workDuration.totalSeconds = parseInt(savedDuration) || 0;
      updateWorkDurationDisplay();
    }
  } catch (err) {
    console.error('加载 token 统计失败:', err);
  }
}

// 保存 token 统计到 localStorage
function saveTokenStats() {
  try {
    localStorage.setItem('vlmA_token_stats', JSON.stringify(tokenStats));
    localStorage.setItem('vlmA_work_duration', workDuration.totalSeconds.toString());
  } catch (err) {
    console.error('保存 token 统计失败:', err);
  }
}

// 更新分析模型的 token 统计
function updateAnalysisTokens(inputTokens, outputTokens) {
  tokenStats.analysis.input += inputTokens || 0;
  tokenStats.analysis.output += outputTokens || 0;
  tokenStats.analysis.total = tokenStats.analysis.input + tokenStats.analysis.output;
  updateTokenStatsDisplay();
  saveTokenStats();
}

// 更新洞察模型的 token 统计
function updateInsightTokens(inputTokens, outputTokens) {
  tokenStats.insight.input += inputTokens || 0;
  tokenStats.insight.output += outputTokens || 0;
  tokenStats.insight.total = tokenStats.insight.input + tokenStats.insight.output;
  updateTokenStatsDisplay();
  saveTokenStats();
}

// 更新显示
function updateTokenStatsDisplay() {
  document.getElementById('analysisInputTokens').textContent = tokenStats.analysis.input.toLocaleString();
  document.getElementById('analysisOutputTokens').textContent = tokenStats.analysis.output.toLocaleString();
  document.getElementById('analysisTotalTokens').textContent = tokenStats.analysis.total.toLocaleString();
  
  document.getElementById('insightInputTokens').textContent = tokenStats.insight.input.toLocaleString();
  document.getElementById('insightOutputTokens').textContent = tokenStats.insight.output.toLocaleString();
  document.getElementById('insightTotalTokens').textContent = tokenStats.insight.total.toLocaleString();
  
  // 计算费用
  updateCostDisplay();
}

// 计算并更新费用显示
function updateCostDisplay() {
  const analysisPriceInput = parseFloat(document.getElementById('analysisPriceInput')?.value || 0.003);
  const analysisPriceOutput = parseFloat(document.getElementById('analysisPriceOutput')?.value || 0.003);
  const insightPriceInput = parseFloat(document.getElementById('insightPriceInput')?.value || 0.002);
  const insightPriceOutput = parseFloat(document.getElementById('insightPriceOutput')?.value || 0.002);
  
  // 计算分析模型费用（元）= (输入tokens / 1000) * 输入单价 + (输出tokens / 1000) * 输出单价
  const analysisCost = (tokenStats.analysis.input / 1000) * analysisPriceInput + 
                       (tokenStats.analysis.output / 1000) * analysisPriceOutput;
  
  // 计算洞察模型费用
  const insightCost = (tokenStats.insight.input / 1000) * insightPriceInput + 
                      (tokenStats.insight.output / 1000) * insightPriceOutput;
  
  // 总费用
  const totalCost = analysisCost + insightCost;
  
  // 更新显示（保留4位小数）
  document.getElementById('analysisCost').textContent = analysisCost.toFixed(4);
  document.getElementById('insightCost').textContent = insightCost.toFixed(4);
  document.getElementById('totalCost').textContent = totalCost.toFixed(4);
  
  // 计算预计成本
  updateEstimatedCosts(totalCost);
}

// 计算并更新预计成本
function updateEstimatedCosts(totalCost) {
  const workSeconds = workDuration.totalSeconds;
  
  if (workSeconds > 0) {
    // 计算每秒平均成本
    const costPerSecond = totalCost / workSeconds;
    
    // 预计1小时成本（3600秒）
    const hourlyEstimate = costPerSecond * 3600;
    
    // 预计24小时成本（86400秒）
    const dailyEstimate = costPerSecond * 86400;
    
    document.getElementById('hourlyEstimate').textContent = hourlyEstimate.toFixed(4);
    document.getElementById('dailyEstimate').textContent = dailyEstimate.toFixed(4);
  } else {
    document.getElementById('hourlyEstimate').textContent = '0.00';
    document.getElementById('dailyEstimate').textContent = '0.00';
  }
}

// 开始工作时长计时
function startWorkDuration() {
  if (workDuration.timerInterval) return; // 已经在运行
  
  workDuration.startTime = Date.now();
  
  // 每秒更新一次
  workDuration.timerInterval = setInterval(() => {
    workDuration.totalSeconds++;
    updateWorkDurationDisplay();
    saveTokenStats(); // 每秒保存一次时长
  }, 1000);
}

// 停止工作时长计时
function stopWorkDuration() {
  if (workDuration.timerInterval) {
    clearInterval(workDuration.timerInterval);
    workDuration.timerInterval = null;
    workDuration.startTime = null;
  }
}

// 更新工作时长显示
function updateWorkDurationDisplay() {
  const hours = Math.floor(workDuration.totalSeconds / 3600);
  const minutes = Math.floor((workDuration.totalSeconds % 3600) / 60);
  const seconds = workDuration.totalSeconds % 60;
  
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('workDuration').textContent = timeStr;
  
  // 同时更新预计成本
  updateCostDisplay();
}

// 清空统计
function clearTokenStats() {
  if (confirm('确定要清空所有 Token 统计数据吗？')) {
    tokenStats = {
      analysis: { input: 0, output: 0, total: 0 },
      insight: { input: 0, output: 0, total: 0 }
    };
    
    // 重置工作时长
    stopWorkDuration();
    workDuration.totalSeconds = 0;
    workDuration.startTime = null;
    localStorage.removeItem('vlmA_work_duration');
    
    updateTokenStatsDisplay();
    updateWorkDurationDisplay();
    saveTokenStats();
    showSaveNotification('✅ Token 统计已清空');
  }
}


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
    // 开始采集
    await startCollection();
    
    const analyzeInterval = parseInt(intervalInput.value) || 12; // 分析间隔（秒）
    const totalFrames = parseInt(fpsInput.value) || 4; // 总帧数
    
    toggleAnalysisBtn.textContent = '⏹️ 停止分析并汇总';
    toggleAnalysisBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    intervalInput.disabled = true;
    fpsInput.disabled = true;
    deviceSelect.disabled = true;
    
    isAnalyzing = true;
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.classList.add('active');
    
    // 启动工作时长计时
    startWorkDuration();
    
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
        
        // 更新缩略图显示
        updateFrameBufferPreview();
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
async function stopAnalysis() {
  console.log('stopAnalysis called, isAnalyzing:', isAnalyzing);
  
  if (captureIntervalId) clearInterval(captureIntervalId);
  if (analyzeIntervalId) clearInterval(analyzeIntervalId);
  if (insightIntervalId) clearInterval(insightIntervalId);
  captureIntervalId = null;
  analyzeIntervalId = null;
  insightIntervalId = null;
  frameBuffer = []; // 清空缓存
  
  isAnalyzing = false;
  
  // 停止工作时长计时
  stopWorkDuration();
  
  // 停止采集并生成汇总
  if (isCollecting) {
    await stopCollectionAndSummarize();
  }
  
  // 停止视频流
  stopVideoStream();
  
  // 确保按钮元素存在
  if (toggleAnalysisBtn) {
    toggleAnalysisBtn.textContent = '▶️ 开始分析与采集';
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
  
  // 隐藏缓存帧预览
  updateFrameBufferPreview();
}

// 更新缓存帧缩略图显示
function updateFrameBufferPreview() {
  const previewContainer = document.getElementById('frameBufferPreview');
  const thumbnailsContainer = document.getElementById('frameBufferThumbnails');
  const countSpan = document.getElementById('frameBufferCount');
  
  if (!previewContainer || !thumbnailsContainer || !countSpan) return;
  
  // 更新计数
  countSpan.textContent = frameBuffer.length;
  
  // 如果没有缓存帧，隐藏容器
  if (frameBuffer.length === 0) {
    previewContainer.style.display = 'none';
    thumbnailsContainer.innerHTML = '';
    return;
  }
  
  // 显示容器
  previewContainer.style.display = 'block';
  
  // 清空并重新生成缩略图
  thumbnailsContainer.innerHTML = '';
  
  frameBuffer.forEach((frame, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 2px solid #e1e4e8; flex-shrink: 0; cursor: pointer; transition: all 0.2s;';
      img.title = `帧 ${index + 1} - ${frame.timestamp.toLocaleTimeString('zh-CN')}`;
      
      // 悬停效果
      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.1)';
        img.style.borderColor = '#667eea';
        img.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
      });
      img.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.borderColor = '#e1e4e8';
        img.style.boxShadow = 'none';
      });
      
      thumbnailsContainer.appendChild(img);
    };
    reader.readAsDataURL(frame.blob);
  });
}

async function sendFramesForAnalysis() {
  if (frameBuffer.length === 0) return;
  
  const framesWithTimestamps = [...frameBuffer]; // 复制当前缓存（包含时间戳）
  frameBuffer = []; // 清空缓存，准备下一轮采集
  
  // 更新缩略图显示（清空）
  updateFrameBufferPreview();
  
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
    const analysisPromptInput = document.getElementById('analysisPromptInput');
    const promptText = analysisPromptInput ? analysisPromptInput.value.trim() : '请描述这些时序图片中的内容,不要逐个描述，请整体简要描述。';
    form.append('prompt', promptText);
    
    // 添加 API URL、模型名称和 API Key
    form.append('apiUrl', apiUrlInput.value);
    form.append('modelName', modelNameInput.value);
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
    if (apiKey) {
      form.append('apiKey', apiKey);
    }

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
    let usageData = null;
    
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
            
            // 打印完整的响应对象（仅在有 finish_reason 时）
            if (json.choices && json.choices[0] && json.choices[0].finish_reason) {
              console.log('📦 分析模型完成消息:', json);
            }
            
            // 提取 token 使用信息（可能在任何数据包中）
            if (json.usage) {
              usageData = json.usage;
              console.log('✅ 找到分析模型真实 usage 数据:', json.usage);
            }
            
            // 处理内容
            if (json.choices && json.choices[0]) {
              const choice = json.choices[0];
              
              // 检查 delta 中的内容（流式）
              if (choice.delta && choice.delta.content) {
                fullText += choice.delta.content;
                contentDiv.innerHTML = marked.parse(fullText);
              }
              
              // 检查 message 中的内容（某些实现）
              if (choice.message && choice.message.content) {
                fullText += choice.message.content;
                contentDiv.innerHTML = marked.parse(fullText);
              }
              
              // 检查 finish_reason，可能伴随 usage
              if (choice.finish_reason && json.usage) {
                usageData = json.usage;
              }
            }
          } catch (e) {
            // 忽略解析错误
            console.debug('JSON 解析失败:', line);
          }
        }
      }
    }
    
    // 更新分析模型的 token 统计
    if (usageData) {
      updateAnalysisTokens(
        usageData.prompt_tokens || 0,
        usageData.completion_tokens || 0
      );
    } else {
      // 如果没有 usage 数据，使用估算值
      // 粗略估算：中文约 1.5 字符/token，英文约 4 字符/token
      const estimatedOutputTokens = Math.ceil(fullText.length / 2);
      // 输入 token 难以估算，假设图片编码约 1000 tokens/图
      const estimatedInputTokens = framesWithTimestamps.length * 1000;
      updateAnalysisTokens(estimatedInputTokens, estimatedOutputTokens);
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

// 开始采集函数
async function startCollection() {
  try {
    const response = await fetch(`${API_BASE_URL}/collection/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      isCollecting = true;
      summaryCard.style.display = 'none';
      
      // 添加状态指示
      const indicator = document.createElement('div');
      indicator.id = 'collectionIndicator';
      indicator.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: linear-gradient(135deg, #20bf6b 0%, #26de81 100%); color: white; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(32, 191, 107, 0.4); z-index: 1000; animation: pulse 2s infinite;';
      indicator.innerHTML = '🔴 正在采集历史记录...';
      document.body.appendChild(indicator);
      
      console.log('Collection started:', data);
    } else {
      console.error('开始采集失败:', data.error);
    }
  } catch (err) {
    console.error('Start collection error:', err);
  }
}

// 停止采集并生成汇总函数
async function stopCollectionAndSummarize() {
  try {
    // 移除采集指示器
    const indicator = document.getElementById('collectionIndicator');
    if (indicator) {
      indicator.remove();
    }
    
    // 显示生成中状态
    if (toggleAnalysisBtn) {
      toggleAnalysisBtn.disabled = true;
      toggleAnalysisBtn.textContent = '⏳ 生成汇总中...';
    }
    
    const summaryPrompt = summaryPromptInput.value.trim() || '请分析以下所有历史观察记录，提供综合洞察和总结：';
    const insightApiUrl = insightApiUrlInput.value.trim();
    const insightModel = insightModelInput.value.trim();
    const insightApiKeyInput = document.getElementById('insightApiKeyInput');
    const insightApiKey = insightApiKeyInput ? insightApiKeyInput.value.trim() : '';
    
    const requestBody = {
      summaryPrompt,
      apiUrl: insightApiUrl,
      modelName: insightModel
    };
    
    // 如果有 API Key，添加到请求体中
    if (insightApiKey) {
      requestBody.apiKey = insightApiKey;
    }
    
    const response = await fetch(`${API_BASE_URL}/collection/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error('请求失败');
    }
    
    // 解析 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let summaryText = '';
    let historyCount = 0;
    
    summaryCard.style.display = 'block';
    summaryResult.textContent = '正在生成汇总分析...';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            const parsed = JSON.parse(jsonStr);
            
            // 元数据
            if (parsed.type === 'metadata') {
              historyCount = parsed.historyCount;
              summaryHistoryCount.textContent = historyCount;
              summaryTimestamp.textContent = new Date().toLocaleString('zh-CN');
              continue;
            }
            
            // 流式内容
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              summaryText += content;
              // 使用 marked.parse() 渲染 Markdown
              summaryResult.innerHTML = marked.parse(summaryText);
              // 自动滚动到底部
              summaryResult.scrollTop = summaryResult.scrollHeight;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
    
    isCollecting = false;
    
    if (toggleAnalysisBtn) {
      toggleAnalysisBtn.disabled = false;
    }
    
    console.log('Summary completed. History count:', historyCount);
    
    // 汇总完成后提取任务
    if (summaryText.trim()) {
      console.log(`[任务提取] 触发历史汇总分析, 内容长度: ${summaryText.length}`);
      await extractTasksFromText(summaryText, '历史汇总分析');
    } else {
      console.log(`[任务提取] 跳过历史汇总 - 内容为空`);
    }
    
  } catch (err) {
    console.error('Stop collection error:', err);
    alert('生成汇总失败: ' + err.message);
    
    if (toggleAnalysisBtn) {
      toggleAnalysisBtn.disabled = false;
    }
  }
}

// 保存汇总提示词（已废弃，现在通过配置模态框保存）
saveSummaryPromptBtn?.addEventListener('click', async () => {
  try {
    const summaryPrompt = summaryPromptInput.value.trim();
    
    if (!summaryPrompt) {
      alert('请输入汇总提示词');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/collection/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryPrompt })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('汇总提示词已保存');
      console.log('Summary prompt updated:', data);
    } else {
      alert('保存失败: ' + (data.error || '未知错误'));
    }
  } catch (err) {
    console.error('Save summary prompt error:', err);
    alert('保存失败: ' + err.message);
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

// 点击模态框背景关闭（在主 DOMContentLoaded 中初始化）
function initImageModal() {
  const modal = document.getElementById('imageModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeImageModal();
      }
    });
  }
  
  // ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageModal();
    }
  });
}

// 检查并自动生成洞察
function checkAndGenerateInsight() {
  const interval = parseInt(insightIntervalInput.value) || 5;
  
  console.log(`[洞察检查] 分析历史数量: ${analysisHistory.length}, 配置区间: ${interval}, 是否触发: ${analysisHistory.length % interval === 0}`);
  
  // 1. 生成60秒洞察：基于原始分析历史
  if (analysisHistory.length > 0 && analysisHistory.length % interval === 0) {
    console.log(`✅ 触发60秒洞察生成 (第 ${analysisHistory.length / interval} 次)`);
    generateMinuteInsight();
  }
}

// 检查并触发下一级洞察（在洞察生成完成后调用）
function checkNextLevelInsight(currentLevel) {
  const fifteenInterval = parseInt(fifteenIntervalInput.value) || 15;
  const hourInterval = parseInt(hourIntervalInput.value) || 4;
  const dayInterval = parseInt(dayIntervalInput.value) || 24;
  
  console.log(`[下一级洞察检查] 当前级别: ${currentLevel}`);
  console.log(`[配置] 15分钟区间: ${fifteenInterval}, 1小时区间: ${hourInterval}, 每日区间: ${dayInterval}`);
  console.log(`[数量] 60秒: ${insightLevels.minute.length}, 15分钟: ${insightLevels.fifteen.length}, 1小时: ${insightLevels.hour.length}, 每日: ${insightLevels.day.length}`);
  
  // 根据当前级别，只检查下一级
  switch(currentLevel) {
    case 'minute':
      // 60秒洞察完成 → 检查是否触发15分钟洞察
      const shouldTriggerFifteen = insightLevels.minute.length > 0 && insightLevels.minute.length % fifteenInterval === 0;
      console.log(`[15分钟检查] 60秒洞察数量: ${insightLevels.minute.length}, 取模结果: ${insightLevels.minute.length % fifteenInterval}, 是否触发: ${shouldTriggerFifteen}`);
      if (shouldTriggerFifteen) {
        console.log(`✅ 触发15分钟洞察生成 (第 ${insightLevels.minute.length / fifteenInterval} 次)`);
        setTimeout(() => generateFifteenInsight(), 500);
      }
      break;
      
    case 'fifteen':
      // 15分钟洞察完成 → 检查是否触发1小时洞察
      const shouldTriggerHour = insightLevels.fifteen.length > 0 && insightLevels.fifteen.length % hourInterval === 0;
      console.log(`[1小时检查] 15分钟洞察数量: ${insightLevels.fifteen.length}, 取模结果: ${insightLevels.fifteen.length % hourInterval}, 是否触发: ${shouldTriggerHour}`);
      if (shouldTriggerHour) {
        console.log(`✅ 触发1小时洞察生成 (第 ${insightLevels.fifteen.length / hourInterval} 次)`);
        setTimeout(() => generateHourInsight(), 500);
      }
      break;
      
    case 'hour':
      // 1小时洞察完成 → 检查是否触发每日洞察
      const shouldTriggerDay = insightLevels.hour.length > 0 && insightLevels.hour.length % dayInterval === 0;
      console.log(`[每日检查] 1小时洞察数量: ${insightLevels.hour.length}, 取模结果: ${insightLevels.hour.length % dayInterval}, 是否触发: ${shouldTriggerDay}`);
      if (shouldTriggerDay) {
        console.log(`✅ 触发每日洞察生成 (第 ${insightLevels.hour.length / dayInterval} 次)`);
        setTimeout(() => generateDayInsight(), 500);
      }
      break;
      
    case 'day':
      // 每日洞察是最高级，无需触发下一级
      console.log(`[每日洞察] 已是最高级别，无需触发下一级`);
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
  const insightPromptInput = document.getElementById('insightPromptInput');
  return insightPromptInput ? insightPromptInput.value.trim() : '你是一个专业的信息综合分析专家。你的任务是对已有的信息进行二次总结和提炼，压缩关键信息，识别重要模式。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。';
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
      stream: true,
      stream_options: {
        include_usage: true  // vLLM 需要这个选项来在流式响应中包含 usage
      }
    };
    
    // 构建请求头
    const requestHeaders = { 'Content-Type': 'application/json' };
    const insightApiKeyInput = document.getElementById('insightApiKeyInput');
    const insightApiKey = insightApiKeyInput ? insightApiKeyInput.value.trim() : '';
    if (insightApiKey) {
      requestHeaders['Authorization'] = `Bearer ${insightApiKey}`;
    }
    
    const resp = await fetch(insightApiUrlInput.value, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let usageData = null;
    
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
            
            // 提取 token 使用信息（可能在任何数据包中）
            if (json.usage) {
              usageData = json.usage;
            }
            
            // 处理内容
            if (json.choices && json.choices[0]) {
              const choice = json.choices[0];
              
              // 检查 delta 中的内容（流式）
              if (choice.delta && choice.delta.content) {
                fullText += choice.delta.content;
                contentDiv.innerHTML = marked.parse(fullText);
              }
              
              // 检查 message 中的内容（某些实现）
              if (choice.message && choice.message.content) {
                fullText += choice.message.content;
                contentDiv.innerHTML = marked.parse(fullText);
              }
              
              // 检查 finish_reason，可能伴随 usage
              if (choice.finish_reason && json.usage) {
                usageData = json.usage;
                console.log('在 finish_reason 处获取到 usage:', json.usage);
              }
            }
          } catch (e) {
            // 忽略解析错误
            console.debug('JSON 解析失败:', line);
          }
        }
      }
    }
    
    // 更新洞察模型的 token 统计
    if (usageData) {
      updateInsightTokens(
        usageData.prompt_tokens || 0,
        usageData.completion_tokens || 0
      );
    } else {
      // 如果没有 usage 数据，使用估算值
      // 粗略估算：中文约 1.5 字符/token，英文约 4 字符/token
      const estimatedInputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 2);
      const estimatedOutputTokens = Math.ceil(fullText.length / 2);
      updateInsightTokens(estimatedInputTokens, estimatedOutputTokens);
    }
    
    // 保存到对应层级的历史中
    insightLevels[level].push({
      timestamp: timestamp,
      content: fullText,
      sourceCount: sourceCount
    });
    
    console.log(`✅ ${config.label}洞察 #${currentCount} 生成完成`);
    
    // 任务提取:小时洞察和每日洞察
    if (level === 'hour' || level === 'day') {
      const source = level === 'hour' ? '1小时洞察' : '每日洞察';
      console.log(`[任务提取] 触发层级: ${level}, 来源: ${source}, 内容长度: ${fullText.length}`);
      await extractTasksFromText(fullText, source);
    } else {
      console.log(`[任务提取] 跳过层级: ${level} (仅在 hour/day 层级提取)`);
    }
    
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
}

// 初始化配置（在主 DOMContentLoaded 中加载）

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
    'model': 0,
    'prompt': 1,
    'params': 2
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

// ==================== 配置管理功能 ====================

// 配置键名
const CONFIG_KEY = 'vlmA_system_config';

// 默认配置
const DEFAULT_CONFIG = {
  // 模型配置
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-vl-plus',
  apiKey: '',  // 分析模型 API Key，留空表示本地模型
  insightApiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  insightModel: 'qwen-max',
  insightApiKey: '',  // 洞察模型 API Key，留空表示本地模型
  
  // 价格配置（元/千tokens）
  analysisPriceInput: 0.003,
  analysisPriceOutput: 0.003,
  insightPriceInput: 0.002,
  insightPriceOutput: 0.002,
  
  // 提示词配置
  analysisPrompt: '请描述这些时序图片中的内容,不要逐个描述，请整体简要描述。',
  insightPrompt: '你是一个专业的信息综合分析专家。你的任务是对已有的信息进行二次总结和提炼，压缩关键信息，识别重要模式。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。',
  summaryPrompt: '请分析以下所有历史观察记录，提供综合洞察和总结：',
  taskPrompt: `你是一个任务提取助手。请从以下内容中识别并提取可操作的待办事项。

## 提取规则
1. **问题/异常** → 转化为排查或修复任务
2. **观察到的变化** → 转化为跟进或确认任务
3. **数据/指标** → 转化为分析或监控任务
4. **建议/优化点** → 转化为具体行动任务
5. **未完成的事项** → 直接作为待办任务

## 输出格式
每个任务占一行，格式必须为：- [ ] 任务描述

## 示例
输入："CPU使用率升高到85%，需要排查原因"
输出：- [ ] 排查服务器CPU使用率异常问题

输入："用户反馈登录慢，可能是数据库连接池不足"
输出：- [ ] 检查数据库连接池配置并优化

## 注意
- 如果内容是纯描述性的日常状态，返回：[]
- 只输出任务列表或空列表，不要有其他文字`,
  autoExtractTasks: true,  // 自动提取任务
  
  // 参数配置
  insightPrompt: '你是一个专业的信息综合分析专家。你的任务是对已有的信息进行二次总结和提炼，压缩关键信息，识别重要模式。你要处理的信息里面有些信息（可能是本次信息也可能是上一分钟的洞察）可能前后不相关，需要区别整理。',
  summaryPrompt: '请分析以下所有历史观察记录，提供综合洞察和总结：',
  
  // 参数配置
  interval: 12,
  fps: 4,
  insightInterval: 5,
  fifteenInterval: 15,
  hourInterval: 4,
  dayInterval: 24
};

// 加载配置
function loadConfig() {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      applyConfig(config);
      console.log('配置已加载:', config);
      return config;
    }
  } catch (err) {
    console.error('加载配置失败:', err);
  }
  return null;
}

// 应用配置到界面
function applyConfig(config) {
  // 模型配置
  if (config.apiUrl) apiUrlInput.value = config.apiUrl;
  if (config.modelName) modelNameInput.value = config.modelName;
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput && config.apiKey !== undefined) apiKeyInput.value = config.apiKey;
  
  if (config.insightApiUrl) insightApiUrlInput.value = config.insightApiUrl;
  if (config.insightModel) insightModelInput.value = config.insightModel;
  const insightApiKeyInput = document.getElementById('insightApiKeyInput');
  if (insightApiKeyInput && config.insightApiKey !== undefined) insightApiKeyInput.value = config.insightApiKey;
  
  // 价格配置
  const analysisPriceInputEl = document.getElementById('analysisPriceInput');
  const analysisPriceOutputEl = document.getElementById('analysisPriceOutput');
  const insightPriceInputEl = document.getElementById('insightPriceInput');
  const insightPriceOutputEl = document.getElementById('insightPriceOutput');
  if (config.analysisPriceInput !== undefined && analysisPriceInputEl) analysisPriceInputEl.value = config.analysisPriceInput;
  if (config.analysisPriceOutput !== undefined && analysisPriceOutputEl) analysisPriceOutputEl.value = config.analysisPriceOutput;
  if (config.insightPriceInput !== undefined && insightPriceInputEl) insightPriceInputEl.value = config.insightPriceInput;
  if (config.insightPriceOutput !== undefined && insightPriceOutputEl) insightPriceOutputEl.value = config.insightPriceOutput;
  
  // 提示词配置
  const analysisPromptInput = document.getElementById('analysisPromptInput');
  const insightPromptInput = document.getElementById('insightPromptInput');
  const taskPromptInput = document.getElementById('taskPromptInput');
  const autoExtractCheckbox = document.getElementById('autoExtractTasksCheckbox');
  
  if (config.analysisPrompt && analysisPromptInput) analysisPromptInput.value = config.analysisPrompt;
  if (config.insightPrompt && insightPromptInput) insightPromptInput.value = config.insightPrompt;
  if (config.summaryPrompt) summaryPromptInput.value = config.summaryPrompt;
  if (config.taskPrompt && taskPromptInput) taskPromptInput.value = config.taskPrompt;
  if (config.autoExtractTasks !== undefined && autoExtractCheckbox) autoExtractCheckbox.checked = config.autoExtractTasks;
  
  // 参数配置
  if (config.interval) intervalInput.value = config.interval;
  if (config.fps) fpsInput.value = config.fps;
  if (config.insightInterval) insightIntervalInput.value = config.insightInterval;
  if (config.fifteenInterval) fifteenIntervalInput.value = config.fifteenInterval;
  if (config.hourInterval) hourIntervalInput.value = config.hourInterval;
  if (config.dayInterval) dayIntervalInput.value = config.dayInterval;
  
  // 更新费用显示
  updateCostDisplay();
}

// 获取当前配置
function getCurrentConfig() {
  const analysisPromptInput = document.getElementById('analysisPromptInput');
  const insightPromptInput = document.getElementById('insightPromptInput');
  const analysisPriceInputEl = document.getElementById('analysisPriceInput');
  const analysisPriceOutputEl = document.getElementById('analysisPriceOutput');
  const insightPriceInputEl = document.getElementById('insightPriceInput');
  const insightPriceOutputEl = document.getElementById('insightPriceOutput');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const insightApiKeyInput = document.getElementById('insightApiKeyInput');
  const taskPromptInput = document.getElementById('taskPromptInput');
  const autoExtractCheckbox = document.getElementById('autoExtractTasksCheckbox');
  
  return {
    // 模型配置
    apiUrl: apiUrlInput.value.trim(),
    modelName: modelNameInput.value.trim(),
    apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
    insightApiUrl: insightApiUrlInput.value.trim(),
    insightModel: insightModelInput.value.trim(),
    insightApiKey: insightApiKeyInput ? insightApiKeyInput.value.trim() : '',
    
    // 价格配置
    analysisPriceInput: parseFloat(analysisPriceInputEl?.value || DEFAULT_CONFIG.analysisPriceInput),
    analysisPriceOutput: parseFloat(analysisPriceOutputEl?.value || DEFAULT_CONFIG.analysisPriceOutput),
    insightPriceInput: parseFloat(insightPriceInputEl?.value || DEFAULT_CONFIG.insightPriceInput),
    insightPriceOutput: parseFloat(insightPriceOutputEl?.value || DEFAULT_CONFIG.insightPriceOutput),
    
    // 提示词配置
    analysisPrompt: analysisPromptInput ? analysisPromptInput.value.trim() : DEFAULT_CONFIG.analysisPrompt,
    insightPrompt: insightPromptInput ? insightPromptInput.value.trim() : DEFAULT_CONFIG.insightPrompt,
    summaryPrompt: summaryPromptInput.value.trim(),
    taskPrompt: taskPromptInput ? taskPromptInput.value.trim() : DEFAULT_CONFIG.taskPrompt,
    autoExtractTasks: autoExtractCheckbox ? autoExtractCheckbox.checked : DEFAULT_CONFIG.autoExtractTasks,
    
    // 参数配置
    interval: parseInt(intervalInput.value) || 12,
    fps: parseInt(fpsInput.value) || 4,
    insightInterval: parseInt(insightIntervalInput.value) || 5,
    fifteenInterval: parseInt(fifteenIntervalInput.value) || 15,
    hourInterval: parseInt(hourIntervalInput.value) || 4,
    dayInterval: parseInt(dayIntervalInput.value) || 24
  };
}

// 保存配置
function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    console.log('配置已保存:', config);
    return true;
  } catch (err) {
    console.error('保存配置失败:', err);
    return false;
  }
}

// 显示保存成功提示
function showSaveNotification(message = '配置已保存') {
  // 移除旧的提示
  const oldNotif = document.getElementById('saveNotification');
  if (oldNotif) oldNotif.remove();
  
  // 创建新提示
  const notification = document.createElement('div');
  notification.id = 'saveNotification';
  notification.style.cssText = 'position: fixed; top: 80px; right: 20px; padding: 12px 20px; background: linear-gradient(135deg, #20bf6b 0%, #26de81 100%); color: white; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(32, 191, 107, 0.4); z-index: 1000; animation: slideInRight 0.3s ease;';
  notification.innerHTML = '✅ ' + message;
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 保存模型配置按钮
document.getElementById('saveModelConfigBtn')?.addEventListener('click', () => {
  const config = getCurrentConfig();
  if (saveConfig(config)) {
    showSaveNotification('模型配置已保存');
  } else {
    alert('保存失败，请重试');
  }
});

// 保存提示词配置按钮
document.getElementById('savePromptConfigBtn')?.addEventListener('click', () => {
  const config = getCurrentConfig();
  if (saveConfig(config)) {
    showSaveNotification('提示词配置已保存');
  } else {
    alert('保存失败，请重试');
  }
});

// 保存参数配置按钮
document.getElementById('saveParamsConfigBtn')?.addEventListener('click', () => {
  const config = getCurrentConfig();
  if (saveConfig(config)) {
    showSaveNotification('参数配置已保存');
  } else {
    alert('保存失败，请重试');
  }
});

// 恢复初始设置按钮
document.getElementById('resetConfigBtn')?.addEventListener('click', () => {
  if (confirm('确定要恢复初始设置吗？这将清除所有已保存的配置，此操作不可撤销。')) {
    try {
      // 清除 localStorage
      localStorage.removeItem(CONFIG_KEY);
      
      // 应用默认配置到界面
      applyConfig(DEFAULT_CONFIG);
      
      showSaveNotification('✅ 已恢复初始设置');
      console.log('配置已重置为默认值');
    } catch (err) {
      console.error('恢复初始设置失败:', err);
      alert('恢复初始设置失败，请重试');
    }
  }
});

// 清空 Token 统计按钮
document.getElementById('clearTokenStatsBtn')?.addEventListener('click', clearTokenStats);

// 页面加载时初始化所有功能
window.addEventListener('DOMContentLoaded', () => {
  console.log('页面初始化开始...');
  
  // 初始化图片模态框
  initImageModal();
  
  // 加载设备列表
  console.log('正在加载设备列表...');
  requestDeviceList();
  
  // 加载配置
  console.log('正在加载配置...');
  loadConfig();
  
  // 加载 Token 统计
  console.log('正在加载 Token 统计...');
  loadTokenStats();
  
  // 加载任务列表
  console.log('正在加载任务列表...');
  loadTasks();
  
  // 绑定任务清空按钮
  const clearTasksBtn = document.getElementById('clearTasksBtn');
  if (clearTasksBtn) {
    clearTasksBtn.addEventListener('click', clearAllTasks);
  }
  
  console.log('页面初始化完成');
});

// ==================== 任务管理功能 ====================

// 更新任务显示
function updateTaskDisplay() {
  const taskListEl = document.getElementById('taskList');
  const taskCountEl = document.getElementById('taskCount');
  
  if (!taskListEl || !taskCountEl) return;
  
  taskCountEl.textContent = `(${taskList.length})`;
  
  if (taskList.length === 0) {
    taskListEl.innerHTML = `
      <div style="text-align: center; color: #999; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 10px;">📋</div>
        <div>暂无任务</div>
        <div style="font-size: 0.85rem; margin-top: 8px;">任务将从汇总和洞察中自动提取</div>
      </div>
    `;
    return;
  }
  
  const tasksHTML = taskList.map((task, index) => {
    const timestamp = new Date(task.timestamp).toLocaleString('zh-CN');
    const checkedClass = task.completed ? 'style="text-decoration: line-through; opacity: 0.6;"' : '';
    
    return `
      <div class="task-item" style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${task.completed ? '#999' : '#667eea'}; transition: all 0.3s;">
        <div style="display: flex; align-items: start; gap: 10px;">
          <input type="checkbox" 
                 ${task.completed ? 'checked' : ''} 
                 onchange="toggleTaskComplete(${index})"
                 style="margin-top: 4px; cursor: pointer; width: 18px; height: 18px; flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div ${checkedClass} style="font-size: 0.9rem; color: #333; line-height: 1.5; margin-bottom: 6px; word-wrap: break-word;">
              ${escapeHtml(task.description)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="font-size: 0.75rem; color: #999; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                📅 ${timestamp}${task.source ? ` • ${task.source}` : ''}
              </div>
              <button onclick="deleteTask(${index})" 
                      style="width: 24px; height: 24px; padding: 0; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center;"
                      onmouseover="this.style.background='#ee5a6f'"
                      onmouseout="this.style.background='#ff6b6b'"
                      title="删除任务">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  taskListEl.innerHTML = tasksHTML;
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 切换任务完成状态
function toggleTaskComplete(index) {
  if (index >= 0 && index < taskList.length) {
    taskList[index].completed = !taskList[index].completed;
    saveTasks();
    updateTaskDisplay();
  }
}

// 删除任务
function deleteTask(index) {
  if (index >= 0 && index < taskList.length) {
    if (confirm('确定要删除这个任务吗？')) {
      taskList.splice(index, 1);
      saveTasks();
      updateTaskDisplay();
    }
  }
}

// 清空所有任务
function clearAllTasks() {
  if (taskList.length === 0) {
    showSaveNotification('⚠️ 任务列表已经是空的');
    return;
  }
  
  if (confirm('确定要清空所有任务吗？')) {
    taskList = [];
    saveTasks();
    updateTaskDisplay();
    showSaveNotification('✅ 所有任务已清空');
  }
}

// 从文本中提取任务
async function extractTasksFromText(content, source = '未知') {
  try {
    const taskPromptInput = document.getElementById('taskPromptInput');
    const autoExtractCheckbox = document.getElementById('autoExtractTasksCheckbox');
    
    // 检查是否启用自动提取
    if (!autoExtractCheckbox || !autoExtractCheckbox.checked) {
      console.log('自动任务提取已禁用');
      return [];
    }
    
    const taskPrompt = taskPromptInput ? taskPromptInput.value.trim() : DEFAULT_CONFIG.taskPrompt;
    
    if (!taskPrompt) {
      console.error('任务提取提示词为空');
      return [];
    }
    
    console.log(`正在从${source}提取任务...`);
    console.log(`任务提示词长度: ${taskPrompt.length}字符`);
    console.log(`分析内容长度: ${content.length}字符`);
    
    // 调用洞察 API 提取任务
    const insightApiKeyInput = document.getElementById('insightApiKeyInput');
    const insightApiKey = insightApiKeyInput ? insightApiKeyInput.value.trim() : '';
    
    const requestHeaders = { 'Content-Type': 'application/json' };
    if (insightApiKey) {
      requestHeaders['Authorization'] = `Bearer ${insightApiKey}`;
    }
    
    const requestBody = {
      model: insightModelInput.value || 'RM-01 LLM',
      messages: [
        {
          role: 'system',
          content: taskPrompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3,
      stream: false
    };
    
    console.log(`调用API: ${insightApiUrlInput.value}`);
    console.log(`使用模型: ${requestBody.model}`);
    
    const resp = await fetch(insightApiUrlInput.value, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`API响应错误 (${resp.status}):`, errorText);
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    
    const result = await resp.json();
    const responseText = result.choices?.[0]?.message?.content || '';
    
    console.log(`API响应内容:`, responseText.substring(0, 500));
    console.log(`响应总长度: ${responseText.length}字符`);
    
    // 解析任务列表
    const tasks = parseTasksFromResponse(responseText);
    console.log(`解析到的任务数量: ${tasks.length}`);
    
    if (tasks.length > 0) {
      console.log(`从${source}提取到 ${tasks.length} 个任务`);
      
      // 添加任务到列表
      tasks.forEach(description => {
        taskList.push({
          description: description,
          completed: false,
          timestamp: new Date().toISOString(),
          source: source
        });
      });
      
      saveTasks();
      updateTaskDisplay();
      
      showSaveNotification(`✅ 从${source}提取了 ${tasks.length} 个新任务`);
    } else {
      console.log(`从${source}未提取到任务`);
    }
    
    return tasks;
  } catch (err) {
    console.error('提取任务失败:', err);
    return [];
  }
}

// 从响应文本中解析任务列表
function parseTasksFromResponse(text) {
  const tasks = [];
  const lines = text.split('\n');
  
  console.log(`解析任务 - 总行数: ${lines.length}`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 匹配 "- [ ] 任务描述" 格式
    const match = trimmed.match(/^-\s*\[\s*\]\s*(.+)$/);
    if (match && match[1]) {
      const taskDesc = match[1].trim();
      console.log(`找到任务 [行${i+1}]: ${taskDesc}`);
      if (taskDesc && !tasks.includes(taskDesc)) {
        tasks.push(taskDesc);
      }
    } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      console.log(`跳过非标准格式 [行${i+1}]: ${trimmed.substring(0, 50)}`);
    }
  }
  
  console.log(`最终解析到 ${tasks.length} 个有效任务`);
  return tasks;
}

// 暴露函数到全局
window.toggleTaskComplete = toggleTaskComplete;
window.deleteTask = deleteTask;
window.clearAllTasks = clearAllTasks;
window.extractTasksFromText = extractTasksFromText;

// 下载历史分析数据
function downloadHistory() {
  try {
    // 构建导出数据
    const exportData = {
      exportTime: new Date().toISOString(),
      exportTimeLocal: new Date().toLocaleString('zh-CN'),
      totalAnalysis: analysisHistory.length,
      summary: {
        content: document.getElementById('summaryResult')?.textContent || '',
        historyCount: historyCount,
        timestamp: document.getElementById('summaryTimestamp')?.textContent || ''
      },
      analysisHistory: analysisHistory,
      insights: {
        minute: insightLevels.minute,
        fifteen: insightLevels.fifteen,
        hour: insightLevels.hour,
        day: insightLevels.day
      },
      insightCounts: insightCounts,
      tasks: taskList,
      tokenStats: tokenStats,
      workDuration: {
        totalSeconds: workDuration.totalSeconds,
        formatted: formatDuration(workDuration.totalSeconds)
      }
    };
    
    // 转换为JSON字符串
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // 创建Blob
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // 文件名包含时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    a.download = `vlmA-history-${timestamp}.json`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSaveNotification('✅ 历史数据已导出');
    
  } catch (err) {
    console.error('导出历史数据失败:', err);
    alert('导出失败: ' + err.message);
  }
}

// 格式化时长
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

// 暴露下载函数到全局
window.downloadHistory = downloadHistory;

// 初始化检查
document.addEventListener('DOMContentLoaded', () => {
  console.log('[初始化检查] 洞察配置元素:');
  console.log('  fifteenIntervalInput:', fifteenIntervalInput, 'value:', fifteenIntervalInput?.value);
  console.log('  hourIntervalInput:', hourIntervalInput, 'value:', hourIntervalInput?.value);
  console.log('  dayIntervalInput:', dayIntervalInput, 'value:', dayIntervalInput?.value);
  console.log('  insightIntervalInput:', insightIntervalInput, 'value:', insightIntervalInput?.value);
});


