# RMinte 多模态分析引擎 v{VERSION}

## 📦 安装包下载

根据您的操作系统和芯片架构选择对应的安装包：

### macOS 🍎

- **Apple Silicon (M1/M2/M3/M4)**: `RMinte 多模态分析引擎-{VERSION}-arm64.dmg`
- **Intel Mac**: `RMinte 多模态分析引擎-{VERSION}.dmg`

### Windows 🪟

- **安装程序**: `RMinte 多模态分析引擎 Setup {VERSION}.exe`
- **便携版**: `RMinte 多模态分析引擎-{VERSION}-win.zip`

### Linux 🐧

- **AppImage**: `RMinte 多模态分析引擎-{VERSION}.AppImage`
- **Deb 包**: `rminte-multimodal-engine_{VERSION}_amd64.deb`

---

## ⚠️ macOS 用户必读

macOS 用户首次运行时会遇到**"应用已损坏"**或**"无法打开"**的提示，这是正常的！

### 快速解决方法：

1. **下载并安装应用**到 Applications 文件夹
2. **打开终端**，运行以下命令：
   ```bash
   sudo xattr -rd com.apple.quarantine "/Applications/RMinte 多模态分析引擎.app"
   ```
3. 输入管理员密码，完成！

📖 **详细说明**: [macOS 安装使用指南](https://github.com/thomas-hiddenpeak/vlmA/blob/main/MACOS_INSTALL.md)

### 其他注意事项：

- ✅ **授予摄像头权限**：首次运行时点击"允许"
- ✅ **安装 Node.js**：后端服务器需要（`brew install node`）
- ✅ **选择正确版本**：M 系列芯片选 arm64，Intel 芯片选标准版

---

## 🆕 本版本更新内容

{CHANGELOG}

---

## 🚀 快速开始

### 1. 安装应用

- macOS: 拖拽到 Applications 文件夹，并执行上述命令
- Windows: 运行安装程序
- Linux: 添加执行权限后运行 AppImage

### 2. 配置 AI 模型

应用支持本地模型和云服务：

**本地 vLLM 模型：**
```
API 地址: http://localhost:8000/v1/chat/completions
API Key: 留空
```

**阿里云 DashScope：**
```
API 地址: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
视觉模型: qwen-vl-plus
文本模型: qwen-plus
API Key: 你的 API Key
```

**OpenAI：**
```
API 地址: https://api.openai.com/v1/chat/completions
模型: gpt-4o
API Key: 你的 API Key
```

### 3. 开始分析

1. 选择摄像头设备
2. 配置分析间隔和采集帧数
3. 点击"开始分析"
4. 查看实时分析结果和多层级洞察

---

## 📋 主要特性

- 🎥 **本地摄像头采集**：支持 UVC 设备，实时视频分析
- 🤖 **流式 AI 分析**：SSE 实时输出，支持 OpenAI 兼容 API
- 📊 **多层级洞察**：60秒/15分钟/1小时/每日递进式分析
- ✅ **智能任务管理**：自动从分析结果中提取待办事项
- 💰 **成本统计**：实时 Token 使用量和费用计算
- 🎨 **现代化界面**：Markdown 渲染，响应式布局
- 💾 **配置持久化**：所有设置自动保存
- 🔧 **灵活配置**：可混用不同 API 服务

---

## 🐛 故障排除

### macOS: 应用无法打开
→ 查看 [macOS 安装指南](https://github.com/thomas-hiddenpeak/vlmA/blob/main/MACOS_INSTALL.md)

### 后端连接失败 (ERR_CONNECTION_REFUSED)
→ 确保已安装 Node.js: `node --version`
→ 查看日志: `~/Library/Application Support/RMinte 多模态分析引擎/app.log`

### 摄像头无法访问
→ 检查系统隐私设置中的摄像头权限
→ 确认摄像头未被其他应用占用

更多问题请查看 [故障排查指南](https://github.com/thomas-hiddenpeak/vlmA/blob/main/TROUBLESHOOTING.md)

---

## 📚 文档

- [完整使用说明](https://github.com/thomas-hiddenpeak/vlmA#readme)
- [macOS 安装指南](https://github.com/thomas-hiddenpeak/vlmA/blob/main/MACOS_INSTALL.md)
- [故障排查指南](https://github.com/thomas-hiddenpeak/vlmA/blob/main/TROUBLESHOOTING.md)

---

## 💬 反馈与支持

遇到问题或有建议？欢迎提交 Issue：
https://github.com/thomas-hiddenpeak/vlmA/issues

---

## 📄 开源协议

MIT License
