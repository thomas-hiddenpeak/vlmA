# GitHub Webhook 自动部署配置指南

## 概述

本项目支持 GitHub Webhook 自动部署。当你推送代码到 GitHub 的 main 分支后，服务器会自动拉取最新代码并重启服务。

## 文件说明

- **update.sh** - 更新脚本，负责拉取代码、安装依赖、重启服务
- **webhook-server.js** - Webhook 服务器，监听 GitHub 推送事件
- **ecosystem.webhook.config.json** - PM2 配置文件，用于管理 webhook 服务器

## 部署步骤

### 1. 在服务器上配置 Git

确保服务器可以访问 GitHub 仓库：

```bash
# 配置 Git 用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 确保项目目录是 git 仓库
cd /path/to/vlmA
git remote -v  # 确认远程仓库地址
```

**如果是私有仓库，需要配置 SSH 密钥或访问令牌：**

```bash
# 方式1: SSH 密钥（推荐）
ssh-keygen -t ed25519 -C "your.email@example.com"
cat ~/.ssh/id_ed25519.pub  # 将输出添加到 GitHub → Settings → SSH keys

# 方式2: Personal Access Token
# 在 GitHub → Settings → Developer settings → Personal access tokens 创建 token
git remote set-url origin https://<TOKEN>@github.com/thomas-hiddenpeak/vlmA.git
```

### 2. 设置更新脚本权限

```bash
cd /path/to/vlmA
chmod +x update.sh
chmod +x webhook-server.js
```

### 3. 测试手动更新

先测试更新脚本是否正常工作：

```bash
./update.sh
```

### 4. 配置 Webhook Secret（可选但推荐）

生成一个随机密钥用于验证 GitHub webhook 请求：

```bash
# 生成随机密钥
openssl rand -hex 32
```

编辑 `ecosystem.webhook.config.json`，设置 `WEBHOOK_SECRET`：

```json
{
  "apps": [{
    "env": {
      "WEBHOOK_SECRET": "your-random-secret-here"
    }
  }]
}
```

### 5. 启动 Webhook 服务器

使用 PM2 启动 webhook 服务器：

```bash
pm2 start ecosystem.webhook.config.json
pm2 save
```

查看状态和日志：

```bash
pm2 status
pm2 logs rminte-webhook
```

### 6. 配置防火墙

开放 webhook 端口（默认 43004）：

```bash
# Ubuntu/Debian
sudo ufw allow 43004/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=43004/tcp
sudo firewall-cmd --reload
```

**如果使用云服务器，还需要在云控制台的安全组中开放 43004 端口**

### 7. 配置 GitHub Webhook

1. 进入 GitHub 仓库页面
2. 点击 **Settings** → **Webhooks** → **Add webhook**
3. 配置如下：
   - **Payload URL**: `http://YOUR_SERVER_IP:43004/webhook`
   - **Content type**: `application/json`
   - **Secret**: 填入步骤 4 生成的密钥（如果设置了）
   - **Which events**: 选择 `Just the push event`
   - **Active**: 勾选
4. 点击 **Add webhook**

### 8. 测试 Webhook

推送一个测试提交到 main 分支：

```bash
# 本地修改并推送
git add .
git commit -m "test: webhook 测试"
git push origin main
```

在服务器上查看 webhook 日志：

```bash
pm2 logs rminte-webhook --lines 50
```

## 手动更新

如果需要手动更新而不等待 webhook：

```bash
cd /path/to/vlmA
./update.sh
```

## 常用命令

```bash
# 查看所有 PM2 进程
pm2 status

# 查看 webhook 日志
pm2 logs rminte-webhook

# 查看主应用日志
pm2 logs rminte

# 重启 webhook 服务
pm2 restart rminte-webhook

# 停止 webhook 服务
pm2 stop rminte-webhook

# 删除 webhook 服务
pm2 delete rminte-webhook
```

## 故障排查

### Webhook 没有触发更新

1. **检查 webhook 服务是否运行**
   ```bash
   pm2 status rminte-webhook
   ```

2. **查看 webhook 日志**
   ```bash
   pm2 logs rminte-webhook --lines 100
   ```

3. **检查 GitHub webhook 状态**
   - 进入 GitHub → Settings → Webhooks
   - 点击你的 webhook，查看 "Recent Deliveries"
   - 检查是否有失败的请求和错误信息

4. **检查防火墙和端口**
   ```bash
   # 测试端口是否开放
   curl http://localhost:43004/webhook
   ```

5. **检查签名验证**
   - 确保 GitHub webhook 的 Secret 与 `ecosystem.webhook.config.json` 中的 `WEBHOOK_SECRET` 一致

### 更新脚本执行失败

1. **检查 Git 权限**
   ```bash
   git pull origin main  # 手动测试是否能拉取
   ```

2. **检查 PM2 权限**
   ```bash
   pm2 status  # 确认当前用户可以管理 PM2 进程
   ```

3. **查看更新日志**
   ```bash
   pm2 logs rminte-webhook  # 查看执行输出
   ```

### 端口冲突

如果 43004 端口已被占用，修改 `ecosystem.webhook.config.json` 中的 `WEBHOOK_PORT`：

```json
{
  "apps": [{
    "env": {
      "WEBHOOK_PORT": 43005
    }
  }]
}
```

然后重启服务并更新 GitHub webhook URL。

## 安全建议

1. **务必设置 WEBHOOK_SECRET** - 防止未授权的更新请求
2. **限制防火墙规则** - 只允许 GitHub 的 IP 地址访问 webhook 端口
3. **使用 HTTPS** - 考虑使用 Nginx 反向代理并配置 SSL 证书
4. **定期检查日志** - 监控异常的更新请求

## GitHub IP 白名单（可选）

如果需要额外的安全性，可以只允许 GitHub 的 IP 访问：

```bash
# 获取 GitHub webhook IP 列表
curl https://api.github.com/meta | jq -r '.hooks[]'

# 使用 iptables 限制（示例）
sudo iptables -A INPUT -p tcp --dport 43004 -s 192.30.252.0/22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 43004 -j DROP
```

## 更多信息

- [GitHub Webhooks 文档](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
