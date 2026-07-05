/**
 * 修桥工程 · 房间管理路由
 *
 * 设计来源（Open WebUI routes/ 层）：
 *   路由函数只做三件事：解析请求参数 → 调用服务 → 格式化响应。
 *   不包含任何业务逻辑。
 */

const { Router } = require('express');

/**
 * @param {import('../lib/room-manager').RoomManager} roomManager
 */
function createRoomRoutes(roomManager) {
  const router = Router();

  /** 获取房间列表 */
  router.get('/', (req, res) => {
    res.json(roomManager.list());
  });

  /** 创建房间 */
  router.post('/', (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '房间名不能为空' });
    }
    const room = roomManager.create(name.trim());
    res.json(room);
  });

  /** 获取单个房间（含历史） */
  router.get('/:id', (req, res) => {
    const room = roomManager.get(req.params.id);
    if (!room) return res.status(404).json({ error: '房间不存在' });
    res.json(room);
  });

  /** 删除房间 */
  router.delete('/:id', (req, res) => {
    const ok = roomManager.delete(req.params.id);
    if (!ok) {
      return res.status(400).json({ error: '无法删除（至少保留一个房间，或房间不存在）' });
    }
    res.json({ success: true });
  });

  return router;
}

module.exports = { createRoomRoutes };
