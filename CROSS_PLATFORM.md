# 跨平台部署快速参考

## 平台对比

| 项目 | macOS | Ubuntu/Linux |
|------|-------|-------------|
| **摄像头工具** | imagesnap | fswebcam |
| **安装命令** | `brew install imagesnap` | `sudo apt-get install fswebcam v4l-utils` |
| **设备格式** | 设备名称（如"USB3 Video"） | /dev/video0, /dev/video1 等 |
| **权限管理** | 系统隐私设置 | 用户组：video |
| **node-webcam后端** | ImageSnap | FSWebcam |

## 快速部署

### macOS
```bash
# 1. 安装依赖
brew install imagesnap

# 2. 安装项目
cd server
npm install

# 3. 启动
./start.sh
# 或
npm start
```

### Ubuntu
```bash
# 1. 一键部署（推荐）
cd server
sudo ./deploy-ubuntu.sh

# 2. 手动安装依赖
sudo apt-get update
sudo apt-get install -y nodejs npm fswebcam v4l-utils

# 3. 配置权限
sudo usermod -a -G video $USER
# 注销重新登录

# 4. 安装项目
cd server
npm install

# 5. 启动
./start.sh
# 或
npm start
```

## 测试摄像头

### macOS
```bash
# 列出设备
imagesnap -l

# 测试拍照
imagesnap test.jpg
```

### Ubuntu
```bash
# 列出设备
v4l2-ctl --list-devices

# 测试拍照
fswebcam -r 640x480 test.jpg
```

## 代码已自动适配

系统会自动检测操作系统并使用对应的摄像头工具，无需手动配置。

### 验证平台检测
```bash
npm run check-platform
```

输出示例：
```
Platform: darwin  # macOS
Platform: linux   # Ubuntu
Node: v18.x.x
```

## 常用命令

```bash
# 检查平台
npm run check-platform

# 获取摄像头检查命令
npm run check-camera

# 启动服务
npm start

# 查看日志（如果使用PM2）
pm2 logs vlm-monitor
```

## 端口和访问

- **默认端口**：3000
- **访问地址**：http://localhost:3000
- **WebSocket**：ws://localhost:3000

## 环境变量

```bash
# 更改端口
PORT=8080 npm start

# 更改模型URL
MODEL_URL=http://192.168.0.113:8000/v1/chat/completions npm start

# 更改模型名称
MODEL_NAME="RM-01 LLM" npm start
```

## 故障排查

### macOS问题
1. **imagesnap找不到**
   ```bash
   brew install imagesnap
   # 或使用完整路径
   /opt/homebrew/bin/imagesnap -l
   ```

2. **权限问题**
   - 系统偏好设置 → 安全性与隐私 → 隐私 → 摄像头
   - 允许Terminal/Node访问摄像头

### Ubuntu问题
1. **找不到摄像头**
   ```bash
   ls -l /dev/video*
   lsusb | grep -i camera
   sudo modprobe uvcvideo
   ```

2. **权限被拒绝**
   ```bash
   sudo usermod -a -G video $USER
   # 注销重新登录
   newgrp video
   ```

3. **fswebcam未安装**
   ```bash
   sudo apt-get install fswebcam v4l-utils
   ```

## 性能调优

两个平台都使用相同的优化配置：
- 分辨率：640x480
- 质量：70%
- 帧率：5 fps (200ms间隔)

如需调整，编辑 `server/server.js`：
```javascript
const webcamOpts = {
  width: 640,    // 可调整为 320, 480, 800 等
  height: 480,   // 可调整为 240, 360, 600 等
  quality: 70,   // 50-100
  // ...
};
```

然后在 `startCameraStream()` 函数中：
```javascript
setInterval(..., 200); // 改为 300 (3fps) 或 500 (2fps)
```

## 生产环境

### 使用PM2（推荐，两个平台通用）
```bash
# 安装
sudo npm install -g pm2

# 启动
pm2 start server.js --name vlm-monitor

# 开机自启
pm2 startup
pm2 save

# 管理
pm2 list
pm2 logs vlm-monitor
pm2 restart vlm-monitor
pm2 stop vlm-monitor
```

### 使用Docker（可选）
```bash
# 构建镜像
docker build -t vlm-monitor .

# 运行容器
docker run -d \
  --name vlm-monitor \
  --device=/dev/video0:/dev/video0 \
  -p 3000:3000 \
  vlm-monitor
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新安装依赖
npm install

# 重启服务
pm2 restart vlm-monitor
# 或
./start.sh
```

## 完整文档

- **Ubuntu详细部署**：查看 `UBUNTU_DEPLOYMENT.md`
- **性能优化说明**：查看 `PERFORMANCE_UPDATE.md`
- **新功能说明**：查看 `NEW_FEATURES.md`
