import { supabase, rpc } from './supabase.js';
import { getToken } from './local.js';

// Centrale state: één `get_state`-RPC levert alles wat een client mag zien.
// Realtime meldt enkel *dat* er iets veranderd is (de `game`-rij); daarna halen we opnieuw op.

let state = null;
let error = null;
let clockOffset = 0;
let bestRtt = Infinity;
const listeners = new Set();

let inFlight = false;
let pending = false;
let debounce = null;
let channel = null;
let subscribed = false;
let pollTimer = null;
let tickTimer = null;
let lastTick = 0;
let anonymous = false;

// Het tv-scherm haalt de state altijd zonder speler-token op.
const currentToken = () => (anonymous ? null : getToken());

export function setAnonymous(value) {
  if (anonymous === value) return;
  anonymous = value;
  refresh();
}

export const getState = () => state;
export const getError = () => error;
export const serverNow = () => Date.now() + clockOffset;

export function subscribe(fn) {
  listeners.add(fn);
  if (state || error) fn(state, error);
  return () => listeners.delete(fn);
}

const emit = () => listeners.forEach((fn) => fn(state, error));

export async function refresh() {
  if (inFlight) {
    pending = true;
    return;
  }
  inFlight = true;
  try {
    const token = currentToken();
    const t0 = Date.now();
    const data = await rpc('get_state', { p_token: token });
    const t1 = Date.now();
    // Klokverschil met de server; het meetpunt met de kortste roundtrip is het nauwkeurigst.
    const rtt = t1 - t0;
    if (rtt <= bestRtt * 1.5 || rtt < 400) {
      bestRtt = Math.min(bestRtt, rtt);
      clockOffset = Date.parse(data.server_now) - (t0 + t1) / 2;
    }
    if (token === currentToken()) {
      state = { ...data, fetchedWith: token };
      error = null;
    } else {
      // token gewijzigd tijdens het ophalen (net geclaimd of nieuwe link): opnieuw
      pending = true;
    }
  } catch (e) {
    error = e;
  } finally {
    inFlight = false;
  }
  if (!pending) emit();
  if (pending) {
    pending = false;
    refresh();
  }
}

export function scheduleRefresh(delay = 120) {
  clearTimeout(debounce);
  debounce = setTimeout(refresh, delay);
}

/** Voert een actie uit en haalt daarna meteen de nieuwe state op. */
export async function act(name, args) {
  const result = await rpc(name, args);
  refresh();
  return result;
}

function phaseDeadline() {
  const g = state?.game;
  if (!g) return null;
  if (g.status === 'question' && state.round) {
    if (state.round.vote_count >= state.round.eligible && state.round.eligible > 0) return 0;
    return Date.parse(state.round.closes_at);
  }
  if (g.status === 'reveal' && g.phase_until) return Date.parse(g.phase_until);
  return null;
}

// Elke client vraagt de server om de fase door te schuiven zodra de deadline voorbij is.
// De server beslist; enkel de eerste aanroep heeft effect.
function checkTick() {
  const deadline = phaseDeadline();
  if (deadline == null) return;
  const now = serverNow();
  if (now < deadline) return;
  if (Date.now() - lastTick < 1500) return;
  lastTick = Date.now();
  setTimeout(() => {
    rpc('tick')
      .then((changed) => changed && refresh())
      .catch(() => {});
  }, Math.random() * 400);
}

export function start() {
  if (channel) return;
  refresh();

  channel = supabase
    .channel('wie-van-ons-game')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game' }, () => scheduleRefresh())
    .subscribe((status) => {
      const wasSubscribed = subscribed;
      subscribed = status === 'SUBSCRIBED';
      // Bij (her)verbinden: volledige state opnieuw ophalen.
      if (subscribed && !wasSubscribed) refresh();
    });

  // Vangnet: trage poll, sneller als realtime weg is.
  const poll = () => {
    if (document.visibilityState === 'visible') refresh();
    pollTimer = setTimeout(poll, subscribed ? 15000 : 4000);
  };
  pollTimer = setTimeout(poll, 4000);

  tickTimer = setInterval(checkTick, 500);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('online', () => refresh());
}

export function stopTimers() {
  clearTimeout(pollTimer);
  clearInterval(tickTimer);
}
