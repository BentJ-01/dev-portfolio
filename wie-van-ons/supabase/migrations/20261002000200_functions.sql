-- "Wie van ons?" — RPC-functies.
-- Elke muterende functie neemt eerst een lock op de `game`-rij, zodat alle acties
-- (stemmen, sluiten, scoren, starten) netjes na elkaar gebeuren.

-- ---------------------------------------------------------------------------
-- Interne helpers (schema `private`, niet bereikbaar via de API)
-- ---------------------------------------------------------------------------

create or replace function private.cfg()
returns jsonb language sql stable set search_path = '' as $$
  select settings from public.config where id = 1;
$$;

create or replace function private.bump()
returns void language sql set search_path = '' as $$
  update public.game set version = version + 1, updated_at = now() where id = 1;
$$;

create or replace function private.lock_game()
returns public.game language sql set search_path = '' as $$
  select * from public.game where id = 1 for update;
$$;

create or replace function private.player_from_token(p_token uuid)
returns public.players language plpgsql stable set search_path = '' as $$
declare
  v_player public.players;
begin
  if p_token is not null then
    select * into v_player from public.players where token = p_token;
  end if;
  if v_player.id is null then
    raise exception 'Ongeldige of vervallen link. Vraag de admin om hulp.' using errcode = 'P0001';
  end if;
  return v_player;
end $$;

create or replace function private.check_admin(p_admin_key text)
returns void language plpgsql stable set search_path = '' as $$
begin
  if p_admin_key is null or not exists (
    select 1 from private.admin_secret
    where key_hash = encode(sha256(convert_to(p_admin_key, 'UTF8')), 'hex')
  ) then
    raise exception 'Ongeldige admin key.' using errcode = 'P0001';
  end if;
end $$;

