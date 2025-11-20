#!/bin/bash

# GitHub Actions 本地测试脚本

echo "======================================"
echo "   GitHub Actions 配置验证"
echo "======================================"
echo ""

WORKFLOW_FILE=".github/workflows/build.yml"

# 检查工作流文件是否存在
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ 错误: 找不到 $WORKFLOW_FILE"
    exit 1
fi

echo "✅ 工作流文件存在: $WORKFLOW_FILE"
echo ""

# 验证 YAML 语法（如果安装了 yamllint）
if command -v yamllint &> /dev/null; then
    echo "🔍 验证 YAML 语法..."
    yamllint "$WORKFLOW_FILE" && echo "  ✅ YAML 语法正确" || echo "  ⚠️  YAML 语法可能有问题"
    echo ""
else
    echo "💡 提示: 安装 yamllint 可以验证 YAML 语法"
    echo "   brew install yamllint"
    echo ""
fi

# 检查关键配置
echo "📋 检查关键配置..."
echo ""

# 检查触发条件
echo "  🏷️  触发条件:"
grep -A 2 "^on:" "$WORKFLOW_FILE" | grep -v "^--"
echo ""

# 检查构建矩阵
echo "  🖥️  构建平台:"
grep -A 1 "matrix:" "$WORKFLOW_FILE" | grep "os:"
echo ""

# 检查 Node.js 版本
echo "  📦 Node.js 版本:"
grep "node-version:" "$WORKFLOW_FILE"
echo ""

# 检查构建命令
echo "  🔨 构建命令:"
grep "run: npm run" "$WORKFLOW_FILE" | head -1
echo ""

# 验证必需文件
echo "📂 验证项目文件..."
echo ""

files=(
    "package.json"
    "src/main.js"
    "src/preload.js"
    "public/index.html"
    "favicon_io/android-chrome-512x512.png"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
    fi
done

echo ""

# 检查 package.json 配置
echo "🔍 检查 package.json 配置..."
echo ""

if [ -f "package.json" ]; then
    # 检查必需的脚本
    if grep -q '"build"' package.json; then
        echo "  ✅ 构建脚本已配置"
    else
        echo "  ❌ 缺少构建脚本"
    fi
    
    # 检查版本号
    version=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    echo "  📌 当前版本: $version"
    
    # 检查 electron-builder 依赖
    if grep -q 'electron-builder' package.json; then
        echo "  ✅ electron-builder 已配置"
    else
        echo "  ⚠️  未找到 electron-builder"
    fi
fi

echo ""

# 模拟标签推送
echo "🧪 模拟测试..."
echo ""
echo "  如果现在创建标签 v$version 并推送："
echo "  $ git tag v$version"
echo "  $ git push origin v$version"
echo ""
echo "  将触发以下构建任务："
echo "  - Windows (windows-latest)"
echo "  - macOS (macos-latest)"
echo "  - Linux (ubuntu-latest)"
echo ""

# 提示后续操作
echo "======================================"
echo "📚 下一步操作："
echo "======================================"
echo ""
echo "1. 本地测试构建:"
echo "   $ npm run build"
echo ""
echo "2. 测试 Electron 应用:"
echo "   $ npm start"
echo ""
echo "3. 提交并推送代码:"
echo "   $ git add ."
echo "   $ git commit -m 'chore: prepare release'"
echo "   $ git push origin main"
echo ""
echo "4. 创建版本标签:"
echo "   $ git tag v$version"
echo "   $ git push origin v$version"
echo ""
echo "5. 查看构建状态:"
echo "   https://github.com/thomas-hiddenpeak/vlmA/actions"
echo ""
