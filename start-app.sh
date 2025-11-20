#!/bin/bash

# vlmA 快速启动脚本

echo "======================================"
echo "   vlmA 视觉分析监控系统"
echo "======================================"
echo ""

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  未检测到依赖，正在安装..."
    npm install
    echo ""
fi

# 检查是否传入 debug 参数
if [ "$1" = "debug" ] || [ "$1" = "-d" ]; then
    echo "🔍 启动 Electron 桌面应用（调试模式）..."
    echo "💡 开发者工具将自动打开"
    DEBUG=true npm start
else
    echo "🚀 启动 Electron 桌面应用..."
    echo "💡 提示: 使用 Cmd+Option+I (Mac) 或 Ctrl+Shift+I (Win/Linux) 打开开发者工具"
    echo "💡 提示: 使用 ./start-app.sh debug 以调试模式启动"
    npm start 2>&1 | grep -v "ERROR:shared_image_manager\|ERROR:skia_output_device" || true
fi
