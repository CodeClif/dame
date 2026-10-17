// The player's anonymous nickname and leaderboard group, kept on this phone only.
import { cleanNickname } from './protocol.js';

const KEY = 'dame.profile.v1';
let profile = { nick: '', group: '' };
try {
  profile = { ...profile, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  if (!profile.nick) profile.nick = JSON.parse(localStorage.getItem('dame.online.v1') || '{}').nick || '';
} catch { /* private mode */ }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* ignore */ } };

export const getNick = () => cleanNickname(profile.nick) || '';
export function setNick(n) {
  const clean = cleanNickname(n);
  if (clean) { profile.nick = clean; save(); }
  return clean;
}
export const getGroup = () => profile.group || '';
export function setGroup(id) { profile.group = /^[a-z0-9-]{2,40}$/.test(id) ? id : ''; save(); }

/** A random player number made on this phone, so leagues can tell two "Kofi"s apart. Not personal data. */
export function getPlayerId() {
  if (!/^[a-z0-9]{12,32}$/.test(profile.pid || '')) {
    const b = new Uint8Array(12);
    crypto.getRandomValues(b);
    profile.pid = [...b].map((x) => (x % 36).toString(36)).join('') + Date.now().toString(36).slice(-4);
    save();
  }
  return profile.pid;
}
