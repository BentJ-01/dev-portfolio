import { esc, lobbyStatus, playerMap, participants } from '../lib/util.js';
import { serverNow } from '../lib/store.js';
import { avatar, chip, bar, BADGE } from './ui.js';

export const REASONS = {
  correct: 'Juist geraden',
  wrong: 'Fout geraden',
  no_vote: 'Niet gestemd',
  nobody_guessed: 'Niemand had je door',
  everyone_guessed: 'Iedereen had je door',
  suspect: 'Verdachte',
  nobody_right: 'Niemand had het juist',
  majority_wrong: 'Meerderheid zat fout',
  everyone_right: 'Iedereen had het juist',
  hopman: 'Hopman-badge',
};

export function secondsLeft(state) {
  const r = state?.round;
  if (!r?.closes_at) return 0;
  return Math.max(0, (Date.parse(r.closes_at) - serverNow()) / 1000);
}

/** Is de auteur al onthuld? (3 s na het sluiten van de stemming) */
export function authorRevealed(state) {
  const r = state?.round;
  if (!r || state.game.status === 'question') return false;
  if (state.game.status !== 'reveal') return true;
  const delay = (state.config?.reveal_author_delay_seconds ?? 3) * 1000;
  return serverNow() >= Date.parse(r.closed_at) + delay;
}

export function countdown(state, { large = false } = {}) {
  const r = state.round;
  const left = secondsLeft(state);
  const total = state.game.vote_seconds || 20;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = left <= 5;
  return `<div class="countdown ${large ? 'countdown-lg' : ''} ${urgent ? 'urgent' : ''}">
    <span class="countdown-num">${Math.ceil(left)}</span>
    <span class="countdown-track"><span style="width:${pct}%"></span></span>
    <span class="countdown-votes">${r.vote_count}/${r.eligible} gestemd</span>
  </div>`;
}

export function lobbyList(state, { tv = false } = {}) {
  const players = state.players;
  const ready = players.filter((p) => lobbyStatus(p).key === 'ready').length;
  return `<div class="lobby-head"><strong>${ready}/${players.length}</strong> klaar</div>
  <ul class="lobby-list ${tv ? 'lobby-tv' : ''}">
    ${players
      .map((p) => {
        const s = lobbyStatus(p);
        return `<li class="lobby-item st-${s.key}">
          ${avatar(p, { size: tv ? 64 : 40 })}
          <span class="lobby-name">${esc(p.name)}${p.is_admin ? ' <span class="muted">👑</span>' : ''}</span>
          <span class="status-pill">${s.key === 'ready' ? '✓ ' : ''}${esc(s.label)}</span>
        </li>`;
      })
      .join('')}
  </ul>`;
}

export function revealPanel(state, { tv = false } = {}) {
  const r = state.round;
  const map = playerMap(state);
  const shown = authorRevealed(state);
  const size = tv ? 44 : 30;

  if (r.type === 'truth_lie') {
    const d = r.distribution ?? { yes: { count: 0, voters: [] }, no: { count: 0, voters: [] } };
    const max = Math.max(1, d.yes.count + d.no.count);
    const row = (key, label, data) => {
      const right = shown && (key === 'yes') === r.is_true;
      return `<div class="dist-row ${right ? 'is-answer' : ''} ${shown && !right ? 'is-dim' : ''}">
        <span class="dist-label">${label}</span>
        <span class="dist-bar"><span style="width:${(data.count / max) * 100}%"></span></span>
        <span class="dist-count">${data.count}</span>
        ${tv ? `<span class="dist-voters">${data.voters.map((id) => avatar(map.get(id), { size: 28 })).join('')}</span>` : ''}
      </div>`;
    };
    return `<div class="reveal">
      <div class="dist dist-tl">${row('yes', '✅ Waar', d.yes)}${row('no', '❌ Leugen', d.no)}</div>
      <div class="reveal-answer ${shown ? 'show' : ''}">
        ${shown ? `Het was <strong class="${r.is_true ? 'txt-good' : 'txt-bad'}">${r.is_true ? 'WAAR' : 'GELOGEN'}</strong>!` : 'En het antwoord is…'}
      </div>
    </div>`;
  }

  const rows = [...(r.distribution ?? [])];
  if (shown && r.author_id && !rows.some((x) => x.id === r.author_id)) {
    rows.push({ id: r.author_id, count: 0, voters: [] });
  }
  const max = Math.max(1, ...rows.map((x) => x.count));
  const author = map.get(r.author_id);
  return `<div class="reveal">
    <div class="dist">
      ${
        rows.length
          ? rows
              .map((x) => {
                const p = map.get(x.id);
                const isAuthor = shown && x.id === r.author_id;
                return `<div class="dist-row ${isAuthor ? 'is-answer' : ''} ${shown && !isAuthor ? 'is-dim' : ''}">
                  <span class="dist-label">${avatar(p, { size })}<span>${esc(p?.name)}</span></span>
                  <span class="dist-bar"><span style="width:${(x.count / max) * 100}%"></span></span>
                  <span class="dist-count">${x.count}</span>
                  ${tv ? `<span class="dist-voters">${x.voters.map((id) => avatar(map.get(id), { size: 28 })).join('')}</span>` : ''}
                </div>`;
              })
              .join('')
          : '<p class="muted center">Niemand heeft gestemd 🙈</p>'
      }
    </div>
    <div class="reveal-answer ${shown ? 'show' : ''}">
      ${
        shown && author
          ? `<span class="reveal-author">${avatar(author, { size: tv ? 160 : 96, cls: 'pop' })}<span>Het was <strong>${esc(author.name)}</strong>!</span></span>`
          : 'En het was…'
      }
    </div>
  </div>`;
}

