# vlmA 项目结构说明

## 目录结构

```
vlmA/
├── .github/
│   └── workflows/
│       └── build.yml          # GitHub Actions 自动构建配置
├── src/
│   ├── main.js                # Electron 主进程
│   └── preload.js             # Electron 预加载脚本
├── server/
│   ├── server.js              # Node.js 后端服务
│   └── package.json           # 服务端依赖配置
├── public/
│   ├── index.html             # 前端页面
│   └── app.js                 # 前端 JavaScript
├── favicon_io/                # 应用图标（多尺寸）
├── package.json               # Electron 项目配置
├── .gitignore                 # Git 忽略文件
└── README.md                  # 项目说明文档
```

## 开发模式

### 1. 启动后端服务（开发）

```bash
cd server
npm install
npm start
```

后端服务运行在 `http://localhost:43003`

### 2. 在浏览器中测试

直接访问：`http://localhost:43003`

### 3. 启动 Electron 桌面应用

在项目根目录：

```bash
npm install
npm start
```

Electron 应用会自动启动本地服务器（端口 51098）并加载前端页面。

## 构建打包

### 本地构建

```bash
# 构建当前平台
npm run build

# 构建特定平台
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

### 自动构建（GitHub Actions）

1. 提交代码到 GitHub
2. 创建版本标签：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions 会自动：
   - 在 Windows、macOS、Linux 三个平台上构建
   - 创建 GitHub Release
   - 上传所有平台的安装包

## 图标文件说明

`favicon_io/` 目录包含多种尺寸的应用图标：

- `favicon.ico` - Windows 图标
- `android-chrome-*.png` - 各种尺寸的 PNG 图标
- `apple-touch-icon.png` - macOS/iOS 图标
- `app.icns` - macOS 原生图标格式
- `site.webmanifest` - Web 应用清单

这些图标文件与参考项目 robOSwebflash 使用相同的文件。

## 平台特定说明

### Windows
- 生成 NSIS 安装程序（`.exe`）
- 生成便携版（portable）
- 支持自定义安装目录
- 创建桌面和开始菜单快捷方式

### macOS
- 生成 DMG 镜像文件
- 支持 Intel（x64）和 Apple Silicon（arm64）
- 未签名（适合内部使用）

### Linux
- 生成 AppImage（通用格式）
- 生成 DEB 包（Debian/Ubuntu）
- 分类为开发工具类

## 关键配置

### package.json - electron-builder 配置

- `appId`: 应用唯一标识符
- `productName`: 应用显示名称
- `files`: 打包包含的文件
- `mac`/`win`/`linux`: 平台特定配置

### src/main.js - Electron 主进程

- 创建本地 HTTP 服务器（端口 51098）
- 加载前端应用
- 管理应用窗口生命周期

## 参考项目

本项目的 GitHub Actions 和打包配置参考了：
[robOSwebflash](https://github.com/thomas-hiddenpeak/robOSwebflash)

## 注意事项

1. **图标要求**：确保图标文件存在且格式正确
2. **依赖安装**：根目录和 server 目录都需要安装依赖
3. **端口配置**：
   - 开发模式服务器：43003
   - Electron 内置服务器：51098
4. **安全性**：生产环境建议使用 HTTPS
