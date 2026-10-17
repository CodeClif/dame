// "Your turn" notifications for play-over-days games (web push). Optional and per game.
import { SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY } from './config.js';
import { rpc } from './realtime.js';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** 'ready' | 'on' | 'denied' | 'needs-install' | 'unsupported' | 'off' (not set up) */
export async function pushState() {
  if (!VAPID_PUBLIC_KEY) return 'off';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'ready';
}

export function pushMessage(state) {
  return {
    off: 'Notifications aren’t set up for this site yet — use the share button to nudge your friend.',
    'needs-install': 'On iPhone, add Dame to your Home Screen first (Share → Add to Home Screen), then open it from there to turn on notifications.',
    unsupported: 'This browser can’t show notifications. Share the link to nudge your friend instead.',
    denied: 'Notifications are blocked for this site. You can allow them in your browser settings.',
    ready: 'Get a notification when it’s your turn.',
    on: 'You’ll get a notification when it’s your turn.',
  }[state];
}

const keyBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Ask permission (must be called from a tap) and register this phone for one game. */
export async function enablePush(gameId, token) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  return rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_days_subscribe', { p_id: gameId, p_token: token, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
}

/** Tell the other player it's their turn (no-op if they didn't turn notifications on). */
export function notifyOpponent(gameId, token) {
  if (!VAPID_PUBLIC_KEY) return;
  fetch(`${SUPABASE_URL}/functions/v1/dame-notify`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: gameId, token }),
  }).catch(() => {});
}
