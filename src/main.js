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
      console.log('本地服务器已启动: http://localhost:51098');
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
    const serverPath = path.join(__dirname, '..', 'server', 'server.js');
    
    console.log('启动后端服务器:', serverPath);
    
    // 启动 Node.js 后端进程
    backendProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..', 'server'),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Backend]', output);
      
      // 检测服务器是否已启动
      if (output.includes('Server running') || output.includes('listening on')) {
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });
    
    backendProcess.on('error', (error) => {
      console.error('后端服务器启动失败:', error);
      reject(error);
    });
    
    backendProcess.on('close', (code) => {
      console.log(`后端服务器进程退出，代码: ${code}`);
    });
    
    // 等待 2 秒确保服务器启动
    setTimeout(resolve, 2000);
  });
}

// Electron初始化完成后启动服务器和创建窗口
app.whenReady().then(async () => {
  try {
    // 先启动后端服务器
    console.log('正在启动后端 API 服务器...');
    await startBackendServer();
    console.log('✅ 后端服务器已启动');
    
    // 然后启动前端本地服务器
    console.log('正在启动前端本地服务器...');
    localServer = await createLocalServer();
    console.log('✅ 前端服务器已启动');
    
    // 最后创建窗口
    createWindow();
  } catch (error) {
    console.error('应用启动失败:', error);
    app.quit();
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
