// A tiny client for Supabase Realtime (broadcast + presence) and PostgREST RPC calls.
// It speaks the Phoenix JSON protocol (vsn 1.0.0) directly, so online play costs a
// few kilobytes instead of the full supabase-js bundle.

const HEARTBEAT_MS = 25000;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];

export class RealtimeRoom {
  /**
   * @param {object} o
   * @param {string} o.url Supabase project URL
   * @param {string} o.key anon key
   * @param {string} o.topic channel name, e.g. "dame:ABC123"
   * @param {string} o.presenceKey stable id for this player in the room
   * @param {object} o.meta presence payload (kept small)
   * @param {(event: string, data: any) => void} o.onBroadcast
   * @param {(players: {key: string, meta: object}[]) => void} o.onPresence
   * @param {(status: 'connecting'|'connected'|'reconnecting'|'closed') => void} o.onStatus
   */
  constructor(o) {
    Object.assign(this, o);
    this.topic = `realtime:${o.topic}`;
    this.ref = 0;
    this.joinRef = null;
    this.joined = false;
    this.queue = [];
    this.presence = {};
    this.attempt = 0;
    this.closed = false;
    this.pendingBeat = null;
    this.onOnline = () => { if (!this.joined) this.reconnectNow(); };
    window.addEventListener('online', this.onOnline);
    this.open();
  }

  nextRef() { return String(++this.ref); }

  open() {
    if (this.closed) return;
    this.onStatus?.(this.attempt ? 'reconnecting' : 'connecting');
    const wsUrl = `${this.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(this.key)}&vsn=1.0.0`;
    let ws;
    try { ws = new WebSocket(wsUrl); } catch { this.scheduleReconnect(); return; }
    this.ws = ws;
    ws.onopen = () => this.join();
    ws.onmessage = (e) => { try { this.handle(JSON.parse(e.data)); } catch { /* ignore junk */ } };
    ws.onclose = () => this.dropped();
    ws.onerror = () => { try { ws.close(); } catch { /* already closed */ } };
  }

  raw(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  join() {
    this.joinRef = this.nextRef();
    this.raw({
      topic: this.topic,
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: this.presenceKey, enabled: true },
          postgres_changes: [],
          private: false,
        },
        access_token: this.key,
      },
      ref: this.joinRef,
      join_ref: this.joinRef,
    });
    clearInterval(this.beatTimer);
    this.beatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_MS);
  }

  heartbeat() {
    if (this.pendingBeat) { // no answer to the last one: the line is dead
      this.pendingBeat = null;
      try { this.ws?.close(); } catch { /* ignore */ }
      return;
    }
    this.pendingBeat = this.nextRef();
    this.raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: this.pendingBeat });
  }

  handle(msg) {
    if (msg.topic === 'phoenix') {
      if (msg.ref === this.pendingBeat) this.pendingBeat = null;
      return;
    }
    if (msg.topic !== this.topic) return;
    switch (msg.event) {
      case 'phx_reply':
        if (msg.ref === this.joinRef) {
          if (msg.payload?.status === 'ok') this.joinedOk();
          else this.dropped();
        }
        break;
      case 'broadcast':
        if (msg.payload?.event) this.onBroadcast?.(msg.payload.event, msg.payload.payload ?? {});
        break;
      case 'presence_state':
        this.presence = {};
        this.mergePresence(msg.payload, {});
        break;
      case 'presence_diff':
        this.mergePresence(msg.payload?.joins || {}, msg.payload?.leaves || {});
        break;
      case 'phx_error':
      case 'phx_close':
        this.dropped();
        break;
      default:
        break;
    }
  }

  joinedOk() {
    this.joined = true;
    this.attempt = 0;
    this.onStatus?.('connected');
    this.track(this.meta);
    const q = this.queue;
    this.queue = [];
    for (const [event, data] of q) this.send(event, data);
  }

  mergePresence(joins, leaves) {
    for (const [key, { metas = [] } = {}] of Object.entries(joins)) {
      const old = this.presence[key] || [];
      const refs = new Set(metas.map((m) => m.phx_ref));
      this.presence[key] = [...old.filter((m) => !refs.has(m.phx_ref)), ...metas];
    }
    for (const [key, { metas = [] } = {}] of Object.entries(leaves)) {
      const refs = new Set(metas.map((m) => m.phx_ref));
      const left = (this.presence[key] || []).filter((m) => !refs.has(m.phx_ref));
      if (left.length) this.presence[key] = left;
      else delete this.presence[key];
    }
    this.onPresence?.(Object.entries(this.presence).map(([key, metas]) => ({ key, meta: metas[metas.length - 1] })));
  }

  track(meta) {
    this.meta = meta;
    if (!this.joined) return;
    this.raw({ topic: this.topic, event: 'presence', payload: { type: 'presence', event: 'track', payload: meta }, ref: this.nextRef(), join_ref: this.joinRef });
  }

  /** Broadcast to everyone else in the room. Queued while (re)connecting. */
  send(event, data = {}) {
    if (!this.joined) {
      if (this.queue.length < 50) this.queue.push([event, data]);
      return;
    }
    this.raw({ topic: this.topic, event: 'broadcast', payload: { type: 'broadcast', event, payload: data }, ref: this.nextRef(), join_ref: this.joinRef });
  }

  dropped() {
    const wasJoined = this.joined;
    this.joined = false;
    this.pendingBeat = null;
    clearInterval(this.beatTimer);
    if (this.ws) { this.ws.onclose = null; try { this.ws.close(); } catch { /* ignore */ } this.ws = null; }
    if (this.closed) return;
    if (wasJoined) { this.presence = {}; this.onPresence?.([]); }
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.closed) return;
    this.onStatus?.('reconnecting');
    clearTimeout(this.retryTimer);
    const wait = BACKOFF_MS[Math.min(this.attempt++, BACKOFF_MS.length - 1)];
    this.retryTimer = setTimeout(() => this.open(), wait);
  }

  reconnectNow() {
    if (this.closed || this.ws) return;
    clearTimeout(this.retryTimer);
    this.open();
  }

  close() {
    this.closed = true;
    window.removeEventListener('online', this.onOnline);
    clearInterval(this.beatTimer);
    clearTimeout(this.retryTimer);
    if (this.joined) this.raw({ topic: this.topic, event: 'phx_leave', payload: {}, ref: this.nextRef(), join_ref: this.joinRef });
    if (this.ws) { this.ws.onclose = null; try { this.ws.close(); } catch { /* ignore */ } }
    this.onStatus?.('closed');
  }
}

/** Call a Postgres function exposed through PostgREST. Resolves to its JSON result, or throws. */
export async function rpc(url, key, fn, args = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${fn}: HTTP ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}
