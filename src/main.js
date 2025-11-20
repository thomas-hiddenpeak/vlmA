const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const { spawn } = require('child_process');

// 保持对窗口对象的全局引用
let mainWindow;
let localServer;
let backendProcess;

// 创建日志文件用于调试
const logFile = path.join(app.getPath('userData'), 'app.log');
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    // 忽略写入错误
  }
}

log(`应用启动 - 版本: ${app.getVersion()}`);
log(`用户数据目录: ${app.getPath('userData')}`);
log(`日志文件: ${logFile}`);

// 获取 MIME 类型
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
  };
  return mimeTypes[ext] || 'text/plain';
}

// 创建本地HTTP服务器
function createLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // 解析URL
      const parsedUrl = url.parse(req.url);
      let pathname = parsedUrl.pathname;
      
      // 默认路径
      if (pathname === '/') {
        pathname = '/index.html';
      }
      
      // 构建文件路径 - 从 public 目录加载
      let filePath;
      if (pathname.startsWith('/favicon_io/')) {
        filePath = path.join(__dirname, '..', pathname.substring(1));
      } else {
        filePath = path.join(__dirname, '..', 'public', pathname.substring(1));
      }
      
      // 检查文件是否存在
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          // 文件不存在
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
          return;
        }
        
        // 读取文件
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal server error');
            return;
          }
          
          // 设置响应头
          const mimeType = getMimeType(filePath);
          res.writeHead(200, { 
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(data);
        });
      });
    });
    
    // 监听端口
    server.listen(51098, 'localhost', () => {
      log('本地服务器已启动: http://localhost:51098');
      resolve(server);
    });
    
    server.on('error', (err) => {
      console.error('服务器启动失败:', err);
      reject(err);
    });
  });
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'favicon_io', 'android-chrome-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  // 通过本地服务器加载应用
  mainWindow.loadURL('http://localhost:51098/');

  // 当窗口准备好时显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 开发模式下自动打开开发者工具
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      mainWindow.webContents.openDevTools();
    }
  });

  // 添加快捷键支持
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Cmd+Option+I (macOS) 或 Ctrl+Shift+I (Windows/Linux) 切换开发者工具
    if ((input.meta && input.alt && input.key === 'i') || 
        (input.control && input.shift && input.key === 'I')) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 设置应用名称
app.setName('vlmA 视觉分析监控系统');

// 启动后端服务器
function startBackendServer() {
  return new Promise((resolve, reject) => {
    // 处理打包后的路径
    let serverPath, serverDir;
    
    if (app.isPackaged) {
      // 生产环境：从 asar.unpacked 或 resources 目录加载
      const resourcesPath = process.resourcesPath;
      serverPath = path.join(resourcesPath, 'app.asar.unpacked', 'server', 'server.js');
      serverDir = path.join(resourcesPath, 'app.asar.unpacked', 'server');
      
      // 如果 asar.unpacked 不存在，尝试直接从 resources
      if (!require('fs').existsSync(serverPath)) {
        serverPath = path.join(resourcesPath, 'server', 'server.js');
        serverDir = path.join(resourcesPath, 'server');
      }
    } else {
      // 开发环境
      serverPath = path.join(__dirname, '..', 'server', 'server.js');
      serverDir = path.join(__dirname, '..', 'server');
    }
    
    log('应用已打包: ' + app.isPackaged);
    log('Resources 路径: ' + process.resourcesPath);
    log('启动后端服务器: ' + serverPath);
    log('工作目录: ' + serverDir);
    
    // 检查服务器文件是否存在
    if (!require('fs').existsSync(serverPath)) {
      const error = new Error(`服务器文件不存在: ${serverPath}`);
      console.error(error.message);
      reject(error);
      return;
    }
    
    let resolved = false;
    
    // 启动 Node.js 后端进程
    backendProcess = spawn(process.execPath, [serverPath], {
      cwd: serverDir,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log('[Backend] ' + output.trim());
      
      // 检测服务器是否已启动
      if (!resolved && (output.includes('Server running') || output.includes('running on') || output.includes('listening'))) {
        resolved = true;
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('[Backend Error]', error);
      
      // 如果是致命错误，拒绝 Promise
      if (!resolved && (error.includes('Error:') || error.includes('Cannot find module'))) {
        resolved = true;
        reject(new Error(error));
      }
    });
    
    backendProcess.on('error', (error) => {
      console.error('后端服务器启动失败:', error);
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    });
    
    backendProcess.on('close', (code) => {
      console.log(`后端服务器进程退出，代码: ${code}`);
      if (!resolved && code !== 0) {
        resolved = true;
        reject(new Error(`后端服务器异常退出，代码: ${code}`));
      }
    });
    
    // 等待 3 秒后如果还没有 resolve，就超时处理
    setTimeout(() => {
      if (!resolved) {
        console.log('等待超时，假定后端已启动');
        resolved = true;
        resolve();
      }
    }, 3000);
  });
}

// Electron初始化完成后启动服务器和创建窗口
app.whenReady().then(async () => {
  try {
    // 先启动后端服务器
    log('正在启动后端 API 服务器...');
    try {
      await startBackendServer();
      log('✅ 后端服务器已启动');
    } catch (backendError) {
      log('❌ 后端服务器启动失败: ' + backendError.message);
      log('⚠️  应用将继续运行，但后端功能可能不可用');
      // 不要退出应用，让用户看到错误
    }
    
    // 然后启动前端本地服务器
    log('正在启动前端本地服务器...');
    localServer = await createLocalServer();
    log('✅ 前端服务器已启动');
    
    // 最后创建窗口
    createWindow();
  } catch (error) {
    console.error('应用启动失败:', error);
    // 显示错误对话框
    const { dialog } = require('electron');
    dialog.showErrorBox('启动错误', `应用启动失败:\n${error.message}\n\n请查看日志了解详情。`);
    // 延迟退出，让用户看到错误
    setTimeout(() => app.quit(), 5000);
  }
});

// macOS上当所有窗口都被关闭时不退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 关闭后端服务器
    if (backendProcess) {
      backendProcess.kill();
    }
    // 关闭本地服务器
    if (localServer) {
      localServer.close();
    }
    app.quit();
  }
});

// 应用即将退出时关闭服务器
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (localServer) {
    localServer.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
