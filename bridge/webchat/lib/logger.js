/**
 * 修桥工程 · 对话日志写入器
 *
 * 设计来源（Separation of Concerns）：
 *   日志写入是一个独立的横切关注点，不依赖 express 或房间管理器。
 *   用哪个存储后端（文件 / DB / 云）都可以独立替换。
 *
 * 职责：
 *   - 将对话写入 temp/conversation-log/YYYY-MM-DD.md
 *   - 兼容原有日志格式（Markdown）
 */

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

/**
 * 写入一条对话日志
 * @param {string} userMessage - 用户消息（或主动推送的描述）
 * @param {Array<{agent: string, content: string}>} responses - Agent 回复列表
 */
function writeConversationLog(userMessage, responses) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const logDir = path.join(config.bridgePath, 'temp', 'conversation-log');
  const logFile = path.join(logDir, `${dateStr}.md`);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let entry = `**[${timeStr}] 临风**\n${userMessage}\n\n`;
  for (const { agent, content } of responses) {
    const a = config.agentMap[agent];
    const label = a ? `${a.emoji} ${a.name}` : agent;
    entry += `**[${timeStr}] ${label}**\n${content}\n\n`;
  }
  entry += `---\n`;

  fs.appendFileSync(logFile, entry, 'utf-8');
}

module.exports = { writeConversationLog };
