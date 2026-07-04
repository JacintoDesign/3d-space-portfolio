# Jacinto Design — Nebula Drift

An immersive, **3D playable portfolio** for a one-person studio. Pilot a fighter through a procedural nebula and dock at floating cyberpunk stations — each one a section of the studio's work, lit with Japanese neon signage. Built to an Awwwards bar: volumetric nebula, detailed PBR ship + station models, bloom-lit signage, arcade flight, a cockpit HUD, and a live sector radar.

## Experience

- **Loader** → "Launch into the Nebula" gate (unlocks synthesized space ambience), then a **cinematic fly-in** that reveals the whole sector before settling into the chase
- **Shareable + resilient** → **deep-links** (`/#recipes` opens that project on load; the URL tracks what you're viewing), a rich **social share card** (`og.jpg`), and a graceful **static fallback** (a full mini-portfolio) if WebGL is unavailable — never a blank screen
- **Photo mode** (`P`) → hides all HUD/nav chrome; drag to frame and screenshot. Respects **reduced-motion** (calms the auto-orbit + warp flash) and buzzes light **haptics** on dock/transit (mobile)
- **Arcade flight** → auto-leveling, banking ship; hitting the sector edge engages an **autopilot to the nearest unvisited station**, so the boundary always aims you at content
- **Stations** → 6 project stations, each with a Japanese blade-sign and a bracketed **holo projection** (scanlines, orbital arcs, emitter node) previewing the work
- **Moon** → a big **procedural shader moon** (fbm maria + cratering, a lit crescent, nebula-tinted limb) hangs in the midground beyond the gate for depth — no texture files
- **The Gateway** → a colossal greebled jump-ring with a **dark, shimmering portal membrane**. Fly through it and the ship warps into **the void** — true-black space beyond the nebula, a fast warp corridor under a vast field of small distant stars — and back again. Autopilot to any project from the void and it routes you home through the gateway automatically
- **About / Contact** → not stations: **warp cinematics out in the void** — the ship jumps beyond the portal and a slow camera **orbits it** (level → high, near-top-down) while it hangs in the text-free half of the frame and the studio story (left) or the comms form (right) plays over the view. Closing it **autopilots you home through the gateway** back to a project
- **Click to travel** → click any station and the autopilot flies you straight there; leaving the void it teleports to the gateway and **warps home through the portal to the project in seconds**
- **Autopilot arrivals** → the ship decelerates and **hovers in front of the station** (its holo projection scales up), then the dock prompt asks — nothing opens without you
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
- **Real 3D models** under `public/models/` — meshopt + WebP + quantized GLBs (~1.8 MB total; the ship is 1.2 MB) decoded by drei's bundled MeshoptDecoder, lit by a procedural `<Environment>` (no runtime CDN fetches). Re-optimize any new model with `npx @gltf-transform/cli webp in.glb tmp.glb --quality 90 && npx @gltf-transform/cli meshopt tmp.glb out.glb`
- **JetBrains Mono** + **Noto Sans JP** (bundled) for terminal-grade Latin type + Japanese neon signage
- Contact form via **FormSubmit**; real demo clips under `public/videos`

No physics engine — arcade flight, proximity docking, and station collision are all hand-rolled for full control over feel.

### Model credits

- **Ship** — "Spitfire", [Ultimate Spaceships Pack](https://quaternius.com) by **Quaternius** (CC0)
- **Station** — "Wikiplanet Space Station" by **Alan Zimmerman** via [poly.pizza](https://poly.pizza) (CC-BY)
- **Comms dish / satellite** — **Poly by Google** via poly.pizza (CC-BY)
- **Cargo depot** — **Kay Lousberg** via poly.pizza (CC0)

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
- **Demo clips** — drop `public/videos/<id>.mp4` (matches a project `id`) to replace its procedural screen
