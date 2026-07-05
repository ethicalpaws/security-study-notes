/**
 * 修桥工程 · 群聊前端
 *
 * 设计来源（ChatGPT-Next-Web Store 模式）：
 *   所有状态集中在 Store 中，通过 setState() 统一修改。
 *   UI 层只读不写——状态变化自动触发渲染。
 *   彻底消灭全局 let 变量。
 *
 * 职责拆分：
 *   store.js     ← 状态管理（纯数据层）
 *   api.js       ← 网络请求（fetch 封装）
 *   ui/*.js      ← 渲染函数（DOM 操作）
 *   app.js       ← 初始化 + 事件绑定
 */

// ════════════════════════════════════════════════════════════
// Store — 集中状态管理
// ════════════════════════════════════════════════════════════

const store = {
  _state: {
    rooms: [],
    currentRoomId: null,
    roomHistory: [],
    activeAgents: ['guidelight', 'echo'],
    isLoading: false,
    connStatus: 'connecting', // 'connecting' | 'online' | 'offline'
  },
  _listeners: {},

  /** 获取状态副本 */
  get(key) { return this._state[key]; },

  /** 获取全部状态 */
  getAll() { return { ...this._state }; },

  /**
   * 统一状态修改
   * 设计来源：任何状态变更都经过 setState，自动通知监听器。
   *         监听器按 key 粒度订阅，只重新渲染变化的部分。
   */
  set(key, value) {
    const prev = this._state[key];
    if (prev === value) return;
    this._state[key] = value;
    this._notify(key, value, prev);
  },

  /** 批量更新 */
  setAll(partial) {
    for (const [key, value] of Object.entries(partial)) {
      const prev = this._state[key];
      if (prev !== value) {
        this._state[key] = value;
        this._notify(key, value, prev);
      }
    }
  },

  /**
   * 订阅状态变化
   * @param {string} key - 状态键名
   * @param {Function} fn - (newVal, oldVal) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = new Set();
    this._listeners[key].add(fn);
    return () => this._listeners[key].delete(fn);
  },

  _notify(key, newVal, oldVal) {
    const fns = this._listeners[key];
    if (fns) fns.forEach(fn => fn(newVal, oldVal));
  },
};

// ════════════════════════════════════════════════════════════
// API — 网络请求层
// ════════════════════════════════════════════════════════════

const api = {
  async rooms() {
    const r = await fetch('/api/rooms');
    return r.json();
  },
  async getRoom(id) {
    const r = await fetch(`/api/rooms/${id}`);
    return r.json();
  },
  async createRoom(name) {
    const r = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error((await r.json()).error || '创建失败');
    return r.json();
  },
  async deleteRoom(id) {
    const r = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || '删除失败');
    return r.json();
  },
};

// ════════════════════════════════════════════════════════════
// DOM 引用
// ════════════════════════════════════════════════════════════

const $ = (id) => document.getElementById(id);
const dom = {
  app: $('app'),
  roomBar: $('roomBar'),
  roomCount: $('roomCount'),
  agentBar: $('agentBar'),
  quickBar: $('quickBar'),
  chatArea: $('chatArea'),
  msgInput: $('msgInput'),
  sendBtn: $('sendBtn'),
  connStatus: $('connStatus'),
  createModal: $('createModal'),
  roomNameInput: $('roomNameInput'),
  modalCancel: $('modalCancel'),
  modalConfirm: $('modalConfirm'),
  confirmOverlay: $('confirmOverlay'),
  confirmMsg: $('confirmMsg'),
  confirmCancel: $('confirmCancel'),
  confirmDelete: $('confirmDelete'),
};

// ════════════════════════════════════════════════════════════
// 七战友数据
// ════════════════════════════════════════════════════════════

const AGENTS = [
  { id: 'guidelight', name: '引灯', emoji: '🔆', color: '#e8a87c' },
  { id: 'chronos',    name: '司辰', emoji: '⏳', color: '#85c1e9' },
  { id: 'anchor',     name: '岸舟', emoji: '⚓', color: '#73c6b6' },
  { id: 'echo',       name: '渡己', emoji: '🪞', color: '#c39bd3' },
  { id: 'libra',      name: '书衡', emoji: '⚖️', color: '#f7dc6f' },
  { id: 'lucero',     name: '衔光', emoji: '💡', color: '#f8c471' },
  { id: 'custos',     name: '藏卷', emoji: '🗡️', color: '#e6b0aa' },
];
const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.id, a]));
const MAX_CLIENT_HISTORY = 80;

// ════════════════════════════════════════════════════════════
// 工具函数
// ════════════════════════════════════════════════════════════

function now() {
  return new Date().toLocaleTimeString('zh-CN', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  });
}

// ════════════════════════════════════════════════════════════
// 渲染函数 — 房间栏
// ════════════════════════════════════════════════════════════

function renderRoomBar() {
  const rooms = store.get('rooms');
  const currentId = store.get('currentRoomId');
  const frag = document.createDocumentFragment();

  rooms.forEach(r => {
    const tab = document.createElement('div');
    tab.className = 'room-tab' + (r.id === currentId ? ' active' : '');
    tab.textContent = r.name;
    tab.dataset.roomId = r.id;

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('close')) return;
      switchRoom(r.id);
    });

    if (rooms.length > 1) {
      const close = document.createElement('span');
      close.className = 'close';
      close.textContent = '×';
      close.title = '删除房间';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        promptDeleteRoom(r.id, r.name);
      });
      tab.appendChild(close);
    }

    frag.appendChild(tab);
  });

  // + 按钮
  const addBtn = document.createElement('div');
  addBtn.className = 'room-tab-add';
  addBtn.textContent = '+';
  addBtn.title = '新建群聊';
  addBtn.addEventListener('click', openCreateModal);
  frag.appendChild(addBtn);

  dom.roomBar.replaceChildren(frag);
  dom.roomCount.textContent = `${rooms.length} 个房间`;
}

// ════════════════════════════════════════════════════════════
// 渲染函数 — 在场 Agent
// ════════════════════════════════════════════════════════════

function renderAgentBar() {
  const activeAgents = store.get('activeAgents');
  const frag = document.createDocumentFragment();

  AGENTS.forEach(a => {
    const isActive = activeAgents.includes(a.id);
    const btn = document.createElement('button');
    btn.className = 'agent-btn' + (isActive ? ' active' : '');
    btn.style.setProperty('--acolor', a.color);
    btn.innerHTML = `<span class="emoji">${a.emoji}</span> ${a.name}`;
    btn.title = `点击${isActive ? '移除' : '加入'}在场`;
    btn.onclick = () => {
      const newList = isActive
        ? activeAgents.filter(x => x !== a.id)
        : [...activeAgents, a.id];
      store.set('activeAgents', newList);
    };
    frag.appendChild(btn);
  });

  dom.agentBar.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════
// 渲染函数 — 快捷 @ 按钮
// ════════════════════════════════════════════════════════════

function renderQuickBar() {
  const frag = document.createDocumentFragment();
  AGENTS.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.style.setProperty('--acolor', a.color);
    btn.textContent = `@${a.name}`;
    btn.onclick = () => {
      dom.msgInput.focus();
      const cursor = dom.msgInput.selectionStart || dom.msgInput.value.length;
      const before = dom.msgInput.value.slice(0, cursor);
      const after = dom.msgInput.value.slice(cursor);
      dom.msgInput.value = before + `@${a.name} ` + after;
      dom.msgInput.focus();
      dom.msgInput.selectionStart = dom.msgInput.selectionEnd = cursor + a.name.length + 2;
    };
    frag.appendChild(btn);
  });
  dom.quickBar.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════
// 渲染函数 — 聊天区域
// ════════════════════════════════════════════════════════════

function renderChatArea() {
  const history = store.get('roomHistory');

  if (history.length === 0) {
    dom.chatArea.innerHTML = `
      <div class="empty-state">
        <div class="big">🕯️</div>
        <div class="text">开始新的对话</div>
        <div class="hint">输入消息，@战友名 指定回应者</div>
      </div>`;
    return;
  }

  dom.chatArea.replaceChildren();
  history.forEach((entry) => {
    const t = entry.timestamp || '';
    if (entry.role === 'user') {
      addMessageDOM('user', null, entry.content, t);
    } else if (entry.role === 'assistant') {
      addMessageDOM('agent', entry.name, entry.content, t);
    }
  });
  dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
}

// ════════════════════════════════════════════════════════════
// DOM 消息渲染（底层）
// ════════════════════════════════════════════════════════════

function addMessageDOM(type, agentId, content, time) {
  const empty = dom.chatArea.querySelector('.empty-state');
  if (empty) empty.remove();

  const group = document.createElement('div');
  group.className = 'msg-group';

  const msg = document.createElement('div');
  msg.className = `msg ${type}`;

  if (type === 'agent' && agentId) {
    const a = AGENT_MAP[agentId];
    msg.style.setProperty('--acolor', a?.color || '#8888a0');
    const hdr = document.createElement('div');
    hdr.className = 'msg-header';
    hdr.innerHTML = `${a?.emoji || ''} ${a?.name || agentId} <span class="time">${time || ''}</span>`;
    msg.appendChild(hdr);
    const body = document.createElement('div');
    body.textContent = content;
    msg.appendChild(body);
  } else if (type === 'user') {
    const hdr = document.createElement('div');
    hdr.className = 'msg-header';
    hdr.innerHTML = `临风 <span class="time">${time || ''}</span>`;
    msg.appendChild(hdr);
    const body = document.createElement('div');
    body.textContent = content;
    msg.appendChild(body);
  } else if (type === 'system') {
    msg.textContent = content;
  }

  group.appendChild(msg);
  dom.chatArea.appendChild(group);
  dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
  return msg;
}

function addMessage(type, agentId, content, time) {
  if (type === 'user' || type === 'agent' || type === 'system') {
    addMessageDOM(type, agentId, content, time);
  }
}

// ════════════════════════════════════════════════════════════
// 加载状态指示器
// ════════════════════════════════════════════════════════════

function showChatLoading(text = '思考中...') {
  const el = document.createElement('div');
  el.className = 'thinking-bar';
  el.id = '__thinkingBar';
  el.innerHTML = `<span>${text}</span><span class="pulse-dots"><span></span><span></span><span></span></span>`;
  dom.chatArea.appendChild(el);
  dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
}

function hideChatLoading() {
  const el = document.getElementById('__thinkingBar');
  if (el) el.remove();
}

function showAppLoading(text = '加载中...') {
  dom.chatArea.innerHTML = `<div class="app-loading"><div class="spinner"></div><div class="text">${text}</div></div>`;
}

function hideAppLoading() {
  const el = dom.chatArea.querySelector('.app-loading');
  if (el) el.remove();
}

// Agent 思考指示器
function addLoading(agentId) {
  const empty = dom.chatArea.querySelector('.empty-state');
  if (empty) empty.remove();

  const group = document.createElement('div');
  group.className = 'msg-group';
  const msg = document.createElement('div');
  msg.className = 'msg agent loading';
  msg.id = `loading-${agentId}`;
  const a = AGENT_MAP[agentId];
  msg.style.setProperty('--acolor', a?.color || '#8888a0');

  const hdr = document.createElement('div');
  hdr.className = 'msg-header';
  hdr.textContent = `${a?.emoji || ''} ${a?.name || agentId} 思考中...`;
  msg.appendChild(hdr);

  const dots = document.createElement('div');
  dots.className = 'dots';
  dots.innerHTML = '<span></span><span></span><span></span>';
  msg.appendChild(dots);

  group.appendChild(msg);
  dom.chatArea.appendChild(group);
  dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
}

function removeLoading(agentId) {
  const el = document.getElementById(`loading-${agentId}`);
  el?.remove();
}

function addRoutingInfo(agentIds) {
  const empty = dom.chatArea.querySelector('.empty-state');
  if (empty) empty.remove();

  const names = agentIds.map(id => AGENT_MAP[id]).filter(Boolean);
  if (names.length === 0) return;
  const div = document.createElement('div');
  div.className = 'routing-info';
  div.textContent = `☉ ${names.map(a => `${a.emoji} ${a.name}`).join(' · ')} 将回应`;
  dom.chatArea.appendChild(div);
  dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
}

// ════════════════════════════════════════════════════════════
// 房间切换
// ════════════════════════════════════════════════════════════

async function switchRoom(roomId) {
  const currentId = store.get('currentRoomId');
  const isLoading = store.get('isLoading');
  if (roomId === currentId || isLoading) return;

  store.set('currentRoomId', roomId);
  renderRoomBar();
  showAppLoading('加载聊天记录...');

  try {
    const room = await api.getRoom(roomId);
    if (!room) return;
    store.setAll({
      roomHistory: room.history || [],
      activeAgents: room.activeAgents || ['guidelight', 'echo'],
    });
    hideAppLoading();
    renderChatArea();
    renderAgentBar();
  } catch (err) {
    hideAppLoading();
    addMessage('system', null, `⚠️ 加载房间失败: ${err.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 房间创建
// ════════════════════════════════════════════════════════════

function openCreateModal() {
  dom.roomNameInput.value = '';
  dom.createModal.classList.add('open');
  setTimeout(() => dom.roomNameInput.focus(), 100);
}

async function handleCreateRoom() {
  const name = dom.roomNameInput.value.trim();
  if (!name) return;
  dom.createModal.classList.remove('open');
  try {
    const room = await api.createRoom(name);
    const rooms = [...store.get('rooms'), room];
    store.set('rooms', rooms);
    renderRoomBar();
    switchRoom(room.id);
  } catch (err) {
    addMessage('system', null, `⚠️ 创建房间失败: ${err.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 房间删除
// ════════════════════════════════════════════════════════════

let pendingDeleteId = null;

function promptDeleteRoom(id, name) {
  pendingDeleteId = id;
  dom.confirmMsg.textContent = `确定要删除「${name}」吗？聊天记录将永久丢失。`;
  dom.confirmOverlay.classList.add('open');
}

async function handleDeleteRoom() {
  if (!pendingDeleteId) return;
  dom.confirmOverlay.classList.remove('open');
  const id = pendingDeleteId;
  pendingDeleteId = null;
  try {
    await api.deleteRoom(id);
    const rooms = store.get('rooms').filter(r => r.id !== id);
    store.set('rooms', rooms);

    if (id === store.get('currentRoomId')) {
      const next = rooms[0];
      if (next) switchRoom(next.id);
    } else {
      renderRoomBar();
    }
    dom.roomCount.textContent = `${rooms.length} 个房间`;
  } catch (err) {
    addMessage('system', null, `⚠️ 删除房间失败: ${err.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 发送消息
// ════════════════════════════════════════════════════════════

async function sendMessage() {
  const message = dom.msgInput.value.trim();
  if (!message || store.get('isLoading')) return;

  store.set('isLoading', true);
  dom.msgInput.disabled = true;
  dom.sendBtn.disabled = true;

  const t = now();
  addMessage('user', null, message, t);

  const history = store.get('roomHistory');
  const updatedHistory = [...history, { role: 'user', content: message, timestamp: t }];
  store.set('roomHistory', updatedHistory);

  dom.msgInput.value = '';
  showChatLoading('分配回应者...');

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        activeAgents: store.get('activeAgents'),
        history: updatedHistory.slice(
          Math.max(0, updatedHistory.length - MAX_CLIENT_HISTORY), -1
        ),
        roomId: store.get('currentRoomId'),
      }),
    });

    if (!resp.ok) {
      hideChatLoading();
      const errText = await resp.text().catch(() => '请求失败');
      addMessage('system', null, `⚠️ ${errText}`);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'routing') {
            hideChatLoading();
            addRoutingInfo(data.agents);
            data.agents.forEach(id => addLoading(id));
          } else if (data.type === 'response') {
            removeLoading(data.agent);
            const rt = now();
            addMessage('agent', data.agent, data.content, rt);
            const newHistory = [...store.get('roomHistory'), {
              role: 'assistant',
              name: data.agent,
              content: data.content,
              timestamp: rt,
            }];
            store.set('roomHistory', newHistory);
          } else if (data.type === 'error') {
            removeLoading(data.agent);
            addMessage('system', null, `⚠️ ${AGENT_MAP[data.agent]?.name || data.agent}: ${data.error}`);
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      }
    }
  } catch (err) {
    hideChatLoading();
    addMessage('system', null, `⚠️ 网络错误: ${err.message}`);
  } finally {
    store.set('isLoading', false);
    dom.msgInput.disabled = false;
    dom.sendBtn.disabled = false;
    dom.msgInput.focus();
  }
}

// ════════════════════════════════════════════════════════════
// SSE 事件订阅（主动推送 + 连接状态）
// ════════════════════════════════════════════════════════════

let eventSource = null;

function subscribeEvents() {
  if (eventSource) eventSource.close();
  store.set('connStatus', 'connecting');
  updateConnStatusUI();

  eventSource = new EventSource('/api/events');

  eventSource.onopen = () => {
    store.set('connStatus', 'online');
    updateConnStatusUI();
  };

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'proactive') {
        if (data.roomId && data.roomId !== store.get('currentRoomId')) return;

        const empty = dom.chatArea.querySelector('.empty-state');
        if (empty) empty.remove();

        const rt = now();
        addMessage('agent', data.agent, data.content, rt);
        const newHistory = [...store.get('roomHistory'), {
          role: 'assistant',
          name: data.agent,
          content: data.content,
          timestamp: rt,
        }];
        store.set('roomHistory', newHistory);

        const tip = document.createElement('div');
        tip.className = 'routing-info';
        tip.textContent = `🕊 ${data.desc || '主动推送'}`;
        dom.chatArea.appendChild(tip);
        dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
      }
    } catch (_) {}
  };

  eventSource.onerror = () => {
    store.set('connStatus', 'offline');
    updateConnStatusUI();
    if (eventSource) eventSource.close();
    eventSource = null;
    setTimeout(subscribeEvents, 5000);
  };
}

function updateConnStatusUI() {
  const status = store.get('connStatus');
  const labels = { connecting: '连接中', online: '已连接', offline: '已断开' };
  dom.connStatus.innerHTML = `<span class="dot ${status}"></span> ${labels[status]}`;
}

// ════════════════════════════════════════════════════════════
// 初始化
// ════════════════════════════════════════════════════════════

async function init() {
  showAppLoading('连接服务器...');
  try {
    const rooms = await api.rooms();
    store.set('rooms', rooms);
    renderRoomBar();

    if (rooms.length > 0) {
      await switchRoom(rooms[0].id);
    } else {
      hideAppLoading();
    }
  } catch (err) {
    hideAppLoading();
    dom.chatArea.innerHTML = `
      <div class="app-loading" style="color:#e06c75;">
        <div>⚠️</div>
        <div class="text">加载失败: ${err.message}</div>
        <div class="hint" style="font-size:12px;opacity:0.6;margin-top:8px;">请确认服务器是否已启动</div>
      </div>`;
  }
  renderQuickBar();
  subscribeEvents();
  dom.msgInput.focus();
}

// ════════════════════════════════════════════════════════════
// 事件绑定
// ════════════════════════════════════════════════════════════

// 发送
dom.sendBtn.onclick = sendMessage;
dom.msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 订阅 activeAgents 变化 → 自动重绘
store.subscribe('activeAgents', () => renderAgentBar());
store.subscribe('rooms', () => renderRoomBar());

// 新建房间弹窗
dom.modalCancel.onclick = () => dom.createModal.classList.remove('open');
dom.modalConfirm.onclick = handleCreateRoom;
dom.roomNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleCreateRoom();
  if (e.key === 'Escape') dom.createModal.classList.remove('open');
});
dom.createModal.addEventListener('click', e => {
  if (e.target === dom.createModal) dom.createModal.classList.remove('open');
});

// 删除确认弹窗
dom.confirmCancel.onclick = () => {
  dom.confirmOverlay.classList.remove('open');
  pendingDeleteId = null;
};
dom.confirmDelete.onclick = handleDeleteRoom;
dom.confirmOverlay.addEventListener('click', e => {
  if (e.target === dom.confirmOverlay) {
    dom.confirmOverlay.classList.remove('open');
    pendingDeleteId = null;
  }
});

// ════════════════════════════════════════════════════════════
// 启动
// ════════════════════════════════════════════════════════════

init();
