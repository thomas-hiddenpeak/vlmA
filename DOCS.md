# vlmA 项目完整文档索引

## 📚 文档列表

### 主要文档

1. **[README.md](README.md)** - 项目主页
   - 功能特性介绍
   - 快速开始指南
   - 使用说明和常见问题

2. **[BUILDING.md](BUILDING.md)** - 构建打包指南
   - 项目结构说明
   - 开发模式配置
   - 本地构建流程
   - 平台特定说明

3. **[RELEASE.md](RELEASE.md)** - 版本发布指南
   - 版本发布流程
   - GitHub Actions 自动构建
   - 版本号规范
   - 问题排查

## 🚀 快速开始

### 方式一：浏览器访问（开发模式）

```bash
cd server
npm install
npm start
```

然后在浏览器访问 `http://localhost:3000`

### 方式二：Electron 桌面应用

```bash
# 使用快速启动脚本
./start-app.sh

# 或手动启动
npm install
npm start
```

## 🔧 开发工具

### 启动脚本

- **start-app.sh** - 快速启动 Electron 应用
- **build.sh** - 交互式构建脚本
- **test-workflow.sh** - GitHub Actions 配置验证

### 使用示例

```bash
# 启动应用
./start-app.sh

# 构建应用（交互式选择平台）
./build.sh

# 验证 GitHub Actions 配置
./test-workflow.sh
```

## 📦 构建命令

```bash
# 安装依赖
npm install

# 启动应用
npm start

# 构建所有平台
npm run build

# 构建特定平台
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

## 🏗️ 项目结构

```
vlmA/
├── .github/
│   └── workflows/
│       └── build.yml          # GitHub Actions 配置
├── src/
│   ├── main.js                # Electron 主进程
│   └── preload.js             # Electron 预加载
├── server/
│   ├── server.js              # Node.js 后端
│   └── package.json           # 后端依赖
├── public/
│   ├── index.html             # 前端页面
│   └── app.js                 # 前端脚本
├── favicon_io/                # 应用图标
├── package.json               # 项目配置
├── README.md                  # 项目说明
├── BUILDING.md                # 构建指南
├── RELEASE.md                 # 发布指南
├── start-app.sh               # 启动脚本
├── build.sh                   # 构建脚本
└── test-workflow.sh           # 测试脚本
```

## 🎯 核心功能

### 视频采集
- 浏览器原生摄像头访问
- 实时预览和帧捕获
- 设备枚举和切换

### AI 分析
- 流式分析输出（SSE）
- 多种分析模式
- 时序帧分析

### 洞察分析
- 60秒快速洞察
- 15分钟趋势分析
- 1小时模式识别
- 每日综合报告

### 桌面应用
- 跨平台支持（Windows、macOS、Linux）
- 自动打包和发布
- 原生应用体验

## 🔐 GitHub Actions

### 自动构建触发

推送版本标签时自动构建：

```bash
git tag v0.1.0
git push origin v0.1.0
```

### 手动触发

在 GitHub Actions 页面手动运行 workflow

### 构建产物

- **Windows**: .exe 安装程序 + 便携版
- **macOS**: .dmg 镜像（Intel + ARM）
- **Linux**: .AppImage + .deb 包

## 📝 版本管理

采用语义化版本：

- `v0.1.0` - 初始版本
- `v0.2.0` - 新增功能
- `v0.2.1` - Bug 修复
- `v1.0.0` - 重大更新

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/thomas-hiddenpeak/vlmA
- **GitHub Actions**: https://github.com/thomas-hiddenpeak/vlmA/actions
- **参考项目**: https://github.com/thomas-hiddenpeak/robOSwebflash

## 🛠️ 技术栈

### 前端
- HTML5 + CSS3 + JavaScript
- getUserMedia API
- Canvas API
- EventSource (SSE)

### 后端
- Node.js + Express
- WebSocket
- Multer (文件上传)

### 桌面应用
- Electron 26.0.0
- electron-builder 24.6.3

### CI/CD
- GitHub Actions
- 跨平台自动构建
- 自动发布到 GitHub Releases

## 📄 许可证

MIT License

---

**维护者**: thomas-hiddenpeak  
**邮箱**: thomas@hiddenpeak.com  
**最后更新**: 2024-11-20
