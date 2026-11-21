// Gilded Shadow — the game itself. World owns the state machine (title,
// playing, won, caught), the objective (two seal keys + the Sunstone, then the
// exit hatch), the alarm (one guard's full meter raises every guard), the
// pebble in flight, and the score. It steps at a fixed 1/60 s so staged
// screenshots replay exactly.
import { PLAYER, SCORE } from './config.js';
import { LEVEL } from './level.js';
import { Guard, STATE_ALERTED, STATE_PATROL } from './guards.js';
import { Player } from './player.js';
import { AudioEngine } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export const EVENT_NONE = 0;
export const EVENT_WIN = 1;
export const EVENT_CAUGHT = 2;

function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

export class World {
  constructor() {
    this.audio = new AudioEngine();
    this.reset();
  }

  reset() {
    this.time = 0;
    this.screen = SCREEN_TITLE;
    this.player = new Player(LEVEL.spawn.x, LEVEL.spawn.y);
    this.guards = LEVEL.guards.map((spec) => new Guard(spec));
    this.keys = LEVEL.keys.map((k) => ({ ...k, taken: false }));
    this.sunstone = { ...LEVEL.sunstone, taken: false };
    this.exitOpen = false;
    this.pebble = null; // {x, y, tx, ty, t} while flying
    this.pebblePing = null; // {x, y, t} fading ring after landing
    this.noisePulse = null; // {x, y, t} fading ring while sprinting loudly
    this.noiseCooldown = 0;
    this.score = 0;
    this.timesSpotted = 0;
    this.alarms = 0;
    this.pebblesThrown = 0;
    this.lastEvent = '';
    this.eventTimer = 0;
    this.flash = 0; // red vignette pulse on being spotted
  }

  start() {
    this.reset();
    this.screen = SCREEN_PLAY;
  }

  get relicsTaken() {
    return this.keys.filter((k) => k.taken).length + (this.sunstone.taken ? 1 : 0);
  }

  get objectiveText() {
    if (this.exitOpen) return 'The hatch is open — slip out unseen!';
    const left = 3 - this.relicsTaken;
    return left === 1 ? 'One relic left, then the hatch opens.' : `${left} relics left: 2 seal keys + the Sunstone.`;
  }

  /** One guard's meter filled: chase, and every other guard investigates. */
  onSpotted(guard, player) {
    this.timesSpotted += 1;
    this.alarms += 1;
    this.score = Math.max(0, this.score - SCORE.alarmPenalty);
    this.lastEvent = `SPOTTED by the ${guard.name} guard!`;
    this.eventTimer = 2.2;
    this.flash = 1;
    this.audio.alert();
    for (const other of this.guards) {
      if (other === guard) {
        other.raiseAlarm(player.x, player.y);
      } else if (other.state !== STATE_ALERTED) {
        other.setInvestigate(player.x, player.y);
      }
    }
  }

  throwPebble(tx, ty) {
    if (this.screen !== SCREEN_PLAY) return;
    const landing = this.player.throwPebble(tx, ty);
    if (!landing) return;
    this.pebblesThrown += 1;
    this.pebble = { x: this.player.x, y: this.player.y, tx: landing.x, ty: landing.y, t: 0 };
    this.audio.pebble();
  }

  updatePebble(dt) {
    if (!this.pebble) return;
    const p = this.pebble;
    p.t += dt * 3.2;
    if (p.t >= 1) {
      this.pebble = null;
      this.pebblePing = { x: p.tx, y: p.ty, t: 0 };
      // The nearest guard walks over to see what made the noise.
      let best = null;
      let bestD = Infinity;
      for (const g of this.guards) {
        const d = dist(g.x, g.y, p.tx, p.ty);
        if (d < bestD) { bestD = d; best = g; }
      }
      if (best && bestD < 420) {
        best.setInvestigate(p.tx, p.ty);
        this.audio.suspicious();
      }
      return;
    }
    p.x = p.x + (p.tx - p.x) * Math.min(1, dt * 8);
    p.y = p.y + (p.ty - p.y) * Math.min(1, dt * 8);
  }

