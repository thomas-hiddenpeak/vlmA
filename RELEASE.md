# vlmA 发布指南

## 版本发布流程

### 1. 更新版本号

编辑 `package.json` 文件，更新 `version` 字段：

```json
{
  "version": "0.2.0"  // 从 0.1.0 改为 0.2.0
}
```

### 2. 提交更改

```bash
git add .
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### 3. 创建版本标签

```bash
# 创建标签（必须以 v 开头）
git tag v0.2.0

# 推送标签到远程仓库
git push origin v0.2.0
```

### 4. 自动构建

推送标签后，GitHub Actions 会自动：

1. ✅ 检出代码
2. ✅ 在三个平台上构建：
   - Windows (windows-latest)
   - macOS (macos-latest)
   - Linux (ubuntu-latest)
3. ✅ 创建 GitHub Release
4. ✅ 上传构建产物

### 5. 检查构建状态

访问 GitHub 仓库的 Actions 页面查看构建进度：

```
https://github.com/thomas-hiddenpeak/vlmA/actions
```

### 6. 发布 Release

构建完成后：

1. 访问 Releases 页面
2. 找到新创建的 Release
3. 编辑 Release Notes（可选）
4. 点击 "Publish release"

## 产物说明

### Windows

- `vlmA-Vision-Monitor-Setup-{version}.exe` - NSIS 安装程序
- `vlmA-Vision-Monitor-{version}.exe` - 便携版

### macOS

- `vlmA-Vision-Monitor-{version}-arm64.dmg` - Apple Silicon 版本
- `vlmA-Vision-Monitor-{version}-x64.dmg` - Intel 版本

### Linux

- `vlmA-Vision-Monitor-{version}.AppImage` - 通用格式
- `vlmA-Vision-Monitor_{version}_amd64.deb` - Debian/Ubuntu 包

## 版本号规范

采用语义化版本（Semantic Versioning）：

- **主版本号 (Major)**: 不兼容的 API 修改
- **次版本号 (Minor)**: 向下兼容的功能性新增
- **修订号 (Patch)**: 向下兼容的问题修正

示例：
- `0.1.0` → `0.2.0` - 新增功能
- `0.2.0` → `0.2.1` - Bug 修复
- `0.2.1` → `1.0.0` - 重大更新

## 手动构建（本地测试）

在推送标签之前，可以先本地构建测试：

```bash
# 安装依赖
npm install

# 构建当前平台
npm run build

# 或使用交互式脚本
./build.sh
```

构建产物位于 `dist/` 目录。

## 常见问题

### Q: GitHub Actions 构建失败？

**A**: 检查以下几点：

1. 确保 `package.json` 中的版本号已更新
2. 确保标签格式正确（必须是 `v*.*.*`）
3. 检查 `.github/workflows/build.yml` 配置
4. 查看 Actions 日志定位具体错误

### Q: 构建的应用无法运行？

**A**: 可能的原因：

1. **Windows**: 未安装 .NET Framework
2. **macOS**: 未允许运行未签名应用（系统偏好设置 → 安全性与隐私）
3. **Linux**: 未给 AppImage 添加执行权限 (`chmod +x`)

### Q: 如何测试发布流程？

**A**: 使用 workflow_dispatch 手动触发：

1. 访问 Actions 页面
2. 选择 "Build and Release Electron App" workflow
3. 点击 "Run workflow"
4. 选择分支并运行

这不会创建 Release，只会上传 artifacts。

### Q: 如何删除错误的 Release？

**A**: 在 GitHub Release 页面删除对应的 release，然后删除标签：

```bash
# 删除本地标签
git tag -d v0.1.0

# 删除远程标签
git push origin --delete v0.1.0
```

## 发布检查清单

在发布前确认：

- [ ] 代码已充分测试
- [ ] 所有依赖版本正确
- [ ] README 和文档已更新
- [ ] 版本号已更新
- [ ] CHANGELOG 已记录变更
- [ ] 本地构建测试通过
- [ ] 提交信息清晰

## 快速发布命令

```bash
# 一键发布脚本
VERSION="0.2.0"

# 更新版本并提交
git add .
git commit -m "chore: release v${VERSION}"
git push origin main

# 创建并推送标签
git tag v${VERSION}
git push origin v${VERSION}

echo "✅ 版本 v${VERSION} 已发布！"
echo "🔗 查看构建状态: https://github.com/thomas-hiddenpeak/vlmA/actions"
```

## 回滚发布

如果发布有问题需要回滚：

```bash
# 1. 删除 GitHub Release（在网页操作）

# 2. 删除标签
git tag -d v0.2.0
git push origin --delete v0.2.0

# 3. 回退提交（如果需要）
git revert HEAD
git push origin main
```
