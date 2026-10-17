-- Dame: Supabase tables and functions.
-- Paste this whole file into the Supabase SQL editor and run it. It is safe to run again.
--
-- Security model: every table has row level security switched on and NO policies, so the
-- anon key cannot read or write tables directly. The browser can only call the small
-- SECURITY DEFINER functions below, which check their inputs. No personal data is stored:
-- just room codes, move codes, anonymous nicknames and scores.

-- ===================================================================== online rooms

create table if not exists public.dame_rooms (
  code        text primary key check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '2 hours',
  options     jsonb not null default '{}'::jsonb,
  game        int not null default 1,
  first_turn  smallint not null default 1,
  moves       text[] not null default '{}',
  result      text
);
alter table public.dame_rooms enable row level security;
-- An explicit "deny everything" policy documents the intent (and keeps the advisor quiet):
-- clients go through the functions below, never the table.
drop policy if exists dame_rooms_no_direct_access on public.dame_rooms;
create policy dame_rooms_no_direct_access on public.dame_rooms as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.dame_create_room(p_code text, p_options jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if length(p_options::text) > 400 then raise exception 'options too large'; end if;
  insert into dame_rooms (code, options) values (p_code, p_options);
  return jsonb_build_object('code', p_code, 'created_at', now());
end $$;

create or replace function public.dame_get_room(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', code, 'created_at', created_at, 'options', options, 'game', game,
    'first_turn', first_turn, 'moves', to_jsonb(moves), 'result', result)
  from dame_rooms where code = p_code and expires_at > now();
$$;

-- Appends a move only if it is the next ply of the current game, so the stored game
-- can't fork. Legality is checked by both players' copies of the rules module.
create or replace function public.dame_push_move(p_code text, p_game int, p_ply int, p_move text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_move !~ '^[A-Za-z0-9_-]{2,20}$' then return false; end if;
  update dame_rooms set moves = array_append(moves, p_move)
   where code = p_code and expires_at > now() and game = p_game
     and cardinality(moves) = p_ply and cardinality(moves) < 500;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Rematch: move the room on to game p_game with the other side starting. Idempotent.
create or replace function public.dame_new_game(p_code text, p_game int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update dame_rooms set game = p_game, moves = '{}', first_turn = -first_turn, result = null
   where code = p_code and expires_at > now() and game = p_game - 1;
  return exists (select 1 from dame_rooms where code = p_code and game = p_game);
end $$;

create or replace function public.dame_finish(p_code text, p_game int, p_result text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update dame_rooms set result = left(p_result, 24)
   where code = p_code and game = p_game and result is null and expires_at > now();
  return found;
end $$;

-- ===================================================================== chat reports

create table if not exists public.dame_reports (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  room        text,
  nickname    text,
  message     text
);
alter table public.dame_reports enable row level security;
drop policy if exists dame_reports_no_direct_access on public.dame_reports;
create policy dame_reports_no_direct_access on public.dame_reports as restrictive for all to anon, authenticated using (false) with check (false);
create index if not exists dame_reports_room on public.dame_reports (room);

create or replace function public.dame_report(p_room text, p_nickname text, p_message text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- at most 20 reports per room, to stop the table being flooded
  if (select count(*) from dame_reports where room = p_room) >= 20 then return false; end if;
  insert into dame_reports (room, nickname, message)
  values (left(p_room, 6), left(p_nickname, 16), left(p_message, 80));
  return true;
end $$;

-- ===================================================================== permissions

revoke all on public.dame_rooms, public.dame_reports from anon, authenticated;
grant execute on function
  public.dame_create_room(text, jsonb), public.dame_get_room(text), public.dame_push_move(text, int, int, text),
  public.dame_new_game(text, int), public.dame_finish(text, int, text), public.dame_report(text, text, text)
  to anon, authenticated;

-- ===================================================================== cleanup (needed for the privacy promises)
-- Expired rooms are already invisible to the game. To actually delete old data, enable
-- the pg_cron extension (Database → Extensions → pg_cron) and run the block at the very
-- end of this file once.

-- ===================================================================== weekly leaderboards
-- Anonymous nicknames and a group id (campus, school or region from data/groups.json).
-- Points: computer win easy 1 / medium 2 / hard 3, online win 3, any finished online game 1,
-- daily puzzle solved 2. Weeks start on Monday (UTC). No personal data is kept.

create table if not exists public.dame_scores (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  week        date not null default (date_trunc('week', now() at time zone 'utc'))::date,
  nickname    text not null,
  group_id    text not null,
  points      smallint not null,
  reason      text not null
);
create index if not exists dame_scores_week on public.dame_scores (week);
create index if not exists dame_scores_nick on public.dame_scores (nickname, created_at);
alter table public.dame_scores enable row level security;
drop policy if exists dame_scores_no_direct_access on public.dame_scores;
create policy dame_scores_no_direct_access on public.dame_scores as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.dame_add_points(p_nickname text, p_group text, p_points int, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  allowed int := case p_reason
    when 'cpu-easy' then 1 when 'cpu-medium' then 2 when 'cpu-hard' then 3
    when 'online-win' then 3 when 'online-play' then 1 when 'puzzle' then 2 end;
begin
  if allowed is null or p_points <> allowed then return false; end if;
  if p_nickname !~ '^[^<>&"''\\]{2,16}$' or p_group !~ '^[a-z0-9-]{2,40}$' then return false; end if;
  -- simple flood limits per nickname
  if (select count(*) from dame_scores where nickname = p_nickname and created_at > now() - interval '10 minutes') >= 15 then return false; end if;
  if (select coalesce(sum(points), 0) from dame_scores where nickname = p_nickname and created_at > now() - interval '1 day') >= 80 then return false; end if;
  if p_reason = 'puzzle' and exists (select 1 from dame_scores where nickname = p_nickname and reason = 'puzzle' and created_at > date_trunc('day', now())) then return false; end if;
  insert into dame_scores (nickname, group_id, points, reason) values (p_nickname, p_group, p_points, p_reason);
  return true;
end $$;

create or replace function public.dame_leaderboard()
returns jsonb language sql stable security definer set search_path = public as $$
  with w as (
    select * from dame_scores where week = (date_trunc('week', now() at time zone 'utc'))::date
  ), players as (
    select nickname as n, group_id as g, sum(points)::int as p from w group by nickname, group_id order by p desc, n limit 20
  ), groups as (
    select group_id as g, sum(points)::int as p, count(distinct nickname)::int as c from w group by group_id order by p desc, g limit 20
  )
  select jsonb_build_object(
    'week', (date_trunc('week', now() at time zone 'utc'))::date,
    'players', coalesce((select jsonb_agg(to_jsonb(players)) from players), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(to_jsonb(groups)) from groups), '[]'::jsonb));
$$;

revoke all on public.dame_scores from anon, authenticated;
grant execute on function public.dame_add_points(text, text, int, text), public.dame_leaderboard() to anon, authenticated;

-- ===================================================================== anonymous counts
-- One row per day per event with a running total. No user id, no IP, no device id:
-- just "how many games were started today". Read it in the Table editor or with SQL.

create table if not exists public.dame_event_counts (
  day    date not null default (now() at time zone 'utc')::date,
  event  text not null,
  n      integer not null default 0,
  primary key (day, event)
);
alter table public.dame_event_counts enable row level security;
drop policy if exists dame_event_counts_no_direct_access on public.dame_event_counts;
create policy dame_event_counts_no_direct_access on public.dame_event_counts as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.dame_count(p_event text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_event !~ '^(game_start|game_finish)_(cpu|pnp|online|puzzle|days)$'
     and p_event not in ('invite_open', 'puzzle_play', 'puzzle_solve', 'puzzle_share', 'app_install') then
    return false;
  end if;
  insert into dame_event_counts (day, event, n) values ((now() at time zone 'utc')::date, p_event, 1)
  on conflict (day, event) do update set n = dame_event_counts.n + 1;
  return true;
end $$;

revoke all on public.dame_event_counts from anon, authenticated;
grant execute on function public.dame_count(text) to anon, authenticated;

-- ===================================================================== retention job
-- Run once after enabling pg_cron. Deletes what privacy.html promises to delete:
--   rooms a day after they close, reports after 90 days, scores after 12 weeks,
--   play-over-days games 30 days after their last move (they end after 14).
-- select cron.schedule('dame-retention', '17 3 * * *', $$
--   delete from public.dame_rooms   where expires_at < now() - interval '1 day';
--   delete from public.dame_reports where created_at < now() - interval '90 days';
--   delete from public.dame_scores  where created_at < now() - interval '12 weeks';
--   delete from public.dame_days_games where last_move_at < now() - interval '30 days';
-- $$);

-- ===================================================================== play over days
-- Turn-based games that wait for each player. No accounts: each seat has a random secret
-- token kept on that player's phone; the table stores only its SHA-256 hash.
-- A game ends 14 days after its last move (the player to move forfeits) and is deleted
-- 30 days after its last move by the retention job.

create table if not exists public.dame_days_games (
  id            text primary key check (id ~ '^[A-HJKMNP-Z2-9]{8}$'),
  created_at    timestamptz not null default now(),
  last_move_at  timestamptz not null default now(),
  options       jsonb not null default '{}'::jsonb,
  host_nick     text not null,
  guest_nick    text,
  host_lineup   text,
  guest_lineup  text,
  host_secret   text not null,
  guest_secret  text,
  first_turn    smallint not null default 1,
  moves         text[] not null default '{}',
  result        text
);
create index if not exists dame_days_last_move on public.dame_days_games (last_move_at);
alter table public.dame_days_games enable row level security;
drop policy if exists dame_days_games_no_direct_access on public.dame_days_games;
create policy dame_days_games_no_direct_access on public.dame_days_games as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.dame_hash(p_token text)
returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- The public view of a game: never the secrets.
create or replace function public.dame_days_view(g public.dame_days_games)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'created_at', g.created_at, 'last_move_at', g.last_move_at,
    'expires_at', g.last_move_at + interval '14 days',
    'expired', g.result is null and g.last_move_at < now() - interval '14 days',
    'options', g.options, 'host_nick', g.host_nick, 'guest_nick', g.guest_nick,
    'host_lineup', g.host_lineup, 'guest_lineup', g.guest_lineup,
    'first_turn', g.first_turn, 'moves', to_jsonb(g.moves), 'result', g.result,
    'has_guest', g.guest_secret is not null);
$$;

create or replace function public.dame_days_create(p_id text, p_token text, p_nick text, p_lineup text, p_options jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g dame_days_games;
begin
  if length(p_token) < 16 or p_nick !~ '^[^<>&"''\\]{2,16}$' or length(coalesce(p_lineup, '')) > 200 or length(p_options::text) > 300 then
    raise exception 'bad input';
  end if;
  insert into dame_days_games (id, host_nick, host_lineup, host_secret, options)
  values (p_id, p_nick, p_lineup, dame_hash(p_token), p_options) returning * into g;
  return dame_days_view(g);
end $$;

create or replace function public.dame_days_get(p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select dame_days_view(g) from dame_days_games g where g.id = p_id;
$$;

-- Take the free seat. Returns 'h' or 'g' for a player who already holds a seat, 'full' otherwise.
create or replace function public.dame_days_join(p_id text, p_token text, p_nick text, p_lineup text)
returns text language plpgsql security definer set search_path = public as $$
declare g dame_days_games; h text := dame_hash(p_token);
begin
  select * into g from dame_days_games where id = p_id for update;
  if not found then return 'missing'; end if;
  if g.host_secret = h then return 'h'; end if;
  if g.guest_secret = h then return 'g'; end if;
  if g.guest_secret is not null then return 'full'; end if;
  if length(p_token) < 16 or p_nick !~ '^[^<>&"''\\]{2,16}$' or length(coalesce(p_lineup, '')) > 200 then return 'bad'; end if;
  update dame_days_games set guest_secret = h, guest_nick = p_nick, guest_lineup = p_lineup where id = p_id;
  return 'g';
end $$;

-- A move is accepted only from the player whose turn it is, as the next ply, before expiry.
create or replace function public.dame_days_move(p_id text, p_token text, p_ply int, p_move text)
returns boolean language plpgsql security definer set search_path = public as $$
declare g dame_days_games; seat_side int; turn int;
begin
  if p_move !~ '^[A-Za-z0-9_-]{2,20}$' then return false; end if;
  select * into g from dame_days_games where id = p_id for update;
  if not found or g.result is not null or g.last_move_at < now() - interval '14 days' then return false; end if;
  if cardinality(g.moves) <> p_ply or cardinality(g.moves) >= 500 then return false; end if;
  seat_side := case dame_hash(p_token) when g.host_secret then 1 when g.guest_secret then -1 else 0 end;
  turn := case when p_ply % 2 = 0 then g.first_turn else -g.first_turn end;
  if seat_side = 0 or seat_side <> turn or g.guest_secret is null and seat_side = -1 then return false; end if;
  update dame_days_games set moves = array_append(moves, p_move), last_move_at = now() where id = p_id;
  return true;
end $$;

-- Record the end: a win on the board, a resignation, or a forfeit after 14 quiet days.
create or replace function public.dame_days_finish(p_id text, p_token text, p_result text)
returns boolean language plpgsql security definer set search_path = public as $$
declare g dame_days_games; h text := dame_hash(p_token);
begin
  if p_result !~ '^(1|-1|0):[a-z-]{2,16}$' then return false; end if;
  select * into g from dame_days_games where id = p_id for update;
  if not found or g.result is not null then return false; end if;
  if h is distinct from g.host_secret and h is distinct from g.guest_secret then return false; end if;
  update dame_days_games set result = p_result where id = p_id;
  delete from dame_push_subs where game_id = p_id;
  return true;
end $$;

-- Summaries for the "My games" screen (up to 50 ids at a time).
create or replace function public.dame_days_list(p_ids text[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(dame_days_view(g)), '[]'::jsonb)
  from dame_days_games g where g.id = any (p_ids[1:50]);
$$;

-- ===================================================================== "your turn" push notifications
-- Optional. A browser push subscription (an address at the browser's push service) per seat,
-- deleted when the game ends.

create table if not exists public.dame_push_subs (
  game_id     text not null references public.dame_days_games (id) on delete cascade,
  seat        text not null check (seat in ('h', 'g')),
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  primary key (game_id, seat)
);
alter table public.dame_push_subs enable row level security;
drop policy if exists dame_push_subs_no_direct_access on public.dame_push_subs;
create policy dame_push_subs_no_direct_access on public.dame_push_subs as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.dame_days_subscribe(p_id text, p_token text, p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql security definer set search_path = public as $$
declare g dame_days_games; h text := dame_hash(p_token); s text;
begin
  if p_endpoint !~ '^https://' or length(p_endpoint) > 600 or length(p_p256dh) > 200 or length(p_auth) > 100 then return false; end if;
  select * into g from dame_days_games where id = p_id;
  if not found or g.result is not null then return false; end if;
  s := case h when g.host_secret then 'h' when g.guest_secret then 'g' end;
  if s is null then return false; end if;
  insert into dame_push_subs (game_id, seat, endpoint, p256dh, auth) values (p_id, s, p_endpoint, p_p256dh, p_auth)
  on conflict (game_id, seat) do update set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  return true;
end $$;

create or replace function public.dame_days_unsubscribe(p_id text, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare g dame_days_games; h text := dame_hash(p_token);
begin
  select * into g from dame_days_games where id = p_id;
  if not found then return false; end if;
  delete from dame_push_subs where game_id = p_id and seat = case h when g.host_secret then 'h' when g.guest_secret then 'g' end;
  return true;
end $$;

revoke all on public.dame_days_games, public.dame_push_subs from anon, authenticated;
revoke all on function public.dame_days_view(public.dame_days_games) from public, anon, authenticated;
grant execute on function
  public.dame_days_create(text, text, text, text, jsonb), public.dame_days_get(text), public.dame_days_join(text, text, text, text),
  public.dame_days_move(text, text, int, text), public.dame_days_finish(text, text, text), public.dame_days_list(text[]),
  public.dame_days_subscribe(text, text, text, text, text), public.dame_days_unsubscribe(text, text)
  to anon, authenticated;
