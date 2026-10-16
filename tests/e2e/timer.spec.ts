import { test, expect, type Page } from "./fixtures";
import { captureTimer, createPresentationDeck, timerPanel } from "../../scripts/parity/timer-evidence";

const epoch = Date.UTC(2026, 9, 16, 12);
const savedTimer = (page: Page) => page.evaluate(() => { const key = Object.keys(localStorage).find(key => key.startsWith('canvaisdead:timer:v1:')); return key ? JSON.parse(localStorage.getItem(key)!) : null; });
const savedDesigns = (page: Page) => page.evaluate(() => window.designTestStorage.entries());
async function duration(page: Page, text: string) { const panel = await timerPanel(page); const input = panel.getByRole('textbox', { name: 'Duration (minutes:seconds)', exact: true }); await input.fill(text); await input.press('Enter'); return panel; }

test("countdown starts, pauses, adds time, catches up after sleep and reloads without changing designs", async ({ page }, info) => {
  await page.clock.setFixedTime(epoch); await createPresentationDeck(page); const original = await savedDesigns(page);
  await captureTimer(page, info.project.name, "after", "editor"); const panel = await timerPanel(page); await expect(panel.getByRole('timer')).toHaveText('5:00');
  const metrics = await captureTimer(page, info.project.name, 'after', 'panel'); expect(metrics.documentWidth).toBe(metrics.viewport.w); expect(metrics.panel!.x).toBeGreaterThanOrEqual(0); expect(metrics.panel!.y).toBeGreaterThanOrEqual(0); expect(metrics.panel!.x + metrics.panel!.w).toBeLessThanOrEqual(metrics.viewport.w); expect(metrics.panel!.y + metrics.panel!.h).toBeLessThanOrEqual(metrics.viewport.h);
  await duration(page, '0:20'); await panel.getByRole('button', { name: 'Start timer', exact: true }).click();
  const started = await savedTimer(page); await page.clock.setFixedTime(epoch + 12_000); await expect(panel.getByRole('timer')).toHaveText('0:08'); expect(await savedTimer(page)).toEqual(started);
  await panel.getByRole('button', { name: '+1 min', exact: true }).click(); await expect(panel.getByRole('timer')).toHaveText('1:08');
  await panel.getByRole('button', { name: 'Pause timer', exact: true }).click(); await page.clock.setFixedTime(epoch + 120_000); await expect(panel.getByRole('timer')).toHaveText('1:08');
  await captureTimer(page, info.project.name, 'after', 'paused'); await panel.getByRole('button', { name: 'Minimize timer', exact: true }).click(); await expect(page.getByRole('button', { name: 'Timer', exact: true })).toContainText('1:08');
  await page.reload(); await timerPanel(page); await expect(panel.getByRole('timer')).toHaveText('1:08');
  await panel.getByRole('button', { name: 'Start timer', exact: true }).click(); await page.clock.setFixedTime(epoch + 200_000); await expect(panel.getByRole('timer')).toHaveText('0:00'); await expect(panel.getByRole('status')).toHaveText('Time’s up!');
  await panel.getByRole('button', { name: 'Reset timer', exact: true }).click(); await expect(panel.getByRole('timer')).toHaveText('0:20'); expect(await savedDesigns(page)).toEqual(original);
});

test("timer validates duration, restores keyboard focus and keeps sound preferences local", async ({ page }) => {
  await createPresentationDeck(page); const original = await savedDesigns(page), panel = await timerPanel(page), input = panel.getByRole('textbox', { name: 'Duration (minutes:seconds)', exact: true });
  await input.fill('1:90'); await input.press('Enter'); await expect(input).toHaveAttribute('aria-invalid', 'true'); await expect(panel.getByRole('timer')).toHaveText('5:00'); expect(await savedTimer(page)).toBeNull();
  await input.press('Escape'); await expect(panel).toHaveCount(0); await expect(page.getByRole('button', { name: 'Timer', exact: true })).toBeFocused();
  await timerPanel(page); await panel.getByRole('combobox', { name: 'Music', exact: true }).selectOption('lofi'); const volume = panel.getByRole('slider', { name: 'Timer volume', exact: true }); await volume.focus(); await volume.press('Home');
  expect(await savedTimer(page)).toMatchObject({ music: 'lofi', volume: 0 });
  await page.getByRole('textbox', { name: 'Design name', exact: true }).click(); await expect(panel).toHaveCount(0); await expect(page.getByRole('textbox', { name: 'Design name', exact: true })).toBeFocused();
  await page.reload(); await timerPanel(page); await expect(panel.getByRole('combobox', { name: 'Music', exact: true })).toHaveValue('lofi'); await expect(volume).toHaveValue('0'); expect(await savedDesigns(page)).toEqual(original);
});

