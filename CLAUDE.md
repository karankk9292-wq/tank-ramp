# Off Ramp: project notes for Claude Code

Single-file (`index.html`) top-down tank brawl, pure HTML/JS canvas, no build tools. Mobile landscape first; keyboard also works.
Owner prefers: single-file deploys, terse output, iterative scoped changes with verification before committing. Deploy target: Cloudflare Pages via GitHub.

## Rules of the game
- Square pad, open ramp on all 4 sides. Touching the end of any ramp (tank edge) = eliminated. Shells/bumps only knock back.
- Ramps start small (half-width 60), widen to 105 at 3 tanks left, full width at 2 left (`LV`, `rh`).
- One-tank-wide stop wall (`STUBS`) in the middle of each ramp lip; tanks can brace against it.
- Player (chosen colour, default hazard yellow) vs 3 AI. Player falling = loss. Last on pad = win. 3-2-1-GO countdown, Rematch.
- Movement is screen-space (up = -y). Facing follows movement. Shell knockback > bump.

## Key code facts
- World 530x530, centre `C`, pad half `HALF=165`, ramp length `RL=90`, tank radius `R=14`. `step(dt)` is a fixed 1/60 sim.
- Collisions: the tank farther from an exit (`mdist`) is the pusher; the nearer one is shoved toward its nearest ramp lane (`mouths()`); level contacts: whoever drives harder pushes. Asymmetric on purpose so nothing freezes.
- Ramp slide: `SLIDE*depth` outward; player drive 135, so climb-back is possible to ~half depth.
- AI (`think`): target = tank nearest a ramp lane; attack by lining up laterally and driving it toward the lane; the "low" tank dodges/turns/fires, flanks after 4s; panics (climbs) only once actually on a ramp (small overshoot allowed while shoving someone deeper). They must NOT camp walls or reverse before the lip.
- Mobile: `fit()` forces landscape by rotating `#wrap` 90deg when a touch device is upright; joystick maps screen->game axes when `rotated`.
- Sound: WebAudio synthesised (`sfx`), starts after first gesture, mute button persists in localStorage.
- Test hook: `window.__off` ({step, startGame (skips countdown), startCount, tanks, input, state, rh, C, HALF, ...}). Headless Playwright sims (call `__off.step(1/60)` in a loop) were used to tune AI: idle-player runs should see a first fall within ~20s (median ~5s) and most matches should end.

## Ideas not done yet
- Real-phone playtest and tuning of rotation direction, stick feel, AI difficulty levels.
- Haptics (navigator.vibrate), best-streak counter, more arenas, 2-player local.
