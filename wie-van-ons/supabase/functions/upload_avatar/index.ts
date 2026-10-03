// Edge Function: upload_avatar
// Valideert het speler-token, het bestandstype en de grootte, en schrijft de foto naar
// `avatars/<player_id>.jpg`. Enkel toegestaan zolang het spel in de lobby zit.
// Deploy met: supabase functions deploy upload_avatar --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function sniffType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405);

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES + 64 * 1024) return json({ error: 'Foto is te groot (max. 1 MB).' }, 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Ongeldige upload.' }, 400);
  }

  const token = form.get('token');
  const file = form.get('file');
  if (typeof token !== 'string' || !UUID_RE.test(token)) {
    return json({ error: 'Ongeldige of vervallen link.' }, 401);
  }
  if (!(file instanceof File)) return json({ error: 'Geen foto ontvangen.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'Foto is te groot (max. 1 MB).' }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type || !ALLOWED.has(type)) {
    return json({ error: 'Enkel JPEG, PNG of WebP is toegestaan.' }, 415);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: playerId, error: targetError } = await supabase.rpc('avatar_upload_target', {
    p_token: token,
  });
  if (targetError || !playerId) {
    return json({ error: targetError?.message ?? 'Ongeldige of vervallen link.' }, 403);
  }

  const path = `${playerId}.jpg`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: type,
    upsert: true,
    cacheControl: '31536000',
  });
  if (uploadError) {
    console.error('upload_avatar: storage upload failed', uploadError.message);
    return json({ error: 'Opslaan van de foto mislukt.' }, 500);
  }

  const { data, error } = await supabase.rpc('set_player_photo', { p_token: token, p_path: path });
  if (error) return json({ error: error.message }, 409);
  return json(data);
});
