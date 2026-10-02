import { subscribe, getState, getError, refresh } from '../lib/store.js';
import { rpc, uploadAvatar } from '../lib/supabase.js';
import { getToken, setToken, getAdminKey } from '../lib/local.js';
import {
  esc,
  setHtml,
  playerMap,
  participants,
  lobbyStatus,
  playUrl,
  joinUrl,
  copyText,
  wakeLock,
} from '../lib/util.js';
import { avatar, chip, toast, toastError, confirmDialog, typeTag, bar, BADGE } from '../components/ui.js';
import {
  lobbyList,
  revealPanel,
  badgeBanner,
  drinkList,
  giverList,
  standings,
  finalPanel,
  countdown,
  secondsLeft,
  authorRevealed,
  REASONS,
} from '../components/sections.js';
import { cropImage } from '../components/cropper.js';

const SKELETONS = {
  lobby: `
    <section class="card" id="profile"></section>
    <section class="card" id="facts"></section>
    <details class="card" id="link"></details>
    <section class="card"><h3>Lobby</h3><div id="lobby-list"></div></section>`,
  question: `
    <div class="q-head" id="q-head"></div>
    <div id="q-text"></div>
    <div id="q-timer"></div>
    <div id="q-body"></div>`,
  reveal: `
    <div class="q-head" id="q-head"></div>
    <div id="rv-verdict"></div>
    <div id="rv-panel"></div>`,
  results: `
    <div class="q-head" id="q-head"></div>
    <div id="rs-recap"></div>
    <div id="rs-badge"></div>
    <div id="rs-me"></div>
    <div id="rs-give"></div>
    <section class="card"><h3>🍺 Moet adden</h3><div id="rs-drinks"></div></section>
    <section class="card"><h3>🎁 Mag uitdelen</h3><div id="rs-givers"></div></section>
    <details class="card"><summary><h3>📊 Tussenstand</h3></summary><div id="rs-standings"></div></details>`,
  finished: `
    <div class="finish-head"><div class="big-emoji">🏁</div><h1>Einde van het spel!</h1></div>
    <div id="rs-me"></div>
    <div id="rs-give"></div>
    <div id="fin-awards"></div>
    <details class="card"><summary><h3>📊 Eindstand</h3></summary><div id="rs-standings"></div></details>`,
};

