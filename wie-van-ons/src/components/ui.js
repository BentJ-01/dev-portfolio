import { esc, initials, hue } from '../lib/util.js';
import { photoUrl } from '../lib/supabase.js';

export const BADGE = '🎖️';

/** Ronde avatar met foto of initialen. `badge` toont het Hopman-icoon. */
export function avatar(player, { size = 44, badge = false, cls = '' } = {}) {
  if (!player) return '';
  const url = photoUrl(player.photo);
  const inner = url
    ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async">`
    : `<span class="av-initials" style="--h:${hue(player.name)}">${esc(initials(player.name))}</span>`;
  return `<span class="av ${cls}" style="--s:${size}px">${inner}${
    badge ? `<span class="av-badge" title="Hopman-badge">${BADGE}</span>` : ''
  }</span>`;
}

/** Avatar + naam op één lijn. */
export function chip(player, { size = 32, badge = false, extra = '' } = {}) {
  if (!player) return '';
  return `<span class="chip">${avatar(player, { size, badge })}<span class="chip-name">${esc(player.name)}</span>${extra}</span>`;
}

export function toast(message, kind = 'info') {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3600);
}

export const toastError = (e) => toast(e?.message ?? String(e), 'error');

/** Modale dialoog. Geeft de waarde van de gekozen knop terug (of null bij annuleren). */
export function dialog({ title, body = '', buttons = [{ label: 'OK', value: true, cls: 'btn-primary' }] }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${title}</h2>
        ${body ? `<div class="modal-body">${body}</div>` : ''}
        <div class="modal-actions">
          ${buttons.map((b, i) => `<button class="btn ${b.cls ?? ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}
        </div>
      </div>`;
    const close = (value) => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => e.key === 'Escape' && close(null);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) return close(null);
      const btn = e.target.closest('[data-i]');
      if (btn) close(buttons[Number(btn.dataset.i)].value);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('.btn-primary, .btn')?.focus();
  });
}

export const confirmDialog = (title, body, okLabel = 'Ja', danger = false) =>
  dialog({
    title,
    body,
    buttons: [
      { label: 'Annuleer', value: false, cls: 'btn-ghost' },
      { label: okLabel, value: true, cls: danger ? 'btn-danger' : 'btn-primary' },
    ],
  });

export function typeTag(round) {
  if (!round) return '';
  const anon = round.type === 'anon';
  return `<span class="type-tag ${anon ? 'tag-anon' : 'tag-tl'}">${anon ? '🕵️ Wie van ons?' : '⚖️ Waarheid of leugen?'}</span>${
    round.golden ? '<span class="type-tag tag-gold">⭐ Gouden vraag · punten x2</span>' : ''
  }`;
}

export function bar(value, max, kind) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<span class="bar bar-${kind}" title="${value}/${max}"><span style="width:${pct}%"></span></span>`;
}
