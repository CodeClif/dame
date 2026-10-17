// Supabase project used for online play, chat reports and leaderboards.
// Use the project URL and the anon (public) key from Project Settings → API.
// Never put the service_role key here: this file is downloaded by every visitor.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const onlineConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
