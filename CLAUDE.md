# Off Ramp: project notes for Claude Code

Single-file (`index.html`) top-down tank brawl, pure HTML/JS canvas, no build tools. Natively landscape (no CSS rotation); keyboard also works.
Owner prefers: single-file deploys, terse output, iterative scoped changes with verification before committing. Deploy target: Cloudflare Pages via GitHub.

## Rules of the game
- Wide 16:9 pad, open ramp on all 4 sides; fixed camera shows the whole arena. Touching the end of any ramp (tank edge) = eliminated. Shells/bumps only knock back.
- Ramps start small (half-width 60), widen to 105 at 3 tanks left, full width at 2 left (`LV`, `rh`). Each side caps `rh` at its own pad half-extent (`laneX()`=min(rh,HY) for left/right, `laneY()`=min(rh,HX) for top/bottom).
- One-tank-wide stop wall (`STUBS`) in the middle of each ramp lip; tanks can brace against it.
- Player (chosen colour, default hazard yellow) vs 3 AI. Player falling = loss. Last on pad = win. 3-2-1-GO countdown, Rematch.
- Movement is screen-space (up = -y). Facing follows movement. Shell knockback > bump.

## Key code facts
- World `W`x`H`=580x400, centre `CX,CY`, pad half-extents `HX=210,HY=120` (420x240), ramp length `RL=80`, tank radius `R=14`. `step(dt)` is a fixed 1/60 sim.
- `over(t)` = distance past the nearest pad edge (<0 inside; replaces the old square `rad`); `onRamp`, slide depth, `outDir` (nearest edge, not nearest axis) all use it. Spawns: each tank `D=70` in from its own edge (player bottom, AIs left/right/top), so start `mdist`s match.
- Collisions: the tank farther from an exit (`mdist`) is the pusher; the nearer one is shoved toward its nearest ramp lane (`mouths()`); level contacts: whoever drives harder pushes. Asymmetric on purpose so nothing freezes.
- Ramp slide: `SLIDE*depth` outward; player drive 135, so climb-back is possible to ~half depth.
- AI (`think`): target = tank nearest a ramp lane; attack by lining up laterally and driving it toward the lane; the "low" tank dodges/turns/fires, flanks after 4s; panics (climbs) only once actually on a ramp (small overshoot allowed while shoving someone deeper). They must NOT camp walls or reverse before the lip.
- Layout: canvas fills the screen inside the left/right safe-area insets; world is scaled to fit (height-bound on phones). HUD (top corners), stick (bottom-left) and Fire (bottom-right) float over the dead corner blocks beside the side ramps. Short screens (<=600px tall) get compact overlay styles via media query.
- Touch device held upright: CSS `#rot` "Rotate your phone" screen and the frame loop stops stepping (`upright()`). `startGame` tries `screen.orientation.lock('landscape')`, failures ignored.
- Known: on notched phones (~47px side insets) at full ramp width the stick circle slightly overlaps the far bottom corner of the left ramp (visual only).
- Sound: WebAudio synthesised (`sfx`), starts after first gesture, mute button persists in localStorage.
- Test hook: `window.__off` ({step, startGame (skips countdown), startCount, tanks, input, state, rh, CX, CY, HX, HY, RL, W, H, STUBS, over, mdist, mouths}). Headless Playwright sims (call `__off.step(1/60)` in a loop) were used to tune AI: idle-player runs should see a first fall within ~20s (median ~5s) and most matches should end. Wide arena (2x100 runs, 60s cap): first fall <=20s in 99/100 and 100/100, median 3.9-4.0s, max ~20s; ended 91-96/100; idle player is the first faller ~85% (square arena: ~72%).

## Ideas not done yet
- Real-phone playtest: stick feel, safe-area fit on notched phones, AI difficulty levels.
- Haptics (navigator.vibrate), best-streak counter, more arenas, 2-player local.
