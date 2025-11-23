const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const { spawn, fork, execSync } = require('child_process');

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
    
    // 前端服务器端口
    const FRONTEND_PORT = 51098;
    
    // 监听端口前先检查并清理
    function ensurePortAvailable(port) {
      try {
        const lsofOutput = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`, { encoding: 'utf8' }).trim();
        if (lsofOutput) {
          const pids = lsofOutput.split('\n').filter(pid => pid);
          log(`[Frontend] 端口 ${port} 被占用，PID: ${pids.join(', ')}`);
          pids.forEach(pid => {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              log(`[Frontend] 已终止进程 ${pid}`);
            } catch (e) {
              // 忽略
            }
          });
          // 等待端口释放
          execSync('sleep 0.5', { stdio: 'ignore' });
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    ensurePortAvailable(FRONTEND_PORT);
    
    // 监听端口
    server.listen(FRONTEND_PORT, 'localhost', () => {
      log(`本地服务器已启动: http://localhost:${FRONTEND_PORT}`);
      resolve(server);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`[Frontend] 端口 ${FRONTEND_PORT} 仍被占用，尝试强制清理...`);
        ensurePortAvailable(FRONTEND_PORT);
        // 重试
        setTimeout(() => {
          server.listen(FRONTEND_PORT, 'localhost', () => {
            log(`本地服务器已启动: http://localhost:${FRONTEND_PORT}`);
            resolve(server);
          });
        }, 1000);
      } else {
        console.error('服务器启动失败:', err);
        reject(err);
      }
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
app.setName('RMinte 多模态分析引擎');

// 后端端口（可通过环境变量覆盖）
const BACKEND_PORT = process.env.PORT || 43003;

// 确保应用为单实例，防止重复启动导致资源竞用或无限递归
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log('另一个实例已存在，退出当前实例。');
  app.quit();
}
app.on('second-instance', () => {
  // 当尝试启动第二个实例时，聚焦到已有窗口
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 启动后端服务器
function startBackendServer() {
  return new Promise((resolve, reject) => {
    // 处理打包后的路径
    let serverPath, serverDir;
    
    if (app.isPackaged) {
      // 生产环境：从 resources 目录加载（使用 extraResources 配置）
      const resourcesPath = process.resourcesPath;
      serverPath = path.join(resourcesPath, 'server', 'server.js');
      serverDir = path.join(resourcesPath, 'server');
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

    // 检查目标端口是否已被其它进程占用（帮助定位 BACKEND_PORT 被 VSCode 等占用的情况）
    function getPortOwner(port) {
      try {
        const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -Pn 2>/dev/null`, { encoding: 'utf8' });
        if (out && out.trim()) return out.trim();
        return null;
      } catch (e) {
        return null;
      }
    }

    function killProcessOnPort(port) {
      try {
        // 获取占用端口的进程信息
        const lsofOutput = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`, { encoding: 'utf8' }).trim();
        if (lsofOutput) {
          const pids = lsofOutput.split('\n').filter(pid => pid);
          log(`[Backend] 发现端口 ${port} 被进程占用，PID: ${pids.join(', ')}`);
          
          // 尝试优雅终止进程
          pids.forEach(pid => {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              log(`[Backend] 已发送 SIGTERM 信号到进程 ${pid}`);
            } catch (e) {
              log(`[Backend] 无法终止进程 ${pid}: ${e.message}`);
            }
          });
          
          // 等待进程退出
          const maxWait = 3000; // 最多等待3秒
          const startTime = Date.now();
          while (Date.now() - startTime < maxWait) {
            if (!getPortOwner(port)) {
              log(`[Backend] 端口 ${port} 已释放`);
              return true;
            }
            // 短暂休眠
            execSync('sleep 0.1', { stdio: 'ignore' });
          }
          
          // 如果优雅终止失败，尝试强制终止
          pids.forEach(pid => {
            try {
              process.kill(parseInt(pid), 'SIGKILL');
              log(`[Backend] 已发送 SIGKILL 信号到进程 ${pid}`);
            } catch (e) {
              // 进程可能已经退出
            }
          });
          
          return !getPortOwner(port);
        }
        return true;
      } catch (e) {
        log(`[Backend] 清理端口时出错: ${e.message}`);
        return false;
      }
    }

    const portOwner = getPortOwner(BACKEND_PORT);
    if (portOwner) {
      log(`[Backend] 发现端口 ${BACKEND_PORT} 已被占用:`);
      log(portOwner);
      
      // 尝试清理端口
      log(`[Backend] 尝试清理端口 ${BACKEND_PORT}...`);
      if (killProcessOnPort(BACKEND_PORT)) {
        log(`[Backend] 端口 ${BACKEND_PORT} 已成功清理`);
      } else {
        // 如果清理失败，提示用户手动处理
        const err = new Error(`端口 ${BACKEND_PORT} 被其它进程占用且无法自动清理。请手动停止占用该端口的程序。`);
        reject(err);
        return;
      }
    }
    
    let resolved = false;
    
    // 使用 fork 来启动 Node.js 脚本
    // fork 会使用 Node.js 而不是 Electron 来执行脚本
    log('[Backend] 使用 fork 启动后端服务器');
    log('[Backend] 服务器路径: ' + serverPath);
    log('[Backend] 工作目录: ' + serverDir);
    
    try {
        backendProcess = fork(serverPath, [], {
          cwd: serverDir,
          env: { ...process.env, NODE_ENV: 'production', PORT: String(BACKEND_PORT) },
          silent: true  // 捕获 stdout/stderr
        });

        backendProcess.stdout.on('data', (data) => {
          const output = data.toString();
          log('[Backend] ' + output.trim());
          if (!resolved && (output.includes('Server running') || output.includes('running on') || output.includes('listening'))) {
            resolved = true;
            resolve();
          }
        });

        backendProcess.stderr.on('data', (data) => {
          const error = data.toString();
          log('[Backend Error] ' + error.trim());
          if (!resolved && (error.includes('Error:') || error.includes('Cannot find module'))) {
            resolved = true;
            reject(new Error(error));
          }
        });

        backendProcess.on('error', (error) => {
          log('后端服务器子进程启动失败: ' + (error && error.message ? error.message : error));
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        });

        backendProcess.on('close', (code) => {
          log('后端服务器子进程退出，代码: ' + code);
          if (!resolved && code !== 0) {
            resolved = true;
            reject(new Error(`后端服务器异常退出，代码: ${code}`));
          }
        });
        
        // 如果5秒后还没有resolved，也算成功（后端可能正常启动但没有输出预期的日志）
        setTimeout(() => {
          if (!resolved) {
            log('[Backend] 超时检测: 假设后端已启动');
            resolved = true;
            resolve();
          }
        }, 5000);
        
      } catch (err) {
        log('后端启动最终失败: ' + (err && err.message ? err.message : err));
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      }
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
