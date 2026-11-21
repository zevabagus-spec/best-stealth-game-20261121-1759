// Gilded Shadow — staged screenshots. Each scene plays the real game forward
// from a fresh world at a fixed step, steered by a scripted autopilot that
// walks the tile paths a player would walk and waits when a guard's cone
// covers the next tile — so every screenshot is a genuine render of the
// game's own code, and the same seed always gives the same frame.
import { STEP, TILE } from './config.js';
import { findPathTiles, LEVEL } from './level.js';
import { canSee } from './vision.js';
import { EVENT_CAUGHT, EVENT_WIN, SCREEN_PLAY } from './world.js';

const SAMPLE = STEP;

/** Is tile centre (x,y) inside any guard's cone with line of sight right now? */
function tileWatched(world, x, y) {
  for (const g of world.guards) {
    const sight = canSee(g.x, g.y, g.angle, x, y, false);
    if (sight.seen && sight.closeness > 0.12) return true;
  }
  return false;
}

/** Synthetic input that walks the player toward (tx,ty), or stands still. */
function inputToward(player, tx, ty, sprint) {
  const dx = tx - player.x;
  const dy = ty - player.y;
  return {
    left: dx < -6, right: dx > 6, up: dy < -6, down: dy > 6,
    sprint: !!sprint, mouseX: tx, mouseY: ty, clicked: false,
  };
}
function inputIdle() {
  return { left: false, right: false, up: false, down: false, sprint: false, mouseX: null, mouseY: null, clicked: false };
}

/**
 * Walk the player through `targets` (px points) in order. Between targets the
 * BFS tile path is followed; before entering a tile whose centre a guard can
 * see, the player waits (up to `waitCap` seconds) for the cone to pass.
 * Returns the last world event seen (EVENT_WIN / EVENT_CAUGHT / 0).
 */
function drive(world, targets, options = {}) {
  const sprint = !!options.sprint;
  const waitCap = options.waitCap ?? 4;
  let lastEvent = 0;
  for (const target of targets) {
    const path = findPathTiles(world.player.x, world.player.y, target.x, target.y);
    if (!path) continue;
    let i = 1; // path[0] is the player's own tile
    let waitLeft = waitCap;
    let steps = 0;
    while (i < path.length && steps < 60 * 300) {
      steps += 1;
      const [nx, ny] = path[i];
      const near = Math.hypot(nx - world.player.x, ny - world.player.y) < 10;
      if (near) { i += 1; continue; }
      if (tileWatched(world, nx, ny) && waitLeft > 0) {
        waitLeft -= SAMPLE;
        lastEvent = world.step(SAMPLE, inputIdle()) || lastEvent;
        continue;
      }
      waitLeft = waitCap;
      lastEvent = world.step(SAMPLE, inputToward(world.player, nx, ny, sprint)) || lastEvent;
      if (lastEvent !== 0) return lastEvent;
    }
    // Settle onto the exact target point.
    let settle = 0;
    while (Math.hypot(target.x - world.player.x, target.y - world.player.y) > 8 && settle < 60 * 20) {
      settle += 1;
      lastEvent = world.step(SAMPLE, inputToward(world.player, target.x, target.y, sprint)) || lastEvent;
      if (lastEvent !== 0) return lastEvent;
    }
  }
  return lastEvent;
}

function waitSeconds(world, seconds) {
  let lastEvent = 0;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    lastEvent = world.step(SAMPLE, inputIdle()) || lastEvent;
    if (lastEvent !== 0) return lastEvent;
  }
  return lastEvent;
}

const T = (tx, ty) => ({ x: tx * TILE, y: ty * TILE });

/**
 * Stage the named scene and return the world ready to render. Names:
 * cover (mid-heist behind the crates), patrol (early game, routes visible),
 * alarm (caught in a cone, guard closing in), escape (the win).
 */
export function stageShot(name, world) {
  world.start();
  if (name === 'patrol') {
    // Early game: slip along the bottom corridor while the patrols sweep above.
    drive(world, [T(8.5, 15.5), T(12.5, 15.5)]);
    waitSeconds(world, 1.5);
    return world;
  }
  if (name === 'alarm') {
    // Hurry up the middle, then hunt the Vault guard: stay just ahead of it
    // in its own cone until its meter fills and the chase begins — then
    // freeze the frame a heartbeat later, mid-chase, before it closes in.
    drive(world, [T(15.5, 15.5)], { sprint: true });
    const guard = world.guards[3];
    for (let i = 0; i < 60 * 40; i += 1) {
      const tx = guard.x + Math.cos(guard.angle) * 90;
      const ty = guard.y + Math.sin(guard.angle) * 90;
      world.step(SAMPLE, inputToward(world.player, tx, ty, true));
      if (world.screen !== SCREEN_PLAY) break;
      if (world.guards.some((g) => g.state === 'alerted')) break;
    }
    waitSeconds(world, 0.35);
    return world;
  }
  if (name === 'escape') {
    // The full run: both seal keys, the Sunstone, then the hatch.
    drive(world, [T(4.5, 2.5)]);
    waitSeconds(world, 0.5);
    drive(world, [T(27.5, 2.5)]);
    waitSeconds(world, 0.5);
    drive(world, [T(15.5, 8.5)]);
    waitSeconds(world, 0.5);
    drive(world, [T(29.5, 16.5)]);
    return world;
  }
  // Cover: mid-heist, crouched behind the library crates with the Vault
  // guard's cone sweeping past and the Sunstone glowing in the vault.
  drive(world, [T(4.5, 2.5)]);
  drive(world, [T(7.5, 10.5)]);
  waitSeconds(world, 1.0);
  return world;
}

export { EVENT_CAUGHT, EVENT_WIN, SCREEN_PLAY };
