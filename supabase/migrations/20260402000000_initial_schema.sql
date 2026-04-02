-- PeaPod initial schema (Supabase Postgres)
-- Maps spec "users" entity to public.profiles (auth.users is canonical identity).

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helpers: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (app user; spec "users")
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- New Supabase auth user -> profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Provider accounts (metadata safe for client UI)
-- -----------------------------------------------------------------------------
create table public.provider_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_name text not null check (provider_name in ('spotify', 'apple_music')),
  provider_user_id text not null,
  account_status text not null default 'linked' check (account_status in ('linked', 'revoked', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_name)
);

create index provider_accounts_user_id_idx on public.provider_accounts (user_id);

create trigger provider_accounts_set_updated_at
before update on public.provider_accounts
for each row execute function public.set_updated_at();

alter table public.provider_accounts enable row level security;

create policy "provider_accounts_select_own"
  on public.provider_accounts for select
  using (auth.uid() = user_id);

create policy "provider_accounts_insert_own"
  on public.provider_accounts for insert
  with check (auth.uid() = user_id);

create policy "provider_accounts_update_own"
  on public.provider_accounts for update
  using (auth.uid() = user_id);

create policy "provider_accounts_delete_own"
  on public.provider_accounts for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- OAuth credentials (server / service role only — no user-facing policies)
-- -----------------------------------------------------------------------------
create table public.provider_oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_account_id uuid not null references public.provider_accounts (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_account_id)
);

create trigger provider_oauth_credentials_set_updated_at
before update on public.provider_oauth_credentials
for each row execute function public.set_updated_at();

alter table public.provider_oauth_credentials enable row level security;
-- Intentionally no policies: authenticated cannot read/write; use service role on server.

-- -----------------------------------------------------------------------------
-- Music graph (normalized)
-- -----------------------------------------------------------------------------
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artists_set_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_date date,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger albums_set_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  duration_ms integer,
  explicit boolean default false,
  preview_url text,
  album_id uuid references public.albums (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tracks_set_updated_at
before update on public.tracks
for each row execute function public.set_updated_at();

create table public.track_artists (
  track_id uuid not null references public.tracks (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  artist_order smallint not null default 0,
  primary key (track_id, artist_id)
);

create table public.provider_track_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null check (provider_name in ('spotify', 'apple_music')),
  provider_track_id text not null,
  track_id uuid not null references public.tracks (id) on delete cascade,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_name, provider_track_id)
);

create trigger provider_track_mappings_set_updated_at
before update on public.provider_track_mappings
for each row execute function public.set_updated_at();

create table public.provider_artist_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null check (provider_name in ('spotify', 'apple_music')),
  provider_artist_id text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_name, provider_artist_id)
);

create trigger provider_artist_mappings_set_updated_at
before update on public.provider_artist_mappings
for each row execute function public.set_updated_at();

-- Service / ingestion can write; users do not read raw catalog tables directly in MVP UI
-- (tighten later with read policies if needed for debugging).
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.track_artists enable row level security;
alter table public.provider_track_mappings enable row level security;
alter table public.provider_artist_mappings enable row level security;

-- Allow authenticated users to read catalog (for dashboards); writes via service role or trusted RPC later
create policy "artists_read_authenticated" on public.artists for select to authenticated using (true);
create policy "albums_read_authenticated" on public.albums for select to authenticated using (true);
create policy "tracks_read_authenticated" on public.tracks for select to authenticated using (true);
create policy "track_artists_read_authenticated" on public.track_artists for select to authenticated using (true);
create policy "provider_track_mappings_read_authenticated" on public.provider_track_mappings for select to authenticated using (true);
create policy "provider_artist_mappings_read_authenticated" on public.provider_artist_mappings for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Listening & stats
-- -----------------------------------------------------------------------------
create table public.listening_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_account_id uuid not null references public.provider_accounts (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  listened_at timestamptz not null,
  source_context text,
  duration_listened_ms integer,
  skipped boolean default false,
  replayed boolean default false,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index listening_events_user_listened_at_idx on public.listening_events (user_id, listened_at desc);

create table public.user_track_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  play_count integer not null default 0,
  repeat_score numeric,
  last_played_at timestamptz,
  affinity_score numeric,
  updated_at timestamptz not null default now(),
  unique (user_id, track_id)
);

create trigger user_track_stats_set_updated_at
before update on public.user_track_stats
for each row execute function public.set_updated_at();

create table public.user_artist_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  play_count integer not null default 0,
  affinity_score numeric,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, artist_id)
);

create trigger user_artist_stats_set_updated_at
before update on public.user_artist_stats
for each row execute function public.set_updated_at();

create table public.user_pattern_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  profile_type text not null,
  profile_key text not null,
  profile_value_json jsonb not null,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, profile_type, profile_key)
);

create trigger user_pattern_profiles_set_updated_at
before update on public.user_pattern_profiles
for each row execute function public.set_updated_at();

alter table public.listening_events enable row level security;
alter table public.user_track_stats enable row level security;
alter table public.user_artist_stats enable row level security;
alter table public.user_pattern_profiles enable row level security;

create policy "listening_events_own" on public.listening_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_track_stats_own" on public.user_track_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_artist_stats_own" on public.user_artist_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_pattern_profiles_own" on public.user_pattern_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Sessions (group / party)
-- -----------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  session_code text not null unique,
  session_type text not null check (session_type in ('group', 'party')),
  mode_setting text not null default 'equal_play'
    check (mode_setting in ('equal_play', 'lean_toward_driver', 'most_hype_wins')),
  status text not null default 'lobby' check (status in ('lobby', 'active', 'ended')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  weighting_multiplier numeric not null default 1,
  joined_at timestamptz not null default now(),
  is_driver boolean not null default false,
  unique (session_id, user_id)
);

