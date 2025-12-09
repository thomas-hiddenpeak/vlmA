# RMinte 多模态分析引擎

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/thomas-hiddenpeak/vlmA)](https://github.com/thomas-hiddenpeak/vlmA/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub last commit](https://img.shields.io/github/last-commit/thomas-hiddenpeak/vlmA)](https://github.com/thomas-hiddenpeak/vlmA/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/thomas-hiddenpeak/vlmA)](https://github.com/thomas-hiddenpeak/vlmA/issues)
[![GitHub stars](https://img.shields.io/github/stars/thomas-hiddenpeak/vlmA)](https://github.com/thomas-hiddenpeak/vlmA/stargazers)

基于 VLM 的多模态分析PE测试平台,支持本地 UVC 摄像头采集、多层级洞察分析和流式输出。支持打包为跨平台桌面应用。

## 📑 目录

- [🚀 在线体验](#-在线体验)
- [功能特性](#功能特性)
  - [视频采集](#视频采集)
  - [AI 分析](#ai-分析)
  - [多层级洞察分析](#多层级洞察分析)
  - [统计与监控](#统计与监控)
  - [智能任务管理](#智能任务管理)
  - [界面特性](#界面特性)
- [快速开始](#快速开始)
  - [方式一：在线体验（推荐）](#方式一在线体验推荐)
  - [方式二：本地部署](#方式二本地部署)
- [系统配置](#系统配置)
  - [分析模型配置](#分析模型配置)
  - [分析提示词配置](#分析提示词配置)
  - [洞察模型配置](#洞察模型配置)
  - [洞察区间配置](#洞察区间配置)
  - [洞察提示词配置](#洞察提示词配置)
  - [任务梳理配置](#任务梳理配置)
  - [统计与价格配置](#统计与价格配置)
  - [配置持久化](#配置持久化)
- [生产环境部署](#生产环境部署)
  - [PM2 部署（推荐）](#pm2-部署推荐)
  - [自动更新部署](#自动更新部署)
  - [Docker 部署（可选）](#docker-部署可选)
- [API 接口](#api-接口)
  - [控制接口](#-控制接口)
  - [数据接口](#-数据接口)
  - [WebSocket 实时通信](#-websocket-实时通信)
  - [API 集成示例](#-api-集成示例)
- [技术架构](#技术架构)
  - [前端技术栈](#前端技术栈)
  - [后端技术栈](#后端技术栈)
  - [信号源架构](#信号源架构)
- [目录结构](#目录结构)
- [环境变量](#环境变量)
- [API 兼容性](#api-兼容性)
- [浏览器兼容性](#浏览器兼容性)
- [常见问题](#常见问题)
- [桌面应用打包](#桌面应用打包)
- [开发计划](#开发计划)
- [License](#license)

## 🚀 在线体验

**演示地址**: [https://vlma.xapp.aoseo.com/](https://vlma.xapp.aoseo.com/)

无需安装，直接在浏览器中体验完整功能！

**快速开始：**
1. 访问演示地址
2. 获取阿里云百炼 API Key：[立即获取](https://bailian.console.aliyun.com/?tab=model#/api-key)
3. 在系统配置中填入 API Key
4. 允许浏览器访问摄像头
5. 开始分析！

> 💡 **提示**：默认已配置阿里云百炼模型，只需填入你的 API Key 即可使用。

## 功能特性

### 视频采集
- 🎥 **浏览器原生 UVC 支持**：使用 `getUserMedia` API 直接访问本地摄像头
- 📹 **设备枚举与切换**：自动检测并支持多摄像头切换
- 🎬 **实时预览**：Canvas 实时捕获视频帧（200ms 间隔）
- ⚙️ **灵活配置**：可调整采集间隔（秒）和每次采集帧数

### AI 分析
- 🤖 **流式分析输出**：支持 SSE（Server-Sent Events）实时显示分析结果
- 💬 **多种分析模式**：场景描述、物体识别、动作分析、安全监控、自定义
- 📊 **时序帧分析**：每次分析可采集多帧图像进行时序理解
- 🖼️ **缩略图预览**：每条分析记录显示对应的采集帧缩略图

### 多层级洞察分析
- ⏱️ **60秒洞察**：基于原始分析历史的快速总结（可配置区间）
- ⏰ **15分钟洞察**：基于多个60秒洞察的中期趋势分析
- 🕐 **1小时洞察**：基于15分钟洞察的长期模式识别
- 📅 **每日洞察**：基于1小时洞察的全天综合报告
- 🔄 **自动触发**：各级洞察自动触发，形成递进式分析链

### 统计与监控
- 📊 **Token 统计**：实时统计分析模型和洞察模型的 Token 使用量（输入/输出/总计）
- 💰 **成本计算**：基于可配置价格自动计算累计成本（支持分别配置输入/输出价格）
- ⏱️ **工作时长追踪**：自动记录分析运行时长（HH:MM:SS 格式）
- 📈 **成本预估**：根据当前成本速率预估 1 小时和 24 小时成本
- 💾 **数据持久化**：所有统计数据保存在 localStorage，刷新页面不丢失
- 🗑️ **一键清空**：支持一键清空所有统计数据
- 🎯 **真实数据**：集成 vLLM stream_options 获取真实 Token 使用量

### 智能任务管理
- ✅ **自动任务提取**：从历史汇总、1小时洞察、每日洞察中自动识别待办任务
- 📝 **任务列表**：统一的待办事项列表，实时显示任务数量
- ✔️ **任务完成**：支持勾选标记任务完成状态
- 🗑️ **任务管理**：可删除单个任务或一键清空所有任务
- 💾 **持久化存储**：任务列表保存在 localStorage，刷新不丢失
- 🎨 **可配置提示词**：自定义任务提取规则和条件
- 🔄 **自动/手动切换**：可开关自动任务提取功能

### 界面特性
- 🎨 **现代化 UI**：渐变色卡片设计，流畅动画效果
- 📑 **选项卡组织**：系统配置和洞察结果均采用选项卡组织
- 📱 **响应式布局**：两栏布局（视频+配置 | 历史+洞察）
- 🔍 **Markdown 渲染**：分析结果支持 Markdown 格式显示
- 🖼️ **图片查看**：点击缩略图查看原始帧大图
- 📦 **缓存预览**：实时显示帧缓存缩略图，直观了解采集状态

## 快速开始

### 方式一：在线体验（推荐）

1. **访问演示站点**  
   打开 [https://vlma.xapp.aoseo.com/](https://vlma.xapp.aoseo.com/)

2. **获取 API Key**  
   前往 [阿里云百炼控制台](https://bailian.console.aliyun.com/?tab=model#/api-key) 获取免费 API Key
   
   ![API Key 获取](https://img.alicdn.com/imgextra/i3/O1CN01qKQZ8i1YZ8F0YZ8F0_!!6000000003073-2-tps-2880-1800.png)
   
   **步骤：**
   - 登录阿里云账号
   - 进入百炼控制台
   - 点击「API-KEY」标签
   - 点击「创建新的 API-KEY」
   - 复制生成的 Key（以 `sk-` 开头）

3. **配置系统**
   - 在「模型配置」选项卡中
   - 将 API Key 粘贴到「API Key」输入框
   - 其他配置保持默认即可（已预设为阿里云百炼）

4. **开始使用**
   - 允许浏览器访问摄像头
   - 选择摄像头设备
   - 点击「▶️ 开始分析与采集」

> 💰 **费用说明**：阿里云百炼提供免费额度，具体请查看 [百炼价格说明](https://help.aliyun.com/zh/model-studio/getting-started/models)

### 方式二：本地部署

> 💻 **硬件推荐**：想要在本地部署运行大模型？推荐使用 [RM-01 便携 AI 超算中心](https://www.rminte.com/)，即插即用的本地 AI 算力解决方案！

#### 1. 安装依赖

```bash
cd server
npm install
```

#### 2. 启动服务

```bash
npm start
```

服务默认运行在 `http://localhost:43003`

#### 3. 打开浏览器

访问 `http://localhost:43003/`

**重要**：摄像头访问需要安全上下文（HTTPS 或 localhost），首次访问需要授权摄像头权限。

#### 4. 配置模型

**使用阿里云百炼（推荐）：**
- API 地址：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`（已预设）
- 视觉模型：`qwen-vl-plus`（已预设）
- 文本模型：`qwen-max`（已预设）
- API Key：[点击获取](https://bailian.console.aliyun.com/?tab=model#/api-key)

**使用本地模型：**
- 留空 API Key
- 修改 API 地址为你的本地模型地址
- 修改模型名称为你的模型名

#### 5. 开始分析

1. 从下拉列表选择 UVC 摄像头设备
2. 点击"刷新设备列表"按钮获取最新设备（如需要）
3. 点击"▶️ 开始分析与采集"按钮
   - 自动启动视频流
   - 开始定时采集和分析
4. 点击"⏹️ 停止分析"按钮停止所有功能

## 系统配置

### 分析模型配置
- **API 地址**：分析模型的 API 端点
  - 本地模型：`http://192.168.0.113:8000/v1/chat/completions`（推荐使用 [RM-01 便携 AI 超算中心](https://www.rminte.com/)）
  - OpenAI：`https://api.openai.com/v1/chat/completions`
  - 阿里云：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **模型名称**：使用的模型名称
  - 本地：`RM-01 LLM`
  - OpenAI：`gpt-4o`、`gpt-4-vision-preview` 等
  - 阿里云：`qwen-vl-plus`、`qwen-vl-max` 等
- **最大输出**：限制模型输出的最大 Token 数量（可选，留空表示不限制）
- **API Key**：API 密钥（留空表示本地模型无需认证）
- **分辨率**：视频采集分辨率选择
  - 全高清：1920x1080（默认）
  - 高清：1280x720
  - 标清：640x480
  - 极清：3840x2160
- **分析间隔**：每次分析的时间间隔，单位秒（默认：12秒）
- **采集帧数**：每次分析采集的视频帧数（默认：4帧）

### 分析提示词配置
- **分析模式**：预设的分析类型（场景描述/物体识别/动作分析/安全监控/自定义）
- **自定义提示词**：选择"自定义"模式时可输入自定义问题
- **提示词预览**：实时预览当前使用的提示词

### 洞察模型配置
- **洞察 API**：洞察分析的 API 端点（支持与分析模型使用不同服务）
- **洞察模型**：洞察使用的模型名称
  - 本地：`RM-01 LLM`
  - OpenAI：`gpt-4o`、`gpt-4-turbo` 等
  - 阿里云：`qwen-plus`、`qwen-max`、`qwen-turbo` 等
- **API Key**：洞察模型的 API 密钥（可与分析模型不同）

### 洞察区间配置
- **60秒区间**：多少条分析历史触发一次60秒洞察（默认：5条）
- **15分钟区间**：多少条60秒洞察触发一次15分钟洞察（默认：15条）
- **1小时区间**：多少条15分钟洞察触发一次1小时洞察（默认：4条）
- **每日区间**：多少条1小时洞察触发一次每日洞察（默认：24条）

### 洞察提示词配置
- **提示词类型**：洞察的分析风格（综合总结/趋势分析/安全监控/异常检测/自定义）
- **自定义提示词**：选择"自定义"时可输入自定义系统提示词

### 任务梳理配置
- **任务提取提示词**：定义如何从分析结果中识别和提取待办任务
- **自动提取开关**：控制是否在汇总和洞察完成后自动提取任务
- **任务格式**：使用 `- [ ] 任务描述` 格式解析任务列表
- **触发时机**：历史汇总完成、1小时洞察完成、每日洞察完成时自动触发

### 统计与价格配置
- **分析模型价格**：配置分析模型的输入和输出 Token 价格（默认：0.003 元/1k tokens）
- **洞察模型价格**：配置洞察模型的输入和输出 Token 价格（默认：0.002 元/1k tokens）
- **Token 统计**：实时显示各模型的输入、输出和总 Token 使用量
- **成本统计**：自动计算累计成本，显示为人民币金额（精确到 0.0001 元）
- **工作时长**：显示分析运行的累计时长（格式：HH:MM:SS）
- **成本预估**：根据当前速率预估 1 小时和 24 小时的预计成本
- **清空统计**：一键清空所有统计数据（需确认）

### 配置持久化
- **自动保存**：所有配置项修改后自动保存到浏览器 localStorage
- **自动恢复**：刷新页面后自动恢复上次的配置
- **恢复初始设置**：提供一键恢复默认配置功能（需确认）

## 生产环境部署

### PM2 部署（推荐）

项目提供了完整的 PM2 部署脚本，适合在生产服务器上运行：

```bash
# 1. 克隆项目到服务器
git clone https://github.com/thomas-hiddenpeak/vlmA.git
cd vlmA

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动完成：
- ✅ 检查 Node.js 环境（需要 18.x 或 20.x LTS）
- ✅ 安装 PM2 进程管理器
- ✅ 安装项目依赖
- ✅ 启动应用并配置自动重启
- ✅ 配置系统开机自启动

**常用 PM2 命令：**

```bash
pm2 status              # 查看应用状态
pm2 logs rminte         # 查看应用日志
pm2 restart rminte      # 重启应用
pm2 stop rminte         # 停止应用
pm2 monit               # 实时监控
```

**端口配置：**
- 默认端口：`43003`
- 修改端口：编辑 `server/server.js` 或设置 `PORT` 环境变量

**防火墙配置：**

```bash
# 开放应用端口
sudo ufw allow 43003/tcp

# 如果使用 Nginx 反向代理
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**HTTPS 配置（必需用于摄像头访问）：**

浏览器安全策略要求摄像头访问必须在 HTTPS 环境下（localhost 除外）。项目提供了 Nginx 配置示例：

```bash
# 查看 HTTP 配置示例
cat nginx-http.conf.example

# 查看 HTTPS 配置示例（推荐）
cat nginx-https.conf.example
```

使用 Let's Encrypt 配置免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 自动配置 SSL（将 your-domain.com 替换为你的域名）
sudo certbot --nginx -d your-domain.com
```

### 自动更新部署

#### 手动更新

服务器上手动更新到最新版本：

```bash
cd /path/to/vlmA
./update.sh
```

更新脚本会自动：
- 从 GitHub 拉取最新代码
- 检测并更新依赖（如果 package.json 有变化）
- 重启 PM2 服务
- 显示版本变更日志

#### 自动更新（GitHub Webhook）

⚠️ **安全警告**：Webhook 自动部署涉及服务器安全，建议 **Fork 本项目后在自己的仓库中配置**。

**为什么要 Fork？**
- 🔒 避免未授权的代码推送自动部署到你的服务器
- 🔐 你可以完全控制代码审查和发布流程
- 🛡️ 使用自己的 Webhook Secret 保护部署端点

**配置步骤：**

1. **Fork 本项目到你的 GitHub 账号**

2. **在服务器上配置 Webhook 服务**

   ```bash
   # 生成安全密钥
   openssl rand -hex 32
   
   # 编辑配置文件
   nano ecosystem.webhook.config.json
   # 将生成的密钥填入 WEBHOOK_SECRET
   
   # 启动 Webhook 服务
   pm2 start ecosystem.webhook.config.json
   pm2 save
   
   # 开放 Webhook 端口（默认 43004）
   sudo ufw allow 43004/tcp
   ```

3. **配置 GitHub Webhook**（在你 Fork 的仓库中）

   - 进入仓库 Settings → Webhooks → Add webhook
   - Payload URL: `http://你的服务器IP:43004/webhook`
   - Content type: `application/json`
   - Secret: 填入你生成的密钥
   - 选择 "Just the push event"
   - 点击 "Add webhook"

4. **测试自动部署**

   ```bash
   # 在你的 Fork 仓库中推送测试提交
   git commit -m "test: 测试自动部署"
   git push origin main
   
   # 在服务器上查看日志
   pm2 logs rminte-webhook
   ```

**详细文档：** 完整的 Webhook 配置说明请参考 [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)

**安全建议：**
- ✅ 务必设置 `WEBHOOK_SECRET` 验证请求来源
- ✅ 使用防火墙限制 Webhook 端口访问
- ✅ 考虑使用 Nginx 反向代理并配置 SSL
- ✅ 定期检查部署日志，监控异常活动
- ✅ 只在你信任和控制的仓库中配置 Webhook

### Docker 部署（可选）

如果你更熟悉 Docker，也可以使用容器化部署：

```bash
# 构建镜像
docker build -t rminte .

# 运行容器
docker run -d \
  --name rminte \
  -p 43003:43003 \
  -e MODEL_URL="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" \
  -e MODEL_NAME="qwen-vl-plus" \
  --restart unless-stopped \
  rminte
```

**注意：** Docker 部署需要自行创建 `Dockerfile`，项目暂未提供。

## 技术架构

### 前端技术栈
- **原生 JavaScript**：无框架依赖
- **WebRTC API**：`navigator.mediaDevices` 访问摄像头
- **Canvas API**：实时视频帧捕获
- **Fetch API**：流式接收分析结果（SSE）
- **Marked.js**：Markdown 渲染
- **localStorage**：配置和统计数据持久化

### 后端技术栈
- **Node.js + Express**：Web 服务器
- **Multer**：处理 multipart/form-data
- **Axios**：转发请求到 AI 模型（支持 SSE 流式响应）
- **CORS**：跨域支持
- **vLLM 集成**：支持 `stream_options` 获取真实 Token 使用量

### 信号源架构
- **浏览器端采集**：使用 `getUserMedia` API 直接获取本地 UVC 摄像头
- **Canvas 转换**：每 200ms 将 video 元素转为 JPEG base64
- **按需采样**：根据配置的间隔和帧数进行采样上传

## 目录结构

```
vlmA/
├── public/              # 前端资源
│   ├── index.html       # 主页面（含 CSS）
│   └── app.js           # 前端逻辑
├── server/              # 后端服务
│   ├── server.js        # Express 服务器
│   ├── package.json     # 依赖配置
│   └── start.sh         # 启动脚本
└── README.md            # 项目文档
```

## 环境变量

可以通过环境变量自定义服务器配置：

```bash
# 修改监听端口
PORT=4000 npm start

# 在 server.js 中可配置默认的模型 API 地址
```

## API 接口

RMinte 提供完整的 RESTful API 接口，支持远程控制和数据导出。

### 🎮 控制接口

#### 开始分析与采集
```bash
POST /api/start-analysis

# 示例
curl -X POST http://localhost:43003/api/start-analysis
```

**功能说明：**
- 远程触发分析任务启动
- 通过 WebSocket 实时同步 UI 状态
- 效果等同于在界面上点击"开始分析"按钮
- 支持多客户端同步控制

**响应示例：**
```json
{
  "status": "triggered",
  "message": "Start analysis command sent to all clients",
  "timestamp": "2025-11-26T01:40:41.478Z"
}
```

#### 停止分析与采集
```bash
POST /api/stop-analysis

# 示例
curl -X POST http://localhost:43003/api/stop-analysis
```

**功能说明：**
- 远程停止分析任务
- 自动生成历史汇总
- 触发任务提取
- UI 实时同步更新

### 📊 数据接口

#### 获取分析进度
```bash
GET /analysis/progress

# 示例
curl http://localhost:43003/analysis/progress | jq .
```

**功能说明：**
- 实时返回采集进度和汇总生成进度
- 提供总项目数、已完成数和百分比
- 显示整体状态和数据就绪状态
- **重要**：调用 `/history/export` 前应确保 `dataReadyForExport: true` 或 `overallStatus: "completed"`

**响应示例：**
```json
{
  "isGenerating": false,
  "collectionComplete": true,
  "isStopping": false,
  "dataReadyForExport": true,
  "analysisHistory": {
    "total": 156,
    "processed": 156,
    "percentage": 100
  },
  "summaryGeneration": {
    "inProgress": false,
    "startTime": "2025-12-08T01:40:41.478Z",
    "estimatedEndTime": "2025-12-08T01:42:15.123Z"
  },
  "overallStatus": "completed"
}
```

**状态说明：**
- `idle`: 空闲状态
- `collecting`: 正在采集中
- `stopping`: 正在停止（等待流式请求完成，约1秒）
- `generating_summary`: 正在生成汇总
- `completed`: 完成并准备好导出（此时可安全调用 `/history/export`）

**关键字段说明：**
- `collectionComplete`: 采集是否已完成
- `isStopping`: 是否正在停止过程中（等待中）
- `dataReadyForExport`: **数据是否完全准备好导出**（推荐检查此字段）
- `isGenerating`: 是否正在生成汇总

**最佳实践：**
```javascript
// 定期检查进度
const checkProgress = async () => {
  const response = await fetch('/analysis/progress');
  const progress = await response.json();
  
  // 等待数据完全准备好
  if (progress.dataReadyForExport && progress.overallStatus === 'completed') {
    // 现在可以安全地获取导出数据
    const exportData = await fetch('/history/export');
    // 处理导出数据...
  }
};
```

#### 同步历史数据
```bash
POST /history/sync
Content-Type: application/json

# 示例
curl -X POST http://localhost:43003/history/sync \
  -H "Content-Type: application/json" \
  -d @history-data.json
```

**功能说明：**
- 将客户端历史数据同步到服务器
- 前端每次分析/洞察/汇总后自动调用
- 支持手动批量上传

#### 导出历史数据
```bash
GET /history/export

# 下载完整历史数据
curl http://localhost:43003/history/export > history.json

# 查看数据结构
curl http://localhost:43003/history/export | jq .
```

**响应数据结构：**
```json
{
  "exportTime": "2025-11-26T01:40:41.478Z",
  "exportTimeLocal": "2025/11/26 09:40:41",
  "lastUpdate": "2025-11-26T01:35:20.123Z",
  "totalAnalysis": 156,
  "summary": {
    "content": "历史汇总内容...",
    "historyCount": 156,
    "timestamp": "2025/11/26 09:35:20"
  },
  "analysisHistory": [
    {
      "timestamp": "2025-11-26T01:30:15.456Z",
      "frameTimeRange": "09:30:12 - 09:30:15",
      "content": "分析内容...",
      "frameCount": 4
    }
  ],
  "insights": {
    "minute": [...],    // 60秒洞察记录
    "fifteen": [...],   // 15分钟洞察记录
    "hour": [...],      // 1小时洞察记录
    "day": [...]        // 每日洞察记录
  },
  "insightCounts": {
    "minute": 12,
    "fifteen": 3,
    "hour": 1,
    "day": 0
  },
  "tasks": [
    {
      "description": "任务描述",
      "completed": false,
      "timestamp": "2025-11-26T01:35:20.123Z",
      "source": "1小时洞察"
    }
  ],
  "tokenStats": {
    "analysis": { "input": 156000, "output": 12000, "total": 168000 },
    "insight": { "input": 45000, "output": 8000, "total": 53000 }
  },
  "workDuration": {
    "totalSeconds": 3600,
    "formatted": "1小时0分0秒"
  }
}
```

### 🔄 WebSocket 实时通信

**连接地址：**
```
ws://localhost:43003
```

**消息格式：**
```json
{
  "type": "start_analysis",  // 或 "stop_analysis"
  "timestamp": "2025-11-26T01:40:41.478Z"
}
```

**特性：**
- ✅ 自动重连（断开后5秒重试）
- ✅ 多客户端广播
- ✅ 实时状态同步
- ✅ 零延迟UI更新

### 🛠️ API 集成示例

#### Python 示例
```python
import requests
import json

BASE_URL = "http://localhost:43003"

# 开始分析
response = requests.post(f"{BASE_URL}/api/start-analysis")
print(response.json())

# 等待一段时间后停止
import time
time.sleep(300)  # 5分钟

response = requests.post(f"{BASE_URL}/api/stop-analysis")
print(response.json())

# 导出历史数据
history = requests.get(f"{BASE_URL}/history/export").json()
print(f"分析记录数: {history['totalAnalysis']}")
print(f"任务数: {len(history['tasks'])}")

# 保存到文件
with open('history.json', 'w', encoding='utf-8') as f:
    json.dump(history, f, ensure_ascii=False, indent=2)
```

#### Shell 脚本示例
```bash
#!/bin/bash

BASE_URL="http://localhost:43003"

# 定时采集任务
echo "开始5分钟采集..."
curl -X POST $BASE_URL/api/start-analysis

sleep 300

echo "停止采集并导出数据..."
curl -X POST $BASE_URL/api/stop-analysis

# 等待汇总生成
sleep 10

# 下载数据
FILENAME="history-$(date +%Y%m%d-%H%M%S).json"
curl $BASE_URL/history/export > $FILENAME
echo "数据已保存到 $FILENAME"
```

## API 兼容性

系统支持所有 OpenAI 兼容的 API 服务：

### ✅ 已测试兼容
- **本地 vLLM**：无需 API Key，直接访问
- **阿里云 DashScope**：使用阿里云 API Key，支持 qwen-vl 系列模型
- **OpenAI**：使用 OpenAI API Key，支持 GPT-4V 等视觉模型

### 🔧 配置说明

**本地模型（vLLM）：**
```
API 地址: http://localhost:8000/v1/chat/completions
API Key: 留空
模型: 你部署的模型名称
```

**阿里云 DashScope：**
```
API 地址: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
API Key: sk-xxxxx（你的阿里云 API Key）
视觉模型: qwen-vl-plus, qwen-vl-max
文本模型: qwen-plus, qwen-max, qwen-turbo
```

**OpenAI：**
```
API 地址: https://api.openai.com/v1/chat/completions
API Key: sk-xxxxx（你的 OpenAI API Key）
视觉模型: gpt-4o, gpt-4-vision-preview
文本模型: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
```

**其他 OpenAI 兼容服务：**
- Azure OpenAI
- 其他云服务商的兼容 API
- 自部署的兼容服务

## 浏览器兼容性

| 浏览器 | 支持情况 | 备注 |
|--------|---------|------|
| Chrome 90+ | ✅ 完全支持 | 推荐使用 |
| Edge 90+ | ✅ 完全支持 | 基于 Chromium |
| Firefox 88+ | ✅ 完全支持 | |
| Safari 14+ | ⚠️ 部分支持 | 可能需要手动授权每个设备 |

## 常见问题

### Q: 浏览器提示"摄像头不可用"？
**A**: 检查以下几点：
1. 确保在 `localhost` 或 HTTPS 环境下访问
2. 检查浏览器摄像头权限设置
3. 确认摄像头未被其他应用占用（如 Zoom、Teams）

### Q: 点击"停止分析"后按钮没有变回"开始分析"？
**A**: 这是已知问题，请查看浏览器控制台（F12）的日志输出，问题正在修复中。

### Q: 设备列表为空？
**A**: 点击"刷新设备列表"按钮，首次会请求摄像头权限以获取设备标签。

### Q: 在非 localhost 环境无法访问摄像头？
**A**: 浏览器安全策略要求必须在 HTTPS 环境下才能访问摄像头。建议：
- 本地测试使用 `http://localhost:43003`
- 远程部署必须配置 HTTPS（可使用 Let's Encrypt）

### Q: Token 统计显示为 0？
**A**: 确保后端 vLLM 服务支持 `stream_options` 参数。如果不支持，系统会使用估算值（每张图片约 1000 tokens 输入，输出按每字符 0.5 token 估算）。

### Q: 工作时长不准确？
**A**: 工作时长只在分析运行时累计。如果中途停止或刷新页面，时长会从 localStorage 中恢复继续累计。点击"清空统计"会重置所有数据。

### Q: 如何重置所有配置？
**A**: 在系统配置面板底部点击"恢复初始设置"按钮，确认后会恢复所有配置到默认值（不会影响统计数据）。

### Q: 如何使用云服务 API（如阿里云、OpenAI）？
**A**: 在系统配置中：
1. 填写完整的 API 地址（包括 `/v1/chat/completions`）
2. 填写对应的模型名称
3. 填写 API Key（如 `sk-xxxxx`）
4. 点击保存配置

### Q: API 返回 404 错误？
**A**: 检查 API 地址是否完整，例如阿里云应该是：
```
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```
而不是：
```
https://dashscope.aliyuncs.com/compatible-mode/v1
```

### Q: 可以混合使用不同的 API 吗？
**A**: 可以！分析模型和洞察模型可以配置不同的服务：
- 视觉分析用阿里云 qwen-vl-plus（处理图片）
- 文本洞察用本地模型或其他文本模型
- 每个模型都有独立的 API Key 配置

## 桌面应用打包

### 安装打包依赖

在项目根目录执行：

```bash
npm install
```

### 本地测试桌面应用

```bash
npm start
```

### 构建各平台安装包

```bash
# 构建所有平台
npm run build

# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux
```

构建完成后，安装包位于 `dist/` 目录：
- Windows: `.exe` 安装程序和便携版
- macOS: `.dmg` 镜像文件（支持 Intel 和 Apple Silicon）
- Linux: `.AppImage` 和 `.deb` 包

### macOS 用户必读 ⚠️

macOS 用户首次运行应用时可能遇到"应用已损坏"或"无法打开"的提示。这是正常的安全机制，请查看详细解决方案：

📖 **[macOS 安装使用指南](MACOS_INSTALL.md)**

**快速解决方法：**

```bash
# 在终端中运行以下命令移除隔离属性
sudo xattr -rd com.apple.quarantine "/Applications/RMinte 多模态分析引擎.app"
```

同时需要：
- ✅ 授予摄像头访问权限
- ✅ 确保已安装 Node.js（后端服务器需要）
- ✅ 根据芯片类型选择正确版本（Apple Silicon 选 arm64，Intel 选标准版）

### GitHub Actions 自动构建

项目已配置 GitHub Actions 自动构建。创建版本标签即可触发：

```bash
git tag v0.1.0
git push origin v0.1.0
```

构建完成后会自动创建 GitHub Release 并上传所有平台的安装包。

## 开发计划

- [x] Electron 桌面应用打包
- [x] GitHub Actions 自动构建和发布
- [x] Token 使用量统计（支持真实 vLLM 数据）
- [x] 成本计算与预估
- [x] 工作时长追踪
- [x] 配置持久化（localStorage）
- [x] 帧缓存缩略图预览
- [x] API Key 支持（兼容 OpenAI、阿里云等云服务）
- [x] 历史汇总 Markdown 格式化显示
- [x] 多服务混合配置（分析和洞察可用不同 API）
- [x] 修复停止分析按钮状态切换问题
- [x] 智能任务提取与管理（基于 AI 自动识别待办事项）
- [ ] 支持录制功能（保存视频片段）

## License

AGPL-3.0

本项目采用 [GNU Affero General Public License v3.0](LICENSE) 开源协议。

**主要特点：**
- ✅ **允许商业使用**：可以用于商业项目
- ✅ **允许修改和分发**：可以自由修改和分发
- 📝 **必须开源衡生作品**：任何基于此项目的衡生作品必须开源
- 🌐 **网络服务也需开源**：即使只是通过网络提供服务，也必须提供源代码
- ⚖️ **同样协议继承**：衡生作品必须使用 AGPL-3.0 协议

**用户权利：**
- 用户有权索要完整源代码
- 用户有权知道软件的修改内容
- 用户可以自由运行、研究、分享和修改软件

详情请参阅 [LICENSE](LICENSE) 文件。
