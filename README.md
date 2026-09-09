# Jacinto Design — Nebula Drift

An immersive, **3D playable portfolio** for a one-person studio. Pilot a fighter through a procedural nebula and dock at floating cyberpunk stations — each one a section of the studio's work, lit with Japanese neon signage. Built to an Awwwards bar: volumetric nebula, detailed PBR ship + procedural station models, bloom-lit signage, arcade flight, a cockpit HUD, and a live sector radar.

## Experience

- **Loader** → "Launch into the Nebula" gate (unlocks synthesized space ambience), then a **cinematic fly-in** that reveals the whole sector before settling into the chase
- **Shareable + resilient** → **deep-links** (`/#recipes` opens that project on load; the URL tracks what you're viewing), a rich **social share card** (`og.jpg`), and a graceful **static fallback** (a full mini-portfolio) if WebGL is unavailable — never a blank screen
- **Photo mode** (`P`) → hides all HUD/nav chrome; drag to frame and screenshot. Respects **reduced-motion** (calms the auto-orbit + warp flash) and buzzes light **haptics** on dock/transit (mobile)
- **Arcade flight** → auto-leveling, banking ship with an **attitude limiter**: the nose soft-stops short of vertical and eases back to the horizon (HUD shows "ATTITUDE ASSIST"), so the ship can never flip onto its back; hitting the sector edge engages an **autopilot to the nearest unvisited station**, so the boundary always aims you at content
- **Stations** → five different architectures: VibeMail's tall solar sails and parabolic communications dish; Waypoint's observatory on a rotating lower rim; ZTM Music's twin resonators and stepped radiator; Scoundrel's open salvage gantry and crane; and Recipes' three greenhouse domes. Stationary hardware is kept outside the observatory rim's swept volume, with fixed spokes and a separate bearing. Cargo bins and cultivation pods have clear service gaps. Repeated hardware is merged by material to keep draw calls low.
- **Station readouts** → camera-facing Japanese blade signs and overhead project holograms stay clear of the hull from every approach. Arrival framing fits the full station on portrait screens; observatory rotation, satellites, and hologram motion respect reduced-motion preferences.
- **Moon** → a big **procedural shader moon** (fbm maria + cratering, a lit crescent, nebula-tinted limb) hangs in the midground beyond the gate for depth — no texture files
- **Asteroid belt** → drop out of warp with `B`, then hold `Space` (or FIRE on mobile) to shoot. Three cratered rock shapes tumble without changing size. Large rocks split into three medium chunks; medium rocks split into two small chunks; small rocks become debris. Fragments inherit momentum, remain shootable, and award 100 / 50 / 10 points by size. Swept collision checks catch fast shots between frames, and short impact flashes keep the fragments visible.
- **The Gateway** → a colossal greebled jump-ring with a **dark, shimmering portal membrane**. Fly through it and the ship warps into **the void** — true-black space beyond the nebula, a fast warp corridor under a vast field of small distant stars — and back again. Autopilot to any project from the void and it routes you home through the gateway automatically
- **About / Contact** → not stations: **warp cinematics out in the void** — the ship jumps beyond the portal and a slow camera **orbits it** (level → high, near-top-down) while it hangs in the text-free half of the frame and the studio story (left) or the comms form (right) plays over the view. Closing it **autopilots you home through the gateway** back to a project
- **Click to travel** → click any station and the autopilot flies you straight there; leaving the void it teleports to the gateway and **warps home through the portal to the project in seconds**
- **Autopilot arrivals** → the ship decelerates and **hovers in front of the station** (its holo projection scales up), then the dock prompt asks. Flight controls stay locked until **Return to free roam** (or `Esc`); closing a docked card restores the same station hold
- **Auto-dock** → fly at a station in range (at thrust speed) and it locks on and opens — hands-off drift never docks
- **HUD** → targeting reticle, dock-lock readout, throttle/velocity gauge, a zone-aware sector radar, and **clickable edge arrows** for every off-screen station and the gateway
- **Nav menu** → centred top navigation (About / Projects / Contact); project picks engage the **autopilot**, About/Contact cut to their cinematics; overlays switch instantly while reading
- **Feel** → keyboard flight (no idle thrust — hold to move), mouse orbits the camera, warp light-streaks on boost, synthesized dock/UI cues, JetBrains Mono terminal typography; respects `prefers-reduced-motion`
- **Mobile** → a semi-transparent **d-pad** steers, **THRUST / BOOST** drive, fly-at-a-station or tap it to dock, tap an edge arrow to autopilot

## Controls

| | Desktop | Mobile |
|---|---|---|
| Thrust | `W` (no idle drift — hold to move) | **THRUST** button |
| Boost | `Shift` | **BOOST** button |
| Brake | `S` | release THRUST |
| Turn | `A`/`D` yaw · `↑`/`↓` pitch | **D-pad** |
| Camera | Drag the mouse to orbit | — |
| Photo mode | `P` (hides HUD; `Esc` exits) | — |
| Travel | **Click a station** to fly to it | **Tap a station** |
| Dock | Fly at a station — it **docks automatically** (or press `E`) | Fly at a station |
| Navigate | Top nav menu **or any edge arrow** — autopilot flies you there (steer to cancel) | ☰ nav sheet / tap an arrow |
| About / Contact | Nav — warp cinematics in the void (`Esc` exits, then autopilots home) | ☰ → ABOUT / CONTACT |
| The void | Fly through the gateway's dark membrane (and back) | Same |
| Close | `Esc` | ✕ |

## Tech

- **React 19 + Vite 6 + TypeScript** (strict)
- **react-three-fiber + drei** (WebGL), **@react-three/postprocessing** (bloom, chromatic aberration, vignette, grain)
- **Zustand** state; procedural nebula (custom fbm GLSL), starfield, signage, and audio
- **Bundled 3D props** under `public/models/` — meshopt + WebP + quantized GLBs (the ship is 1.2 MB) decoded by drei's bundled MeshoptDecoder, lit by a procedural `<Environment>` (no runtime CDN fetches). Re-optimize any new model with `npx @gltf-transform/cli webp in.glb tmp.glb --quality 90 && npx @gltf-transform/cli meshopt tmp.glb out.glb`
- **JetBrains Mono** + **Noto Sans JP** (bundled) for terminal-grade Latin type + Japanese neon signage
- Contact form via **FormSubmit**; real demo clips under `public/videos`

No physics engine — arcade flight, proximity docking, and station collision are all hand-rolled for full control over feel.

### Model credits

- **Ship** — "Spitfire", [Ultimate Spaceships Pack](https://quaternius.com) by **Quaternius** (CC0)
- **Stations** — procedural geometry authored in `src/stations/StationStructure.tsx`. The original bundled `station.glb`, retained as an unused source asset, is "Wikiplanet Space Station" by **Alan Zimmerman** via [poly.pizza](https://poly.pizza) (CC-BY)
- **Satellite** — **Poly by Google** via poly.pizza (CC-BY). The original bundled comms dish is retained as an unused source asset; the relay now uses a procedural reflector.
- **Cargo depot** — unused bundled source asset by **Kay Lousberg** via poly.pizza (CC0). Unused station, dish, and cargo GLBs are not preloaded.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle to dist/
npm run typecheck
npm run lint
```

Deploy `dist/` to any static host (Vercel config included in `vercel.json`).

### Customize

- **Projects / studio copy** — `src/data/projects.ts`, `src/data/studio.ts`
- **Station layout & flight bounds** — `src/data/world.ts`
- **Station modeling** — hulls, solar arrays, and habitat wheels in `src/stations/StationStructure.tsx`; mounted props, interaction, and hologram placement in `src/stations/Station.tsx`
- **Screenshots** — `public/images/<name>.jpg`, referenced from `projects.ts` (overlay hero + holo screen)
- **Demo clips** — drop `public/videos/<id>.mp4` (matches a project `id`) to replace the screenshot / procedural screen

### Development inspection

- `http://localhost:5173/?station-lab` — inspect the actual station assemblies from seven angles, orbit freely, and advance or animate the observatory rim.
- `http://localhost:5173/?combat-lab` — fire real projectiles at a controlled target, inspect each fragmentation stage and score, or test a small target with 50 ms simulation steps.

These inspection screens are development-only and excluded from the production build.
