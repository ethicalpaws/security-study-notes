/**
 * 修桥工程 · 聊天路由（SSE 流式响应）
 *
 * 设计来源（Open WebUI routes/ 层）：
 *   路由只做：解析请求 → 设置 SSE 头部 → 调用 service 发事件 → 清理。
 *   所有业务逻辑委托给 lib/ 模块。
 */

const { Router } = require('express');
const { config } = require('../lib/config');
const { callOpenClaw } = require('../lib/openclaw');
const {
  determineResponders,
  buildAgentPrompt,
} = require('../lib/chat-service');
const { writeConversationLog } = require('../lib/logger');

/** 默认"在场"列表 */
const DEFAULT_ACTIVE = config.defaultActiveAgents;

/**
 * @param {import('../lib/room-manager').RoomManager} roomManager
 */
function createChatRoute(roomManager) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { message, activeAgents = [], history = [], roomId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    let targetRoom = null;
    if (roomId) {
      targetRoom = roomManager.getMeta(roomId);
      if (!targetRoom) {
        return res.status(404).json({ error: '房间不存在' });
      }
    }

    const agentList = determineResponders(message, activeAgents);

    // 设置 SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // 推送路由信息
    res.write(`data: ${JSON.stringify({ type: 'routing', agents: agentList })}\n\n`);

    const accumulated = [...history];
    const responses = [];
    let hasError = false;

    for (let i = 0; i < agentList.length; i++) {
      const agentId = agentList[i];
      const agent = config.agentMap[agentId];
      if (!agent) continue;

      try {
        const isFirst = i === 0;
        const isLast = i === agentList.length - 1;

        const messages = buildAgentPrompt(
          agentId,
          message,
          accumulated,
          isFirst,
          isLast,
          targetRoom,
        );

        const response = await callOpenClaw(agentId, messages);
        responses.push({ agent: agentId, content: response });

        res.write(`data: ${JSON.stringify({ type: 'response', agent: agentId, content: response })}\n\n`);

        accumulated.push({ role: 'assistant', name: agentId, content: response });

        // Agent 间短暂延迟
        if (!isLast) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (err) {
        hasError = true;
        res.write(`data: ${JSON.stringify({ type: 'error', agent: agentId, error: err.message })}\n\n`);
      }
    }

    // 持久化
    if (targetRoom) {
      const entries = [
        { role: 'user', content: message },
        ...responses.map(r => ({ role: 'assistant', name: r.agent, content: r.content })),
      ];
      roomManager.appendBatch(roomId, entries);
      if (activeAgents.length > 0) {
        roomManager.updateActiveAgents(roomId, activeAgents);
      }
    }

    // 日志
    try {
      writeConversationLog(message, responses);
    } catch (err) {
      console.error('写日志失败:', err.message);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', hasError })}\n\n`);
    res.end();
  });

  return router;
}

module.exports = { createChatRoute };
