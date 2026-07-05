# 修桥工程 · Webchat 架构说明

> 本文档说明 webchat 的架构设计、模块职责、以及从开源项目中借鉴的模式。

---

## 架构总览

```
webchat/
├── server.js          ← 组装层（Dependency Injection）
├── config.js          ← 删除，配置已合并到 lib/config.js
│
├── lib/               ← 服务层（业务逻辑，无 express 依赖）
│   ├── config.js      ← 全局配置 + Agent 数据
│   ├── room-manager   ← 房间/消息持久化
│   ├── sse-bus.js     ← SSE 事件发布-订阅
│   ├── openclaw.js    ← LLM API 调用（超时+重试）
│   ├── chat-service   ← 对话截断 / @路由 / prompt 构建
│   ├── scheduler.js   ← 主动推送定时调度
│   └── logger.js      ← 对话日志写入
│
├── routes/            ← 路由层（HTTP 解析 + 响应）
│   ├── rooms.js       ← /api/rooms CRUD
│   ├── chat.js        ← /api/chat （SSE 流）
│   └── agents.js      ← /api/agents
│
├── public/            ← 前端（Store 模式）
│   ├── index.html     ← 73 行，纯 HTML 结构
│   ├── style.css      ← 样式，CSS 变量管理
│   └── app.js         ← 应用逻辑 + Store 状态管理
│
├── data/
│   └── rooms.json     ← 房间数据持久化文件
│
└── package.json       ← Express 依赖
```

---

## 从开源项目借鉴的设计模式

### 1. 配置为数据（Lobe Chat — Agent Schema）

**Lobe Chat 的做法**：Agent 不是硬编码在组件里，而是定义为一个 JSON Schema，UI 根据 schema 动态渲染配置表单。

**我们的运用**：`lib/config.js` 把 7 个 Agent 的定义、调度计划、业务常量全部放在一个纯数据对象里。添加一个新 Agent 只需要加一个对象条目，不需要改任何逻辑代码。

```javascript
// ❌ 之前：AGENTS 对象 + 散落的常量
const AGENTS = { guidelight: { ... } };
const MAX_HISTORY = 500;

// ✅ 现在：config 对象统一管理
const config = {
  agents: [ ... ],       // 加一个对象 = 加一个战友
  context: { ... },      // 所有截断参数
  pushSchedule: [ ... ], // 所有定时任务
};
```

### 2. 三层架构（Open WebUI — routes / services / models 分离）

**Open WebUI 的做法**：路由层只做"解析请求 → 调用服务 → 返回响应"，业务逻辑在 services/，数据模型在 models/。每一层都可以独立测试。

**我们的运用**：

```
HTTP 请求
    │
    ▼
routes/*.js       ← 只做 req 解析 + res 格式化（不调 LLM、不读写文件）
    │
    ▼
lib/*.js          ← 做真正的业务逻辑（截断、路由、持久化）
    │
    ▼
data/rooms.json   ← 纯数据存储，不关心上层是谁调用
```

### 3. Store 模式（ChatGPT-Next-Web — 集中状态管理）

**ChatGPT-Next-Web 的做法**：所有 UI 状态集中在一个 Store 对象中，任何状态的修改都经过 `setState()` 方法，UI 通过订阅机制自动更新。

**我们的运用**：

```javascript
// ❌ 之前：5 个全局 let 变量
let rooms = [];
let currentRoomId = null;
let roomHistory = [];
let activeAgents = [...];
let isLoading = false;

// ✅ 现在：Store 集中管理
store.set('activeAgents', newList);
store.setAll({ roomHistory: [...], isLoading: false });
store.subscribe('rooms', () => renderRoomBar());
```

优势：
- 不会出现"两个函数同时修改同一个全局变量导致 bug"
- 状态变化自动通知监听器，不再需要手动 `renderXxx()`
- 新增状态不需要加全局变量，只需要 `store.set('xxx', value)`

### 4. 指数退避重试（Resilience Pattern）

**行业标准做法**：调用外部 API 一定会失败。超时 + 重试 + 退避 = 生产级调用模式。

