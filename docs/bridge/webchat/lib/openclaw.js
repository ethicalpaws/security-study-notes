/**
 * 修桥工程 · OpenClaw 适配器（兼容层）
 *
 * 此文件已重构为 LINK LLM 模块的代理层。
 * 实际实现在 /modules/llm/，此处仅保持向后兼容。
 *
 * 设计：
 *   所有新代码应直接引用 modules/llm/index.js。
 *   此文件会随 bridge 的 Gateway 瘦身逐步淘汰。
 */

const path = require('path');

// 解析 modules/llm/ 的路径（支持从不同目录 require）
// 从 webchat/lib/ → docs/LINK/packages/llm/
const LLM_MODULE_PATH = path.resolve(__dirname, '..', '..', '..', 'LINK', 'packages', 'llm');
const { call, setProvider, getStatus } = require(LLM_MODULE_PATH);
const { config } = require('./config');

// ─── 启动时自动配置 ───

const { openclaw: ocConfig } = config;
if (ocConfig?.url) {
  setProvider({
    primary: {
      provider: 'openclaw',
      model: '',  // 由 agentId 动态决定
      baseUrl: ocConfig.url,
      token: ocConfig.token,
    },
  });
}

/**
 * 调用 OpenClaw（完全向后兼容）
 * @param {string} agentId
 * @param {Array} messages
 * @param {number} [retryCount]
 * @returns {Promise<string>}
 */
async function callOpenClaw(agentId, messages, retryCount) {
  try {
    return await call(agentId, messages);
  } catch (err) {
    throw err;
  }
}

module.exports = { callOpenClaw };
