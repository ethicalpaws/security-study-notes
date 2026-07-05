/**
 * 修桥工程 · SSE 事件总线
 *
 * 设计来源（Event-driven pattern in WebSocket/SSE 系统）：
 *   发布-订阅模式，Server-Sent Events 的客户端管理。
 *   任何模块都可以广播事件，不需要持有特定 response 对象的引用。
 *
 * 职责：
 *   - 管理所有 SSE 客户端连接
 *   - 广播事件到所有客户端
 *   - 自动清理断开的连接
 */

class SSEBus {
  constructor() {
    /** @type {Set<import('express').Response>} */
    this.clients = new Set();
  }

  /** 添加一个 SSE 客户端连接 */
  add(res) {
    this.clients.add(res);
  }

  /** 移除一个 SSE 客户端连接 */
  remove(res) {
    this.clients.delete(res);
  }

  /** 当前在线客户端数 */
  get size() {
    return this.clients.size;
  }

  /**
   * 广播事件到所有已连接的客户端
   * @param {object} event - 事件对象，会被 JSON.stringify
   *
   * 设计来源：每个客户端独立 try-catch，
   * 一个客户端断开不影响其他客户端。
   */
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(data);
      } catch (_) {
        this.clients.delete(client);
      }
    }
  }
}

module.exports = { SSEBus };
