/**
 * 修桥工程 · 主动推送调度器
 *
 * 设计来源（Cron-like Schedule Pattern）：
 *   取代飞书的主动提醒能力。定时任务定义为纯数据，
 *   调度器只负责"到什么时间，调用哪个 Agent，发什么 prompt"。
 *   这是"策略模式"的体现——任务逻辑在配置中，不在代码中。
 *
 * 职责：
 *   - 按配置的时间表定时触发 Agent 主动发言
 *   - 防重复触发（同一任务 90 秒窗口内不二次触发）
 *   - 通过 SSE 广播推送给前端
 *   - 持久化到房间历史 + 日志
 */

const { config } = require('./config');
const { callOpenClaw } = require('./openclaw');
const { writeConversationLog } = require('./logger');

class PushScheduler {
  /**
   * @param {import('./room-manager').RoomManager} roomManager
   * @param {import('./sse-bus').SSEBus} sseBus
   */
  constructor(roomManager, sseBus) {
    this.roomManager = roomManager;
    this.sseBus = sseBus;
    /** @type {Map<string, number>} 上次触发时间戳 */
    this.lastFired = new Map();
    /** @type {NodeJS.Timeout|null} */
    this._timer = null;
  }

  /** 启动调度器 */
  start() {
    if (this._timer) return;
    const { checkIntervalMs } = config.scheduler;
    console.log(`⏰ 主动推送调度器已启动 (${config.pushSchedule.length} 个定时任务)`);

    this._timer = setInterval(() => this._tick(), checkIntervalMs);
  }

  /** 停止调度器 */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** 每 30 秒检查一次 */
  _tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    const targetRoom = this.roomManager.list()[0];
    if (!targetRoom) return;

    for (const job of config.pushSchedule) {
      if (job.hour !== h || job.minute !== m) continue;

      const key = `${job.agent}-${job.hour}:${job.minute}`;
      const last = this.lastFired.get(key);
      if (last && (Date.now() - last) < config.scheduler.dedupWindowMs) continue;

      this.lastFired.set(key, Date.now());
      console.log(`  ↳ 触发主动推送: ${job.desc || job.agent}`);

      this._execute(targetRoom.id, job).catch(err => {
        console.error(`  ↳ 推送失败 ${job.desc}:`, err.message);
      });
    }
  }

  /** 执行一次主动推送 */
  async _execute(roomId, job) {
    const agent = config.agentMap[job.agent];
    if (!agent) return;

    const response = await callOpenClaw(job.agent, [
      { role: 'user', content: job.prompt },
    ]);

    // 持久化到房间
    this.roomManager.appendHistory(roomId, {
      role: 'assistant',
      name: job.agent,
      content: response,
    });

    // SSE 广播给前端
    this.sseBus.broadcast({
      type: 'proactive',
      agent: job.agent,
      content: response,
      desc: job.desc,
      roomId,
    });

    // 写日志
    try {
      writeConversationLog(`[${job.desc}]`, [{ agent: job.agent, content: response }]);
    } catch (_) {}

    console.log(`  ↳ ✓ ${job.desc} 推送完成`);
  }
}

module.exports = { PushScheduler };