export function badgeBanner(state) {
  const r = state.round;
  if (!r?.scored) return '';
  const map = playerMap(state);
  const before = map.get(r.badge_before);
  const after = map.get(r.badge_after);
  const bonus = state.config?.badge_bonus_good ?? 5;
  if (after && before && after.id !== before.id) {
    return `<div class="badge-banner change">${BADGE} <strong>${esc(after.name)}</strong> pikt de Hopman-badge af van <strong>${esc(before.name)}</strong>!</div>`;
  }
  if (after && !before) {
    return `<div class="badge-banner change">${BADGE} <strong>${esc(after.name)}</strong> verovert de Hopman-badge!</div>`;
  }
  if (!after && before) {
    return `<div class="badge-banner lost">${BADGE} <strong>${esc(before.name)}</strong> verliest de Hopman-badge!</div>`;
  }
  if (after) {
    return `<div class="badge-banner keep">${BADGE} ${esc(after.name)} houdt de Hopman-badge (+${bonus} goede punten)</div>`;
  }
  return '';
}

export function drinkList(state, { size = 36 } = {}) {
  const map = playerMap(state);
  const drinks = state.results?.drinks ?? [];
  if (!drinks.length) return '<p class="muted">Niemand… voorlopig 😇</p>';
  return `<ul class="ad-list">${drinks
    .map((d) => {
      const givers = d.given_by.map((id) => map.get(id)?.name).filter(Boolean);
      const from = givers.length ? `<span class="muted small"> van ${esc([...new Set(givers)].join(', '))}</span>` : '';
      return `<li class="${givers.length ? 'fresh' : ''}">${chip(map.get(d.id), { size, extra: `<span class="times">x${d.count}</span>${from}` })}</li>`;
    })
    .join('')}</ul>`;
}

export function giverList(state, { size = 36 } = {}) {
  const map = playerMap(state);
  const givers = state.results?.givers ?? [];
  if (!givers.length) return '<p class="muted">Niemand</p>';
  return `<ul class="ad-list">${givers
    .map((g) => `<li>${chip(map.get(g.id), { size, extra: `<span class="times times-give">${g.open}x</span>` })}</li>`)
    .join('')}</ul>`;
}

export function standings(state, { size = 32 } = {}) {
  const per = state.config?.penalty_per_drink ?? 5;
  const good = state.config?.good_per_give ?? 10;
  const holder = state.game.badge_holder_id;
  return `<ul class="standings">${participants(state)
    .map(
      (p) => `<li>
        ${avatar(p, { size, badge: p.id === holder })}
        <span class="st-name">${esc(p.name)}${p.streak >= 2 ? ` <span class="streak">🔥${p.streak}</span>` : ''}</span>
        <span class="st-bars">
          <span class="st-bar">${bar(p.penalty, per, 'bad')}<span class="st-num">${p.penalty}/${per}</span></span>
          <span class="st-bar">${bar(p.good, good, 'good')}<span class="st-num">${p.good}/${good}</span></span>
        </span>
      </li>`,
    )
    .join('')}</ul>
  <p class="legend small muted"><span class="dot dot-bad"></span> strafpunten (${per} = adden) · <span class="dot dot-good"></span> goede punten (${good} = uitdelen)</p>`;
}

const AWARDS = [
  ['best_guesser', '🎯', 'Beste rader', (v) => `${v} juist`],
  ['longest_streak', '🔥', 'Langste streak', (v) => `${v} op rij`],
  ['badge_rounds', BADGE, 'Langst Hopman', (v) => `${v} ${v === 1 ? 'ronde' : 'rondes'}`],
  ['most_drunk', '🍺', 'Meeste adfundums gedronken', (v) => `${v}x`],
  ['most_given', '🎁', 'Meeste adfundums uitgedeeld', (v) => `${v}x`],
  ['most_suspect', '🕵️', 'Meest verdacht', (v) => `${v}x`],
];

export function finalPanel(state, { tv = false } = {}) {
  const f = state.final;
  if (!f) return '';
  const map = playerMap(state);
  const cards = AWARDS.map(([key, icon, title, fmt]) => {
    const list = f[key] ?? [];
    if (!list.length) {
      return `<article class="award"><div class="award-icon">${icon}</div><h3>${title}</h3><p class="muted">Niemand</p></article>`;
    }
    const top = list[0].value;
    const winners = list.filter((x) => x.value === top);
    const rest = list.filter((x) => x.value !== top);
    return `<article class="award">
      <div class="award-icon">${icon}</div>
      <h3>${title}</h3>
      <div class="award-winners">${winners
        .map((w) => `<div class="award-winner">${avatar(map.get(w.id), { size: tv ? 96 : 64 })}<strong>${esc(map.get(w.id)?.name)}</strong></div>`)
        .join('')}</div>
      <p class="award-value">${fmt(top)}</p>
      ${rest.length ? `<p class="small muted">${rest.map((x) => `${esc(map.get(x.id)?.name)} (${fmt(x.value)})`).join(' · ')}</p>` : ''}
    </article>`;
  });
  const hf = f.hardest_fact;
  if (hf) {
    const author = map.get(hf.author_id);
    cards.push(`<article class="award award-wide">
      <div class="award-icon">🧩</div>
      <h3>Moeilijkste weetje</h3>
      <blockquote>“${esc(hf.text)}”</blockquote>
      <div class="award-winner">${avatar(author, { size: tv ? 72 : 48 })}<strong>${esc(author?.name)}</strong></div>
      <p class="small muted">${hf.correct} van ${hf.eligible} juist geraden</p>
    </article>`);
  }
  return `<div class="awards ${tv ? 'awards-tv' : ''}">${cards.join('')}</div>`;
}
