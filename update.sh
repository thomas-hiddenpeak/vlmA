#!/bin/bash

# RMinte 多模态分析引擎 - 自动更新脚本
# 用于从 GitHub 拉取最新代码并重启服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================"
echo "RMinte 自动更新脚本"
echo "======================================${NC}"

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. 备份当前版本信息
echo ""
echo -e "${YELLOW}步骤 1/6: 记录当前版本...${NC}"
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "当前版本: $CURRENT_COMMIT"

# 2. 从 GitHub 拉取最新代码
echo ""
echo -e "${YELLOW}步骤 2/6: 拉取最新代码...${NC}"
git fetch origin main
LATEST_COMMIT=$(git rev-parse --short origin/main)

if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
    echo -e "${GREEN}✓ 已是最新版本，无需更新${NC}"
    exit 0
fi

echo "最新版本: $LATEST_COMMIT"
echo "正在更新..."
git pull origin main

# 3. 检查是否有依赖更新
echo ""
echo -e "${YELLOW}步骤 3/6: 检查依赖更新...${NC}"
cd server
if git diff --name-only $CURRENT_COMMIT..HEAD | grep -q "package.json"; then
    echo "检测到 package.json 变化，更新依赖..."
    npm ci --only=production
    echo -e "${GREEN}✓ 依赖已更新${NC}"
else
    echo -e "${GREEN}✓ 依赖无变化${NC}"
fi
cd ..

# 4. 重启 PM2 服务
echo ""
echo -e "${YELLOW}步骤 4/6: 重启服务...${NC}"
pm2 reload rminte --update-env
echo -e "${GREEN}✓ 服务已重启${NC}"

# 5. 检查服务状态
echo ""
echo -e "${YELLOW}步骤 5/6: 检查服务状态...${NC}"
sleep 2
pm2 status rminte

# 6. 显示最新日志
echo ""
echo -e "${YELLOW}步骤 6/6: 显示最新日志...${NC}"
pm2 logs rminte --lines 15 --nostream

# 完成
echo ""
echo -e "${GREEN}======================================"
echo "更新完成!"
echo "======================================${NC}"
echo ""
echo "版本信息:"
echo "  旧版本: $CURRENT_COMMIT"
echo "  新版本: $LATEST_COMMIT"
echo ""
echo "变更内容:"
git log --oneline $CURRENT_COMMIT..HEAD
echo ""