test("presentation shortcuts and presenter/audience controls synchronize the countdown", async ({ page, context }, info) => {
  await createPresentationDeck(page); const original = await savedDesigns(page);
  await page.getByRole('button', { name: 'Present', exact: true }).click(); await captureTimer(page, info.project.name, 'after', 'presentation');
  await page.getByRole('main', { name: 'Presentation', exact: true }).focus(); await page.keyboard.press('2'); const panel = await timerPanel(page); await expect(panel.getByRole('timer')).toHaveText('2:00');
  await captureTimer(page, info.project.name, 'after', 'presentation-panel'); await panel.getByRole('heading', { name: 'Timer', exact: true }).press('4'); await expect(panel.getByRole('timer')).toHaveText('4:00'); await panel.getByRole('heading', { name: 'Timer', exact: true }).press('Escape'); await expect(panel).toHaveCount(0); await expect(page.getByRole('main', { name: 'Presentation', exact: true })).toBeVisible();
  await page.getByRole('main', { name: 'Presentation', exact: true }).focus(); await page.keyboard.press('3'); await expect(panel.getByRole('timer')).toHaveText('3:00');
  await panel.getByRole('textbox', { name: 'Duration (minutes:seconds)', exact: true }).fill('4:00'); await panel.getByRole('textbox', { name: 'Duration (minutes:seconds)', exact: true }).press('Escape'); await expect(page.getByRole('button', { name: 'Timer', exact: true })).toContainText('3:00');
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click(); await page.getByRole('button', { name: 'More present options', exact: true }).click(); const popup = context.waitForEvent('page'); await page.getByRole('button', { name: 'Presenter view', exact: true }).click(); const audience = await popup;
  await timerPanel(page); const audiencePanel = await timerPanel(audience); await expect(audiencePanel.getByRole('timer')).toHaveText('3:00');
  await audiencePanel.getByRole('button', { name: '+1 min', exact: true }).click(); await expect(panel.getByRole('timer')).toHaveText('4:00');
  await panel.getByRole('button', { name: 'Start timer', exact: true }).click(); await expect(audiencePanel.getByRole('button', { name: 'Pause timer', exact: true })).toBeVisible();
  await audiencePanel.getByRole('button', { name: 'Pause timer', exact: true }).click(); await expect(panel.getByRole('button', { name: 'Start timer', exact: true })).toBeVisible();
  await audience.reload(); await timerPanel(audience); await expect(audiencePanel.getByRole('button', { name: 'Start timer', exact: true })).toBeVisible();
  await expect(audience.getByText('Private speaker note', { exact: true })).toHaveCount(0); expect(await savedDesigns(page)).toEqual(original); await audience.close();
});

test("different designs keep independent countdown settings after reload", async ({ page, context }) => {
  await createPresentationDeck(page); const other = await context.newPage(); await other.goto('/canvaisdead/app');
  await other.locator('.cx-qc').getByRole('button', { name: 'Presentation', exact: true }).click(); await expect(other.getByTestId('page')).toBeVisible();
  const original = await savedDesigns(other); await duration(page, '2:00'); const otherPanel = await timerPanel(other); await expect(otherPanel.getByRole('timer')).toHaveText('5:00');
  await duration(other, '3:00'); await expect(page.getByRole('dialog', { name: 'Timer', exact: true }).getByRole('timer')).toHaveText('2:00');
  await page.reload(); await timerPanel(page); await expect(page.getByRole('dialog', { name: 'Timer', exact: true }).getByRole('timer')).toHaveText('2:00'); expect(await savedDesigns(page)).toEqual(original); await other.close();
});

test("timer storage and audio failures are recoverable without losing control changes or designs", async ({ page }) => {
  await createPresentationDeck(page); const original = await savedDesigns(page);
  await page.evaluate(() => { const original = Storage.prototype.setItem; Object.assign(window, { restoreTimerStorage: () => { Storage.prototype.setItem = original; } }); Storage.prototype.setItem = function(key, value) { if (key.startsWith('canvaisdead:timer:v1:')) throw new DOMException('Quota', 'QuotaExceededError'); return original.call(this, key, value); }; Object.defineProperty(window, 'AudioContext', { configurable: true, value: class { constructor() { throw Error('Unavailable'); } } }); });
  const panel = await duration(page, '0:30'); await expect(panel.getByRole('alert')).toContainText('could not be saved'); await panel.getByRole('button', { name: 'Start timer', exact: true }).click(); await panel.getByRole('button', { name: '+1 min', exact: true }).click();
  await expect(panel.getByRole('timer')).toContainText('1:'); await page.evaluate(() => (window as unknown as { restoreTimerStorage: () => void }).restoreTimerStorage());
  await panel.getByRole('button', { name: 'Pause timer', exact: true }).click(); await expect(panel.getByRole('alert')).toContainText('Sound is unavailable'); expect((await savedTimer(page)).remaining).toBeGreaterThan(80_000); expect(await savedDesigns(page)).toEqual(original);
});

test("timer produces original music through the real audio graph and volume zero silences it", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    class ObservedAudio extends NativeAudio {
      constructor() { super(); const analyser = this.createAnalyser(); analyser.fftSize = 2048; const create = this.createGain.bind(this); let first = true;
        this.createGain = () => { const gain = create(); if (first) { first = false; gain.connect(analyser); } return gain; };
        Object.assign(window, { timerAudioProbe: { state: () => this.state, peak: () => { const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data); return Math.max(...Array.from(data, Math.abs)); } } });
      }
    }
    window.AudioContext = ObservedAudio;
  });
  await createPresentationDeck(page); const panel = await timerPanel(page); await panel.getByRole('combobox', { name: 'Music', exact: true }).selectOption('upbeat'); await panel.getByRole('button', { name: 'Start timer', exact: true }).click();
  const probe = () => page.evaluate(() => { const p = (window as unknown as { timerAudioProbe: { state: () => string; peak: () => number } }).timerAudioProbe; return { state: p.state(), peak: p.peak() }; });
  await expect.poll(async () => (await probe()).state).toBe('running'); await expect.poll(async () => (await probe()).peak).toBeGreaterThan(.001);
  const volume = panel.getByRole('slider', { name: 'Timer volume', exact: true }); await volume.focus(); await volume.press('Home'); await expect.poll(async () => (await probe()).peak).toBe(0);
  await panel.getByRole('button', { name: 'Pause timer', exact: true }).click();
});