-- Eenmalig uit te voeren in de SQL editor: select private.set_admin_key('<lange geheime sleutel>');
create or replace function private.set_admin_key(p_admin_key text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_admin_key is null or char_length(p_admin_key) < 12 then
    raise exception 'Kies een admin key van minstens 12 tekens.';
  end if;
  insert into private.admin_secret (id, key_hash)
  values (1, encode(sha256(convert_to(p_admin_key, 'UTF8')), 'hex'))
  on conflict (id) do update set key_hash = excluded.key_hash;
end $$;

create or replace function private.participant_count()
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.players where token is not null;
$$;

create or replace function private.all_voted(p_round_id bigint)
returns boolean language sql stable set search_path = '' as $$
  select (select count(*) from public.votes where round_id = p_round_id)
         >= greatest(private.participant_count() - 1, 1);
$$;

create or replace function private.open_round(p_round_no integer)
returns void language plpgsql set search_path = '' as $$
declare
  v_secs integer;
begin
  select vote_seconds into v_secs from public.game where id = 1;
  update public.rounds
     set opened_at = now(), closes_at = now() + make_interval(secs => v_secs), closed_at = null
   where round_no = p_round_no;
  update public.game
     set status = 'question', current_round = p_round_no, phase_until = null
   where id = 1;
  perform private.bump();
end $$;

create or replace function private.close_round()
returns void language plpgsql set search_path = '' as $$
begin
  update public.rounds set closed_at = now()
   where round_no = (select current_round from public.game where id = 1);
  update public.game
     set status = 'reveal',
         phase_until = now() + make_interval(secs => (private.cfg() ->> 'reveal_seconds')::integer)
   where id = 1;
  perform private.bump();
end $$;

-- Punten, streaks, Hopman-badge en omzetting naar adfundums voor de huidige ronde.
create or replace function private.score_round()
returns void language plpgsql set search_path = '' as $$
declare
  c        jsonb := private.cfg();
  tc       jsonb;
  g        public.game;
  r        public.rounds;
  f        public.facts;
  v_mult   integer;
  v_elig   integer;
  v_corr   integer;
  v_wrong  integer;
  v_max    integer;
  v_holder integer;
  v_new    integer;
  v_rec    record;
  v_n      integer;
begin
  select * into g from public.game where id = 1;
  select * into r from public.rounds where round_no = g.current_round;
  if r.id is null or r.scored_at is not null then
    return;
  end if;
  select * into f from public.facts where id = r.fact_id;
  tc := c -> f.type;
  v_mult := case when r.is_golden then (c ->> 'golden_multiplier')::integer else 1 end;

  -- 1. Stemmers: juist / fout / niet gestemd
  insert into public.point_events (round_id, player_id, reason, penalty_points, good_points)
  select r.id, o.player_id, o.reason,
         case o.reason
           when 'wrong'   then (tc ->> 'wrong_penalty')::integer
           when 'no_vote' then (tc ->> 'no_vote_penalty')::integer
           else 0 end * v_mult,
         case o.reason when 'correct' then (tc ->> 'correct_good')::integer else 0 end * v_mult
  from (
    select p.id as player_id,
           case
             when v.id is null then 'no_vote'
             when (f.type = 'anon' and v.suspect_id = f.player_id)
               or (f.type = 'truth_lie' and v.answer_true = f.is_true) then 'correct'
             else 'wrong'
           end as reason
    from public.players p
    left join public.votes v on v.round_id = r.id and v.voter_id = p.id
    where p.token is not null and p.id <> f.player_id
  ) o;

  select count(*) filter (where reason in ('correct', 'wrong', 'no_vote')),
         count(*) filter (where reason = 'correct'),
         count(*) filter (where reason = 'wrong')
    into v_elig, v_corr, v_wrong
    from public.point_events where round_id = r.id;

  -- 2. Streaks (de auteur blijft ongewijzigd)
  update public.player_streaks s
     set current_streak = s.current_streak + 1,
         best_streak = greatest(s.best_streak, s.current_streak + 1),
         streak_reached_at = v.updated_at
    from public.votes v
   where v.round_id = r.id and v.voter_id = s.player_id
     and exists (select 1 from public.point_events e
                  where e.round_id = r.id and e.player_id = s.player_id and e.reason = 'correct');

  update public.player_streaks s
     set current_streak = 0, streak_reached_at = null
   where exists (select 1 from public.point_events e
                  where e.round_id = r.id and e.player_id = s.player_id
                    and e.reason in ('wrong', 'no_vote'));

  -- 3. Auteur en verdachten
  if v_elig > 0 then
    if f.type = 'anon' then
      if v_corr = 0 then
        insert into public.point_events (round_id, player_id, reason, good_points)
        values (r.id, f.player_id, 'nobody_guessed', (tc ->> 'nobody_guessed_author_good')::integer * v_mult);
      elsif v_corr = v_elig then
        insert into public.point_events (round_id, player_id, reason, penalty_points)
        values (r.id, f.player_id, 'everyone_guessed', (tc ->> 'everyone_guessed_author_penalty')::integer * v_mult);
      end if;
    else
      if v_corr = 0 then
        insert into public.point_events (round_id, player_id, reason, good_points)
        values (r.id, f.player_id, 'nobody_right', (tc ->> 'nobody_right_author_good')::integer * v_mult);
      elsif v_wrong > v_corr then
        insert into public.point_events (round_id, player_id, reason, good_points)
        values (r.id, f.player_id, 'majority_wrong', (tc ->> 'majority_wrong_author_good')::integer * v_mult);
      end if;
      if v_corr = v_elig then
        insert into public.point_events (round_id, player_id, reason, penalty_points)
        values (r.id, f.player_id, 'everyone_right', (tc ->> 'everyone_right_author_penalty')::integer * v_mult);
      end if;
    end if;
  end if;

  if f.type = 'anon' then
    insert into public.point_events (round_id, player_id, reason, penalty_points)
    select r.id, x.suspect_id, 'suspect', (tc ->> 'suspect_penalty')::integer * v_mult
    from (
      select suspect_id, count(*) as n, max(count(*)) over () as top
      from public.votes where round_id = r.id group by suspect_id
    ) x
    where x.n = x.top and x.suspect_id <> f.player_id;
  end if;

  -- 4. Hopman-badge
  v_holder := g.badge_holder_id;
  select max(s.current_streak) into v_max
    from public.player_streaks s join public.players p on p.id = s.player_id
   where p.token is not null;

  if v_max is null or v_max < (c ->> 'badge_min_streak')::integer then
    v_new := null;
  elsif exists (select 1 from public.player_streaks
                 where player_id = v_holder and current_streak = v_max) then
    v_new := v_holder;
  else
    select s.player_id into v_new
      from public.player_streaks s join public.players p on p.id = s.player_id
     where p.token is not null and s.current_streak = v_max
     order by s.streak_reached_at asc nulls last, s.player_id
     limit 1;
  end if;

  if v_new is not null then
    -- niet verdubbeld bij een Gouden vraag
    insert into public.point_events (round_id, player_id, reason, good_points)
    values (r.id, v_new, 'hopman', (c ->> 'badge_bonus_good')::integer);
  end if;

  update public.game set badge_holder_id = v_new where id = 1;

  -- 5. Omzetting naar adfundums
  for v_rec in
    select player_id, sum(penalty_points) as pen, sum(good_points) as good
      from public.point_events group by player_id
  loop
    v_n := v_rec.pen / (c ->> 'penalty_per_drink')::integer;
    if v_n > 0 then
      insert into public.point_events (round_id, player_id, reason, penalty_points)
      values (r.id, v_rec.player_id, 'to_drink', -v_n * (c ->> 'penalty_per_drink')::integer);
      insert into public.adfundum_events (round_id, player_id, type, resolved, resolved_at)
      select r.id, v_rec.player_id, 'drink', true, now() from generate_series(1, v_n);
    end if;

    v_n := v_rec.good / (c ->> 'good_per_give')::integer;
    if v_n > 0 then
      insert into public.point_events (round_id, player_id, reason, good_points)
      values (r.id, v_rec.player_id, 'to_give', -v_n * (c ->> 'good_per_give')::integer);
      insert into public.adfundum_events (round_id, player_id, type)
      select r.id, v_rec.player_id, 'give' from generate_series(1, v_n);
    end if;
  end loop;

  update public.rounds
     set scored_at = now(), badge_before = v_holder, badge_after = v_new
   where id = r.id;
end $$;

create or replace function private.finish_reveal()
returns void language plpgsql set search_path = '' as $$
begin
  perform private.score_round();
  update public.game set status = 'results', phase_until = null where id = 1;
  perform private.bump();
end $$;

create or replace function private.clear_game_data()
returns void language plpgsql set search_path = '' as $$
begin
  delete from public.adfundum_events where true;
  delete from public.point_events where true;
  delete from public.votes where true;
  delete from public.rounds where true;
  insert into public.player_streaks (player_id) select id from public.players on conflict do nothing;
  update public.player_streaks
     set current_streak = 0, best_streak = 0, streak_reached_at = null where true;
  update public.game
     set status = 'lobby', current_round = 0, badge_holder_id = null,
         phase_until = null, started_at = null
   where id = 1;
end $$;

-- ---------------------------------------------------------------------------
-- Publieke state (gesanitized). Lekt nooit de auteur van een weetje of `is_true`
-- tijdens `question`, noch wie op wie stemde.
-- ---------------------------------------------------------------------------

create or replace function public.get_state(p_token uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c         jsonb := private.cfg();
  g         public.game;
  me        public.players;
  r         public.rounds;
  f         public.facts;
  v_reveal  boolean := false;
  v_players jsonb;
  v_counts  jsonb;
  v_round   jsonb;
  v_me      jsonb;
  v_results jsonb;
  v_final   jsonb;
begin
  select * into g from public.game where id = 1;

  if p_token is not null then
    select * into me from public.players where token = p_token;
  end if;

  if g.current_round > 0 then
    select * into r from public.rounds where round_no = g.current_round;
    select * into f from public.facts where id = r.fact_id;
    v_reveal := g.status in ('reveal', 'results', 'finished');
  end if;

  select coalesce(jsonb_agg(t.j order by lower(t.name)), '[]'::jsonb) into v_players
  from (
    select p.name, jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'is_admin', p.is_admin,
      'claimed', p.token is not null,
      'photo', case when p.photo_path is not null then p.photo_path || '?v=' || p.photo_version end,
      'anon_count', (select count(*) from public.facts x where x.player_id = p.id and x.type = 'anon'),
      'tl_count', (select count(*) from public.facts x where x.player_id = p.id and x.type = 'truth_lie'),
      'penalty', coalesce(pe.penalty, 0),
      'good', coalesce(pe.good, 0),
      'streak', coalesce(s.current_streak, 0),
      'best_streak', coalesce(s.best_streak, 0),
      'drinks', (select count(*) from public.adfundum_events a
                  where a.player_id = p.id and a.type = 'drink'),
      'given', (select count(*) from public.adfundum_events a
                 where a.player_id = p.id and a.type = 'give' and a.resolved),
      'open_gives', (select count(*) from public.adfundum_events a
                      where a.player_id = p.id and a.type = 'give' and not a.resolved)
    ) as j
    from public.players p
    left join public.player_streaks s on s.player_id = p.id
    left join lateral (
      select sum(e.penalty_points) as penalty, sum(e.good_points) as good
      from public.point_events e where e.player_id = p.id
    ) pe on true
  ) t;

  select jsonb_build_object(
           'anon', count(*) filter (where x.type = 'anon'),
           'truth_lie', count(*) filter (where x.type = 'truth_lie'))
    into v_counts
    from public.facts x join public.players p on p.id = x.player_id
   where p.token is not null;

  if r.id is not null then
    v_round := jsonb_build_object(
      'id', r.id,
      'no', r.round_no,
      'total', g.question_count,
      'golden', r.is_golden,
      'type', f.type,
      'text', f.text,
      'author_id', case when f.type = 'truth_lie' or v_reveal then f.player_id end,
      'is_true', case when f.type = 'truth_lie' and v_reveal then f.is_true end,
      'opened_at', r.opened_at,
      'closes_at', r.closes_at,
      'closed_at', r.closed_at,
      'vote_count', (select count(*) from public.votes v where v.round_id = r.id),
      'eligible', greatest(private.participant_count() - 1, 0),
      'scored', r.scored_at is not null,
      'badge_before', r.badge_before,
      'badge_after', r.badge_after,
      'distribution', case
        when not v_reveal then null
        when f.type = 'anon' then (
          select coalesce(jsonb_agg(jsonb_build_object('id', d.suspect_id, 'count', d.n, 'voters', d.voters)
                                    order by d.n desc, d.suspect_id), '[]'::jsonb)
          from (select suspect_id, count(*) as n, jsonb_agg(voter_id order by updated_at) as voters
                  from public.votes where round_id = r.id group by suspect_id) d)
        else (
          select jsonb_build_object(
            'yes', jsonb_build_object('count', count(*) filter (where answer_true),
                                      'voters', coalesce(jsonb_agg(voter_id) filter (where answer_true), '[]'::jsonb)),
            'no', jsonb_build_object('count', count(*) filter (where not answer_true),
                                     'voters', coalesce(jsonb_agg(voter_id) filter (where not answer_true), '[]'::jsonb)))
          from public.votes where round_id = r.id)
      end
    );
  end if;

  if me.id is not null then
    v_me := jsonb_build_object(
      'id', me.id,
      'name', me.name,
      'is_admin', me.is_admin,
      'facts', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'type', x.type, 'slot', x.slot,
                                                             'text', x.text, 'is_true', x.is_true)
                                          order by x.type, x.slot), '[]'::jsonb)
                  from public.facts x where x.player_id = me.id),
      'is_author', coalesce(f.player_id = me.id, false),
      'vote', (select jsonb_build_object('suspect_id', v.suspect_id, 'answer_true', v.answer_true)
                 from public.votes v where v.round_id = r.id and v.voter_id = me.id)
    );
  end if;

  if r.id is not null and g.status in ('results', 'finished') then
    v_results := jsonb_build_object(
      'drinks', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.player_id, 'count', d.n, 'given_by', d.givers)
                                  order by d.n desc, d.player_id), '[]'::jsonb)
        from (select player_id, count(*) as n,
                     coalesce(jsonb_agg(given_by order by id) filter (where given_by is not null), '[]'::jsonb) as givers
                from public.adfundum_events
               where type = 'drink' and round_id = r.id
               group by player_id) d),
      'givers', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.player_id, 'open', d.n) order by d.player_id), '[]'::jsonb)
        from (select player_id, count(*) as n from public.adfundum_events
               where type = 'give' and not resolved group by player_id) d),
      'points', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.player_id, 'penalty', d.pen, 'good', d.good,
                                                     'reasons', d.reasons)), '[]'::jsonb)
        from (select player_id, sum(penalty_points) as pen, sum(good_points) as good,
                     jsonb_agg(reason order by id) as reasons
                from public.point_events
               where round_id = r.id and reason not in ('to_drink', 'to_give')
               group by player_id) d)
    );
  end if;

  if g.status = 'finished' then
    v_final := jsonb_build_object(
      'best_guesser', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, count(*) as n from public.point_events
               where reason = 'correct' group by player_id order by n desc, player_id limit 3) d),
      'longest_streak', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, best_streak as n from public.player_streaks
               where best_streak > 0 order by best_streak desc, player_id limit 3) d),
      'badge_rounds', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, count(*) as n from public.point_events
               where reason = 'hopman' group by player_id order by n desc, player_id limit 3) d),
      'most_drunk', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, count(*) as n from public.adfundum_events
               where type = 'drink' group by player_id order by n desc, player_id limit 3) d),
      'most_given', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, count(*) as n from public.adfundum_events
               where type = 'give' and resolved group by player_id order by n desc, player_id limit 3) d),
      'most_suspect', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.pid, 'value', d.n) order by d.n desc, d.pid), '[]'::jsonb)
        from (select player_id as pid, count(*) as n from public.point_events
               where reason = 'suspect' group by player_id order by n desc, player_id limit 3) d),
      'hardest_fact', (
        select jsonb_build_object('text', x.text, 'author_id', x.player_id, 'correct', d.correct, 'eligible', d.elig)
        from (select r2.fact_id,
                     count(*) filter (where e.reason = 'correct') as correct,
                     count(*) filter (where e.reason in ('correct', 'wrong', 'no_vote')) as elig
                from public.rounds r2
                join public.point_events e on e.round_id = r2.id
               where r2.scored_at is not null
               group by r2.fact_id) d
        join public.facts x on x.id = d.fact_id
        where x.type = 'anon' and d.elig > 0
        order by d.correct::numeric / d.elig, d.correct, x.id
        limit 1)
    );
  end if;

  return jsonb_build_object(
    'server_now', clock_timestamp(),
    'version', g.version,
    'game', jsonb_build_object(
      'status', g.status,
      'current_round', g.current_round,
      'question_count', g.question_count,
      'vote_seconds', g.vote_seconds,
      'badge_holder_id', g.badge_holder_id,
      'phase_until', g.phase_until),
    'config', c,
    'players', v_players,
    'counts', v_counts,
    'round', v_round,
    'me', v_me,
    'token_valid', p_token is null or me.id is not null,
    'results', v_results,
    'final', v_final
  );
