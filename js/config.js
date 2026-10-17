// Supabase project used for online play, play over days, reports, leaderboards and counts.
// Use the project URL and the anon (public) key from Project Settings → API.
// Never put the service_role key here: this file is downloaded by every visitor.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
// Public VAPID key for "your turn" notifications (the private half lives only in the
// dame-notify Edge Function secrets). Leave empty to switch notifications off.
export const VAPID_PUBLIC_KEY = '';

export const onlineConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
