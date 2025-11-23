# macOS 安装使用指南

## 解决"应用已损坏"或"无法打开"提示

在 macOS 上首次运行应用时，系统可能会提示"应用已损坏，无法打开"或"无法验证开发者"。这是因为应用没有经过苹果官方签名（需要付费开发者账号）。请按照以下步骤解决：

### 方法一：通过系统偏好设置允许应用

1. 尝试打开应用，看到提示后，点击"取消"（不要点"移到废纸篓"）
2. 打开 **系统设置（或系统偏好设置）** > **隐私与安全性**
3. 向下滚动找到被阻止的应用提示，点击"仍要打开"
4. 再次确认"打开"

### 方法二：使用终端命令（推荐）⭐

打开终端（Terminal），输入以下命令：

```bash
# 移除隔离属性
sudo xattr -rd com.apple.quarantine "/Applications/RMinte 多模态分析引擎.app"

# 或者，如果应用在其他位置（如下载文件夹）
sudo xattr -rd com.apple.quarantine ~/Downloads/RMinte\ 多模态分析引擎.app
```

输入管理员密码后，应用即可正常打开。

### 方法三：暂时禁用 Gatekeeper（不推荐）

```bash
# 禁用 Gatekeeper
sudo spctl --master-disable

# 使用完后建议重新启用
sudo spctl --master-enable
```

## 摄像头权限授权

应用首次访问摄像头时，macOS 会弹出权限请求：

1. 点击"好"或"允许"授予摄像头访问权限
2. 如果不小心点了"拒绝"，可以通过以下方式重新授权：
   - 打开 **系统设置** > **隐私与安全性** > **摄像头**
   - 找到 "RMinte 多模态分析引擎"，勾选启用

## ARM64 vs Intel 版本选择

根据您的 Mac 芯片类型选择对应版本：

- **Apple Silicon (M1/M2/M3/M4)**: 下载 `RMinte 多模态分析引擎-X.X.X-arm64.dmg`
- **Intel Mac**: 下载 `RMinte 多模态分析引擎-X.X.X.dmg`

### 如何确认您的 Mac 类型：

1. 点击屏幕左上角的 **苹果菜单 **
2. 选择 **关于本机**
3. 查看 **芯片** 信息：
   - 显示 "Apple M1/M2/M3" → 选择 arm64 版本
   - 显示 "Intel Core" → 选择 Intel 版本

## 安装步骤

1. 下载对应版本的 `.dmg` 文件
2. 双击打开 DMG 文件
3. 将应用拖拽到 **Applications（应用程序）** 文件夹
4. 按照上述"解决应用已损坏"的方法处理安全提示
5. 从应用程序文件夹启动应用

## 首次使用配置

应用启动后需要配置 AI 模型：

### 使用本地模型（vLLM）

```
视觉分析模型 API: http://localhost:8000/v1/chat/completions
模型名称: 你的模型名称
API Key: 留空
```

### 使用云服务（阿里云/OpenAI）

**阿里云 DashScope：**
```
API 地址: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
视觉模型: qwen-vl-plus 或 qwen-vl-max
文本模型: qwen-plus 或 qwen-max
API Key: sk-xxxxx（你的阿里云 API Key）
```

**OpenAI：**
```
API 地址: https://api.openai.com/v1/chat/completions
视觉模型: gpt-4o
文本模型: gpt-4o 或 gpt-4-turbo
API Key: sk-xxxxx（你的 OpenAI API Key）
```

## 故障排除

### 应用无法启动

1. **检查应用权限：**
   ```bash
   ls -la "/Applications/RMinte 多模态分析引擎.app/Contents/MacOS/"
   ```

2. **如需要，添加执行权限：**
   ```bash
   chmod +x "/Applications/RMinte 多模态分析引擎.app/Contents/MacOS/RMinte 多模态分析引擎"
   ```

3. **查看应用日志：**
   ```bash
   tail -f ~/Library/Application\ Support/RMinte\ 多模态分析引擎/app.log
   ```

### 后端服务器启动失败（ERR_CONNECTION_REFUSED）

这通常是 Node.js 未安装或不在系统 PATH 中：

1. **检查 Node.js 是否安装：**
   ```bash
   which node
   node --version
   ```

2. **如果未安装，使用 Homebrew 安装：**
   ```bash
   # 安装 Homebrew（如果还没有）
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # 安装 Node.js
   brew install node
   ```

3. **查看详细错误日志：**
   ```bash
   cat ~/Library/Application\ Support/RMinte\ 多模态分析引擎/app.log
   ```

### 摄像头无法访问

1. 确认已授予摄像头权限（参见上方"摄像头权限授权"）
2. 确认摄像头未被其他应用占用（如 Zoom、Teams、FaceTime）
3. 尝试重启应用

### 查看系统错误日志

```bash
# 查看最近 5 分钟的系统日志
log show --predicate 'process == "RMinte 多模态分析引擎"' --last 5m
```

## 性能优化建议

- **Apple Silicon Mac**: 推荐使用 arm64 版本以获得最佳性能
- **后台运行**: 应用包含后端服务器，会占用一定 CPU 和内存
- **首次启动**: 可能需要几秒钟初始化后端服务器
- **网络要求**: 使用云服务 API 时需要稳定的网络连接

## 卸载应用

1. 关闭应用
2. 从应用程序文件夹删除应用
3. 清理应用数据（可选）：
   ```bash
   rm -rf ~/Library/Application\ Support/RMinte\ 多模态分析引擎/
   ```

## 获取帮助

如果仍有问题，请在 GitHub Issues 中反馈，并提供：

- macOS 版本（在"关于本机"中查看）
- Mac 芯片类型（Intel/Apple Silicon）
- 应用版本
- 错误信息截图
- 应用日志文件（`~/Library/Application Support/RMinte 多模态分析引擎/app.log`）

**GitHub Issues**: https://github.com/thomas-hiddenpeak/vlmA/issues

## 相关文档

- [完整 README](README.md)
- [故障排查指南](TROUBLESHOOTING.md)
- [GitHub 项目主页](https://github.com/thomas-hiddenpeak/vlmA)
