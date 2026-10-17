// Privacy-friendly counts: each event just adds one to a per-day total in Supabase.
// No names, no ids, no cookies, nothing about the device. Respects Do Not Track / GPC
// and the "Anonymous counts" switch in Settings.
import { SUPABASE_URL, SUPABASE_ANON_KEY, onlineConfigured } from './config.js';

let allowed = () => true;
export function setCountsAllowed(fn) { allowed = fn; }

const sent = new Set();
/** Count an event. `once` limits it to one per page load (e.g. an invite opened). */
export function count(event, { once = false } = {}) {
  try {
    if (!onlineConfigured() || !allowed() || !navigator.onLine) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    if (once && sent.has(event)) return;
    sent.add(event);
    fetch(`${SUPABASE_URL}/rest/v1/rpc/dame_count`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_event: event }),
    }).catch(() => {});
  } catch { /* never let counting break the game */ }
}
