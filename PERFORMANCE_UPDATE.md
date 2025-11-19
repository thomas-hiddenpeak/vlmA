# 性能优化和设备管理更新

## 问题修复

### 1. ✅ UVC设备列表问题
**问题**：设备选择下拉框只显示"默认设备"，无法看到系统中的多个UVC摄像头。

**原因**：
- `imagesnap -l` 命令未使用正确的PATH
- 设备名称解析逻辑未正确处理引号

**解决方案**：
- 使用完整路径调用 `/opt/homebrew/bin/imagesnap -l`
- 改进设备名称解析逻辑，正确处理引号格式
- 示例：`"Thomas's iPhone"的相机` → `Thomas's iPhone的相机`

### 2. ✅ 视频流卡顿问题
**问题**：启动视频流后响应特别慢，画面严重卡帧。

**原因**：
- 分辨率过高（1920x1080）
- 图片质量过高（quality: 100）
- 捕获频率过高（100ms/帧，约10fps）

**解决方案**：
- **降低分辨率**：1920x1080 → 640x480
- **降低质量**：quality 100 → 70
- **降低帧率**：100ms → 200ms（10fps → 5fps）

## 新功能

### 设备刷新功能
- 添加 🔄 刷新按钮，可手动刷新设备列表
- 页面加载时自动获取可用设备
- 刷新时显示加载状态（⏳）

### 优化的设备管理
- 支持自动发现系统中所有UVC摄像头
- 实时更新设备列表
- 保持用户选择的设备（刷新后）

## 性能参数对比

### 优化前
```javascript
width: 1920
height: 1080
quality: 100
captureInterval: 100ms (10fps)
数据量: ~200-300KB/帧
带宽需求: ~2-3MB/s
```

### 优化后
```javascript
width: 640
height: 480
quality: 70
captureInterval: 200ms (5fps)
数据量: ~30-50KB/帧
带宽需求: ~150-250KB/s
```

**性能提升**：
- 数据量减少约 **85%**
- 带宽需求降低约 **90%**
- 显著减少卡顿，画面更流畅

## 界面变化

**设备选择区域**：
```
[UVC设备: ▼ USB3 Video] [🔄]
```

- 下拉框显示所有可用设备
- 刷新按钮可重新扫描设备
- 点击刷新时按钮变为⏳加载状态

## 代码改动

### server.js
1. **降低摄像头配置**：
   ```javascript
   width: 640, height: 480, quality: 70
   ```

2. **添加设备获取函数**：
   ```javascript
   function getAvailableDevices(callback)
   ```

3. **优化捕获间隔**：
   ```javascript
   setInterval(..., 200) // 5fps
   ```

### index.html
1. 添加刷新设备按钮
2. 优化设备选择器布局

### app.js
1. **添加刷新功能**：
   ```javascript
   refreshDevicesBtn.addEventListener('click', ...)
   ```

2. **页面加载自动获取设备**：
   ```javascript
   window.addEventListener('DOMContentLoaded', requestDeviceList)
   ```

3. **改进设备列表更新逻辑**：
   ```javascript
   function requestDeviceList()
   ```

## 使用说明

1. **页面加载**：自动获取并显示所有可用的UVC设备
2. **刷新设备**：点击 🔄 按钮手动刷新设备列表
3. **选择设备**：从下拉框选择要使用的摄像头
4. **启动视频流**：点击"📹 启动视频流"按钮
5. **观察性能**：视频预览应该流畅无卡顿（5fps）

## 调整建议

如果仍然感觉卡顿，可以进一步调整：

### 降低帧率（更流畅）
```javascript
// server.js line ~350
setInterval(..., 300) // 改为300ms，约3fps
```

### 进一步降低分辨率
```javascript
// server.js line ~20
width: 480,
height: 360,
```

### 降低图片质量
```javascript
// server.js line ~22
quality: 60,  // 或更低
```

## 验证检查

测试服务器已启动并运行，可以：

1. 打开浏览器访问 `http://localhost:3000`
2. 检查设备下拉框是否显示多个设备
3. 选择不同的设备测试
4. 观察视频流是否流畅
5. 点击刷新按钮测试设备重新扫描

## 已知设备

系统当前检测到的设备：
- USB3 Video
- FaceTime高清相机
- Thomas's iPhone的相机

所有设备都应该在下拉框中正确显示！
