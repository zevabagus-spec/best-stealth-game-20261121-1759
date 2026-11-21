// Gilded Shadow — the thief. Wren moves with WASD/arrows; Shift sprints
// (fast, loud — guards hear it); click throws a pebble that draws the nearest
// guard to the landing point. Standing in a fern planter hides Wren; standing
// in shadow slows every guard's detection. Movement slides along walls.
import { PLAYER, TILE, VIEW_H, VIEW_W } from './config.js';
import { blocksMove, inBush, inShadow } from './level.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.radius;
    this.pebbles = PLAYER.pebbles;
    this.facing = 0; // radians, toward the mouse or the last move
    this.moving = false;
    this.sprinting = false;
    this.hidden = false;
    this.inShadow = false;
    this.stepTimer = 0;
    this.stepDue = false;
  }

  /** Axis-separated slide: try x, then y, so corners don't snag. */
  tryMove(dx, dy) {
    const r = this.radius;
    const canBeAt = (x, y) =>
      !blocksMove(x - r, y - r) && !blocksMove(x + r, y - r) &&
      !blocksMove(x - r, y + r) && !blocksMove(x + r, y + r);
    if (dx !== 0 && canBeAt(this.x + dx, this.y)) this.x += dx;
    if (dy !== 0 && canBeAt(this.x, this.y + dy)) this.y += dy;
    // Safety net: whatever the level holds, Wren never leaves the floor.
    this.x = Math.max(this.radius, Math.min(VIEW_W - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(VIEW_H - this.radius, this.y));
  }

  update(dt, input, audio) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    const len = Math.hypot(mx, my);
    this.moving = len > 0;
    this.sprinting = this.moving && input.sprint;
    if (this.moving) {
      const speed = this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
      this.tryMove((mx / len) * speed * dt, (my / len) * speed * dt);
      this.facing = Math.atan2(my, mx);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepDue = true;
        this.stepTimer = this.sprinting ? 0.26 : 0.42;
      }
    } else {
      this.stepDue = false;
    }
    if (input.mouseX !== null && input.mouseY !== null) {
      this.facing = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
    }
    this.hidden = inBush(this.x, this.y);
    this.inShadow = inShadow(this.x, this.y);
    if (this.stepDue && audio) audio.footstep(this.sprinting);
    this.stepDue = false;
  }

  /** Throw a pebble toward (tx,ty); returns the landing point or null. */
  throwPebble(tx, ty) {
    if (this.pebbles <= 0) return null;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) return null;
    const range = Math.min(d, PLAYER.throwRange);
    this.pebbles -= 1;
    return { x: this.x + (dx / d) * range, y: this.y + (dy / d) * range };
  }
}
