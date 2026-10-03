import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null;

/** Roept een RPC aan en gooit een Error met een leesbare (Nederlandse) boodschap. */
export async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(friendlyError(error));
  return data;
}

function friendlyError(error) {
  if (error.code === 'P0001' && error.message) return error.message;
  if (/fetch|network/i.test(error.message ?? '')) return 'Geen verbinding. Probeer opnieuw.';
  return error.message || 'Er ging iets mis.';
}

export function photoUrl(photo) {
  return photo ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${photo}` : null;
}

export async function uploadAvatar(token, blob) {
  const body = new FormData();
  body.append('token', token);
  body.append('file', blob, 'avatar.jpg');
  const { data, error } = await supabase.functions.invoke('upload_avatar', { body });
  if (error) {
    let message = 'Uploaden mislukt. Probeer opnieuw.';
    try {
      const payload = await error.context.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* geen JSON-body */
    }
    throw new Error(message);
  }
  return data;
}
