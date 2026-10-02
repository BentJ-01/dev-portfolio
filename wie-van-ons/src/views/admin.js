import { rpc } from '../lib/supabase.js';
import { getAdminKey, setAdminKey, setToken } from '../lib/local.js';
import { refresh } from '../lib/store.js';
import { esc } from '../lib/util.js';

export function adminView(root, params) {
  const fromUrl = params.get('key');
  if (fromUrl) {
    setAdminKey(fromUrl);
    // sleutel niet in de adresbalk laten staan
    history.replaceState(null, '', '#/admin');
  }

  const showForm = (message = '') => {
    root.innerHTML = `<div class="phone">
      <div class="card">
        <h1>Admin</h1>
        ${message ? `<p class="error">${esc(message)}</p>` : ''}
        <form class="stack" id="admin-form">
          <label class="field"><span>Admin key</span>
            <input type="password" name="key" autocomplete="off" required></label>
          <button class="btn btn-primary">Inloggen</button>
        </form>
      </div>
    </div>`;
    root.querySelector('#admin-form').addEventListener('submit', (e) => {
      e.preventDefault();
      setAdminKey(new FormData(e.target).get('key'));
      login();
    });
  };

  async function login() {
    const key = getAdminKey();
    if (!key) return showForm();
    root.innerHTML = '<div class="phone"><p class="center muted">Even inloggen…</p></div>';
    try {
      const res = await rpc('claim_admin', { p_admin_key: key });
      setToken(res.token);
      await refresh();
      location.hash = '#/play';
    } catch (e) {
      setAdminKey(null);
      showForm(e.message);
    }
  }

  login();
}
