#!/bin/bash

# vlmA 跨平台构建脚本

echo "======================================"
echo "   vlmA 跨平台构建工具"
echo "======================================"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  未检测到依赖，正在安装..."
    npm install
    echo ""
fi

# 显示菜单
echo "请选择构建目标："
echo "  1) 所有平台 (Windows + macOS + Linux)"
echo "  2) Windows"
echo "  3) macOS"
echo "  4) Linux"
echo "  5) 当前平台"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔨 构建所有平台..."
        npm run build
        ;;
    2)
        echo ""
        echo "🪟 构建 Windows 版本..."
        npm run build:win
        ;;
    3)
        echo ""
        echo "🍎 构建 macOS 版本..."
        npm run build:mac
        ;;
    4)
        echo ""
        echo "🐧 构建 Linux 版本..."
        npm run build:linux
        ;;
    5)
        echo ""
        echo "💻 构建当前平台..."
        npm run build
        ;;
    *)
        echo ""
        echo "❌ 无效选项！"
        exit 1
        ;;
esac

echo ""
echo "✅ 构建完成！"
echo "📦 安装包位于 dist/ 目录"
echo ""
ls -lh dist/ 2>/dev/null || echo "⚠️  dist/ 目录为空或不存在"
