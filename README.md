# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/zevabagus-spec/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/zevabagus-spec/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

GILDED SHADOW — a top-down stealth game that runs entirely in the browser. You are Wren, a thief inside the Gilded Archive after midnight: take the two seal keys and the Sunstone from its vault, then slip out through the hatch — unseen. Four guards patrol the halls with raycast lantern cones; their detection is a meter, not a tripwire, so a glimpse only makes them suspicious and breaking line of sight always lets you recover. Hide in the fern planters, keep to the dark floor, sprint only when the noise is worth it, and throw a pebble to turn a guard away. Static files, no build step, fully offline — every sprite is drawn in code and every sound is synthesized with WebAudio.

## How it plays

- **Patrols you can learn** — four guards walk fixed routes (Corridor, Stacks, Gallery, Vault) with pauses and idle scans. Watch a route once and you know when the gap opens.
- **Detection with recovery** — a guard's meter fills while you stand in its cone (faster up close, slower in shadow, not at all inside a fern unless the guard is nearly on top of you) and drains the moment you break sight. A full meter raises the alarm: that guard chases, the others converge on your last seen spot, and if one touches you, you are caught.
- **Noise is a choice** — walking is silent, sprinting is fast and loud enough to draw a guard to investigate. A thrown pebble (5 per run, click to throw) pulls the nearest guard to where it lands.
- **The objective** — 2 seal keys + the Sunstone unlock the hatch. Score rewards relics, the escape, and speed, and loses points for every alarm.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

WASD / arrows to move · Shift to sprint · Click to throw a pebble · M mute · P pause · R restart · Enter to start.

## Structure

- `game/src/level.js` — the hand-built floor plan: walls, crates, ferns, shadow, patrol routes, plus tile pathfinding.
- `game/src/vision.js` — line of sight and raycast vision cones.
- `game/src/guards.js` — guard AI: patrol, suspicious, alerted, and the return to patrol.
- `game/src/player.js` — Wren: movement, sprint noise, pebble throws, hiding.
- `game/src/world.js` — the game state machine, objective, alarm, and score.
- `game/src/render.js` — all drawing, including the HUD and title/win/lose screens.
- `game/src/audio.js` — synthesized WebAudio sounds, including positional guard footsteps.
- `game/src/shots.js` — staged screenshots: an autopilot plays the real rules forward, so each screenshot is a genuine render of the game's own code.
- `game/src/input.js` / `game/src/main.js` — keyboard + mouse input, and the game loop.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pkrtjm47&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
