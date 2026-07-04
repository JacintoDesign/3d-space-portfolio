import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ProjectScreenProps {
  label: string
  subtitle?: string
  color: string
  size: [number, number]
  active: boolean
}

const CW = 512
const CH = 288

/**
 * A procedural, animated "app preview" rendered to a canvas texture — a stand-in
 * for a real demo clip (drop an <mp4> here later). Animates only when the player
 * is near, to keep idle cost at zero.
 */
export function ProjectScreen({ label, subtitle, color, size, active }: ProjectScreenProps) {
  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CW
    canvas.height = CH
    const ctx = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { ctx, texture }
  }, [])

  const acc = useRef(0)
  const throttle = useRef(0)
  const bars = useRef<number[]>(Array.from({ length: 28 }, () => Math.random()))
  const tiles = useRef<number[]>(Array.from({ length: 8 * 5 }, () => Math.random()))

  const draw = (t: number, lit: number) => {
    // background
    const bg = ctx.createLinearGradient(0, 0, 0, CH)
    bg.addColorStop(0, '#0a0c1a')
    bg.addColorStop(1, '#05060d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, CW, CH)

    // video-wall tile grid that flickers like a panel of monitors
    const cols = 8
    const rows = 5
    const tw = CW / cols
    const th = CH / rows
    for (let i = 0; i < cols * rows; i++) {
      const cx = i % cols
      const cy = (i / cols) | 0
      const phase = Math.sin(t * (1.2 + (i % 5) * 0.4) + i) * 0.5 + 0.5
      const a = (0.05 + tiles.current[i] * 0.12 + phase * 0.18 * lit) * (0.5 + lit * 0.5)
      ctx.fillStyle = hexA(color, a)
      ctx.fillRect(cx * tw + 2, cy * th + 2, tw - 4, th - 4)
    }

    // accent glow wash
    const glow = ctx.createRadialGradient(CW / 2, CH * 0.45, 20, CW / 2, CH * 0.45, CW * 0.6)
    glow.addColorStop(0, hexA(color, 0.3 * lit))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, CW, CH)

    // occasional RGB-split glitch slice
    if (Math.sin(t * 7.3) > 0.93) {
      const gy = (Math.abs(Math.sin(t * 3.1)) * CH) | 0
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ff0040'
      ctx.fillRect(-4, gy, CW, 10)
      ctx.fillStyle = '#00fff0'
      ctx.fillRect(4, gy + 4, CW, 8)
      ctx.globalAlpha = 1
    }

    // top status bar
    ctx.fillStyle = hexA(color, 0.9)
    ctx.beginPath()
    ctx.arc(28, 30, 6 + Math.sin(t * 4) * 1.5 * lit, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '600 16px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.textAlign = 'left'
    ctx.fillText(active ? '● LIVE PREVIEW' : '◦ STANDBY', 44, 36)

    // title
    ctx.textAlign = 'center'
    ctx.shadowColor = color
    ctx.shadowBlur = 18
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 46px Inter, sans-serif'
    ctx.fillText(label.toUpperCase(), CW / 2, CH / 2 - 4)
    ctx.shadowBlur = 0
    if (subtitle) {
      ctx.font = '400 17px Inter, sans-serif'
      ctx.fillStyle = hexA(color, 0.95)
      ctx.fillText(clip(subtitle, 46), CW / 2, CH / 2 + 26)
    }

    // animated equalizer bars
    const n = bars.current.length
    const bw = CW / n
    for (let i = 0; i < n; i++) {
      const target = active ? 0.25 + Math.abs(Math.sin(t * 3 + i * 0.6)) * 0.75 : 0.12 + Math.abs(Math.sin(t * 1.2 + i)) * 0.3
      bars.current[i] += (target - bars.current[i]) * 0.25
      const h = bars.current[i] * 70
      ctx.fillStyle = hexA(color, 0.85)
      ctx.fillRect(i * bw + 2, CH - 18 - h, bw - 4, h)
    }

    // moving scanline
    const y = (t * 60) % CH
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(0, y, CW, 2)

    texture.needsUpdate = true
  }

  useFrame((_, delta) => {
    acc.current += delta
    // Full rate when the player is near; throttled idle animation otherwise so the
    // whole city of screens stays alive cheaply.
    if (active) {
      draw(acc.current, 1)
    } else {
      throttle.current += delta
      if (throttle.current > 0.12) {
        throttle.current = 0
        draw(acc.current, 0.5)
      }
    }
  })

  return (
    <mesh>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function hexA(hex: string, a: number): string {
  const c = new THREE.Color(hex)
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`
}
function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
