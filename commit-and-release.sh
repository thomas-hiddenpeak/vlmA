#!/bin/bash

# RMinte 多模态分析引擎 快速提交和发布脚本

echo "======================================"
echo "   RMinte 多模态分析引擎 快速提交和发布"
echo "====================================="
echo ""

# 显示当前状态
echo "📊 当前 Git 状态："
echo ""
git status --short
echo ""

# 确认是否继续
read -p "是否提交这些更改？(y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "📝 添加所有文件到暂存区..."
git add .

echo ""
echo "✅ 提交更改..."
git commit -m "feat: add Electron packaging and GitHub Actions

- Configure electron-builder for cross-platform builds
- Add GitHub Actions workflow for automated builds
- Copy icons from robOSwebflash reference project
- Add build scripts and comprehensive documentation
- Support Windows (NSIS + Portable), macOS (DMG), Linux (AppImage + DEB)
- Add quick start scripts (start-app.sh, build.sh, test-workflow.sh)
- Update README with desktop app usage instructions

Reference project: https://github.com/thomas-hiddenpeak/robOSwebflash"

echo ""
echo "🚀 推送到 GitHub..."
git push origin main

echo ""
echo "======================================"
echo "   提交完成！"
echo "======================================"
echo ""

# 询问是否创建标签
read -p "是否创建版本标签 v0.1.0 并触发自动构建？(y/n): " create_tag
if [ "$create_tag" = "y" ]; then
    echo ""
    echo "🏷️  创建标签 v0.1.0..."
    git tag v0.1.0
    
    echo ""
    echo "🚀 推送标签..."
    git push origin v0.1.0
    
    echo ""
    echo "======================================"
    echo "   🎉 版本发布完成！"
    echo "======================================"
    echo ""
    echo "GitHub Actions 将自动构建以下平台："
    echo "  - Windows (exe 安装程序 + 便携版)"
    echo "  - macOS (dmg 镜像, Intel + ARM)"
    echo "  - Linux (AppImage + deb 包)"
    echo ""
    echo "🔗 查看构建状态："
    echo "   https://github.com/thomas-hiddenpeak/vlmA/actions"
    echo ""
    echo "🔗 查看 Release："
    echo "   https://github.com/thomas-hiddenpeak/vlmA/releases"
    echo ""
else
    echo ""
    echo "💡 提示：稍后可以手动创建标签："
    echo "   $ git tag v0.1.0"
    echo "   $ git push origin v0.1.0"
    echo ""
fi

echo "✨ 完成！"
