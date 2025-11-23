#!/bin/bash

# RMinte 多模态分析引擎 - 生产环境部署脚本
# 使用 PM2 进行进程管理

set -e

echo "======================================"
echo "RMinte 多模态分析引擎 部署脚本"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示: 部分操作可能需要 sudo 权限${NC}"
fi

# 1. 检查 Node.js
echo ""
echo "步骤 1/7: 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js 18+ 或 20 LTS${NC}"
    echo "安装命令:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 2. 安装 PM2
echo ""
echo "步骤 2/7: 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
else
    PM2_VERSION=$(pm2 -v)
    echo -e "${GREEN}✓ PM2 已安装，版本: $PM2_VERSION${NC}"
fi

# 3. 安装项目依赖
echo ""
echo "步骤 3/7: 安装项目依赖..."
cd server
if [ -f "package-lock.json" ]; then
    npm ci --only=production
else
    npm install --only=production
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"
cd ..

# 4. 停止旧的 PM2 进程（如果存在）
echo ""
echo "步骤 4/7: 停止旧进程..."
pm2 stop rminte 2>/dev/null || echo "未找到旧进程"
pm2 delete rminte 2>/dev/null || echo "清理完成"

# 5. 启动应用
echo ""
echo "步骤 5/7: 启动应用..."
cd server
pm2 start server.js \
    --name rminte \
    --time \
    --log-date-format "YYYY-MM-DD HH:mm:ss" \
    --max-memory-restart 500M \
    --restart-delay 3000 \
    --env production

cd ..
echo -e "${GREEN}✓ 应用已启动${NC}"

# 6. 设置开机自启动
echo ""
echo "步骤 6/7: 配置开机自启动..."
pm2 startup systemd -u $USER --hp $HOME 2>&1 | grep "sudo" | bash || true
pm2 save
echo -e "${GREEN}✓ 开机自启动已配置${NC}"

# 7. 显示状态
echo ""
echo "步骤 7/7: 检查应用状态..."
sleep 2
pm2 status
echo ""
pm2 logs rminte --lines 20 --nostream

# 8. 配置防火墙（可选）
echo ""
echo "======================================"
echo "部署完成!"
echo "======================================"
echo ""
echo -e "${GREEN}应用信息:${NC}"
echo "  应用名称: rminte"
echo "  运行端口: 43003 (默认)"
echo "  访问地址: http://$(hostname -I | awk '{print $1}'):43003"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看状态:   pm2 status"
echo "  查看日志:   pm2 logs rminte"
echo "  重启应用:   pm2 restart rminte"
echo "  停止应用:   pm2 stop rminte"
echo "  删除应用:   pm2 delete rminte"
echo "  监控面板:   pm2 monit"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 配置防火墙开放 43003 端口"
echo "     sudo ufw allow 43003/tcp"
echo ""
echo "  2. 配置安全组（云服务器）"
echo "     在云控制台开放 43003 端口"
echo ""
echo "  3. 配置 HTTPS（推荐）"
echo "     需要摄像头功能必须使用 HTTPS"
echo "     参考: ./nginx-https.conf.example"
echo ""
