// Gilded Shadow — guard behaviour. Four states, each readable at a glance:
// PATROL (walk the route, cone sweeping ahead), SUSPICIOUS (something caught
// the eye or ear — go look), ALERTED (the thief is seen — chase), and the
// return to patrol once the trail goes cold. Detection is a meter, not a
// tripwire: a glimpse fills it slowly, a stare fills it fast, and breaking
// line of sight always lets it drain — the player gets a chance to recover.
import { GUARD, STEP, TILE } from './config.js';
import { findPathTiles } from './level.js';
import { canSee } from './vision.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERTED = 'alerted';

function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function turnToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export class Guard {
  constructor(spec) {
    this.name = spec.name;
    this.waypoints = spec.waypoints.map(([tx, ty]) => ({ x: tx * TILE, y: ty * TILE }));
    this.loop = spec.loop;
    this.pauseAtEnds = spec.pauseAtEnds ?? 0.8;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.targetIndex = 1;
    this.direction = 1; // for ping-pong routes
    this.angle = 0;
    this.state = STATE_PATROL;
    this.detection = 0; // 0..100, per guard
    this.pauseTimer = 0;
    this.unseenTimer = 0;
    this.lookTimer = 0;
    this.lookAngle = 0;
    this.investigate = null; // {x, y} point to walk to and look around
    this.path = null; // tile-centre path while investigating / chasing
    this.pathIndex = 0;
    this.repathTimer = 0; // chase path is re-planned at most every 0.3 s
    this.stepPhase = Math.random() * Math.PI * 2; // footstep rhythm offset
    this.lastStepAt = 0;
  }

  /** Next waypoint on the patrol route (loop or ping-pong). */
  advanceWaypoint() {
    if (this.loop) {
      this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
    } else {
      this.targetIndex += this.direction;
      if (this.targetIndex >= this.waypoints.length) {
        this.targetIndex = this.waypoints.length - 2;
        this.direction = -1;
      } else if (this.targetIndex < 0) {
        this.targetIndex = 1;
        this.direction = 1;
      }
    }
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.angle = turnToward(this.angle, angleTo(this.x, this.y, tx, ty), 6 * dt);
    return d - step < 2;
  }

  followPath(speed, dt) {
    if (!this.path || this.pathIndex >= this.path.length) return true;
    const [tx, ty] = this.path[this.pathIndex];
    if (this.moveToward(tx, ty, speed, dt)) this.pathIndex += 1;
    return this.pathIndex >= this.path.length;
  }

  setInvestigate(x, y) {
    if (this.state === STATE_ALERTED) return;
    this.state = STATE_SUSPICIOUS;
    this.investigate = { x, y };
    this.path = findPathTiles(this.x, this.y, x, y);
    this.pathIndex = 0;
    this.lookTimer = 0;
  }

  raiseAlarm(x, y) {
    this.state = STATE_ALERTED;
    this.investigate = { x, y };
    this.detection = 100;
    this.unseenTimer = 0;
    this.path = findPathTiles(this.x, this.y, x, y);
    this.pathIndex = 0;
  }

  update(dt, player, world) {
    const hidden = player.hidden;
    const sight = canSee(this.x, this.y, this.angle, player.x, player.y, hidden);
    const shadowFactor = player.inShadow ? GUARD.shadowFactor : 1;

    if (sight.seen) {
      // A glimpse fills slowly, a close stare fast; shadows blunt it.
      const rate = GUARD.fillPerSecond * (0.35 + 0.65 * sight.closeness) * shadowFactor;
      this.detection = Math.min(100, this.detection + rate * dt);
      this.unseenTimer = 0;
      if (this.detection >= 100 && this.state !== STATE_ALERTED) {
        world.onSpotted(this, player);
      }
    } else {
      this.detection = Math.max(0, this.detection - GUARD.decayPerSecond * dt);
      this.unseenTimer += dt;
    }

    if (this.state === STATE_PATROL) {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        // Idle scan: slow sweep while waiting at a waypoint.
        this.angle += Math.sin(world.time * 0.8 + this.waypoints.length) * 0.25 * dt;
      } else {
        const target = this.waypoints[this.targetIndex];
        if (this.moveToward(target.x, target.y, GUARD.patrolSpeed, dt)) {
          this.advanceWaypoint();
          this.pauseTimer = this.pauseAtEnds;
        }
      }
      return;
    }

    if (this.state === STATE_ALERTED) {
      if (sight.seen) {
        // Keep the chase path fresh while the thief is visible, but re-plan
        // at most every 0.3 s instead of every frame.
        this.repathTimer -= dt;
        if (this.repathTimer <= 0) {
          this.repathTimer = 0.3;
          this.investigate = { x: player.x, y: player.y };
          this.path = findPathTiles(this.x, this.y, player.x, player.y);
          this.pathIndex = 0;
        }
        this.unseenTimer = 0;
      }
      if (this.unseenTimer > GUARD.loseSightSeconds) {
        // Trail gone cold: drop to suspicious at the last seen point.
        this.state = STATE_SUSPICIOUS;
        this.detection = 55;
        return;
      }
      if (this.followPath(GUARD.chaseSpeed, dt)) {
        // Reached the last seen point and still nothing: look around, then give up.
        this.lookTimer += dt;
        this.angle += 1.6 * dt;
        if (this.lookTimer > GUARD.lookAroundSeconds) {
          this.state = STATE_PATROL;
          this.detection = 0;
          this.lookTimer = 0;
        }
      }
      return;
    }

    // SUSPICIOUS: walk to the point, look around, then resume the route.
    if (this.investigate) {
      if (this.followPath(GUARD.investigateSpeed, dt)) {
        this.lookTimer += dt;
        this.angle += 1.4 * dt;
        if (this.lookTimer > GUARD.lookAroundSeconds) {
          this.state = STATE_PATROL;
          this.investigate = null;
          this.lookTimer = 0;
        }
      }
    } else {
      this.state = STATE_PATROL;
    }
  }

  /** Distance to the player, for footstep volume. */
  distanceTo(player) { return Math.hypot(player.x - this.x, player.y - this.y); }
}
