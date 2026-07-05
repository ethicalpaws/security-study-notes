/**
 * 修桥工程 · Web 群聊
 *
 * 架构：Open WebUI 风格的三层分离
 *
 *   server.js         ← 组装层：实例化所有模块，挂载路由，启动
 *   routes/*.js       ← 路由层：解析 HTTP 请求，委托到 service，格式化响应
 *   lib/*.js          ← 服务层：真正的业务逻辑（房间管理、OpenClaw 调用、聊天服务）
 *
 * 设计来源：
 *   - 配置统一管理（Lobe Chat 的 Agent Schema 模式）
 *   - 数据访问与业务逻辑分离（Open WebUI 的 models/services 架构）
 *   - 路由只做"翻译"，不做"决策"
 *   - 所有模块通过构造函数注入依赖（Dependency Injection 模式）
 */

const express = require('express');
const path = require('path');
const { config } = require('./lib/config');
const { RoomManager } = require('./lib/room-manager');
const { SSEBus } = require('./lib/sse-bus');
const { PushScheduler } = require('./lib/scheduler');
const { createRoomRoutes } = require('./routes/rooms');
const { createChatRoute } = require('./routes/chat');
const { createAgentRoutes } = require('./routes/agents');

// ─── 初始化 ──────────────────────────────────────────────────

const app = express();
const roomManager = new RoomManager();
const sseBus = new SSEBus();
const scheduler = new PushScheduler(roomManager, sseBus);

// ─── 中间件 ──────────────────────────────────────────────────

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 路由 ────────────────────────────────────────────────────

app.use('/api/rooms',   createRoomRoutes(roomManager));
app.use('/api/chat',    createChatRoute(roomManager));
app.use('/api/agents',  createAgentRoutes());

/**
 * SSE 事件订阅（浏览器主动推送通道）
 *
 * 设计来源（Event Stream 模式）：
 *   /api/events 是一个长期连接，服务器可以随时推送事件到浏览器。
 *   每 30 秒发送 keepalive 注释行防止负载均衡器/代理断开连接。
 */
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const keepAlive = setInterval(() => {
    try { res.write(':keepalive\n\n'); } catch (_) { clearInterval(keepAlive); }
  }, 30000);

  sseBus.add(res);
  console.log(`  ↳ SSE 客户端接入 (当前 ${sseBus.size} 个连接)`);

  req.on('close', () => {
    sseBus.remove(res);
    clearInterval(keepAlive);
    console.log(`  ↳ SSE 客户端断开 (剩余 ${sseBus.size} 个连接)`);
  });
});

// ─── 启动 ────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`🌉 修桥工程 Web 群聊`);
  console.log(`   地址: http://localhost:${config.port}`);
  console.log(`   OpenClaw: ${config.openclaw.url}`);
  console.log(`   Bridge: ${config.bridgePath}`);
  console.log(`   房间: ${roomManager.list().length} 个已加载`);

  scheduler.start();
});
