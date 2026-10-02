import './style.css';
import { configured } from './lib/supabase.js';
import { start } from './lib/store.js';
import { homeView } from './views/home.js';
import { joinView } from './views/join.js';
import { playView } from './views/play.js';
import { tvView } from './views/tv.js';
import { adminView } from './views/admin.js';

const routes = {
  '/': homeView,
  '/join': joinView,
  '/play': playView,
  '/tv': tvView,
  '/admin': adminView,
};

const root = document.getElementById('app');
let current = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}

function route() {
  current?.unmount?.();
  const { path, params } = parseHash();
  const view = routes[path] ?? homeView;
  document.body.dataset.view = path.slice(1) || 'home';
  root.replaceChildren();
  current = view(root, params) ?? null;
}

if (!configured) {
  root.innerHTML = `<div class="phone"><div class="card">
    <h1>Wie van ons?</h1>
    <p>Supabase is nog niet ingesteld. Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code>
    (zie README) en bouw opnieuw.</p></div></div>`;
} else {
  start();
  window.addEventListener('hashchange', route);
  route();
}
