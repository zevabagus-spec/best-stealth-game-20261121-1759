// Gilded Shadow — bootstrap. Normal play runs a requestAnimationFrame loop
// with a fixed 1/60 s step (accumulator, so the game plays the same speed on
// any display). With ?shot=<name> the game instead stages that scene
// synchronously and renders one frame, for screenshots: the frame is what the
// rules produce, never a mock-up.
import { STEP, VIEW_H, VIEW_W } from './config.js';
import { World, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { Input } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const world = new World();
const status = document.getElementById('status');

function announce() {
  if (!status) return;
  if (world.screen === SCREEN_PLAY) {
    status.textContent = `${world.objectiveText} Pebbles: ${world.player.pebbles}.`;
  } else if (world.screen === SCREEN_WIN) {
    status.textContent = `You escaped with the Sunstone. Score ${world.score}.`;
  } else if (world.screen === SCREEN_LOSE) {
    status.textContent = 'Caught by a guard. Press R to try again.';
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  document.title = `Gilded Shadow — shot ${shot}`;
  stageShot(shot, world);
  render(ctx, world);
  announce();
} else {
  let last = performance.now();
  let acc = 0;
  let paused = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const key = input.consumeKey();
    if (key === 'KeyM') world.audio.toggleMute();
    if (key === 'KeyP' || key === 'Escape') paused = !paused;
    if (key === 'KeyR') { world.start(); paused = false; }
    if ((key === 'Enter' || key === 'Space') && world.screen === SCREEN_TITLE) world.start();
    if ((key === 'Enter' || key === 'Space') && (world.screen === SCREEN_WIN || world.screen === SCREEN_LOSE)) world.start();
    if (paused || world.screen !== SCREEN_PLAY) {
      render(ctx, world);
      return;
    }
    acc += Math.min(100, now - last) / 1000;
    last = now;
    while (acc >= STEP) {
      world.step(STEP, input);
      acc -= STEP;
    }
    render(ctx, world);
    announce();
  }
  requestAnimationFrame(frame);
  canvas.addEventListener('mousedown', () => world.audio.ensure(), { once: true });
  window.addEventListener('keydown', () => world.audio.ensure(), { once: true });
}
