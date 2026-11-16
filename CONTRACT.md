# CONTRACT.md

What Nebula Drift is, and what it must always do. Changes should keep every point below true, or update this file on purpose.

## The idea

A portfolio you play instead of scroll. Visitors pilot a ship through a neon nebula, and each project is a floating station whose design shows what the project is. Docking at a station opens the project card. It should feel like a polished arcade flight game while never getting in the way of seeing the work.

## Audience promises

1. **The work is always reachable.** Every project can be opened in at most two actions (nav menu, edge arrow, or clicking a station), without flying skill.
2. **Never a blank screen.** Without WebGL, a static mini-portfolio (projects, links, contact) is shown instead.
3. **Works on desktop and mobile.** Keyboard + mouse on desktop; on-screen d-pad, THRUST and BOOST on mobile.
4. **Respects the visitor.** Sound is off until they opt in, `prefers-reduced-motion` calms camera and animation, and photo mode (`P`) hides all chrome.

## Functional contract

### Flight
- `W` thrusts, `S` brakes, `A`/`D` yaw, `↑`/`↓` pitch, `Shift` boosts. No input means the ship coasts to a stop.
- The mouse orbits the camera; a click (not a drag) on a station flies there. The mouse never steers.
- The ship can never flip upside down (attitude limiter).
- Reaching the edge of the sector autopilots toward the nearest unvisited station.

### Stations and docking
- One station per project in `src/data/projects.ts`, each modelled to reflect its project.
- Each station shows its name sign and a hologram of the project (video, else screenshot).
- Flying at a station in range docks automatically; hands-off drifting never docks.
- Autopilot arrivals hover in front of the station and ask before docking.
- The project card shows title, tagline, media, description, tech, and Live Site / GitHub links.

### Navigation
- Top nav: About, Projects, Contact. Project picks engage the autopilot.
- Off-screen stations and the gateway get clickable edge arrows.
- URL hash deep-links: `#<projectId>`, `#about`, `#contact` open on load and stay in sync.

### Gateway, void and asteroid game
- Flying through the gateway ring warps between the nebula and the void, and back.
- Autopilot to a project from the void routes home through the gateway in a few seconds.
- In the void, the player can drop out of warp and shoot asteroids in a 60-second round. Large rocks split into medium, medium into small; scores are 100 / 50 / 10, and the top 3 scores are kept locally.

### About and Contact
- Not stations: each is a warp cinematic in the void with the camera orbiting the ship.
- About copy sits on the left, the Contact form on the right.
- Closing either autopilots back through the gateway to a project.

## Non-goals

- No physics engine, no WebGPU, no runtime CDN asset loading.
- No accounts, backend or analytics beyond the contact form service.
