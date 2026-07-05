# 部署说明

## 前提
- Node.js v22+ 已安装
- OpenClaw 运行中（127.0.0.1:10675）
- 项目已克隆到本地：`E:\youth-sandbox\`

## 启动步骤

### 1. 启动 OpenClaw（如果没启动）

```bash
# 在你存放 OpenClaw 配置的目录下
openclaw gateway --config openclaw.json
# 看到 Gateway running on port 10675 说明成功
```

### 2. 安装依赖并启动 Webchat

```cmd
cd E:\youth-sandbox\docs\bridge\webchat
npm install
node server.js
```

输出示例：
```
🌉 修桥工程 Web 群聊
   地址: http://localhost:3000
   OpenClaw: http://localhost:10675
   Bridge: E:\youth-sandbox\docs\bridge
   房间: 1 个已加载
⏰ 主动推送调度器已启动 (3 个定时任务)
```

### 3. 访问

- **本机**：浏览器打开 `http://localhost:3000`
- **同局域网**：查看本机 IPv4 地址（`ipconfig`），其他设备访问 `http://192.168.x.x:3000`

### 4. 用 pm2 后台运行

```cmd
npm install -g pm2
pm2 start server.js --name bridge-webchat
pm2 save
```

---

## Agent 配置位置

- **6 个本地 Agent**：定义文件在 `E:\youth-sandbox\docs\bridge\init\` 下，通过 OpenClaw 的 workspace 配置指向此目录
- **藏卷 (Custos)**：运行在 Kali VM 上，独立 OpenClaw 实例，渗透报告通过内网 SMB 共享传回 `temp/in/`

---

## 新功能说明

### 🕊 Agent 主动推送
webchat 支持 Agent **主动发言**，无需用户先发消息。默认已配置：

| 时间 | Agent | 内容 |
|:----:|:-----:|------|
| 08:00 | ⏳ 司辰 | 推送今日学习计划 |
| 21:00 | ⏳ 司辰 | 晚间学习总结提醒 |
| 21:30 | 🪞 渡己 | 晚间情绪关怀 |

通过环境变量 `PUSH_SCHEDULE` 自定义（JSON 格式，Windows CMD）：
```cmd
set PUSH_SCHEDULE=[{"hour":9,"minute":0,"agent":"chronos","prompt":"早上好","desc":"晨报"}]
node server.js
```

### 🔗 连接状态
页面右上角显示连接状态指示器：
- 🟢 已连接（SSE 通道正常）
- 🟡 连接中
- 🔴 已断开（自动重连）

### ⏱ 超时与重试
OpenClaw 调用超时 60 秒，失败自动重试 2 次，每次间隔 500ms→1000ms 指数退避。

## 注意事项

- 对话日志自动写入 `E:\youth-sandbox\docs\bridge\temp\conversation-log\YYYY-MM-DD.md`
- 所有 Agent 调用通过本地 OpenClaw Gateway 直连，不经过第三方
- 藏卷（Kali VM）通过内网 SMB/共享文件夹将渗透报告传回 `temp/in/`
