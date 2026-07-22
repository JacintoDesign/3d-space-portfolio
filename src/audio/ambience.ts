/**
 * Synthesized deep-space ambience via the Web Audio API — a low drone pad,
 * slow sonar pings, and a throttle-reactive engine hum. No asset files. Must
 * be started from a user gesture (the LAUNCH button).
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let engineGain: GainNode | null = null
let started = false

const BASE_LEVEL = 0.16

export function startAmbience() {
  if (started) return
  started = true
  try {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.0
    master.connect(ctx.destination)

    // --- Low drone pad: two detuned oscillators through a slow lowpass ---
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.5
    const droneLp = ctx.createBiquadFilter()
    droneLp.type = 'lowpass'
    droneLp.frequency.value = 320
    droneLp.connect(droneGain)
    droneGain.connect(master)
    for (const [freq, detune] of [
      [55, -6],
      [82.4, 5],
      [110, 0],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      const g = ctx.createGain()
      g.gain.value = 0.22
      osc.connect(g)
      g.connect(droneLp)
      osc.start()
    }
    // Slow filter sweep so the pad breathes.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 140
    lfo.connect(lfoGain)
    lfoGain.connect(droneLp.frequency)
    lfo.start()

    // --- Engine hum: throttle-reactive, driven externally via setEngine() ---
    engineGain = ctx.createGain()
    engineGain.gain.value = 0.04
    const engineLp = ctx.createBiquadFilter()
    engineLp.type = 'lowpass'
    engineLp.frequency.value = 220
    engineLp.connect(engineGain)
    engineGain.connect(master)
    for (const freq of [70, 104]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(engineLp)
      osc.start()
    }

    // --- Sonar pings: occasional bright sine blips, ducked low ---
    const ping = () => {
      if (!ctx || !master) return
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = [784, 988, 1175, 1318][Math.floor(Math.random() * 4)]
      g.gain.value = 0
      osc.connect(g)
      g.connect(master)
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
      osc.start(t)
      osc.stop(t + 1.5)
    }
    // Silent when muted (routes through `master`, whose gain is 0) — runs for
    // the page lifetime, no need to pause/resume on mute toggles.
    setInterval(ping, 9000)

    // Fade in.
    master.gain.linearRampToValueAtTime(BASE_LEVEL, ctx.currentTime + 2.0)
  } catch {
    /* audio not available — silent fallback */
  }
}

/**
 * One-shot UI blip. Routed through `master`, so it's automatically silent while
 * muted (master gain rides to 0). No-ops until ambience has been started.
 */
function blip(freqs: number[], dur: number, peak: number, type: OscillatorType = 'sine') {
  if (!ctx || !master) return
  const t0 = ctx.currentTime
  freqs.forEach((f, i) => {
    const osc = ctx!.createOscillator()
    const g = ctx!.createGain()
    osc.type = type
    osc.frequency.value = f
    const start = t0 + i * 0.05
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(peak, start + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(g)
    g.connect(master!)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  })
}

/** A station just came into dock range. */
export function playPing() {
  blip([1046], 0.22, 0.045, 'sine')
}
/** Docked / overlay opened. */
export function playConfirm() {
  blip([659, 988, 1319], 0.5, 0.05, 'triangle')
}
/** Overlay closed. */
export function playBack() {
  blip([880, 587], 0.26, 0.045, 'sine')
}

/** Modulate the engine hum with normalised throttle (0..1). Cheap; safe to call ~12Hz. */
export function setEngine(level: number) {
  if (!ctx || !engineGain) return
  const target = 0.03 + Math.min(1, Math.max(0, level)) * 0.13
  engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.15)
}

export function setMuted(muted: boolean) {
  if (!ctx || !master) return
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.linearRampToValueAtTime(muted ? 0 : BASE_LEVEL, ctx.currentTime + 0.4)
}