create table public.session_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  queue_position integer not null,
  score numeric,
  source_type text not null check (source_type in ('ai', 'vote', 'member_add', 'fallback')),
  added_by_user_id uuid references public.profiles (id) on delete set null,
  is_played boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_queue_session_position_idx on public.session_queue (session_id, queue_position);

create trigger session_queue_set_updated_at
before update on public.session_queue
for each row execute function public.set_updated_at();

create table public.session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  vote_value integer not null default 1,
  created_at timestamptz not null default now(),
  unique (session_id, user_id, track_id)
);

create table public.session_activity (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  activity_type text not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

-- Session RLS: members + host
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.session_queue enable row level security;
alter table public.session_votes enable row level security;
alter table public.session_activity enable row level security;

create policy "sessions_visible_to_members"
  on public.sessions for select
  using (
    auth.uid() = host_user_id
    or exists (
      select 1 from public.session_members m
      where m.session_id = sessions.id and m.user_id = auth.uid()
    )
  );

create policy "sessions_host_update"
  on public.sessions for update
  using (auth.uid() = host_user_id);

create policy "sessions_host_insert"
  on public.sessions for insert
  with check (auth.uid() = host_user_id);

create policy "session_members_visible"
  on public.session_members for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_members.session_id
        and (
          s.host_user_id = auth.uid()
          or exists (select 1 from public.session_members sm where sm.session_id = s.id and sm.user_id = auth.uid())
        )
    )
  );

create policy "session_members_insert_self"
  on public.session_members for insert
  with check (auth.uid() = user_id);

create policy "session_queue_visible"
  on public.session_queue for select
  using (
    exists (
      select 1 from public.session_members m
      where m.session_id = session_queue.session_id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.sessions s
      where s.id = session_queue.session_id and s.host_user_id = auth.uid()
    )
  );

-- Inserts/updates on queue: host or RPC later; for MVP allow host only
create policy "session_queue_host_write"
  on public.session_queue for insert
  with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.host_user_id = auth.uid())
  );

create policy "session_queue_host_update"
  on public.session_queue for update
  using (
    exists (select 1 from public.sessions s where s.id = session_id and s.host_user_id = auth.uid())
  );

create policy "session_votes_visible"
  on public.session_votes for select
  using (
    exists (
      select 1 from public.session_members m
      where m.session_id = session_votes.session_id and m.user_id = auth.uid()
    )
  );

create policy "session_votes_insert_own"
  on public.session_votes for insert
  with check (auth.uid() = user_id);

create policy "session_activity_visible"
  on public.session_activity for select
  using (
    exists (
      select 1 from public.session_members m
      where m.session_id = session_activity.session_id and m.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Generated playlists (after sessions for FK)
-- -----------------------------------------------------------------------------
create table public.generated_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  source_type text not null check (source_type in ('solo', 'chatbot', 'group', 'party_fill')),
  title text not null,
  prompt_text text,
  explanation_text text,
  created_at timestamptz not null default now()
);

create table public.generated_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  generated_playlist_id uuid not null references public.generated_playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  rank integer not null,
  score numeric,
  reason_json jsonb
);

create index generated_playlist_tracks_playlist_idx on public.generated_playlist_tracks (generated_playlist_id, rank);

alter table public.generated_playlists enable row level security;
alter table public.generated_playlist_tracks enable row level security;

create policy "generated_playlists_select"
  on public.generated_playlists for select
  using (
    (user_id is not null and auth.uid() = user_id)
    or (
      session_id is not null
      and exists (
        select 1 from public.session_members m
        where m.session_id = generated_playlists.session_id
          and m.user_id = auth.uid()
      )
    )
  );

create policy "generated_playlists_insert"
  on public.generated_playlists for insert
  with check (
    (user_id is not null and auth.uid() = user_id)
    or (
      session_id is not null
      and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  );

create policy "generated_playlists_update"
  on public.generated_playlists for update
  using (
    (user_id is not null and auth.uid() = user_id)
    or (
      session_id is not null
      and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  );

create policy "generated_playlist_tracks_select"
  on public.generated_playlist_tracks for select
  using (
    exists (
      select 1 from public.generated_playlists gp
      where gp.id = generated_playlist_id
        and (
          (gp.user_id is not null and gp.user_id = auth.uid())
          or (
            gp.session_id is not null
            and exists (
              select 1 from public.session_members m
              where m.session_id = gp.session_id
                and m.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "generated_playlist_tracks_write"
  on public.generated_playlist_tracks for insert
  with check (
    exists (
      select 1 from public.generated_playlists gp
      where gp.id = generated_playlist_id
        and (
          (gp.user_id is not null and gp.user_id = auth.uid())
          or (
            gp.session_id is not null
            and exists (
              select 1 from public.sessions s
              where s.id = gp.session_id
                and s.host_user_id = auth.uid()
            )
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- Chatbot + sync jobs
-- -----------------------------------------------------------------------------
create table public.chatbot_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_text text not null,
  interpreted_mood text,
  interpreted_context text,
  response_summary text,
  created_at timestamptz not null default now()
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_account_id uuid not null references public.provider_accounts (id) on delete cascade,
  sync_type text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_text text,
  metadata_json jsonb
);

alter table public.chatbot_requests enable row level security;
alter table public.sync_jobs enable row level security;

create policy "chatbot_requests_own" on public.chatbot_requests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sync_jobs_own" on public.sync_jobs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Realtime: enable for session tables (Supabase dashboard or SQL)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.session_queue;
alter publication supabase_realtime add table public.session_votes;
alter publication supabase_realtime add table public.session_members;
alter publication supabase_realtime add table public.sessions;
