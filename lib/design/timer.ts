export const MAX_TIMER_SECONDS = 86_399;
export const TIMER_MUSIC = ["none", "focus", "dramatic", "upbeat", "energetic", "lofi"] as const;
export type TimerMusic = typeof TIMER_MUSIC[number];
export type TimerState = { version: 1; duration: number; remaining: number; deadline: number | null; active: boolean; music: TimerMusic; volume: number };
export const INITIAL_TIMER: TimerState = { version: 1, duration: 300_000, remaining: 300_000, deadline: null, active: false, music: "none", volume: .5 };
export type TimerAction = { type: "set"; seconds: number } | { type: "start" | "pause" | "reset" | "add" } | { type: "music"; value: TimerMusic } | { type: "volume"; value: number };
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function validTimer(value: unknown): value is TimerState {
  if (!value || typeof value !== "object") return false;
  const s = value as TimerState, max = MAX_TIMER_SECONDS * 1000;
  return s.version === 1 && finite(s.duration) && s.duration >= 1000 && s.duration <= max && finite(s.remaining) && s.remaining >= 0 && s.remaining <= max &&
    (s.deadline === null || (finite(s.deadline) && s.deadline > 0 && s.deadline <= Number.MAX_SAFE_INTEGER)) && typeof s.active === "boolean" &&
    TIMER_MUSIC.includes(s.music) && finite(s.volume) && s.volume >= 0 && s.volume <= 1;
}
export const timerRemaining = (state: TimerState, now: number) => Math.max(0, Math.min(MAX_TIMER_SECONDS * 1000, state.deadline === null ? state.remaining : state.deadline - now));
export function timerAction(state: TimerState, action: TimerAction, now: number): TimerState {
  const remaining = timerRemaining(state, now);
  switch (action.type) {
    case "set": return Number.isInteger(action.seconds) && action.seconds >= 1 && action.seconds <= MAX_TIMER_SECONDS ? { ...state, duration: action.seconds * 1000, remaining: action.seconds * 1000, deadline: null, active: true } : state;
    case "start": return state.deadline !== null && remaining > 0 ? state : { ...state, deadline: now + (remaining || state.duration), remaining: remaining || state.duration, active: true };
    case "pause": return state.deadline === null ? state : { ...state, remaining, deadline: null };
    case "reset": return { ...state, remaining: state.duration, deadline: null, active: false };
    case "add": { const value = Math.min(MAX_TIMER_SECONDS * 1000, remaining + 60_000); return { ...state, remaining: value, deadline: state.deadline !== null && remaining > 0 ? now + value : null, active: true }; }
    case "music": return TIMER_MUSIC.includes(action.value) ? { ...state, music: action.value } : state;
    case "volume": return finite(action.value) && action.value >= 0 && action.value <= 1 ? { ...state, volume: action.value } : state;
  }
}
export function formatTimer(milliseconds: number) { const seconds = Math.max(0, Math.ceil(milliseconds / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function parseTimer(value: string): number | null {
  const match = /^(\d{1,4}):([0-5]\d)$/.exec(value.trim()); if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]); return seconds >= 1 && seconds <= MAX_TIMER_SECONDS ? seconds : null;
}
export const timerStorageKey = (owner: string, design: string) => `canvaisdead:timer:v1:${JSON.stringify([owner, design])}`;

type TimerSnapshot = { state: TimerState; error: string };
type TimerStorage = Pick<Storage, "getItem" | "setItem">;
/** Only control changes are saved. Ticks derive from the deadline; no design writes. */
export function createTimerStore(key: string, storage: () => TimerStorage, now = Date.now) {
  const initial: TimerSnapshot = { state: INITIAL_TIMER, error: "" };
  let snapshot = initial, unsaved = false;
  const listeners = new Set<() => void>(), notify = () => listeners.forEach(listener => listener());
  function read() {
    if (unsaved) return;
    try {
      const raw = storage().getItem(key), state: unknown = raw === null ? INITIAL_TIMER : JSON.parse(raw);
      if (!validTimer(state)) throw Error("Invalid timer");
      if (JSON.stringify(snapshot.state) !== JSON.stringify(state) || snapshot.error) { snapshot = { state, error: "" }; notify(); }
    } catch { snapshot = { ...snapshot, error: "Timer settings could not be read. You can still use the timer in this window." }; notify(); }
  }
  function dispatch(action: TimerAction) {
    // Read the latest control changes from another window before applying ours.
    read(); const state = timerAction(snapshot.state, action, now()); if (state === snapshot.state) return;
    let error = "";
    try { storage().setItem(key, JSON.stringify(state)); unsaved = false; }
    catch { unsaved = true; error = "Timer settings could not be saved. Keep this window open to continue the timer."; }
    snapshot = { state, error }; notify();
  }
  return { read, dispatch, getSnapshot: () => snapshot, getServerSnapshot: () => initial, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
