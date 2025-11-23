#!/usr/bin/env node

/**
 * RMinte GitHub Webhook 服务器
 * 监听 GitHub push 事件，自动触发更新脚本
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

// 配置
const PORT = process.env.WEBHOOK_PORT || 43004;
const SECRET = process.env.WEBHOOK_SECRET || ''; // GitHub webhook secret
const UPDATE_SCRIPT = path.join(__dirname, 'update.sh');

// 验证 GitHub webhook 签名
function verifySignature(payload, signature) {
  if (!SECRET) {
    console.warn('[警告] 未设置 WEBHOOK_SECRET，跳过签名验证');
    return true;
  }
  
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// 执行更新脚本
function executeUpdate() {
  return new Promise((resolve, reject) => {
    console.log('[执行] 开始执行更新脚本...');
    
    exec(`bash ${UPDATE_SCRIPT}`, (error, stdout, stderr) => {
      if (error) {
        console.error('[错误] 更新失败:', error);
        reject(error);
        return;
      }
      
      console.log('[输出]', stdout);
      if (stderr) {
        console.warn('[警告]', stderr);
      }
      
      console.log('[完成] 更新成功');
      resolve(stdout);
    });
  });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // 读取请求体
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const signature = req.headers['x-hub-signature-256'] || '';
      const event = req.headers['x-github-event'] || '';
      
      console.log(`[请求] 收到 GitHub 事件: ${event}`);
      
      // 验证签名
      if (!verifySignature(body, signature)) {
        console.error('[错误] 签名验证失败');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }
      
      // 解析 payload
      const payload = JSON.parse(body);
      
      // 只处理 push 事件到 main 分支
      if (event === 'push' && payload.ref === 'refs/heads/main') {
        console.log(`[触发] Push 到 main 分支，提交: ${payload.after.substring(0, 7)}`);
        console.log(`[提交] ${payload.head_commit?.message || '无提交信息'}`);
        
        // 异步执行更新（不阻塞响应）
        executeUpdate().catch(err => {
          console.error('[错误] 更新过程出错:', err);
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success', 
          message: 'Update triggered',
          commit: payload.after.substring(0, 7)
        }));
      } else {
        console.log(`[忽略] 事件: ${event}, ref: ${payload.ref}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ignored', 
          message: 'Not a main branch push event' 
        }));
      }
      
    } catch (error) {
      console.error('[错误] 处理请求失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log('=====================================');
  console.log('RMinte GitHub Webhook 服务器');
  console.log('=====================================');
  console.log(`监听端口: ${PORT}`);
  console.log(`Webhook URL: http://YOUR_SERVER_IP:${PORT}/webhook`);
  console.log(`签名验证: ${SECRET ? '已启用' : '未启用（不安全）'}`);
  console.log('');
  console.log('配置 GitHub Webhook:');
  console.log('  1. 进入仓库设置 → Webhooks → Add webhook');
  console.log('  2. Payload URL: http://YOUR_SERVER_IP:' + PORT + '/webhook');
  console.log('  3. Content type: application/json');
  console.log('  4. Secret: ' + (SECRET || '(未设置)'));
  console.log('  5. 选择 "Just the push event"');
  console.log('=====================================');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
