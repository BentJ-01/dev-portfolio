import { subscribe, refresh } from '../lib/store.js';
import { rpc } from '../lib/supabase.js';
import { getToken, setToken } from '../lib/local.js';
import { esc, setHtml, playUrl, copyText } from '../lib/util.js';
import { avatar, confirmDialog, toast, toastError } from '../components/ui.js';

export function joinView(root) {
  root.innerHTML = `<div class="phone">
    <header class="hero hero-sm"><h1>Wie van ons?</h1></header>
    <main id="join"></main>
  </div>`;
  const main = root.querySelector('#join');
  let claimed = null; // { token, name } na een geslaagde claim
  let busy = false;

  function render(state, error) {
    if (claimed) {
      const url = playUrl(claimed.token);
      return setHtml(
        main,
        `<div class="card stack">
          <h2>Welkom, ${esc(claimed.name)}! 🎉</h2>
          <p>Dit is jouw <strong>persoonlijke link</strong>. Bewaar hem goed: zo kan je later (of op een ander toestel) verder spelen. Deel hem met niemand.</p>
          <div class="linkbox"><code>${esc(url)}</code></div>
          <button class="btn btn-secondary" data-action="copy">📋 Kopieer link</button>
          <a class="btn btn-primary btn-xl" href="#/play">Verder: foto en weetjes</a>
        </div>`,
      );
    }
    if (!state) {
      return setHtml(main, error ? `<p class="error center">${esc(error.message)}</p>` : '<p class="center muted">Laden…</p>');
    }
    if (state.me) {
      return setHtml(
        main,
        `<div class="card stack center">
          ${avatar(state.players.find((p) => p.id === state.me.id), { size: 96 })}
          <h2>Je bent geregistreerd als ${esc(state.me.name)}</h2>
          <a class="btn btn-primary btn-xl" href="#/play">Verder spelen</a>
        </div>`,
      );
    }
    if (state.game.status !== 'lobby') {
      return setHtml(
        main,
        `<div class="card center stack"><div class="big-emoji">⏳</div><h2>Het spel is al begonnen</h2>
        <p class="muted">Inschrijven kan niet meer. Heb je een persoonlijke link? Open die dan opnieuw.</p></div>`,
      );
    }
    const released = getToken() && !state.token_valid;
    setHtml(
      main,
      `${released ? '<p class="notice">Je vorige registratie werd vrijgegeven. Kies opnieuw je naam.</p>' : ''}
      <h2 class="center">Wie ben jij?</h2>
      <div class="name-grid">
        ${state.players
          .map((p) => {
            const taken = p.claimed || p.is_admin;
            return `<button class="name-btn" data-action="pick" data-id="${p.id}" data-name="${esc(p.name)}" ${taken ? 'disabled' : ''}>
              ${avatar(p, { size: 40 })}<span>${esc(p.name)}</span>
              ${p.is_admin ? '<span class="small muted">admin</span>' : p.claimed ? '<span class="small muted">gekozen</span>' : ''}
            </button>`;
          })
          .join('')}
      </div>`,
    );
  }

  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'copy') {
      (await copyText(playUrl(claimed.token))) ? toast('Link gekopieerd ✓') : toast('Kopiëren lukte niet, selecteer de link manueel.', 'error');
      return;
    }
    if (btn.dataset.action === 'pick' && !busy) {
      const id = Number(btn.dataset.id);
      const name = btn.dataset.name;
      const ok = await confirmDialog(`Ben jij echt ${esc(name)}?`, 'Na bevestigen kan niemand anders deze naam nog kiezen.', 'Ja, dat ben ik');
      if (!ok) return;
      busy = true;
      try {
        const res = await rpc('claim_player', { p_player_id: id });
        setToken(res.token);
        claimed = { token: res.token, name: res.name };
        await refresh();
      } catch (err) {
        toastError(err);
      } finally {
        busy = false;
      }
    }
  });

  return { unmount: subscribe(render) };
}
