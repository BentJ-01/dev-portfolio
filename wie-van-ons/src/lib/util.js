export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Zet innerHTML enkel als de inhoud veranderd is (behoudt focus en animaties). */
export function setHtml(el, html) {
  if (!el) return;
  if (el.__html !== html) {
    el.__html = html;
    el.innerHTML = html;
  }
}

export const initials = (name) =>
  String(name ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function hue(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export const byName = (a, b) => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });

export function playerMap(state) {
  return new Map((state?.players ?? []).map((p) => [p.id, p]));
}

export const participants = (state) => (state?.players ?? []).filter((p) => p.claimed);

export function lobbyStatus(p) {
  if (!p.claimed) return { key: 'unclaimed', label: 'Niet geclaimd' };
  const filled = Math.min(p.anon_count, 2) + Math.min(p.tl_count, 1);
  if (!p.photo) return { key: 'nophoto', label: `Geen foto · ${filled}/3` };
  if (filled < 3) return { key: 'partial', label: `${filled}/3 ingevuld` };
  return { key: 'ready', label: 'Klaar' };
}

export const isReady = (p) => lobbyStatus(p).key === 'ready';

export function wakeLock() {
  let lock = null;
  const request = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        lock = await navigator.wakeLock.request('screen');
      }
    } catch {
      /* niet ondersteund of geweigerd */
    }
  };
  const onVisible = () => document.visibilityState === 'visible' && request();
  request();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    lock?.release().catch(() => {});
  };
}

export function joinUrl() {
  return `${location.origin}${location.pathname}#/join`;
}

export function playUrl(token) {
  return `${location.origin}${location.pathname}#/play?t=${token}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
