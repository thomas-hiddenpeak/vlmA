# UVC -> vllm 分析示例

这个仓库包含一个简单的前端页面（`public/`）和一个 Node.js 代理（`server/`），用于：

- 从本地 UVC 摄像头采集视频流（浏览器），
- 每 3 秒截取一帧并上传到代理的 `/analyze`，
- 代理将帧转发到你本地的 vllm 服务（默认 `http://192.168.0.113:8000/v1`）。

快速开始
1. 在项目根目录打开终端：

```bash
cd /Users/thomas/rm01/vlmTest/server
npm install
npm start
```

2. 在浏览器打开代理提供的页面：

```
http://localhost:3000/
```

注意与调试
- CORS: 浏览器直接请求 `http://192.168.0.113:8000` 可能被阻止；因此我们提供了代理在 `localhost:3000` 提供前端并转发请求。
- 模型 API 格式：当前代理把图片以 multipart/form-data 的 `frame` 字段转发到 `MODEL_URL`（可通过环境变量 `MODEL_URL` 覆盖）。如果你的 vllm 服务需要其它请求体（例如 JSON 包含 base64 编码的图像、或不同字段名），请告知，我会调整代理/前端以匹配。
- 性能：当前实现是每 3 秒发送一帧（JPEG 压缩）。如果你希望发送短视频片段或更频繁/更低延迟的分析，建议发送缩小尺寸的帧或在服务端做批量推理。

示例环境变量

```bash
# 若模型服务地址不同，启动代理时指定：
MODEL_URL=http://192.168.0.113:8000/v1 npm start
PORT=4000 npm start
```

后续可以改进点
- 将静态页面部署到 HTTPS 环境（部分浏览器要求 HTTPS 才能使用摄像头）。
- 如果模型需要 JSON base64，请确认字段名和 schema，我会把前端改成发送 base64 JSON。
