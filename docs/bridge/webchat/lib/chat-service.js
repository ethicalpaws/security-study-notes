/**
 * 修桥工程 · 聊天业务逻辑
 *
 * 设计来源（Open WebUI services/ 层）：
 *   路由层只做"解析请求 → 调用服务 → 返回响应"。
 *   真正的业务逻辑（对话截断、LLM 接力、@路由）在 service 层。
 *   这样 chat 路由可以测试，不依赖 express 的 req/res 对象。
 */

const { config, resolveAgent } = require('./config');
const { callOpenClaw } = require('./openclaw');

/**
 * 构建对话转述文本（供 LLM 上下文使用）
 *
 * 设计来源（滑动窗口截断）：
 *   保留最近 MAX_CONTEXT 条完整消息，更早的消息压缩成一行摘要。
 *   既让 LLM 有完整上下文，又不会超过 token 上限。
 *
 * @param {Array} msgs - 完整消息历史
 * @param {object} [roomMeta] - 房间元数据（用于获取 archive summary）
 * @returns {string}
 */
function buildTranscript(msgs, roomMeta = null) {
  const max = config.context.maxContextForLLM;

  if (msgs.length === 0) return '';

  let header = '';
  let slice = msgs;

  if (msgs.length > max) {
    const dropped = msgs.slice(0, msgs.length - max);
    slice = msgs.slice(msgs.length - max);

    const userCount = dropped.filter(m => m.role === 'user').length;
    const agentMap = {};
    dropped.filter(m => m.role === 'assistant').forEach(m => {
      agentMap[m.name] = (agentMap[m.name] || 0) + 1;
    });
    const agentSummary = Object.entries(agentMap)
      .map(([name, c]) => {
        const agent = config.agentMap[name];
        return `${agent?.emoji || ''}${agent?.name || name} ${c}条`;
      })
      .join(' ');

    header = `【以下省略了 ${dropped.length} 条早期对话 — 临风 ${userCount} 条，${agentSummary}】`;
    if (roomMeta?.summary) {
      header += `\n${roomMeta.summary}`;
    }
    header += '\n\n';
  }

  const body = slice
    .map(m => {
      if (m.role === 'user') return `临风：${m.content}`;
      const agent = config.agentMap[m.name];
      return agent ? `${agent.emoji} ${agent.name}：${m.content}` : `助手：${m.content}`;
    })
    .join('\n');

  return header + body;
}

/**
 * 解析 @ 提及，返回命中的 Agent ID 列表
 * @param {string} message
 * @returns {string[]}
 */
function parseMentions(message) {
  const mentionRegex = /@([^\s，,、]+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(message)) !== null) {
    const resolved = resolveAgent(match[1]);
    if (resolved && !mentions.includes(resolved)) mentions.push(resolved);
  }
  return mentions;
}

/**
 * 决定本轮回应者列表
 * @param {string} message - 用户消息
 * @param {string[]} activeAgents - 当前"在场"的 Agent
 * @returns {string[]} Agent ID 列表
 *
 * 优先级：
 *   1. @提及 → 只回应被 @ 的 Agent
 *   2. 在场列表 → 所有"在场"的 Agent 依次回应
 *   3. 默认 → guidelight + echo
 */
function determineResponders(message, activeAgents) {
  const mentions = parseMentions(message);
  if (mentions.length > 0) return mentions;
  if (activeAgents.length > 0) return activeAgents;
  return config.defaultActiveAgents;
}

/**
 * 构建 Agent 的 prompt
 * @param {string} agentId
 * @param {string} message - 用户原始消息
 * @param {Array} accumulated - 当前轮已累积的对话
 * @param {boolean} isFirst - 是否是本轮第一个回应的 Agent
 * @param {boolean} isLast - 是否是本轮最后一个回应的 Agent
 * @param {object} [roomMeta] - 房间元数据
 * @returns {Array} messages 数组 [{ role, content }]
 */
function buildAgentPrompt(agentId, message, accumulated, isFirst, isLast, roomMeta = null) {
  const agent = config.agentMap[agentId];
  if (!agent) return [{ role: 'user', content: message }];

  if (isFirst && accumulated.length === 0) {
    return [{ role: 'user', content: message }];
  }

  const transcript = buildTranscript(accumulated, roomMeta);
  const relayHint = isLast ? '这是本轮最后一位回应。' : '后面还有战友会继续回应。';
  const prompt = `以下是在场群聊记录：\n\n${transcript}\n\n---\n临风的最新消息：${message}\n\n现在轮到你——${agent.emoji} ${agent.name}——回应。${relayHint}\n直接以你的身份说话，不要复述前面的人说过的话，不要评价别人的发言，直接贡献你的视角。`;

  return [{ role: 'user', content: prompt }];
}

module.exports = {
  buildTranscript,
  parseMentions,
  determineResponders,
  buildAgentPrompt,
};
