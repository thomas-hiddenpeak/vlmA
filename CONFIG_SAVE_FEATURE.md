# 系统配置保存功能说明

## 功能概述

新增了配置持久化保存功能，使用浏览器 localStorage 存储系统配置，即使刷新浏览器页面，所有设置也会自动恢复。

## 功能特点

### 1. 自动加载配置
- 页面加载时自动从 localStorage 读取已保存的配置
- 自动应用到所有配置项
- 无需手动设置，即可恢复上次的配置状态

### 2. 分类保存按钮
在每个配置选项卡底部都有对应的保存按钮：

#### 🤖 模型选项卡
- **💾 保存模型配置** 按钮
- 保存内容：
  - 分析模型 API 地址
  - 分析模型名称
  - 洞察模型 API 地址
  - 洞察模型名称

#### 💬 提示词选项卡
- **💾 保存提示词配置** 按钮
- 保存内容：
  - 分析模式选择
  - 自定义分析提示词
  - 洞察提示词类型
  - 自定义洞察提示词
  - 汇总提示词

#### ⚙️ 参数配置选项卡
- **💾 保存参数配置** 按钮
- 保存内容：
  - 分析间隔（秒）
  - 采集帧数
  - 60秒区间
  - 15分钟区间
  - 1小时区间
  - 每日区间

### 3. 保存成功提示
- 点击保存按钮后，右上角会显示绿色通知
- 提示内容：`✅ [配置类型]已保存`
- 3秒后自动消失
- 带有滑入/滑出动画效果

## 使用方法

### 保存配置
1. 在任意配置选项卡中修改设置
2. 点击该选项卡底部的 **💾 保存配置** 按钮
3. 看到成功提示后，配置已保存到浏览器本地

### 配置自动恢复
1. 刷新浏览器页面（F5 或 Ctrl/Cmd+R）
2. 系统会自动加载之前保存的所有配置
3. 无需任何手动操作

### 跨浏览器说明
- 配置保存在当前浏览器的 localStorage 中
- 不同浏览器之间的配置不共享
- 同一浏览器的不同标签页会共享配置

## 技术实现

### 存储机制
- 使用浏览器原生 localStorage API
- 存储键名：`vlmA_system_config`
- 数据格式：JSON 字符串

### 配置项列表
```javascript
{
  // 模型配置
  apiUrl: 分析模型API地址,
  modelName: 分析模型名称,
  insightApiUrl: 洞察模型API地址,
  insightModel: 洞察模型名称,
  
  // 提示词配置
  promptMode: 分析模式,
  customPrompt: 自定义分析提示词,
  insightPromptType: 洞察提示词类型,
  customInsightPrompt: 自定义洞察提示词,
  summaryPrompt: 汇总提示词,
  
  // 参数配置
  interval: 分析间隔,
  fps: 采集帧数,
  insightInterval: 60秒区间,
  fifteenInterval: 15分钟区间,
  hourInterval: 1小时区间,
  dayInterval: 每日区间
}
```

### 核心函数
- `loadConfig()` - 从 localStorage 加载配置
- `saveConfig(config)` - 保存配置到 localStorage
- `getCurrentConfig()` - 获取当前界面上的所有配置
- `applyConfig(config)` - 将配置应用到界面
- `showSaveNotification(message)` - 显示保存成功提示

## 默认配置

系统内置默认配置，首次使用时自动应用：

```javascript
{
  // 模型配置
  apiUrl: 'http://192.168.0.113:8000/v1/chat/completions',
  modelName: 'RM-01 LLM',
  insightApiUrl: 'http://192.168.0.159:58000/v1/chat/completions',
  insightModel: 'RM-01 LLM',
  
  // 提示词配置
  promptMode: 'describe',
  customPrompt: '',
  insightPromptType: 'summary',
  customInsightPrompt: '',
  summaryPrompt: '请分析以下所有历史观察记录，提供综合洞察和总结：',
  
  // 参数配置
  interval: 12,
  fps: 4,
  insightInterval: 5,
  fifteenInterval: 15,
  hourInterval: 4,
  dayInterval: 24
}
```

## 常见问题

### Q: 为什么我的配置没有保存？
A: 
1. 确保点击了对应选项卡的保存按钮
2. 检查浏览器是否允许使用 localStorage（隐私模式可能限制）
3. 查看浏览器控制台是否有错误信息

### Q: 如何清除已保存的配置？
A: 
1. 打开浏览器开发者工具（F12）
2. 进入 Application/存储 标签
3. 找到 Local Storage
4. 删除 `vlmA_system_config` 键
5. 刷新页面即可恢复默认配置

### Q: 配置可以导出/导入吗？
A: 
当前版本不支持导出/导入功能，但可以通过以下方式手动操作：
1. 打开开发者工具（F12）
2. 在控制台执行：`localStorage.getItem('vlmA_system_config')`
3. 复制输出的 JSON 字符串保存为文件
4. 导入时在控制台执行：`localStorage.setItem('vlmA_system_config', '粘贴的JSON字符串')`

### Q: 配置会同步到其他设备吗？
A: 
不会。配置只保存在当前浏览器的本地存储中，不会同步到其他设备或浏览器。

## 注意事项

1. **浏览器限制**：localStorage 有容量限制（通常 5-10MB），但当前配置很小，不会有问题
2. **隐私模式**：浏览器隐私/无痕模式下可能无法使用 localStorage
3. **清除数据**：清除浏览器数据时会删除保存的配置
4. **备份建议**：重要配置建议手动记录或截图保存

## 界面优化

### 保存按钮设计
- 全宽绿色渐变按钮
- 悬停时有上浮动画效果
- 带有磁盘图标 💾
- 明确标注保存的配置类型

### 成功提示设计
- 固定在右上角，不遮挡主要内容
- 绿色渐变背景，白色文字
- 滑入/滑出动画效果
- 自动消失，无需手动关闭

## 未来改进方向

1. **配置版本管理**：支持配置历史记录和回滚
2. **配置导出/导入**：支持 JSON 文件导出和导入
3. **配置模板**：预设多种场景的配置模板
4. **云端同步**：支持账号登录后跨设备同步配置
5. **配置分享**：生成配置分享链接给其他用户
