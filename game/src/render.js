// Gilded Shadow — everything the player sees. Top-down, drawn on one canvas:
// a lamplit archive floor, walls with a lit top edge, fern planters and
// shadow pools, crates, the vault, the hatch; guards as red-coated figures
// with raycast vision cones; Wren as a hooded figure in a blue cloak. The
// HUD is drawn on the canvas too, so screenshots show the whole game.
import { COLORS, TILE, VIEW_H, VIEW_W } from './config.js';
import { bushRects, crateTiles, LEVEL, shadowRects, wallTiles } from './level.js';
import { conePolygon } from './vision.js';
import { STATE_ALERTED, STATE_SUSPICIOUS } from './guards.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, guard) {
  const range = 235;
  const poly = conePolygon(guard.x, guard.y, guard.angle, range);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle =
    guard.state === STATE_ALERTED ? COLORS.coneAlert :
    guard.state === STATE_SUSPICIOUS ? COLORS.coneSuspect : COLORS.cone;
  ctx.fill();
}

function drawGuard(ctx, guard) {
  drawCone(ctx, guard);
  // Body: red coat, dark hat, facing wedge.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.angle);
  ctx.fillStyle = guard.state === STATE_ALERTED ? '#ff6a55' : COLORS.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardDark;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4e9c8';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Detection ring over the guard's head.
  if (guard.detection > 4) {
    const frac = guard.detection / 100;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 24, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = frac > 0.66 ? '#ff5340' : frac > 0.33 ? '#ffb13d' : '#ffe08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 24, 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
  // Name tag for the patrol, tiny and dim.
  ctx.fillStyle = 'rgba(239,232,214,0.55)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name, guard.x, guard.y + 30);
}

function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.hidden) ctx.globalAlpha = 0.55; // half-seen inside the ferns
  // Cloak.
  ctx.rotate(player.facing);
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.rotate(-player.facing);
  // Hood.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.arc(3, -3, 2.2, 0, Math.PI * 2);
  ctx.arc(3, 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRelic(ctx, x, y, kind, taken, time) {
  if (taken) return;
  const bob = Math.sin(time * 2 + x) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = kind === 'sunstone' ? 'rgba(255,93,143,0.25)' : 'rgba(255,215,94,0.22)';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'sunstone') {
    ctx.fillStyle = COLORS.sunstone;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = COLORS.key;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-2, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(9, 0);
    ctx.lineTo(9, 4);
    ctx.moveTo(12, 0);
    ctx.lineTo(12, 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExit(ctx, world) {
  const { x, y, radius } = LEVEL.exit;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = world.exitOpen ? 'rgba(232,182,76,0.30)' : 'rgba(120,110,90,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = world.exitOpen ? COLORS.exit : '#8a7f68';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = world.exitOpen ? COLORS.exit : '#8a7f68';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.exitOpen ? 'EXIT' : 'LOCKED', 0, 0);
  ctx.restore();
}

function drawHud(ctx, world) {
  const player = world.player;
  ctx.textBaseline = 'alphabetic';
  // Top bar.
  ctx.fillStyle = 'rgba(10, 10, 14, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.objectiveText, 14, 22);
  ctx.textAlign = 'right';
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`Pebbles ${'●'.repeat(player.pebbles)}${'○'.repeat(Math.max(0, 5 - player.pebbles))}   ${mins}:${String(secs).padStart(2, '0')}`, VIEW_W - 14, 22);

  // Detection meter: the loudest guard's meter, centre-top.
  const loudest = Math.max(0, ...world.guards.map((g) => g.detection));
  if (loudest > 2) {
    const w = 260;
    const x = (VIEW_W - w) / 2;
    const y = 46;
    ctx.fillStyle = 'rgba(10,10,14,0.70)';
    roundRect(ctx, x - 8, y - 6, w + 16, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#3a3230';
    roundRect(ctx, x, y, w, 14, 7);
    ctx.fill();
    ctx.fillStyle = loudest > 66 ? '#ff5340' : loudest > 33 ? '#ffb13d' : '#ffe08a';
    if (loudest > 1) {
      roundRect(ctx, x, y, Math.max(8, (w * loudest) / 100), 14, 7);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loudest >= 100 ? 'SPOTTED!' : loudest > 66 ? 'SEEN — break line of sight!' : 'Suspicious…', VIEW_W / 2, y + 32);
  }

  // Event banner.
  if (world.eventTimer > 0 && world.lastEvent) {
    ctx.globalAlpha = Math.min(1, world.eventTimer);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.lastEvent, VIEW_W / 2, VIEW_H - 52);
    ctx.globalAlpha = 1;
  }

  // Bottom hints.
  ctx.fillStyle = 'rgba(184,173,147,0.85)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift sprint (loud) · Click throw pebble · M mute · P pause · R restart', 14, VIEW_H - 12);

  // Spotted flash vignette.
  if (world.flash > 0) {
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    grad.addColorStop(0, 'rgba(255,40,30,0)');
    grad.addColorStop(1, `rgba(255,40,30,${0.45 * world.flash})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawOverlay(ctx, title, lines, accent, alpha = 0.72) {
  ctx.fillStyle = `rgba(8, 8, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 70);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 20 + i * 30));
}

export function render(ctx, world) {
  // Floor: checker of warm stone, with faint grout lines.
  for (let y = 0; y < 18; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  for (let x = 0; x <= 32; x += 1) {
    ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, VIEW_H); ctx.stroke();
  }
  for (let y = 0; y <= 18; y += 1) {
    ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(VIEW_W, y * TILE); ctx.stroke();
  }

  // Shadow pools (dark floor) and fern planters.
  for (const r of shadowRects()) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
  }
  for (const r of bushRects()) {
    ctx.fillStyle = COLORS.bush;
    roundRect(ctx, r.x * TILE + 2, r.y * TILE + 2, r.w * TILE - 4, r.h * TILE - 4, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.bushLeaf;
    for (let i = 0; i < r.w * r.h * 3; i += 1) {
      const lx = r.x * TILE + 8 + ((i * 37) % (r.w * TILE - 16));
      const ly = r.y * TILE + 8 + ((i * 53) % (r.h * TILE - 16));
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crates.
  for (const [tx, ty] of crateTiles()) {
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = COLORS.crateEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6);
    ctx.beginPath();
    ctx.moveTo(tx * TILE + 3, ty * TILE + 3);
    ctx.lineTo(tx * TILE + TILE - 3, ty * TILE + TILE - 3);
    ctx.moveTo(tx * TILE + TILE - 3, ty * TILE + 3);
    ctx.lineTo(tx * TILE + 3, ty * TILE + TILE - 3);
    ctx.stroke();
  }

  // Walls with a lit top edge so the plan reads at a glance.
  for (const [tx, ty] of wallTiles()) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(tx * TILE, ty * TILE, TILE, 5);
  }

  // Relics, exit, pebble, guards, player — in that order, so the player is on top.
  drawExit(ctx, world);
  for (const k of world.keys) drawRelic(ctx, k.x, k.y, 'key', k.taken, world.time);
  drawRelic(ctx, world.sunstone.x, world.sunstone.y, 'sunstone', world.sunstone.taken, world.time);

  if (world.pebble) {
    ctx.fillStyle = '#d8d2c2';
    ctx.beginPath();
    ctx.arc(world.pebble.x, world.pebble.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.pebblePing) {
    const t = world.pebblePing.t / 0.9;
    ctx.strokeStyle = `rgba(255, 220, 130, ${1 - t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world.pebblePing.x, world.pebblePing.y, 12 + t * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (world.noisePulse) {
    const t = world.noisePulse.t / 0.7;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - t)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(world.noisePulse.x, world.noisePulse.y, 14 + t * 130, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const g of world.guards) drawGuard(ctx, g);
  drawPlayer(ctx, world.player);

  if (world.screen === SCREEN_PLAY) drawHud(ctx, world);

  if (world.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'GILDED SHADOW', [
      'The Gilded Archive, after midnight. You are Wren, thief of the Sunstone.',
      'Take the 2 seal keys and the Sunstone, then slip out through the hatch — unseen.',
      'Guards patrol with lanterns. Their cones are their eyes: stay out of them,',
      'hide in the ferns, keep to the dark, and throw a pebble to turn a guard away.',
      '',
      'Click or press Enter to begin',
    ], '#e8b64c');
  } else if (world.screen === SCREEN_WIN) {
    const mins = Math.floor(world.time / 60);
    const secs = Math.floor(world.time % 60);
    drawOverlay(ctx, 'THE SUNSTONE IS YOURS', [
      `Out through the hatch in ${mins}:${String(secs).padStart(2, '0')} — spotted ${world.timesSpotted} time${world.timesSpotted === 1 ? '' : 's'}.`,
      `Score: ${world.score}   ·   Pebbles thrown: ${world.pebblesThrown}`,
      '',
      'Press R to run it again',
    ], '#e8b64c', 0.58);
  } else if (world.screen === SCREEN_LOSE) {
    drawOverlay(ctx, 'CAUGHT', [
      'A guard laid hands on Wren. The archive keeps its Sunstone — this time.',
      `Score: ${world.score}   ·   Spotted ${world.timesSpotted} time${world.timesSpotted === 1 ? '' : 's'}`,
      '',
      'Press R to try again',
    ], '#ff6a55');
  }
}
