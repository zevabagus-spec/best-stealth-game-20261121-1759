// Gilded Shadow — sight. Walls and crates block vision; everything else is
// open. Line of sight is sampled along the segment (cheap and exact enough at
// this scale); the rendered cone is raycast, so it hugs the walls it hits.
import { GUARD, TILE } from './config.js';
import { blocksSight } from './level.js';

function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

/** True when no wall/crate tile lies on the segment (ax,ay)->(bx,by). */
export function hasLineOfSight(ax, ay, bx, by) {
  // Same tile: nothing can stand between the two points.
  if (Math.floor(ax / TILE) === Math.floor(bx / TILE) && Math.floor(ay / TILE) === Math.floor(by / TILE)) return true;
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / (TILE / 4)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (blocksSight(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/**
 * Can a guard at (gx,gy) facing `angle` see a point (px,py)?
 * `hidden` is true while the player crouches in a bush (unless very close).
 * Returns { seen, closeness } — closeness 0..1, 1 = point-blank.
 */
export function canSee(gx, gy, angle, px, py, hidden) {
  const d = dist(gx, gy, px, py);
  if (d > GUARD.coneRange) return { seen: false, closeness: 0 };
  if (hidden && d > GUARD.bushHideDistance) return { seen: false, closeness: 0 };
  let diff = Math.atan2(py - gy, px - gx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > GUARD.coneHalfAngle) return { seen: false, closeness: 0 };
  if (!hasLineOfSight(gx, gy, px, py)) return { seen: false, closeness: 0 };
  const closeness = Math.max(0, 1 - d / GUARD.coneRange);
  return { seen: true, closeness };
}

/** Cast one sight ray from (ox,oy) along `angle`; stop at a wall or range. */
export function castRay(ox, oy, angle, maxRange) {
  const step = 6;
  let d = 0;
  while (d < maxRange) {
    d += step;
    const x = ox + Math.cos(angle) * d;
    const y = oy + Math.sin(angle) * d;
    if (blocksSight(x, y)) return { x, y, d };
  }
  return { x: ox + Math.cos(angle) * maxRange, y: oy + Math.sin(angle) * maxRange, d: maxRange };
}

/**
 * The visible cone as a polygon: the guard's position plus the raycast hit
 * points across the cone's sweep. Rendered, this is the light the player reads.
 */
export function conePolygon(gx, gy, angle, range) {
  const rays = 26;
  const points = [{ x: gx, y: gy }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
    const hit = castRay(gx, gy, a, range);
    points.push({ x: hit.x, y: hit.y });
  }
  return points;
}
