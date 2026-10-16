import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimerStore, formatTimer, INITIAL_TIMER, MAX_TIMER_SECONDS, parseTimer, timerAction, timerRemaining, timerStorageKey, validTimer } from "@/lib/design/timer";
import { createTimerAudio } from "@/lib/design/timer-audio";

describe("local countdown", () => {
  it("uses a deadline across sleep and reload, pauses exactly, resumes and resets", () => {
    const start = 1_000_000, running = timerAction(INITIAL_TIMER, { type: "start" }, start);
    expect(running.deadline).toBe(start + 300_000); expect(timerAction(running, { type: "start" }, start + 5000)).toBe(running);
    expect(timerRemaining(JSON.parse(JSON.stringify(running)), start + 143_500)).toBe(156_500);
    const paused = timerAction(running, { type: "pause" }, start + 143_500);
    expect(timerRemaining(paused, start + 9_000_000)).toBe(156_500);
    const resumed = timerAction(paused, { type: "start" }, start + 9_000_000);
    expect(timerRemaining(resumed, start + 9_156_501)).toBe(0);
    expect(timerAction(resumed, { type: "start" }, start + 10_000_000).deadline).toBe(start + 10_300_000);
    expect(timerAction(resumed, { type: "reset" }, start)).toEqual(INITIAL_TIMER);
  });
  it("adds a minute while running, paused or ended without replacing the reset duration", () => {
    const running = timerAction(INITIAL_TIMER, { type: "start" }, 1000);
    const added = timerAction(running, { type: "add" }, 21_000);
    expect(added.deadline).toBe(361_000); expect(added.duration).toBe(300_000);
    expect(timerAction(added, { type: "reset" }, 22_000)).toEqual(INITIAL_TIMER);
    expect(timerAction(INITIAL_TIMER, { type: "add" }, 1000)).toMatchObject({ remaining: 360_000, deadline: null });
    expect(timerAction(running, { type: "add" }, 400_000)).toMatchObject({ remaining: 60_000, deadline: null });
    const maximum = timerAction(INITIAL_TIMER, { type: "set", seconds: MAX_TIMER_SECONDS }, 0);
    expect(timerAction(maximum, { type: "add" }, 0).remaining).toBe(MAX_TIMER_SECONDS * 1000);
  });
  it("validates explicit durations, rounds only the display and rejects invalid settings", () => {
    expect(parseTimer("0:01")).toBe(1); expect(parseTimer(" 12:34 ")).toBe(754); expect(parseTimer("1439:59")).toBe(MAX_TIMER_SECONDS);
    for (const value of ["", "5", "1:60", "0:00", "-1:00", "1.5:00", "1440:00", "1:1", "<script>"]) expect(parseTimer(value)).toBeNull();
    expect(formatTimer(1)).toBe("0:01"); expect(formatTimer(59_001)).toBe("1:00"); expect(formatTimer(0)).toBe("0:00");
    for (const seconds of [0, -1, NaN, Infinity, .5, MAX_TIMER_SECONDS + 1]) expect(timerAction(INITIAL_TIMER, { type: "set", seconds }, 0)).toBe(INITIAL_TIMER);
    for (const value of [null, {}, { ...INITIAL_TIMER, version: 2 }, { ...INITIAL_TIMER, duration: Infinity }, { ...INITIAL_TIMER, deadline: NaN }, { ...INITIAL_TIMER, remaining: -1 }, { ...INITIAL_TIMER, music: "https://remote" }, { ...INITIAL_TIMER, volume: 2 }]) expect(validTimer(value)).toBe(false);
    expect(validTimer(INITIAL_TIMER)).toBe(true);
  });
  it("reads other-window changes before edits, isolates owners/designs and writes no ticks", () => {
    const data = new Map<string, string>(), getItem = (key: string) => data.get(key) ?? null, setItem = vi.fn((key: string, value: string) => { data.set(key, value); });
    const key = timerStorageKey("owner", "design"), storage = () => ({ getItem, setItem }), a = createTimerStore(key, storage, () => 1000), b = createTimerStore(key, storage, () => 2000);
    const listener = vi.fn(), unsubscribe = b.subscribe(listener); a.read(); b.read(); expect(setItem).not.toHaveBeenCalled();
    a.dispatch({ type: "set", seconds: 60 }); b.dispatch({ type: "add" }); expect(b.getSnapshot().state.remaining).toBe(120_000);
    a.read(); expect(a.getSnapshot().state).toEqual(b.getSnapshot().state); const snapshot = a.getSnapshot(); a.read(); expect(a.getSnapshot()).toBe(snapshot);
    expect(createTimerStore(timerStorageKey("other", "design"), storage).getSnapshot().state).toEqual(INITIAL_TIMER);
    expect(timerStorageKey("a:b", "c")).not.toBe(timerStorageKey("a", "b:c"));
    for (let now = 1000; now < 10_000; now++) timerRemaining(a.getSnapshot().state, now); expect(setItem).toHaveBeenCalledTimes(2);
    unsubscribe(); b.read(); expect(listener).toHaveBeenCalledTimes(2);
  });
  it("preserves bad saved bytes on read and keeps unsaved control changes across retries", () => {
    let raw: string | null = "bad-json", fail = false;
    const setItem = vi.fn((_key: string, value: string) => { if (fail) throw Error("Quota"); raw = value; });
    const store = createTimerStore("timer", () => ({ getItem: () => raw, setItem }), () => 1000);
    store.read(); expect(store.getSnapshot().error).toContain("could not be read"); expect(raw).toBe("bad-json"); expect(setItem).not.toHaveBeenCalled();
    store.dispatch({ type: "set", seconds: 20 }); fail = true; store.dispatch({ type: "start" });
    expect(store.getSnapshot().error).toContain("could not be saved"); expect(store.getSnapshot().state.deadline).toBe(21_000);
    store.read(); store.dispatch({ type: "add" }); expect(store.getSnapshot().state.deadline).toBe(81_000);
    fail = false; store.dispatch({ type: "volume", value: 0 }); expect(store.getSnapshot().error).toBe(""); expect(JSON.parse(raw!).deadline).toBe(81_000);
  });
});

afterEach(() => vi.useRealTimers());
it("synthesizes all music choices locally and releases oscillators, intervals and context", async () => {
  vi.useFakeTimers(); const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const gain = () => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
  const master = gain(), context = { currentTime: 1, destination: {}, createGain: vi.fn().mockReturnValueOnce(master).mockImplementation(gain), createOscillator: () => { const oscillator = { type: "sine", frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; oscillators.push(oscillator); return oscillator; }, resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
  const audio = createTimerAudio(context as unknown as AudioContext); await audio.unlock();
  for (const music of ["focus", "dramatic", "upbeat", "energetic", "lofi"] as const) { const before = oscillators.length; audio.update(true, music, .5); vi.advanceTimersByTime(2000); expect(oscillators.length).toBeGreaterThan(before); }
  audio.cue("start"); audio.cue("warning"); audio.cue("end"); audio.update(false, "none", 0); expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 1);
  const count = oscillators.length; vi.advanceTimersByTime(10_000); expect(oscillators).toHaveLength(count); audio.close(); expect(context.close).toHaveBeenCalledOnce(); expect(master.disconnect).toHaveBeenCalledOnce(); expect(oscillators.every(o => o.start.mock.calls.length === 1 && o.stop.mock.calls.length >= 1)).toBe(true);
});
