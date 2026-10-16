import type { TimerMusic } from "./timer";

/** Original synthesized cues and short musical patterns; no recordings or network. */
export function createTimerAudio(context: AudioContext) {
  const master = context.createGain(); master.gain.value = .06; master.connect(context.destination);
  let music: TimerMusic = "none", running = false, beat = 0, interval: ReturnType<typeof setInterval> | null = null;
  const voices = new Set<OscillatorNode>();
  function tone(frequency: number, start: number, length: number, volume = 1, type: OscillatorType = "sine") {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency; oscillator.connect(gain); gain.connect(master);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .025); gain.gain.exponentialRampToValueAtTime(.001, start + length);
    oscillator.start(start); oscillator.stop(start + length + .02); voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  function cue(kind: "start" | "warning" | "end") {
    const notes = kind === "start" ? [523.25, 659.25] : kind === "warning" ? [440, 440] : [659.25, 523.25, 783.99];
    notes.forEach((note, index) => tone(note, context.currentTime + index * .18, .35, .7));
  }
  const patterns: Record<Exclude<TimerMusic, "none">, { notes: number[]; pace: number; type: OscillatorType }> = {
    focus: { notes: [130.81, 196, 164.81, 220, 174.61, 196, 146.83, 196], pace: 900, type: "sine" },
    dramatic: { notes: [110, 164.81, 130.81, 196, 110, 146.83, 123.47, 164.81], pace: 650, type: "triangle" },
    upbeat: { notes: [261.63, 329.63, 392, 329.63, 349.23, 440, 392, 293.66], pace: 360, type: "triangle" },
    energetic: { notes: [220, 440, 329.63, 440, 246.94, 493.88, 392, 329.63], pace: 240, type: "triangle" },
    lofi: { notes: [146.83, 220, 174.61, 261.63, 164.81, 246.94, 196, 220], pace: 720, type: "sine" },
  };
  function stopVoices() { for (const voice of voices) { try { voice.stop(); } catch { /* Already stopped. */ } } }
  function update(nextRunning: boolean, nextMusic: TimerMusic, volume: number) {
    master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * .12, context.currentTime);
    if (running === nextRunning && music === nextMusic) return;
    if (interval !== null) clearInterval(interval); interval = null; stopVoices();
    running = nextRunning; music = nextMusic; beat = 0;
    if (!running || music === "none") return;
    const pattern = patterns[music];
    const play = () => { const note = pattern.notes[beat++ % pattern.notes.length]; tone(note, context.currentTime, pattern.pace / 1000 * 1.4, .35, pattern.type); if (beat % 4 === 1) tone(note / 2, context.currentTime, pattern.pace / 500, .25); };
    play(); interval = setInterval(play, pattern.pace);
  }
  return { unlock: () => context.resume(), cue, update, close: () => { if (interval !== null) clearInterval(interval); stopVoices(); master.disconnect(); void context.close().catch(() => {}); } };
}
