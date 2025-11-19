# Ubuntu部署指南

## 系统要求

- **操作系统**：Ubuntu 18.04+ / Debian 10+
- **Node.js**：14.x 或更高版本
- **摄像头**：支持V4L2的USB摄像头或内置摄像头
- **内存**：至少 1GB RAM
- **磁盘**：至少 500MB 可用空间

## 一键部署

### 快速开始

```bash
cd /path/to/vlmTest/server
sudo ./deploy-ubuntu.sh
```

部署脚本会自动：
- 安装 Node.js（如果未安装）
- 安装 fswebcam（Linux摄像头工具）
- 安装 v4l-utils（Video4Linux工具）
- 配置用户权限
- 安装项目依赖

### 手动部署

如果一键脚本失败，可以手动执行以下步骤：

#### 1. 安装Node.js

```bash
# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 2. 安装摄像头工具

```bash
# 安装fswebcam和v4l-utils
sudo apt-get update
sudo apt-get install -y fswebcam v4l-utils

# 验证安装
fswebcam --version
v4l2-ctl --version
```

#### 3. 检查摄像头设备

```bash
# 列出所有video设备
ls -l /dev/video*

# 查看设备详情
v4l2-ctl --list-devices

# 测试摄像头捕获
fswebcam -r 640x480 test.jpg
```

#### 4. 配置权限

```bash
# 将用户添加到video组
sudo usermod -a -G video $USER

# 注销并重新登录使权限生效
# 或使用：
newgrp video
```

#### 5. 安装项目依赖

```bash
cd /path/to/vlmTest/server
npm install
```

#### 6. 启动服务

```bash
# 开发模式
npm start

# 或直接运行
node server.js

# 后台运行（使用PM2）
npm install -g pm2
pm2 start server.js --name vlm-monitor
pm2 save
pm2 startup
```

## 平台差异说明

### macOS vs Ubuntu

| 功能 | macOS | Ubuntu |
|------|-------|--------|
| 摄像头工具 | imagesnap | fswebcam |
| 设备路径 | 设备名称 | /dev/video0, /dev/video1 等 |
| 安装方式 | brew install imagesnap | apt-get install fswebcam |
| 权限管理 | 系统隐私设置 | video 用户组 |
| node-webcam后端 | ImageSnap | FSWebcam |

### 代码已自动适配

系统会自动检测操作系统并选择合适的摄像头工具：

```javascript
const isMacOS = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

if (isMacOS) {
  // 使用 imagesnap
} else if (isLinux) {
  // 使用 fswebcam
}
```

## 设备识别

### Ubuntu设备格式

Ubuntu上的摄像头设备使用 `/dev/videoX` 格式：

```bash
# 查看所有摄像头
v4l2-ctl --list-devices

# 示例输出：
# UVC Camera (046d:0825) (usb-0000:00:14.0-1):
#     /dev/video0
#     /dev/video1
# 
# Integrated Camera: Integrated C (usb-0000:00:14.0-5):
#     /dev/video2
#     /dev/video3
```

系统会自动解析并在下拉框中显示：
- UVC Camera (video0)
- Integrated Camera (video2)

## 常见问题

### 1. 找不到摄像头设备

**问题**：`ls /dev/video*` 返回 "No such file or directory"

**解决方案**：
```bash
# 检查USB设备
lsusb | grep -i camera

# 检查内核模块
sudo modprobe uvcvideo

# 查看内核日志
dmesg | grep -i video
```

### 2. 权限被拒绝

**问题**：`Permission denied: '/dev/video0'`

**解决方案**：
```bash
# 添加用户到video组
sudo usermod -a -G video $USER

# 注销重新登录，或
newgrp video

# 临时解决（不推荐）
sudo chmod 666 /dev/video0
```

### 3. fswebcam命令不存在

**问题**：`fswebcam: command not found`

**解决方案**：
```bash
sudo apt-get update
sudo apt-get install -y fswebcam
```

### 4. 端口被占用

**问题**：`Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**：
```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>

# 或更改端口
PORT=8080 node server.js
```

### 5. node-webcam捕获失败

**问题**：摄像头无法捕获图像

**解决方案**：
```bash
# 测试fswebcam直接捕获
fswebcam -r 640x480 --no-banner test.jpg

# 如果成功，检查node-webcam配置
# 确保设备路径正确（/dev/video0）

# 检查设备支持的分辨率
v4l2-ctl -d /dev/video0 --list-formats-ext
```

## 性能优化

### Ubuntu特定优化

```bash
# 禁用不必要的服务
sudo systemctl disable bluetooth.service
sudo systemctl disable cups.service

# 调整摄像头缓冲区大小
v4l2-ctl -d /dev/video0 --set-fmt-video=width=640,height=480

# 使用硬件加速（如果支持）
sudo apt-get install -y libv4l-0 v4l-utils
```

### Node.js性能调优

```bash
# 增加Node.js内存限制
NODE_OPTIONS="--max-old-space-size=2048" node server.js

# 使用生产模式
NODE_ENV=production node server.js
```

## 生产环境部署

### 使用PM2管理进程

```bash
# 安装PM2
sudo npm install -g pm2

# 启动应用
pm2 start server.js --name vlm-monitor

# 查看状态
pm2 status

# 查看日志
pm2 logs vlm-monitor

# 设置开机自启
pm2 startup
pm2 save

# 重启应用
pm2 restart vlm-monitor

# 停止应用
pm2 stop vlm-monitor
```

### 使用Systemd服务

创建 `/etc/systemd/system/vlm-monitor.service`：

```ini
[Unit]
Description=VLM Video Monitor
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/vlmTest/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=vlm-monitor
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable vlm-monitor
sudo systemctl start vlm-monitor
sudo systemctl status vlm-monitor
```

### Nginx反向代理

安装Nginx：

```bash
sudo apt-get install -y nginx
```

创建 `/etc/nginx/sites-available/vlm-monitor`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/vlm-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 防火墙配置

```bash
# UFW防火墙
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 或iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## 监控和日志

### 查看系统日志

```bash
# 实时查看应用日志
journalctl -u vlm-monitor -f

# PM2日志
pm2 logs vlm-monitor --lines 100

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 监控资源使用

```bash
# 查看进程资源
top -p $(pgrep -f "node.*server.js")

# 或使用htop
sudo apt-get install htop
htop -p $(pgrep -f "node.*server.js")

# PM2监控
pm2 monit
```

## 安全建议

1. **使用HTTPS**：配置SSL证书（Let's Encrypt）
2. **防火墙**：只开放必要端口
3. **用户权限**：不要使用root运行Node.js
4. **环境变量**：敏感信息使用环境变量
5. **定期更新**：保持系统和依赖更新

## 测试部署

```bash
# 测试摄像头
fswebcam -r 640x480 test.jpg

# 测试服务器
curl http://localhost:3000

# 测试WebSocket（需要wscat）
npm install -g wscat
wscat -c ws://localhost:3000
```

## 卸载

```bash
# 停止服务
pm2 stop vlm-monitor
pm2 delete vlm-monitor

# 或systemd
sudo systemctl stop vlm-monitor
sudo systemctl disable vlm-monitor
sudo rm /etc/systemd/system/vlm-monitor.service

# 删除文件
cd /path/to/vlmTest
cd ..
rm -rf vlmTest

# 卸载全局包
sudo npm uninstall -g pm2
```

## 技术支持

如遇问题，请检查：
1. 日志文件
2. 摄像头权限
3. 端口占用
4. 防火墙设置
5. Node.js版本兼容性
