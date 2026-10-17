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

-- ===================================================================== optional cleanup
-- Expired rooms are already invisible. To delete them, enable the pg_cron extension
-- (Database → Extensions) and run once:
--   select cron.schedule('dame-cleanup', '17 * * * *',
--     $$delete from public.dame_rooms where expires_at < now() - interval '1 day'$$);