**我们的运用**（`lib/openclaw.js`）：

```javascript
for (let attempt = 0; attempt <= retries; attempt++) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
    return resp.json();
  } catch (err) {
    if (isLastAttempt) throw new Error('...');
    await sleep(500 * (attempt + 1)); // 500ms → 1000ms
  }
}
```

### 5. 发布-订阅事件总线（Event-driven Pattern）

**行业标准做法**：解耦事件生产者和消费者，任何模块都可以发出事件，任何模块都可以订阅事件。

**我们的运用**（`lib/sse-bus.js`）：

```
sseBus.broadcast({ type: 'proactive', ... })
    │
    ▼
  ┌──────────┬──────────┬──────────┐
  │ Client A │ Client B │ Client C │
  └──────────┴──────────┴──────────┘
   每个客户端独立 try-catch，一个断开不影响其他
```

---

## 数据流

### 用户发送消息

```
1. 用户在浏览器输入消息 → 点击发送
2. app.js 将消息显示在 chatArea → store.set('isLoading', true)
3. fetch POST /api/chat → SSE 连接
4. server 解析 @ 提及 → determineResponders()
5. 对每个 Agent 依次：
   a. buildAgentPrompt() → 构建上下文
   b. callOpenClaw() → 调 LLM（超时 60s + 重试 2 次）
   c. res.write SSE 事件 → 浏览器显示
6. 持久化到 rooms.json → writeConversationLog()
7. 前端 isLoading = false → 解锁输入
```

### Agent 主动推送

```
1. PushScheduler 每 30s 检查定时任务
2. 匹配到 08:00 → 调用 callOpenClaw('chronos', ...)
3. sseBus.broadcast({ type: 'proactive', ... })
4. 浏览器收到 SSE → 显示在 chatArea + 存入 roomHistory
5. appendHistory() 持久化到 rooms.json
```

---

## 上下文截断（三层防线）

```
用户发送消息后消息不断增加...
    │
    ▼
第 1 层 前端 app.js
  只发最近 MAX_CLIENT_HISTORY(80) 条给后端
    │
    ▼
第 2 层 lib/chat-service.js buildTranscript()
  只取最近 MAX_CONTEXT(60) 条进 LLM 上下文
  更早的压缩成一行摘要
    │
    ▼
第 3 层 lib/room-manager.js _truncateIfNeeded()
  总历史超过 MAX_HISTORY(500) 时，最早消息整体归档
  旧数据丢弃，但生成一条归档提示
```

---

## 模块依赖关系

```
server.js
  ├→ lib/config.js          （被所有模块引用）
  ├→ lib/room-manager.js    （独立）
  ├→ lib/sse-bus.js         （独立）
  ├→ lib/openclaw.js        （依赖 config）
  ├→ lib/chat-service.js    （依赖 config + openclaw）
  ├→ lib/scheduler.js       （依赖 room-manager + sse-bus + openclaw + logger）
  ├→ lib/logger.js          （依赖 config）
  ├→ routes/rooms.js        （依赖 room-manager）
  ├→ routes/chat.js         （依赖 room-manager + openclaw + chat-service + logger）
  └→ routes/agents.js       （依赖 config）
```

**依赖方向**：`routes → lib → config`，不允许反向依赖。

---

## 可维护性对照（重构前后）

| 维度 | 重构前 | 重构后 |
|:----|:------:|:------:|
| 文件数 | 3（server.js + index.html + DEPLOY.md） | 12（6 lib + 3 routes + 3 public） |
| 单文件最大行数 | 634 (server.js) + 1100 (index.html) | 150 (server.js) + 310 (app.js) |
| 全局变量 | 5 个 let | 1 个 store 对象 |
| 配置硬编码 | 散落各处 | 全部在 lib/config.js |
| 可测试性 | 无法单独测试 | 每个 lib 模块可独立 require |
| 添加新 Agent | 改两处代码 | 只在 config.agents 加一项 |
| 添加新路由 | 改 server.js | 新建 routes/xxx.js + 一行挂载 |
