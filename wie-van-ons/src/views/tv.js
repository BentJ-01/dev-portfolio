import qrcode from 'qrcode-generator';
import { subscribe, getState, getError, setAnonymous } from '../lib/store.js';
import { esc, setHtml, playerMap, joinUrl, wakeLock } from '../lib/util.js';
import { avatar, chip, typeTag } from '../components/ui.js';
import {
  lobbyList,
  revealPanel,
  badgeBanner,
  drinkList,
  giverList,
  standings,
  finalPanel,
  countdown,
} from '../components/sections.js';

const SKELETONS = {
  lobby: `<div class="tv-lobby">
      <div class="tv-join">
        <h1 class="tv-title">Wie van ons?</h1>
        <div class="qr" id="tv-qr"></div>
        <p class="tv-url" id="tv-url"></p>
        <p class="muted">Scan, kies je naam, upload een foto en vul je weetjes in.</p>
      </div>
      <div class="tv-players" id="tv-lobby"></div>
    </div>`,
  question: `<div class="tv-stage">
      <header class="tv-head" id="tv-head"></header>
      <div class="tv-center" id="tv-question"></div>
      <footer id="tv-timer"></footer>
    </div>`,
  reveal: `<div class="tv-stage tv-stage-reveal">
      <header class="tv-head" id="tv-head"></header>
      <p class="tv-recap" id="tv-recap"></p>
      <div class="tv-center" id="tv-reveal"></div>
    </div>`,
  results: `<div class="tv-stage tv-stage-results">
      <header class="tv-head" id="tv-head"></header>
      <div id="tv-badge"></div>
      <div class="tv-results">
        <div class="tv-col">
          <div class="tv-recap-card" id="tv-recap"></div>
          <section class="tv-box drink"><h2>🍺 Moet adden</h2><div id="tv-drinks"></div></section>
          <section class="tv-box"><h2>🎁 Mag uitdelen</h2><div id="tv-givers"></div></section>
        </div>
        <section class="tv-box tv-standings"><h2>📊 Tussenstand</h2><div id="tv-standings"></div></section>
      </div>
    </div>`,
  finished: `<div class="tv-stage tv-stage-final">
      <h1 class="tv-title center">🏁 Eindklassement</h1>
      <div id="tv-final"></div>
    </div>`,
};

export function tvView(root) {
  setAnonymous(true);
  root.innerHTML = `<div class="tv" id="tv"></div>
    <button class="tv-fullscreen" data-action="fullscreen" title="Volledig scherm">⛶</button>`;
  const stage = root.querySelector('#tv');
  const $ = (sel) => root.querySelector(sel);
  let skeleton = null;

  function head(r) {
    return `<div class="q-tags">${typeTag(r)}</div><span class="tv-no">Vraag ${r.no}/${r.total}</span>`;
  }

  function render(state = getState(), error = getError()) {
    if (!state || state.fetchedWith) {
      setHtml(stage, `<p class="tv-loading">${error ? esc(error.message) : 'Laden…'}</p>`);
      skeleton = null;
      return;
    }
    const status = state.game.status;
    const key = status === 'lobby' || status === 'finished' ? status : `${status}:${state.round?.id}`;
    if (skeleton !== key) {
      skeleton = key;
      stage.__html = null;
      stage.innerHTML = SKELETONS[status];
      stage.dataset.status = status;
      if (status === 'lobby') {
        const qr = qrcode(0, 'M');
        qr.addData(joinUrl());
        qr.make();
        $('#tv-qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
        $('#tv-url').textContent = joinUrl().replace(/^https?:\/\//, '');
      }
    }
    stage.classList.toggle('offline', Boolean(error));
    const map = playerMap(state);
    const r = state.round;

    if (status === 'lobby') {
      setHtml($('#tv-lobby'), lobbyList(state, { tv: true }));
      return;
    }
    if (status === 'finished') {
      setHtml($('#tv-final'), finalPanel(state, { tv: true }));
      return;
    }

    setHtml($('#tv-head'), head(r));

    if (status === 'question') {
      const author = r.type === 'truth_lie' ? map.get(r.author_id) : null;
      setHtml(
        $('#tv-question'),
        `<div class="tv-q ${r.type === 'anon' ? 'q-anon' : 'q-tl'} ${r.golden ? 'q-golden' : ''}">
          ${
            author
              ? `<div class="tv-q-author">${avatar(author, { size: 220, badge: state.game.badge_holder_id === author.id })}<strong>${esc(author.name)}</strong></div>`
              : '<div class="tv-q-icon">🕵️</div>'
          }
          <div class="tv-q-body">
            <p class="tv-q-label">${r.type === 'anon' ? 'Wie van ons…' : 'Waarheid of leugen?'}</p>
            <p class="tv-q-text">${esc(r.text)}</p>
          </div>
        </div>`,
      );
      setHtml($('#tv-timer'), countdown(state, { large: true }));
      return;
    }

    if (status === 'reveal') {
      setHtml($('#tv-recap'), `“${esc(r.text)}”`);
      setHtml($('#tv-reveal'), revealPanel(state, { tv: true }));
      return;
    }

    // results
    const author = map.get(r.author_id);
    setHtml($('#tv-badge'), badgeBanner(state));
    setHtml(
      $('#tv-recap'),
      `<p class="recap-text">“${esc(r.text)}”</p><div class="recap-answer">${
        r.type === 'anon'
          ? `Geschreven door ${chip(author, { size: 40 })}`
          : `${chip(author, { size: 40 })} ${r.is_true ? 'sprak de <strong class="txt-good">waarheid</strong>' : '<strong class="txt-bad">loog</strong>'}`
      }</div>`,
    );
    setHtml($('#tv-drinks'), drinkList(state, { size: 52 }));
    setHtml($('#tv-givers'), giverList(state, { size: 44 }));
    setHtml($('#tv-standings'), standings(state, { size: 36 }));
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-action=fullscreen]')) {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });

  const unsubscribe = subscribe(render);
  const timer = setInterval(() => render(), 250);
  const releaseWake = wakeLock();

  return {
    unmount() {
      setAnonymous(false);
      unsubscribe();
      clearInterval(timer);
      releaseWake();
    },
  };
}
