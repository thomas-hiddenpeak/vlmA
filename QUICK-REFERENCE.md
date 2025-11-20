# 🚀 vlmA 快速参考卡片

## 📦 已安装的组件

```
✅ Electron 26.0.0
✅ electron-builder 24.6.3
✅ GitHub Actions workflow
✅ 应用图标（favicon_io/）
✅ 构建脚本和文档
```

## ⚡ 一键命令

```bash
# 启动应用
./start-app.sh

# 启动应用（调试模式，自动打开开发者工具）
./start-app.sh debug

# 构建应用
./build.sh

# 验证配置
./test-workflow.sh

# 提交并发布
./commit-and-release.sh
```

## 🔍 调试技巧

```bash
# 方式 1: 启动时自动打开调试工具
./start-app.sh debug

# 方式 2: 运行时快捷键切换
# macOS: Cmd + Option + I
# Windows/Linux: Ctrl + Shift + I
```

## 📝 手动操作

### 开发测试

```bash
# 安装依赖
npm install

# 启动 Electron 应用
npm start

# 构建所有平台
npm run build

# 构建特定平台
npm run build:win     # Windows
npm run build:mac     # macOS  
npm run build:linux   # Linux
```

### Git 操作

```bash
# 提交更改
git add .
git commit -m "feat: add Electron packaging"
git push origin main

# 创建版本标签（触发自动构建）
git tag v0.1.0
git push origin v0.1.0
```

## 📚 文档索引

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目介绍和使用说明 |
| [BUILDING.md](BUILDING.md) | 构建和打包指南 |
| [RELEASE.md](RELEASE.md) | 版本发布流程 |
| [DOCS.md](DOCS.md) | 完整文档索引 |
| [CHECKLIST.md](CHECKLIST.md) | 配置完成清单 |

## 🔧 脚本工具

| 脚本 | 功能 |
|------|------|
| `start-app.sh` | 快速启动 Electron 应用 |
| `build.sh` | 交互式构建工具 |
| `test-workflow.sh` | 验证 GitHub Actions 配置 |
| `commit-and-release.sh` | 一键提交和发布 |

## 🎯 构建产物

### Windows
- `vlmA-Vision-Monitor-Setup-{version}.exe` - 安装程序
- `vlmA-Vision-Monitor-{version}.exe` - 便携版

### macOS  
- `vlmA-Vision-Monitor-{version}-arm64.dmg` - Apple Silicon
- `vlmA-Vision-Monitor-{version}-x64.dmg` - Intel

### Linux
- `vlmA-Vision-Monitor-{version}.AppImage` - 通用格式
- `vlmA-Vision-Monitor_{version}_amd64.deb` - Debian/Ubuntu

## 🔗 重要链接

```
GitHub 仓库:
https://github.com/thomas-hiddenpeak/vlmA

GitHub Actions:
https://github.com/thomas-hiddenpeak/vlmA/actions

参考项目:
https://github.com/thomas-hiddenpeak/robOSwebflash
```

## 💡 小贴士

1. **首次构建**: 运行 `npm install` 安装依赖
2. **本地测试**: 使用 `./start-app.sh` 启动应用
3. **配置验证**: 使用 `./test-workflow.sh` 检查配置
4. **快速发布**: 使用 `./commit-and-release.sh` 一键完成
5. **查看日志**: 构建失败时查看 GitHub Actions 日志

## ⚠️ 注意事项

- 标签必须以 `v` 开头（如 `v0.1.0`）
- macOS 应用未签名，需要在安全设置中允许运行
- Linux AppImage 需要添加执行权限（`chmod +x`）
- Windows 可能需要管理员权限安装

## 🎉 下一步

1. [ ] 测试 Electron 应用: `./start-app.sh`
2. [ ] 本地构建验证: `./build.sh`
3. [ ] 提交到 GitHub: `./commit-and-release.sh`
4. [ ] 监控构建状态: 查看 Actions 页面
5. [ ] 下载测试安装包: 从 Releases 下载

---

**版本**: 0.1.0  
**最后更新**: 2024-11-20  
**配置来源**: robOSwebflash
