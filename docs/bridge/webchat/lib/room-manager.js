/**
 * 修桥工程 · 房间管理器
 *
 * 设计来源（Open WebUI models/ 层）：
 *   数据访问与业务逻辑分离。RoomManager 只关心"如何存储/读取房间数据"，
 *   不关心"消息如何路由到 Agent"。
 *
 * 职责：
 *   - 房间的 CRUD
 *   - 消息持久化 + 自动截断归档
 *   - 原子写入（防崩溃）
 *
 * 上下文截断策略（三层防线）：
 *   第 1 层 前端 MAX_CLIENT_HISTORY → 只发最近 N 条给后端
 *   第 2 层 后端 buildTranscript()    → 只取最近 M 条进 LLM 上下文
 *   第 3 层 RoomManager.truncate()     → 总历史超限时归档最早消息
 */

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this._load();
    if (this.rooms.size === 0) {
      this.create('默认群聊');
    }
  }

  /** 创建房间 */
  create(name) {
    const id = this._genId();
    const now = new Date().toISOString();
    const room = {
      id,
      name: name || '新群聊',
      history: [],
      activeAgents: [...config.defaultActiveAgents],
      createdAt: now,
      updatedAt: now,
    };
    this.rooms.set(id, room);
    this._save();
    return this._sanitize(room);
  }

  /** 获取房间（含完整 history） */
  get(id) {
    const room = this.rooms.get(id);
    return room ? this._sanitize(room, true) : null;
  }

  /** 获取房间元数据（不含 history） */
  getMeta(id) {
    const room = this.rooms.get(id);
    return room ? this._sanitize(room, false) : null;
  }

  /** 房间列表（按更新时间倒序） */
  list() {
    return Array.from(this.rooms.values())
      .map(r => this._sanitize(r, false))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /** 删除房间（至少保留一个） */
  delete(id) {
    if (this.rooms.size <= 1) return false;
    const ok = this.rooms.delete(id);
    if (ok) this._save();
    return ok;
  }

  /** 追加一条消息 */
  appendHistory(id, entry) {
    const room = this.rooms.get(id);
    if (!room) return false;
    room.history.push(entry);
    room.updatedAt = new Date().toISOString();
    this._save();
    return true;
  }

  /** 批量追加，超量自动归档 */
  appendBatch(id, entries) {
    const room = this.rooms.get(id);
    if (!room) return false;
    room.history.push(...entries);
    this._truncateIfNeeded(room);
    room.updatedAt = new Date().toISOString();
    this._save();
    return true;
  }

  /** 更新房间的 activeAgents */
  updateActiveAgents(id, agentIds) {
    const room = this.rooms.get(id);
    if (!room) return false;
    room.activeAgents = agentIds;
    this._save();
    return true;
  }

  // ─── 内部 ───

  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 脱敏输出：按需返回 history
   * 设计来源：API 返回层不暴露内部存储格式，
   *         只暴露前端需要的字段（lastMessage 预览）。
   */
  _sanitize(room, includeHistory = false) {
    const base = {
      id: room.id,
      name: room.name,
      summary: room.summary || null,
      activeAgents: room.activeAgents,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      messageCount: room.history.length,
    };
    if (includeHistory) {
      base.history = room.history;
      if (room.history.length > 0) {
        const last = room.history[room.history.length - 1];
        base.lastMessage = {
          role: last.role,
          name: last.name || null,
          content: last.content.slice(0, 80) + (last.content.length > 80 ? '…' : ''),
        };
      }
    }
    return base;
  }

  /**
   * 原子写入
   * 设计来源：防止写文件一半时崩溃导致数据损坏。
   *          先写 .tmp，再 rename 覆盖原文件（rename 在 POSIX 上是原子操作）。
   */
  _save() {
    try {
      const plain = {};
      for (const [id, room] of this.rooms) {
        plain[id] = room;
      }
      const tmp = ROOMS_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(plain, null, 2), 'utf-8');
      fs.renameSync(tmp, ROOMS_FILE);
    } catch (err) {
      console.error('✗ 保存房间数据失败:', err.message);
    }
  }

  /**
   * 历史超出上限时：丢弃最早消息，生成一行摘要
   * 这样用户永远不会看到"消息已丢失"——只是旧消息被压缩成了一行归档提示。
   */
  _truncateIfNeeded(room) {
    const max = config.context.maxHistoryPerRoom;
    if (room.history.length <= max) return;

    const excess = room.history.length - max;
    const dropped = room.history.splice(0, excess);

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

    room.summary = `📜 ${dropped.length} 条已归档（临风 ${userCount} 条，${agentSummary}）`;
    console.log(`  ↳ 房间 ${room.id}: ${room.summary}`);
  }

  _load() {
    try {
      if (!fs.existsSync(ROOMS_FILE)) return;
      const raw = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf-8'));
      for (const [id, room] of Object.entries(raw)) {
        if (!room.history) room.history = [];
        if (!room.activeAgents) room.activeAgents = [...config.defaultActiveAgents];
        this.rooms.set(id, room);
      }
      console.log(`✓ 加载 ${this.rooms.size} 个房间`);
    } catch (err) {
      console.error('✗ 加载房间数据失败:', err.message);
    }
  }
}

module.exports = { RoomManager };
