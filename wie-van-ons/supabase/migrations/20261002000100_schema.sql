-- "Wie van ons?" — tabellen, RLS, seed.
-- Alle schrijfacties lopen via security definer RPC's (zie 20261002000200_functions.sql).

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.players (
  id            integer generated always as identity primary key,
  name          text not null unique,
  token         uuid unique,
  claimed_at    timestamptz,
  photo_path    text,
  photo_version integer not null default 0,
  is_admin      boolean not null default false
);
create unique index players_single_admin on public.players (is_admin) where is_admin;

create table public.facts (
  id         bigint generated always as identity primary key,
  player_id  integer not null references public.players (id) on delete cascade,
  type       text not null check (type in ('anon', 'truth_lie')),
  slot       smallint not null,
  text       text not null check (char_length(text) between 1 and 200),
  is_true    boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- max. 2 weetjes en 1 waarheid of leugen per speler
  unique (player_id, type, slot),
  check (
    (type = 'anon' and slot in (1, 2) and is_true is null)
    or (type = 'truth_lie' and slot = 1 and is_true is not null)
  )
);
create index facts_player_idx on public.facts (player_id);

create table public.config (
  id       smallint primary key default 1 check (id = 1),
  settings jsonb not null
);

create table public.game (
  id              smallint primary key default 1 check (id = 1),
  status          text not null default 'lobby'
                  check (status in ('lobby', 'question', 'reveal', 'results', 'finished')),
  current_round   integer not null default 0,
  question_count  integer not null default 30,
  vote_seconds    integer not null default 20,
  badge_holder_id integer references public.players (id) on delete set null,
  phase_until     timestamptz, -- einde van de reveal-fase
  started_at      timestamptz,
  version         bigint not null default 0, -- wordt bij elke wijziging verhoogd (realtime-signaal)
  updated_at      timestamptz not null default now()
);

create table public.player_streaks (
  player_id         integer primary key references public.players (id) on delete cascade,
  current_streak    integer not null default 0,
  best_streak       integer not null default 0,
  streak_reached_at timestamptz
);

create table public.rounds (
  id           bigint generated always as identity primary key,
  round_no     integer not null unique,
  fact_id      bigint not null references public.facts (id),
  is_golden    boolean not null default false,
  opened_at    timestamptz,
  closes_at    timestamptz,
  closed_at    timestamptz,
  scored_at    timestamptz,
  badge_before integer references public.players (id) on delete set null,
  badge_after  integer references public.players (id) on delete set null
);

create table public.votes (
  id          bigint generated always as identity primary key,
  round_id    bigint not null references public.rounds (id) on delete cascade,
  voter_id    integer not null references public.players (id) on delete cascade,
  suspect_id  integer references public.players (id) on delete cascade,
  answer_true boolean,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (round_id, voter_id),
  check ((suspect_id is null) <> (answer_true is null))
);

create table public.point_events (
  id             bigint generated always as identity primary key,
  round_id       bigint references public.rounds (id) on delete cascade,
  player_id      integer not null references public.players (id) on delete cascade,
  reason         text not null,
  penalty_points integer not null default 0,
  good_points    integer not null default 0,
  created_at     timestamptz not null default now()
);
create index point_events_player_idx on public.point_events (player_id);
create index point_events_round_idx on public.point_events (round_id);

create table public.adfundum_events (
  id          bigint generated always as identity primary key,
  round_id    bigint references public.rounds (id) on delete cascade,
  player_id   integer not null references public.players (id) on delete cascade,
  type        text not null check (type in ('drink', 'give')),
  given_by    integer references public.players (id) on delete set null,
  target_id   integer references public.players (id) on delete set null,
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index adfundum_events_player_idx on public.adfundum_events (player_id);
create index adfundum_events_round_idx on public.adfundum_events (round_id);

create table private.admin_secret (
  id       smallint primary key default 1 check (id = 1),
  key_hash text not null
);

-- ---------------------------------------------------------------------------
-- RLS: alles dicht, behalve lezen van `game` (nodig voor Realtime).
-- `game` bevat geen geheimen: enkel status, rondenummer, badgehouder en een versieteller.
-- ---------------------------------------------------------------------------

alter table public.players         enable row level security;
alter table public.facts           enable row level security;
alter table public.config          enable row level security;
alter table public.game            enable row level security;
alter table public.player_streaks  enable row level security;
alter table public.rounds          enable row level security;
alter table public.votes           enable row level security;
alter table public.point_events    enable row level security;
alter table public.adfundum_events enable row level security;
alter table private.admin_secret   enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.game to anon, authenticated;
create policy game_public_read on public.game for select to anon, authenticated using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game'
     ) then
    alter publication supabase_realtime add table public.game;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: publieke bucket voor avatars. Geen schrijfpolicies: enkel de Edge Function
-- (service role) schrijft.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

-- Alle spelparameters op één plek. Aanpassen kan in de Supabase table editor (tabel `config`).
insert into public.config (id, settings) values (1, '{
  "anon": {
    "wrong_penalty": 1,
    "no_vote_penalty": 1,
    "correct_good": 1,
    "nobody_guessed_author_good": 3,
    "everyone_guessed_author_penalty": 2,
    "suspect_penalty": 1
  },
  "truth_lie": {
    "wrong_penalty": 1,
    "no_vote_penalty": 1,
    "correct_good": 1,
    "majority_wrong_author_good": 2,
    "nobody_right_author_good": 3,
    "everyone_right_author_penalty": 2
  },
  "golden_every": 10,
  "golden_multiplier": 2,
  "penalty_per_drink": 5,
  "good_per_give": 10,
  "badge_min_streak": 2,
  "badge_bonus_good": 5,
  "reveal_author_delay_seconds": 3,
  "reveal_seconds": 9,
  "default_question_count": 30,
  "default_vote_seconds": 20,
  "max_text_length": 200
}');

insert into public.game (id) values (1);

insert into public.players (name, is_admin) values
  ('Anna', false), ('Annelien', false), ('Bent', true), ('Bertus', false),
  ('Cikke', false), ('Floewer', false), ('Hannah', false), ('Jakke', false),
  ('Jon', false), ('Lander', false), ('Maud', false), ('Pieter', false),
  ('Rosalie', false), ('Senne', false), ('Simon', false), ('Stien', false),
  ('Tikke', false), ('Waco', false);

insert into public.player_streaks (player_id) select id from public.players;
