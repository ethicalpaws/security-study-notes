/**
 * 修桥工程 · 全局配置
 *
 * 设计来源（Lobe Chat）：
 *   所有 Agent 配置、环境变量、业务常量统一到一个数据对象中。
 *   Agent 是"data"不是"code"——修改配置不需要改逻辑代码。
 *
 * 核心原则：
 *   任何 magic number 都应该在这里命名。
 *   任何环境变量都应该在这里有默认值。
 */

const path = require('path');

const config = {
  // ─── 端口与路径 ───────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 3000,
  bridgePath: process.env.BRIDGE_PATH || path.resolve(__dirname, '..', '..'),

  // ─── OpenClaw ──────────────────────────────────────────────
  openclaw: {
    url: process.env.OPENCLAW_URL || 'http://localhost:10675',
    token: process.env.OPENCLAW_TOKEN || '759fca75af7611b6e6fb112590aeeca5',
    timeout: 60_000,           // 单次调用超时
    retries: 2,                // 失败重试次数
    retryBaseDelay: 500,       // 退避起始延迟 (ms)
    maxTokens: 8192,
  },

  // ─── 上下文截断 ────────────────────────────────────────────
  context: {
    maxHistoryPerRoom: 500,    // 每个房间最大历史条数（超出自动归档）
    maxContextForLLM: 60,      // 每次发给 LLM 的最大历史条数
    maxClientHistory: 80,      // 前端发送给后端的历史上限
  },

  // ─── 默认在场战友 ─────────────────────────────────────────
  defaultActiveAgents: ['guidelight', 'echo'],

  // ─── 七战友定义 ───────────────────────────────────────────
  // 设计来源（Lobe Chat Agent Schema）：
  //   将 Agent 元数据定义为"配置数据"而非"代码常量"。
  //   每项包含 id / 显示名 / Emoji / 主题色 / 优先级顺序。
  //   可轻松扩展：加一个对象条目 = 加一个战友。
  agents: [
    { id: 'guidelight', name: '引灯', emoji: '🔆', color: '#e8a87c', order: 1 },
    { id: 'chronos',    name: '司辰', emoji: '⏳', color: '#85c1e9', order: 2 },
    { id: 'anchor',     name: '岸舟', emoji: '⚓', color: '#73c6b6', order: 3 },
    { id: 'echo',       name: '渡己', emoji: '🪞', color: '#c39bd3', order: 4 },
    { id: 'libra',      name: '书衡', emoji: '⚖️', color: '#f7dc6f', order: 5 },
    { id: 'lucero',     name: '衔光', emoji: '💡', color: '#f8c471', order: 6 },
    { id: 'custos',     name: '藏卷', emoji: '🗡️', color: '#e6b0aa', order: 7 },
  ],

  // ─── Agent ID → 元数据的快速索引 ──────────────────────────
  get agentMap() {
    const map = {};
    for (const a of this.agents) map[a.id] = a;
    return map;
  },

  // ─── 主动推送调度 ─────────────────────────────────────────
  // 设计来源（Open WebUI Webhook Schedule）：
  //   定时任务定义为纯数据数组，每个任务只是一个 { time, agent, prompt }。
  //   运行时只解释数据，不写死调度逻辑。
  pushSchedule: process.env.PUSH_SCHEDULE
    ? JSON.parse(process.env.PUSH_SCHEDULE)
    : [
        { hour: 8,  minute: 0,  agent: 'chronos',
          prompt: '临风，早上好。请根据本周计划推送今日学习任务安排，包括：今日重点、预计用时、注意事项。直接以你的风格输出今日安排。',
          desc: '司辰晨报' },
        { hour: 21, minute: 0,  agent: 'chronos',
          prompt: '临风，今天的学习结束了吗？请回顾今日完成情况，给出简短总结，并为明天做简单预告。',
          desc: '司辰晚报' },
        { hour: 21, minute: 30, agent: 'echo',
          prompt: '临风，今天过得怎么样？不论好坏，我都在。需要聊聊今天的心情吗？',
          desc: '渡己关怀' },
      ],

  // ─── 调度器配置 ───────────────────────────────────────────
  scheduler: {
    checkIntervalMs: 30_000,    // 每 30 秒检查一次定时任务
    dedupWindowMs: 90_000,      // 同一任务 90 秒内不重复触发
  },
};

/**
 * @name resolveAgent
 * @description 解析 @提及 或 id 到 agent id
 * @param {string} name - 中文名（引灯）或英文 id（guidelight）
 * @returns {string|null}
 *
 * 设计来源（CrewAI 的 Agent Router）：
 *   模糊匹配 + 精确优先。先按 id 匹配，再按 displayName 匹配。
 */
function resolveAgent(name) {
  const low = name.toLowerCase();
  const byId = config.agents.find(a => a.id === low);
  if (byId) return byId.id;
  const byName = config.agents.find(a => a.name === name);
  return byName ? byName.id : null;
}

module.exports = { config, resolveAgent };