  /** One fixed step. Returns EVENT_WIN / EVENT_CAUGHT / EVENT_NONE. */
  step(dt, input) {
    if (this.screen !== SCREEN_PLAY) return EVENT_NONE;
    this.time += dt;
    if (this.eventTimer > 0) this.eventTimer -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.4);

    this.player.update(dt, input, this.audio);

    // Sprinting is loud: every beat, patrolling guards inside the noise
    // radius turn to investigate where the sound came from.
    if (this.player.sprinting && this.player.moving) {
      this.noiseCooldown -= dt;
      if (this.noiseCooldown <= 0) {
        this.noiseCooldown = 0.9;
        this.noisePulse = { x: this.player.x, y: this.player.y, t: 0 };
        for (const g of this.guards) {
          if (g.state === STATE_PATROL && dist(g.x, g.y, this.player.x, this.player.y) < PLAYER.sprintNoiseRadius) {
            g.setInvestigate(this.player.x, this.player.y);
          }
        }
      }
    }
    if (this.noisePulse) {
      this.noisePulse.t += dt;
      if (this.noisePulse.t > 0.7) this.noisePulse = null;
    }
    if (input.clicked) {
      this.throwPebble(input.mouseX, input.mouseY);
      input.clicked = false;
    }
    this.updatePebble(dt);
    if (this.pebblePing) {
      this.pebblePing.t += dt;
      if (this.pebblePing.t > 0.9) this.pebblePing = null;
    }

    // Guard footsteps: the nearer a moving guard, the louder its steps,
    // panned left/right so the player can tell where it is.
    for (const g of this.guards) {
      const before = { x: g.x, y: g.y };
      g.update(dt, this.player, this);
      const moved = dist(before.x, before.y, g.x, g.y);
      if (moved > 0.5) {
        g.lastStepAt += dt;
        const interval = g.state === STATE_ALERTED ? 0.30 : 0.46;
        if (g.lastStepAt >= interval) {
          g.lastStepAt = 0;
          const pan = Math.max(-1, Math.min(1, (g.x - this.player.x) / 320));
          this.audio.guardStep(g.distanceTo(this.player), pan);
        }
      }
      // Caught: an alerted guard closes the distance.
      if (g.state === STATE_ALERTED && dist(g.x, g.y, this.player.x, this.player.y) < PLAYER.catchRadius) {
        this.screen = SCREEN_LOSE;
        this.audio.lose();
        return EVENT_CAUGHT;
      }
    }

    // Pickups.
    for (const k of this.keys) {
      if (!k.taken && dist(this.player.x, this.player.y, k.x, k.y) < 26) {
        k.taken = true;
        this.score += SCORE.key;
        this.audio.pickup();
        this.lastEvent = 'Seal key taken.';
        this.eventTimer = 1.6;
      }
    }
    if (!this.sunstone.taken && dist(this.player.x, this.player.y, this.sunstone.x, this.sunstone.y) < 28) {
      this.sunstone.taken = true;
      this.score += SCORE.sunstone;
      this.audio.pickup();
      this.lastEvent = 'The Sunstone is yours!';
      this.eventTimer = 1.8;
    }
    if (!this.exitOpen && this.relicsTaken === 3) {
      this.exitOpen = true;
      this.lastEvent = 'The hatch unlocks — go!';
      this.eventTimer = 2.0;
    }

    // Win: reach the open hatch.
    if (this.exitOpen && dist(this.player.x, this.player.y, LEVEL.exit.x, LEVEL.exit.y) < LEVEL.exit.radius) {
      this.screen = SCREEN_WIN;
      const timeBonus = Math.max(0, SCORE.timeBonusCap - Math.floor(this.time) * SCORE.timeBonusPerSecond);
      this.score += SCORE.win + timeBonus;
      this.audio.win();
      return EVENT_WIN;
    }
    return EVENT_NONE;
  }
}
