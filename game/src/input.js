// Gilded Shadow — input. Keyboard (WASD/arrows, Shift to sprint, M mute,
// P pause, R restart, Enter to start) and mouse (click throws a pebble).
// Coordinates are converted to the game's own 1280x720 space, whatever the
// window size, so a click always lands where the player aimed.
import { VIEW_H, VIEW_W } from './config.js';

export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.sprint = false;
    this.mouseX = null;
    this.mouseY = null;
    this.clicked = false;
    this.pressedKey = null; // one-shot key press, consumed by the loop
    this.canvas = canvas;
    this.attach(canvas);
  }

  attach(canvas) {
    const keys = {};
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      keys[e.code] = true;
      // Pure modifiers are not game keys; keep them out of the one-shot slot.
      if (!['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
        this.pressedKey = e.code;
      }
      this.sync(keys);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      this.sync(keys);
    });
    window.addEventListener('blur', () => {
      for (const k of Object.keys(keys)) keys[k] = false;
      this.sync(keys);
    });
    canvas.addEventListener('mousemove', (e) => {
      const p = this.toGame(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      const p = this.toGame(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.clicked = true;
    });
  }

  sync(keys) {
    this.left = !!(keys.KeyA || keys.ArrowLeft);
    this.right = !!(keys.KeyD || keys.ArrowRight);
    this.up = !!(keys.KeyW || keys.ArrowUp);
    this.down = !!(keys.KeyS || keys.ArrowDown);
    this.sprint = !!(keys.ShiftLeft || keys.ShiftRight);
  }

  toGame(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  /** Take and clear the last pressed key, if any. */
  consumeKey() {
    const k = this.pressedKey;
    this.pressedKey = null;
    return k;
  }
}
