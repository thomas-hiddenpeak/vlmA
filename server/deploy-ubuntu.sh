#!/bin/bash
# Ubuntu部署脚本

echo "===== 视觉分析监控系统 - Ubuntu部署 ====="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

echo "1. 更新系统包..."
apt-get update

echo ""
echo "2. 安装必要的系统依赖..."

# 安装Node.js（如果未安装）
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js 已安装: $(node --version)"
fi

# 安装摄像头相关工具
echo "安装摄像头工具..."
apt-get install -y fswebcam v4l-utils

# 验证安装
echo ""
echo "3. 验证安装..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "fswebcam: $(fswebcam --version 2>&1 | head -1)"
echo "v4l2-ctl: $(v4l2-ctl --version 2>&1 | head -1)"

# 列出可用的摄像头设备
echo ""
echo "4. 检测摄像头设备..."
if [ -e /dev/video0 ]; then
    echo "✓ 检测到摄像头设备"
    ls -l /dev/video* 2>/dev/null
    echo ""
    echo "设备详情："
    v4l2-ctl --list-devices
else
    echo "⚠ 未检测到摄像头设备 (/dev/video0)"
    echo "请确保摄像头已连接"
fi

echo ""
echo "5. 设置权限..."
# 将当前用户添加到video组
if [ -n "$SUDO_USER" ]; then
    usermod -a -G video $SUDO_USER
    echo "✓ 用户 $SUDO_USER 已添加到 video 组"
    echo "请注销并重新登录以使权限生效"
fi

echo ""
echo "6. 安装Node.js依赖..."
cd "$(dirname "$0")"
npm install

echo ""
echo "===== 部署完成 ====="
echo ""
echo "使用说明："
echo "1. 请注销并重新登录（如果是首次安装）"
echo "2. 运行: npm start"
echo "3. 浏览器访问: http://localhost:3000"
echo ""
echo "测试摄像头："
echo "  fswebcam -r 640x480 test.jpg"
echo ""