end $$;

-- Laat de server de fase doorschuiven als de timer verlopen is. Iedere client roept dit aan
-- wanneer zijn (gecorrigeerde) klok het einde van een fase bereikt; enkel de eerste heeft effect.
create or replace function public.tick()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  g public.game;
  r public.rounds;
begin
  select * into g from public.game where id = 1;
  if g.status = 'question' then
    select * into r from public.rounds where round_no = g.current_round;
    if now() >= r.closes_at or private.all_voted(r.id) then
      g := private.lock_game();
      if g.status = 'question' and g.current_round = r.round_no then
        perform private.close_round();
        return true;
      end if;
    end if;
  elsif g.status = 'reveal' and now() >= g.phase_until then
    g := private.lock_game();
    if g.status = 'reveal' then
      perform private.finish_reveal();
      return true;
    end if;
  end if;
  return false;
end $$;

-- ---------------------------------------------------------------------------
-- Speler-acties
-- ---------------------------------------------------------------------------

create or replace function public.claim_player(p_player_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g        public.game := private.lock_game();
  v_player public.players;
begin
  if g.status <> 'lobby' then
    raise exception 'Het spel is al begonnen.' using errcode = 'P0001';
  end if;
  select * into v_player from public.players where id = p_player_id for update;
  if v_player.id is null then
    raise exception 'Onbekende speler.' using errcode = 'P0001';
  end if;
  if v_player.is_admin then
    raise exception 'Deze naam kan enkel via de admin-link gekozen worden.' using errcode = 'P0001';
  end if;
  if v_player.token is not null then
    raise exception '% is al gekozen door iemand anders.', v_player.name using errcode = 'P0001';
  end if;

  update public.players set token = gen_random_uuid(), claimed_at = now()
   where id = p_player_id
   returning * into v_player;
  perform private.bump();
  return jsonb_build_object('token', v_player.token, 'player_id', v_player.id, 'name', v_player.name);
end $$;

create or replace function public.upsert_fact(
  p_token uuid, p_type text, p_text text, p_is_true boolean default null, p_fact_id bigint default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g      public.game := private.lock_game();
  me     public.players := private.player_from_token(p_token);
  v_text text := btrim(coalesce(p_text, ''));
  v_slot smallint;
  v_fact public.facts;
begin
  if g.status <> 'lobby' then
    raise exception 'Het spel is al begonnen, je kan niets meer wijzigen.' using errcode = 'P0001';
  end if;
  if p_type not in ('anon', 'truth_lie') then
    raise exception 'Ongeldig type.' using errcode = 'P0001';
  end if;
  if char_length(v_text) = 0 then
    raise exception 'Vul eerst iets in.' using errcode = 'P0001';
  end if;
  if char_length(v_text) > (private.cfg() ->> 'max_text_length')::integer then
    raise exception 'Maximaal % tekens.', private.cfg() ->> 'max_text_length' using errcode = 'P0001';
  end if;
  if p_type = 'truth_lie' and p_is_true is null then
    raise exception 'Kies of je stelling waar of gelogen is.' using errcode = 'P0001';
  end if;

  if p_fact_id is not null then
    update public.facts
       set text = v_text,
           is_true = case when p_type = 'truth_lie' then p_is_true end,
           updated_at = now()
     where id = p_fact_id and player_id = me.id and type = p_type
     returning * into v_fact;
    if v_fact.id is null then
      raise exception 'Weetje niet gevonden.' using errcode = 'P0001';
    end if;
  else
    select s into v_slot
      from generate_series(1, case when p_type = 'anon' then 2 else 1 end) s
     where not exists (select 1 from public.facts x
                        where x.player_id = me.id and x.type = p_type and x.slot = s)
     order by s limit 1;
    if v_slot is null then
      raise exception '%', case when p_type = 'anon' then 'Je hebt al 2 weetjes.'
                                else 'Je hebt al een waarheid of leugen.' end
        using errcode = 'P0001';
    end if;
    insert into public.facts (player_id, type, slot, text, is_true)
    values (me.id, p_type, v_slot, v_text, case when p_type = 'truth_lie' then p_is_true end)
    returning * into v_fact;
  end if;

  perform private.bump();
  return jsonb_build_object('id', v_fact.id, 'type', v_fact.type, 'slot', v_fact.slot,
                            'text', v_fact.text, 'is_true', v_fact.is_true);
end $$;

create or replace function public.delete_fact(p_token uuid, p_fact_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g  public.game := private.lock_game();
  me public.players := private.player_from_token(p_token);
begin
  if g.status <> 'lobby' then
    raise exception 'Het spel is al begonnen, je kan niets meer wijzigen.' using errcode = 'P0001';
  end if;
  delete from public.facts where id = p_fact_id and player_id = me.id;
  perform private.bump();
end $$;

create or replace function public.cast_vote(
  p_token uuid, p_round_id bigint, p_suspect_id integer default null, p_answer_true boolean default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g  public.game := private.lock_game();
  me public.players := private.player_from_token(p_token);
  r  public.rounds;
  f  public.facts;
begin
  if g.status <> 'question' then
    raise exception 'De stemming is gesloten.' using errcode = 'P0001';
  end if;
  select * into r from public.rounds where round_no = g.current_round;
  if r.id is distinct from p_round_id then
    raise exception 'Deze vraag is niet meer actief.' using errcode = 'P0001';
  end if;
  if now() > r.closes_at + interval '1 second' then
    raise exception 'De tijd is om.' using errcode = 'P0001';
  end if;
  select * into f from public.facts where id = r.fact_id;
  if f.player_id = me.id then
    raise exception 'Je kan niet stemmen op je eigen vraag.' using errcode = 'P0001';
  end if;

  if f.type = 'anon' then
    if p_suspect_id is null or p_answer_true is not null then
      raise exception 'Kies een speler.' using errcode = 'P0001';
    end if;
    if p_suspect_id = me.id then
      raise exception 'Je kan niet op jezelf stemmen.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.players where id = p_suspect_id and token is not null) then
      raise exception 'Deze speler doet niet mee.' using errcode = 'P0001';
    end if;
  else
    if p_answer_true is null or p_suspect_id is not null then
      raise exception 'Kies waar of leugen.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.votes (round_id, voter_id, suspect_id, answer_true)
  values (r.id, me.id, p_suspect_id, p_answer_true)
  on conflict (round_id, voter_id) do update
     set suspect_id = excluded.suspect_id, answer_true = excluded.answer_true, updated_at = now();

  if private.all_voted(r.id) then
    perform private.close_round();
  else
    perform private.bump();
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.give_adfundum(p_token uuid, p_target_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g      public.game := private.lock_game();
  me     public.players := private.player_from_token(p_token);
  r      public.rounds;
  v_give bigint;
begin
  if g.status not in ('results', 'finished') then
    raise exception 'Uitdelen kan enkel tijdens het adfundum-overzicht.' using errcode = 'P0001';
  end if;
  if p_target_id = me.id then
    raise exception 'Jezelf een adfundum geven? Respect, maar nee.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.players where id = p_target_id and token is not null) then
    raise exception 'Deze speler doet niet mee.' using errcode = 'P0001';
  end if;

  select id into v_give from public.adfundum_events
   where player_id = me.id and type = 'give' and not resolved
   order by id limit 1
   for update;
  if v_give is null then
    raise exception 'Je hebt geen adfundums meer om uit te delen.' using errcode = 'P0001';
  end if;

  select * into r from public.rounds where round_no = g.current_round;
  update public.adfundum_events
     set target_id = p_target_id, resolved = true, resolved_at = now()
   where id = v_give;
  insert into public.adfundum_events (round_id, player_id, type, given_by, resolved, resolved_at)
  values (r.id, p_target_id, 'drink', me.id, true, now());

  perform private.bump();
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Admin-acties
-- ---------------------------------------------------------------------------

create or replace function public.claim_admin(p_admin_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g        public.game;
  v_player public.players;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  select * into v_player from public.players where is_admin for update;
  if v_player.id is null then
    raise exception 'Er is geen admin-speler.' using errcode = 'P0001';
  end if;
  if v_player.token is null then
    update public.players set token = gen_random_uuid(), claimed_at = now()
     where id = v_player.id returning * into v_player;
    perform private.bump();
  end if;
  return jsonb_build_object('token', v_player.token, 'player_id', v_player.id, 'name', v_player.name);
end $$;

create or replace function public.release_claim(p_admin_key text, p_player_id integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.game;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  if g.status <> 'lobby' then
    raise exception 'Vrijgeven kan enkel in de lobby.' using errcode = 'P0001';
  end if;
  delete from public.facts where player_id = p_player_id;
  update public.players
     set token = null, claimed_at = null, photo_path = null, photo_version = photo_version + 1
   where id = p_player_id;
  perform private.bump();
end $$;

create or replace function public.start_game(
  p_admin_key text, p_question_count integer default null, p_vote_seconds integer default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c            jsonb := private.cfg();
  g            public.game;
  v_total      integer;
  v_anon_total integer;
  v_tl_total   integer;
  v_n          integer;
  v_tl_n       integer;
  v_anon_n     integer;
  v_secs       integer;
  v_golden     integer;
  v_ids        bigint[];
  v_auth       integer[];
  v_type       text[];
  v_order      integer[];
  v_best       integer[];
  v_rem        integer[];
  v_cand       integer[];
  v_pick       integer;
  v_last       integer;
  v_run        integer;
  v_viol       integer;
  v_best_viol  integer := 2147483647;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  if g.status <> 'lobby' then
    raise exception 'Het spel is al gestart.' using errcode = 'P0001';
  end if;
  if private.participant_count() < 3 then
    raise exception 'Er zijn minstens 3 spelers nodig.' using errcode = 'P0001';
  end if;

  select count(*), count(*) filter (where x.type = 'anon'), count(*) filter (where x.type = 'truth_lie')
    into v_total, v_anon_total, v_tl_total
    from public.facts x join public.players p on p.id = x.player_id
   where p.token is not null;
  if v_total = 0 then
    raise exception 'Er zijn nog geen weetjes ingediend.' using errcode = 'P0001';
  end if;

  v_n := least(greatest(coalesce(p_question_count, (c ->> 'default_question_count')::integer), 1), v_total);
  v_secs := least(greatest(coalesce(p_vote_seconds, (c ->> 'default_vote_seconds')::integer), 5), 300);

  -- verhouding weetjes/stellingen volgt die van wat ingediend is
  v_tl_n := least(round(v_n * v_tl_total::numeric / v_total)::integer, v_tl_total);
  v_anon_n := v_n - v_tl_n;
  if v_anon_n > v_anon_total then
    v_anon_n := v_anon_total;
    v_tl_n := v_n - v_anon_n;
  end if;

  -- Selectie: eerst één weetje per auteur, dan pas een tweede (zoveel mogelijk verschillende auteurs).
  -- Stellingen bij voorkeur van auteurs die nog weinig weetjes in de selectie hebben.
  with a as materialized (
    select x.id, x.player_id, x.type
      from public.facts x join public.players p on p.id = x.player_id
     where p.token is not null and x.type = 'anon'
     order by row_number() over (partition by x.player_id order by random()), random()
     limit v_anon_n
  ), t as materialized (
    select x.id, x.player_id, x.type
      from public.facts x join public.players p on p.id = x.player_id
     where p.token is not null and x.type = 'truth_lie'
     order by (select count(*) from a where a.player_id = x.player_id), random()
     limit v_tl_n
  )
  select array_agg(s.id), array_agg(s.player_id), array_agg(s.type)
    into v_ids, v_auth, v_type
    from (select * from a union all select * from t) s;

  -- Volgorde: willekeurig, maar nooit twee keer na elkaar dezelfde auteur en max. 2 stellingen
  -- na elkaar. Bij een doodlopende poging opnieuw; lukt het nooit, dan de poging met de minste
  -- overtredingen.
  for attempt in 1..400 loop
    v_rem := array(select generate_series(1, v_n));
    v_order := '{}';
    v_last := null;
    v_run := 0;
    v_viol := 0;
    while cardinality(v_rem) > 0 loop
      v_cand := array(
        select i from unnest(v_rem) as i
         where v_auth[i] is distinct from v_last
           and not (v_type[i] = 'truth_lie' and v_run >= 2));
      if cardinality(v_cand) = 0 then
        v_cand := v_rem;
        v_viol := v_viol + 1;
      end if;
      v_pick := v_cand[1 + floor(random() * cardinality(v_cand))::integer];
      v_order := v_order || v_pick;
      v_rem := array_remove(v_rem, v_pick);
      v_last := v_auth[v_pick];
      v_run := case when v_type[v_pick] = 'truth_lie' then v_run + 1 else 0 end;
    end loop;
    if v_viol < v_best_viol then
      v_best := v_order;
      v_best_viol := v_viol;
    end if;
    exit when v_viol = 0;
  end loop;

  perform private.clear_game_data();

  v_golden := coalesce((c ->> 'golden_every')::integer, 0);
  insert into public.rounds (round_no, fact_id, is_golden)
  select o.ord::integer, v_ids[o.idx], v_golden > 0 and o.ord % v_golden = 0
    from unnest(v_best) with ordinality as o (idx, ord);

  update public.game
     set question_count = v_n, vote_seconds = v_secs, started_at = now()
   where id = 1;
  perform private.open_round(1);

  return jsonb_build_object('questions', v_n, 'anon', v_anon_n, 'truth_lie', v_tl_n);
end $$;

create or replace function public.close_voting(p_admin_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.game;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  if g.status <> 'question' then
    raise exception 'Er is geen open stemming.' using errcode = 'P0001';
  end if;
  perform private.close_round();
end $$;

create or replace function public.next_round(p_admin_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.game;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  if g.status = 'reveal' then
    -- admin wacht de onthulling niet af: eerst scoren, dan pas verder
    perform private.finish_reveal();
    return;
  end if;
  if g.status <> 'results' then
    raise exception 'Je kan nu niet naar de volgende vraag.' using errcode = 'P0001';
  end if;
  if g.current_round >= g.question_count then
    update public.game set status = 'finished', phase_until = null where id = 1;
    perform private.bump();
  else
    perform private.open_round(g.current_round + 1);
  end if;
end $$;

-- p_full = false: terug naar lobby, punten weg, weetjes en claims blijven.
-- p_full = true: alles weg (claims, foto's, weetjes).
create or replace function public.reset_game(p_admin_key text, p_full boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.game;
begin
  perform private.check_admin(p_admin_key);
  g := private.lock_game();
  perform private.clear_game_data();
  if p_full then
    delete from public.facts where true;
    update public.players
       set token = null, claimed_at = null, photo_path = null, photo_version = photo_version + 1
     where true;
  end if;
  perform private.bump();
end $$;

-- ---------------------------------------------------------------------------
-- Enkel voor de Edge Function `upload_avatar` (service role)
-- ---------------------------------------------------------------------------

create or replace function public.avatar_upload_target(p_token uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  me public.players := private.player_from_token(p_token);
begin
  if (select status from public.game where id = 1) <> 'lobby' then
    raise exception 'Het spel is al begonnen, je foto ligt vast.' using errcode = 'P0001';
  end if;
  return me.id;
end $$;

create or replace function public.set_player_photo(p_token uuid, p_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g  public.game := private.lock_game();
  me public.players := private.player_from_token(p_token);
begin
  if g.status <> 'lobby' then
    raise exception 'Het spel is al begonnen, je foto ligt vast.' using errcode = 'P0001';
  end if;
  update public.players
     set photo_path = p_path, photo_version = photo_version + 1
   where id = me.id
   returning * into me;
  perform private.bump();
  return jsonb_build_object('photo', me.photo_path || '?v=' || me.photo_version);
end $$;

-- ---------------------------------------------------------------------------
-- Rechten
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.get_state(uuid),
  public.tick(),
  public.claim_player(integer),
  public.upsert_fact(uuid, text, text, boolean, bigint),
  public.delete_fact(uuid, bigint),
  public.cast_vote(uuid, bigint, integer, boolean),
  public.give_adfundum(uuid, integer),
  public.claim_admin(text),
  public.release_claim(text, integer),
  public.start_game(text, integer, integer),
  public.close_voting(text),
  public.next_round(text),
  public.reset_game(text, boolean),
  public.avatar_upload_target(uuid),
  public.set_player_photo(uuid, text)
from public, anon, authenticated;

grant execute on function public.get_state(uuid) to anon, authenticated;
grant execute on function public.tick() to anon, authenticated;
grant execute on function public.claim_player(integer) to anon, authenticated;
grant execute on function public.upsert_fact(uuid, text, text, boolean, bigint) to anon, authenticated;
grant execute on function public.delete_fact(uuid, bigint) to anon, authenticated;
grant execute on function public.cast_vote(uuid, bigint, integer, boolean) to anon, authenticated;
grant execute on function public.give_adfundum(uuid, integer) to anon, authenticated;
grant execute on function public.claim_admin(text) to anon, authenticated;
grant execute on function public.release_claim(text, integer) to anon, authenticated;
grant execute on function public.start_game(text, integer, integer) to anon, authenticated;
grant execute on function public.close_voting(text) to anon, authenticated;
grant execute on function public.next_round(text) to anon, authenticated;
grant execute on function public.reset_game(text, boolean) to anon, authenticated;

grant execute on function public.avatar_upload_target(uuid) to service_role;
grant execute on function public.set_player_photo(uuid, text) to service_role;