export function playView(root, params) {
  const fromUrl = params.get('t');
  if (fromUrl) {
    setToken(fromUrl);
    // token niet in de adresbalk laten staan
    history.replaceState(null, '', '#/play');
    refresh();
  }
  if (!getToken()) {
    location.hash = '#/join';
    return null;
  }

  root.innerHTML = `<div class="phone play">
    <header class="topbar" id="topbar"></header>
    <main id="main"></main>
    <section id="admin"></section>
  </div>`;
  const $ = (sel) => root.querySelector(sel);
  const main = $('#main');
  const adminEl = $('#admin');

  const local = {
    skeleton: null,
    adminSkeleton: null,
    factsSig: null,
    editing: new Set(), // keys van bestaande weetjes in bewerkmodus
    drafts: {}, // key -> { text, isTrue }
    uploading: false,
    pendingVote: null,
  };

  // ------------------------------------------------------------------ render

  function render(state = getState(), error = getError()) {
    if (!state || state.fetchedWith !== getToken()) {
      setHtml(main, error ? `<p class="error center">${esc(error.message)}</p>` : '<p class="center muted">Laden…</p>');
      return;
    }
    if (!state.me) {
      // token ongeldig (vrijgegeven of volledige reset)
      location.hash = getAdminKey() ? '#/admin' : '#/join';
      return;
    }
    const map = playerMap(state);
    const me = state.me;
    const status = state.game.status;

    renderTopbar(state, map, error);

    const key = status === 'lobby' ? 'lobby' : `${status}:${state.round?.id ?? ''}`;
    if (local.skeleton !== key) {
      main.innerHTML = SKELETONS[status];
      main.__html = null;
      local.skeleton = key;
      local.factsSig = null;
      local.pendingVote = null;
      if (status === 'lobby') renderLink();
      window.scrollTo({ top: 0 });
    }

    if (status === 'lobby') renderLobby(state, map, me);
    else if (status === 'question') renderQuestion(state, map, me);
    else if (status === 'reveal') renderReveal(state, map, me);
    else if (status === 'results') renderResults(state, map, me);
    else if (status === 'finished') renderFinished(state, map, me);

    renderAdmin(state, map);
  }

  function renderTopbar(state, map, error) {
    const p = map.get(state.me.id);
    const r = state.round;
    const where =
      state.game.status === 'lobby'
        ? 'Lobby'
        : state.game.status === 'finished'
          ? 'Einde'
          : `Vraag ${r?.no ?? '?'}/${r?.total ?? '?'}`;
    setHtml(
      $('#topbar'),
      `${avatar(p, { size: 36, badge: state.game.badge_holder_id === p.id })}
      <strong class="topbar-name">${esc(p.name)}</strong>
      ${p.streak >= 2 ? `<span class="streak">🔥${p.streak}</span>` : ''}
      <span class="spacer"></span>
      ${error ? '<span class="offline" title="Geen verbinding">⚠️ offline</span>' : ''}
      <span class="topbar-where">${where}</span>`,
    );
  }

  const qHead = (r) => `<div class="q-tags">${typeTag(r)}</div>`;

  // ------------------------------------------------------------------ lobby

  function renderLink() {
    const url = playUrl(getToken());
    $('#link').innerHTML = `<summary><h3>🔗 Jouw persoonlijke link</h3></summary>
      <p class="small muted">Hiermee speel je later of op een ander toestel verder. Deel hem met niemand.</p>
      <div class="linkbox"><code>${esc(url)}</code></div>
      <button class="btn btn-secondary btn-sm" data-action="copy" data-text="${esc(url)}">📋 Kopieer link</button>`;
  }

  function missingText(p) {
    const missing = [];
    if (!p.photo) missing.push('een foto');
    const anonLeft = 2 - p.anon_count;
    if (anonLeft > 0) missing.push(anonLeft === 1 ? '1 weetje' : '2 weetjes');
    if (!p.tl_count) missing.push('je waarheid of leugen');
    return missing;
  }

  function renderLobby(state, map, me) {
    const p = map.get(me.id);
    const missing = missingText(p);
    setHtml(
      $('#profile'),
      `<div class="profile">
        ${avatar(p, { size: 88 })}
        <div class="profile-info">
          <h2>Hoi ${esc(p.name)}!</h2>
          ${
            missing.length
              ? `<p class="status-line">Nog nodig: ${esc(missing.join(', '))}.</p>`
              : '<p class="status-line ok">✓ Klaar! Wacht tot de admin het spel start.</p>'
          }
          <label class="btn btn-secondary btn-sm ${local.uploading ? 'is-busy' : ''}">
            ${local.uploading ? 'Uploaden…' : p.photo ? '📷 Andere foto' : '📷 Foto toevoegen'}
            <input class="visually-hidden" type="file" accept="image/*" data-action="photo" ${local.uploading ? 'disabled' : ''}>
          </label>
        </div>
      </div>`,
    );
    renderFacts(state, me);
    setHtml($('#lobby-list'), lobbyList(state));
  }

  function renderFacts(state, me) {
    const sig = JSON.stringify([me.facts, [...local.editing]]);
    if (sig === local.factsSig) return;
    local.factsSig = sig;
    const max = state.config?.max_text_length ?? 200;
    const anon = me.facts.filter((f) => f.type === 'anon');
    const tl = me.facts.find((f) => f.type === 'truth_lie');
    const anonSlots = [
      ...anon.map((f) => ({ key: `f${f.id}`, type: 'anon', fact: f })),
      ...Array.from({ length: Math.max(0, 2 - anon.length) }, (_, i) => ({ key: `anon-new-${i}`, type: 'anon', fact: null })),
    ];
    const tlSlot = tl ? { key: `f${tl.id}`, type: 'truth_lie', fact: tl } : { key: 'tl-new', type: 'truth_lie', fact: null };

    $('#facts').innerHTML = `
      <h3>🕵️ Jouw 2 weetjes <span class="muted small">(anoniem)</span></h3>
      <p class="hint">Iets wat de anderen waarschijnlijk niet van je weten.</p>
      ${anonSlots.map((s) => factSlot(s, max)).join('')}
      <h3>⚖️ Waarheid of leugen</h3>
      <p class="hint">Iets ongeloofwaardigs dat waar is, of een geloofwaardige leugen. Je naam staat erbij tijdens de quiz.</p>
      ${factSlot(tlSlot, max)}`;
  }

  function factSlot({ key, type, fact }, max) {
    const editing = !fact || local.editing.has(key);
    if (!editing) {
      return `<div class="fact fact-${type}">
        <p class="fact-text">${esc(fact.text)}</p>
        ${
          type === 'truth_lie'
            ? `<span class="pill ${fact.is_true ? 'pill-good' : 'pill-bad'}">${fact.is_true ? '✅ Dit is waar' : '❌ Dit is gelogen'}</span>`
            : ''
        }
        <div class="fact-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit-fact" data-key="${key}">✏️ Bewerk</button>
          <button class="btn btn-ghost btn-sm" data-action="delete-fact" data-id="${fact.id}">🗑️ Verwijder</button>
        </div>
      </div>`;
    }
    const draft = local.drafts[key];
    const text = draft?.text ?? fact?.text ?? '';
    const isTrue = draft ? draft.isTrue : fact?.is_true;
    return `<form class="fact-form fact-${type}" data-key="${key}" data-type="${type}" data-id="${fact?.id ?? ''}">
      <textarea name="text" maxlength="${max}" rows="3" placeholder="${
        type === 'anon' ? 'Bv. Ik heb ooit…' : 'Bv. Ik heb al eens…'
      }" aria-label="${type === 'anon' ? 'Weetje' : 'Stelling'}">${esc(text)}</textarea>
      <div class="form-row"><span class="counter">${text.length}/${max}</span></div>
      ${
        type === 'truth_lie'
          ? `<div class="seg" role="radiogroup" aria-label="Waar of gelogen">
              <label><input type="radio" name="is_true" value="true" ${isTrue === true ? 'checked' : ''}><span>✅ Dit is waar</span></label>
              <label><input type="radio" name="is_true" value="false" ${isTrue === false ? 'checked' : ''}><span>❌ Dit is gelogen</span></label>
            </div>`
          : ''
      }
      <div class="fact-actions">
        ${fact ? `<button type="button" class="btn btn-ghost btn-sm" data-action="cancel-edit" data-key="${key}">Annuleer</button>` : ''}
        <button class="btn btn-primary btn-sm" type="submit">Bewaar</button>
      </div>
    </form>`;
  }

  function readForm(form) {
    const checked = form.querySelector('input[name=is_true]:checked');
    return { text: form.elements.text.value, isTrue: checked ? checked.value === 'true' : null };
  }

  async function saveFact(form) {
    const key = form.dataset.key;
    const type = form.dataset.type;
    const id = form.dataset.id ? Number(form.dataset.id) : null;
    const { text, isTrue } = readForm(form);
    if (!text.trim()) return toast('Vul eerst iets in.', 'error');
    if (type === 'truth_lie' && isTrue == null) return toast('Kies of je stelling waar of gelogen is.', 'error');
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await rpc('upsert_fact', {
        p_token: getToken(),
        p_type: type,
        p_text: text.trim(),
        p_is_true: type === 'truth_lie' ? isTrue : null,
        p_fact_id: id,
      });
      delete local.drafts[key];
      local.editing.delete(key);
      // het tweede lege formulier schuift op naar de eerste plaats
      if (key === 'anon-new-0' && local.drafts['anon-new-1']) {
        local.drafts['anon-new-0'] = local.drafts['anon-new-1'];
        delete local.drafts['anon-new-1'];
      }
      toast('Bewaard ✓');
      await refresh();
    } catch (e) {
      toastError(e);
      btn.disabled = false;
    }
  }

  async function onPhoto(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const blob = await cropImage(file);
      if (!blob) return;
      local.uploading = true;
      render();
      await uploadAvatar(getToken(), blob);
      toast('Foto opgeslagen ✓');
      await refresh();
    } catch (e) {
      toastError(e);
    } finally {
      local.uploading = false;
      render();
    }
  }

  // ------------------------------------------------------------------ question

  function renderQuestion(state, map, me) {
    const r = state.round;
    setHtml($('#q-head'), qHead(r));
    const author = r.type === 'truth_lie' ? map.get(r.author_id) : null;
    setHtml(
      $('#q-text'),
      `<div class="q-card ${r.type === 'anon' ? 'q-anon' : 'q-tl'} ${r.golden ? 'q-golden' : ''}">
        ${author ? `<div class="q-author">${avatar(author, { size: 48 })}<span><strong>${esc(author.name)}</strong> beweert:</span></div>` : ''}
        <p class="q-text">${esc(r.text)}</p>
      </div>`,
    );
    setHtml($('#q-timer'), countdown(state));

    if (me.is_author) {
      setHtml(
        $('#q-body'),
        r.type === 'anon'
          ? '<div class="author-msg"><div class="big-emoji">🤫</div><h2>Dit is jouw weetje</h2><p>Hou je poker face!</p></div>'
          : '<div class="author-msg"><div class="big-emoji">🎭</div><h2>Overtuig ze!</h2><p>Verdedig je stelling of beantwoord vragen. Jij stemt niet mee.</p></div>',
      );
      return;
    }

    const closed = secondsLeft(state) <= 0;
    const voted = local.pendingVote ?? me.vote;
    const hint = closed
      ? 'De tijd is om!'
      : voted
        ? 'Gestemd ✓ Je kan nog wijzigen tot de tijd om is.'
        : r.type === 'anon'
          ? 'Wie schreef dit?'
          : 'Waar of gelogen?';

    let options;
    if (r.type === 'anon') {
      options = `<div class="vote-grid">${participants(state)
        .filter((p) => p.id !== me.id)
        .map(
          (p) => `<button class="vote-btn ${voted?.suspect_id === p.id ? 'selected' : ''}" data-action="vote" data-id="${p.id}" ${closed ? 'disabled' : ''}>
            ${avatar(p, { size: 44 })}<span>${esc(p.name)}</span></button>`,
        )
        .join('')}</div>`;
    } else {
      options = `<div class="tl-buttons">
        <button class="tl-btn tl-yes ${voted?.answer_true === true ? 'selected' : ''}" data-action="vote-tl" data-value="true" ${closed ? 'disabled' : ''}>✅ Waar</button>
        <button class="tl-btn tl-no ${voted?.answer_true === false ? 'selected' : ''}" data-action="vote-tl" data-value="false" ${closed ? 'disabled' : ''}>❌ Leugen</button>
      </div>`;
    }
    setHtml($('#q-body'), `<p class="vote-hint ${voted ? 'ok' : ''}">${hint}</p>${options}`);
  }

  async function vote(args) {
    const r = getState()?.round;
    if (!r) return;
    local.pendingVote = 'p_suspect_id' in args ? { suspect_id: args.p_suspect_id } : { answer_true: args.p_answer_true };
    render();
    try {
      await rpc('cast_vote', { p_token: getToken(), p_round_id: r.id, p_suspect_id: null, p_answer_true: null, ...args });
      navigator.vibrate?.(30);
      await refresh();
    } catch (e) {
      toastError(e);
    } finally {
      local.pendingVote = null;
      render();
    }
  }

  // ------------------------------------------------------------------ reveal

  function renderReveal(state, map, me) {
    const r = state.round;
    setHtml($('#q-head'), qHead(r));
    const shown = authorRevealed(state);
    let verdict;
    if (!shown) {
      verdict = '<div class="verdict pending"><div class="big-emoji drum">🥁</div><h2>Even spannend…</h2></div>';
    } else if (me.is_author) {
      const right =
        r.type === 'anon'
          ? (r.distribution.find((d) => d.id === me.id)?.count ?? 0)
          : r.is_true
            ? r.distribution.yes.count
            : r.distribution.no.count;
      verdict = `<div class="verdict author"><div class="big-emoji">${right === 0 ? '😎' : '🙈'}</div>
        <h2>${right === 0 ? 'Niemand had je door!' : `${right} van ${r.eligible} hadden je door`}</h2></div>`;
    } else if (!me.vote) {
      verdict = '<div class="verdict bad"><div class="big-emoji">😴</div><h2>Niet gestemd!</h2></div>';
    } else {
      const correct = r.type === 'anon' ? me.vote.suspect_id === r.author_id : me.vote.answer_true === r.is_true;
      verdict = correct
        ? '<div class="verdict good"><div class="big-emoji">🎉</div><h2>Juist!</h2></div>'
        : '<div class="verdict bad"><div class="big-emoji">💥</div><h2>Fout!</h2></div>';
    }
    setHtml($('#rv-verdict'), verdict);
    setHtml($('#rv-panel'), `<div class="card"><p class="recap-text">“${esc(r.text)}”</p>${revealPanel(state)}</div>`);
  }

  // ------------------------------------------------------------------ results & finished

  function myRound(state, me, map) {
    const p = map.get(me.id);
    const mine = state.results?.points.find((x) => x.id === me.id);
    const per = state.config?.penalty_per_drink ?? 5;
    const good = state.config?.good_per_give ?? 10;
    const lines = mine
      ? mine.reasons.map((reason) => `<li>${esc(REASONS[reason] ?? reason)}</li>`).join('')
      : '<li class="muted">Geen punten deze ronde</li>';
    const delta = mine
      ? `${mine.penalty ? `<span class="txt-bad">+${mine.penalty} straf</span>` : ''} ${mine.good ? `<span class="txt-good">+${mine.good} goed</span>` : ''}`
      : '';
    return `<section class="card my-round">
      <h3>Jouw ronde ${delta}</h3>
      <ul class="reason-list">${lines}</ul>
      <div class="my-bars">
        <span>Strafpunten</span>${bar(p.penalty, per, 'bad')}<span>${p.penalty}/${per}</span>
        <span>Goede punten</span>${bar(p.good, good, 'good')}<span>${p.good}/${good}</span>
      </div>
    </section>`;
  }

  function givePanel(state, me) {
    const p = playerMap(state).get(me.id);
    if (!p.open_gives) return '';
    return `<section class="card give-card">
      <h3>🎁 Jij mag ${p.open_gives === 1 ? 'een adfundum' : `${p.open_gives} adfundums`} uitdelen!</h3>
      <p class="small muted">Tik op wie moet adden:</p>
      <div class="vote-grid">${participants(state)
        .filter((x) => x.id !== me.id)
        .map(
          (x) => `<button class="vote-btn" data-action="give" data-id="${x.id}" data-name="${esc(x.name)}">
            ${avatar(x, { size: 40 })}<span>${esc(x.name)}</span></button>`,
        )
        .join('')}</div>
    </section>`;
  }

  function renderResults(state, map, me) {
    const r = state.round;
    setHtml($('#q-head'), qHead(r));
    const author = map.get(r.author_id);
    setHtml(
      $('#rs-recap'),
      `<div class="recap"><p class="recap-text">“${esc(r.text)}”</p>
        <div class="recap-answer">${
          r.type === 'anon'
            ? `Geschreven door ${chip(author, { size: 28 })}`
            : `${chip(author, { size: 28 })} ${r.is_true ? 'sprak de <strong class="txt-good">waarheid</strong>' : 'loog <strong class="txt-bad">alles bij elkaar</strong>'}`
        }</div>
      </div>`,
    );
    setHtml($('#rs-badge'), badgeBanner(state));
    setHtml($('#rs-me'), myRound(state, me, map));
    setHtml($('#rs-give'), givePanel(state, me));
    setHtml($('#rs-drinks'), drinkList(state));
    setHtml($('#rs-givers'), giverList(state));
    setHtml($('#rs-standings'), standings(state));
  }

  function renderFinished(state, map, me) {
    const p = map.get(me.id);
    setHtml(
      $('#rs-me'),
      `<section class="card my-summary">
        ${avatar(p, { size: 64, badge: state.game.badge_holder_id === p.id })}
        <div><strong>${esc(p.name)}</strong>
        <p class="small">🍺 ${p.drinks} gedronken · 🎁 ${p.given} uitgedeeld · 🔥 beste streak ${p.best_streak}</p></div>
      </section>`,
    );
    setHtml($('#rs-give'), givePanel(state, me));
    setHtml($('#fin-awards'), finalPanel(state));
    setHtml($('#rs-standings'), standings(state));
  }

  async function give(id, name) {
    const ok = await confirmDialog(`Adfundum voor ${esc(name)}?`, '', `🍺 Ja, ${esc(name)} moet adden`);
    if (!ok) return;
    try {
      await rpc('give_adfundum', { p_token: getToken(), p_target_id: id });
      toast(`${name} moet adden! 🍺`);
      await refresh();
    } catch (e) {
      toastError(e);
    }
  }

  // ------------------------------------------------------------------ admin

  const DANGER = `<details class="danger-zone">
      <summary>⚠️ Reset</summary>
      <div class="stack">
        <button class="btn btn-ghost" data-action="reset">↩️ Reset spel (terug naar lobby)</button>
        <button class="btn btn-danger" data-action="reset-full">🧨 Volledige reset</button>
      </div>
    </details>`;

  function renderAdmin(state, map) {
    const key = getAdminKey();
    if (!state.me.is_admin || !key) {
      setHtml(adminEl, '');
      local.adminSkeleton = null;
      return;
    }
    const status = state.game.status;
    if (local.adminSkeleton !== status) {
      local.adminSkeleton = status;
      adminEl.__html = null;
      adminEl.className = 'admin-panel';
      if (status === 'lobby') {
        const def = state.config?.default_question_count ?? 30;
        const secs = state.config?.default_vote_seconds ?? 20;
        adminEl.innerHTML = `
          <h3>👑 Admin</h3>
          <div class="admin-links">
            <button class="btn btn-ghost btn-sm" data-action="copy" data-text="${esc(joinUrl())}">📋 Deelnamelink</button>
            <a class="btn btn-ghost btn-sm" href="#/tv" target="_blank" rel="noopener">📺 TV-scherm</a>
          </div>
          <form id="start-form" class="stack">
            <div class="form-grid">
              <label class="field"><span>Aantal vragen</span>
                <input type="number" name="count" min="1" value="${def}" inputmode="numeric"></label>
              <label class="field"><span>Stemtijd (seconden)</span>
                <input type="number" name="secs" min="5" max="300" value="${secs}" inputmode="numeric"></label>
            </div>
            <p class="small muted" id="adm-count"></p>
            <div id="adm-warn"></div>
            <button class="btn btn-gold btn-xl" type="submit">🚀 Start spel</button>
          </form>
          <details><summary>Claim vrijgeven</summary><div id="adm-release"></div></details>
          ${DANGER}`;
      } else {
        adminEl.innerHTML = `<h3>👑 Admin</h3><div id="adm-actions" class="admin-actions"></div>${DANGER}`;
      }
    }

    if (status === 'lobby') {
      const total = (state.counts?.anon ?? 0) + (state.counts?.truth_lie ?? 0);
      const count = adminEl.querySelector('input[name=count]');
      if (count) count.max = String(Math.max(total, 1));
      setHtml(
        adminEl.querySelector('#adm-count'),
        `Ingediend: ${state.counts?.anon ?? 0} weetjes en ${state.counts?.truth_lie ?? 0} stellingen (max. ${total} vragen).`,
      );
      const notReady = state.players.filter((p) => lobbyStatus(p).key !== 'ready');
      setHtml(
        adminEl.querySelector('#adm-warn'),
        notReady.length
          ? `<p class="warn">⚠️ Nog niet klaar: ${notReady.map((p) => `${esc(p.name)} <span class="muted">(${esc(lobbyStatus(p).label.toLowerCase())})</span>`).join(', ')}</p>`
          : '<p class="ok">✓ Iedereen is klaar!</p>',
      );
      const claimed = state.players.filter((p) => p.claimed && !p.is_admin);
      setHtml(
        adminEl.querySelector('#adm-release'),
        claimed.length
          ? `<ul class="release-list">${claimed
              .map(
                (p) => `<li>${chip(p, { size: 28 })}<button class="btn btn-ghost btn-sm" data-action="release" data-id="${p.id}" data-name="${esc(p.name)}">Vrijgeven</button></li>`,
              )
              .join('')}</ul>`
          : '<p class="muted small">Nog niemand geclaimd.</p>',
      );
      return;
    }

    const r = state.round;
    let actions = '';
    if (status === 'question') {
      actions = '<button class="btn btn-danger btn-xl" data-action="close-voting">⏹ Sluit stemming nu</button>';
    } else if (status === 'reveal') {
      actions = '<button class="btn btn-secondary btn-xl" data-action="next">⏭ Naar adfundum-overzicht</button>';
    } else if (status === 'results') {
      const open = (state.results?.givers ?? []).map((g) => `${esc(map.get(g.id)?.name)} (${g.open})`);
      const last = r && r.no >= r.total;
      actions = `<p class="small ${open.length ? 'warn' : 'ok'}">${
        open.length ? `🎁 Nog uit te delen: ${open.join(', ')}` : '✓ Alle uitdeelbeurten zijn gebruikt'
      }</p>
      <button class="btn btn-gold btn-xl" data-action="next">${last ? '🏁 Naar eindklassement' : 'Volgende vraag ➡️'}</button>`;
    } else {
      actions = '<p class="small muted">Het spel is gedaan. Reset om opnieuw te spelen.</p>';
    }
    setHtml(adminEl.querySelector('#adm-actions'), actions);
  }

  async function adminAct(name, args = {}) {
    try {
      await rpc(name, { p_admin_key: getAdminKey(), ...args });
      await refresh();
    } catch (e) {
      toastError(e);
    }
  }

  async function startGame(form) {
    const state = getState();
    const notReady = state.players.filter((p) => lobbyStatus(p).key !== 'ready');
    if (notReady.length) {
      const ok = await confirmDialog(
        'Niet iedereen is klaar',
        `<p>${notReady.map((p) => `${esc(p.name)} (${esc(lobbyStatus(p).label.toLowerCase())})`).join(', ')}</p>
         <p class="small muted">Wie niet geclaimd heeft, doet niet mee en verschijnt niet als stemoptie.</p>`,
        'Toch starten',
      );
      if (!ok) return;
    }
    const data = new FormData(form);
    await adminAct('start_game', {
      p_question_count: Number(data.get('count')) || null,
      p_vote_seconds: Number(data.get('secs')) || null,
    });
  }

  // ------------------------------------------------------------------ events

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const { action } = btn.dataset;
    switch (action) {
      case 'copy':
        (await copyText(btn.dataset.text)) ? toast('Gekopieerd ✓') : toast('Kopiëren lukte niet.', 'error');
        break;
      case 'edit-fact':
        local.editing.add(btn.dataset.key);
        render();
        break;
      case 'cancel-edit':
        local.editing.delete(btn.dataset.key);
        delete local.drafts[btn.dataset.key];
        local.factsSig = null;
        render();
        break;
      case 'delete-fact':
        if (await confirmDialog('Weetje verwijderen?', '', 'Verwijder', true)) {
          try {
            await rpc('delete_fact', { p_token: getToken(), p_fact_id: Number(btn.dataset.id) });
            await refresh();
          } catch (err) {
            toastError(err);
          }
        }
        break;
      case 'vote':
        vote({ p_suspect_id: Number(btn.dataset.id) });
        break;
      case 'vote-tl':
        vote({ p_answer_true: btn.dataset.value === 'true' });
        break;
      case 'give':
        give(Number(btn.dataset.id), btn.dataset.name);
        break;
      case 'release':
        if (
          await confirmDialog(
            `Claim van ${esc(btn.dataset.name)} vrijgeven?`,
            'De persoonlijke link wordt ongeldig, en de foto en weetjes worden gewist.',
            'Vrijgeven',
            true,
          )
        ) {
          adminAct('release_claim', { p_player_id: Number(btn.dataset.id) });
        }
        break;
      case 'close-voting':
        adminAct('close_voting');
        break;
      case 'next':
        adminAct('next_round');
        break;
      case 'reset':
        if (
          await confirmDialog(
            'Spel resetten?',
            'Terug naar de lobby. Alle punten en adfundums worden gewist. Weetjes, foto’s en claims blijven.',
            'Reset spel',
            true,
          )
        ) {
          adminAct('reset_game', { p_full: false });
        }
        break;
      case 'reset-full':
        if (
          (await confirmDialog('Volledige reset?', 'Alles wordt gewist: claims, foto’s, weetjes en punten.', 'Verder', true)) &&
          (await confirmDialog('Echt zeker?', 'Dit kan niet ongedaan gemaakt worden. Iedereen moet zich opnieuw registreren.', 'Ja, wis alles', true))
        ) {
          adminAct('reset_game', { p_full: true });
        }
        break;
    }
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.matches('.fact-form')) saveFact(e.target);
    else if (e.target.id === 'start-form') startGame(e.target);
  });

  root.addEventListener('input', (e) => {
    const form = e.target.closest('.fact-form');
    if (!form) return;
    local.drafts[form.dataset.key] = readForm(form);
    const counter = form.querySelector('.counter');
    if (counter) counter.textContent = `${form.elements.text.value.length}/${form.elements.text.maxLength}`;
  });

  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-action=photo]')) onPhoto(e.target);
  });

  const unsubscribe = subscribe(render);
  const timer = setInterval(() => render(), 250);
  const releaseWake = wakeLock();

  return {
    unmount() {
      unsubscribe();
      clearInterval(timer);
      releaseWake();
    },
  };
}
