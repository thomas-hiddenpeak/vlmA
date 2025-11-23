# 故障排查指南

## Electron 打包应用调试

### 查看应用日志

应用启动时会在用户数据目录中创建日志文件 `app.log`。

**macOS 日志位置：**
```bash
~/Library/Application Support/RMinte 多模态分析引擎/app.log
```

**查看实时日志：**
```bash
tail -f ~/Library/Application\ Support/RMinte\ 多模态分析引擎/app.log
```

**Windows 日志位置：**
```
%APPDATA%\RMinte 多模态分析引擎\app.log
```

**Linux 日志位置：**
```
~/.config/RMinte 多模态分析引擎/app.log
```

### 打开开发者工具

应用内按快捷键：
- **macOS**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

### 常见问题

#### 1. ERR_CONNECTION_REFUSED 错误

**症状：** 打开应用后，控制台显示 `POST http://localhost:43003/... net::ERR_CONNECTION_REFUSED`

**原因：** 后端服务器未正确启动

**排查步骤：**

1. 检查应用日志文件，查找后端启动相关的消息：
   ```bash
   cat ~/Library/Application\ Support/RMinte\ 多模态分析引擎/app.log | grep Backend
   ```

2. 检查端口是否被占用：
   ```bash
   lsof -nP -iTCP:43003 -sTCP:LISTEN
   ```

3. 检查 Node.js 是否安装：
   ```bash
   which node
   node --version
   ```

4. 手动测试后端服务器：
   ```bash
   cd "/Applications/RMinte 多模态分析引擎.app/Contents/Resources/app.asar.unpacked/server"
   node server.js
   ```

#### 2. 后端模块找不到

**症状：** 日志显示 `Cannot find module 'express'` 等错误

**原因：** node_modules 未正确打包或路径不对

**解决方案：**

1. 检查 `app.asar.unpacked/server/node_modules` 是否存在：
   ```bash
   ls -la "/Applications/RMinte 多模态分析引擎.app/Contents/Resources/app.asar.unpacked/server/"
   ```

2. 重新构建应用：
   ```bash
   cd /path/to/vlmA
   rm -rf dist
   npm run build:mac
   ```

#### 3. 权限问题

**症状：** 无法访问摄像头或写入文件

**解决方案：**

1. macOS: 在系统偏好设置 → 安全性与隐私 → 隐私中授权应用访问摄像头

2. 检查应用是否有写入日志文件的权限

### 开发模式测试

在开发模式下运行应用，可以看到更详细的输出：

```bash
cd /path/to/vlmA
DEBUG=true npm start
```

或设置环境变量：
```bash
export NODE_ENV=development
npm start
```

### 手动测试各组件

#### 测试前端静态文件服务器

应用会在 51098 端口启动前端静态文件服务器：
```bash
curl http://localhost:51098/
```

#### 测试后端 API 服务器

后端应该在 43003 端口运行：
```bash
curl http://localhost:43003/
```

### 清除应用数据

如果需要重置应用配置和日志：

**macOS:**
```bash
rm -rf ~/Library/Application\ Support/RMinte\ 多模态分析引擎/
```

**Windows:**
```
rd /s /q "%APPDATA%\RMinte 多模态分析引擎"
```

**Linux:**
```bash
rm -rf ~/.config/RMinte\ 多模态分析引擎/
```

### 提交 Bug

如果问题仍然存在，请提交 issue 并附上：

1. 完整的 `app.log` 日志文件
2. 开发者工具中的错误信息截图
3. 操作系统版本
4. Node.js 版本（`node --version`）
5. 应用版本

GitHub Issues: https://github.com/thomas-hiddenpeak/vlmA/issues
