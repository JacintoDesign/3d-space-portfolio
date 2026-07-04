import * as THREE from 'three'

/**
 * Glowing neon-sign textures painted to a transparent canvas. The browser's
 * system fonts cover CJK (Hiragino on macOS, Noto/Yu elsewhere) so we get dense,
 * authentic Tokyo signage with zero downloaded assets. Each texture is cached and
 * reused across the whole city; planes read it with a `toneMapped={false}` basic
 * material so bloom turns it into real neon.
 */

export interface SignTexture {
  texture: THREE.CanvasTexture
  /** width / height of the painted content, for sizing the plane without stretch. */
  aspect: number
}

const cache = new Map<string, SignTexture>()

const CJK_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif'
const LATIN_FONT = '"JetBrains Mono", "SF Mono", "Menlo", monospace'

function isCJK(s: string): boolean {
  // CJK symbols/kana, unified ideographs (ext-A + main), and full-width forms.
  return /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(s)
}

/** Common neon-district words — bars, ramen, 24h, cyber, district kanji, etc. */
export const JP_WORDS = [
  'ネオン', '東京', '夜', '電脳', 'バー', '寿司', '居酒屋', 'ラーメン', '24時間',
  '不夜城', '歌舞伎町', '渋谷', '新宿', 'カラオケ', '焼鳥', '営業中', '酒', '麺',
  '夢', '光', '雨', '猫', '無限', '未来', '幻', 'デザイン', '芸者', '銀座',
]

export const LATIN_WORDS = [
  'OPEN', 'BAR', '24H', 'NEON', 'CLUB', 'TOKYO', 'LIVE', 'HOTEL', 'GAME',
  'NOODLE', 'CYBER', 'VOID', 'SAKE', 'LOVE', 'XTC', 'KARAOKE', 'AKIRA',
]

export const NEON_PALETTE = [
  '#ff2a6d', '#05d9e8', '#b537f2', '#39ff14', '#f9f871', '#ff7b00',
  '#ff5edf', '#00fff0', '#7a5cff', '#fffb00',
]

interface SignOpts {
  vertical?: boolean
  /** Slightly different per-instance flavours so cached keys don't collide. */
  variant?: number
}

/**
 * Paint `text` as a neon sign. Horizontal by default; `vertical` stacks the
 * glyphs for the classic hanging-blade look.
 */
export function makeSignTexture(text: string, color: string, opts: SignOpts = {}): SignTexture {
  const vertical = opts.vertical ?? false
  const key = `${text}|${color}|${vertical ? 'v' : 'h'}|${opts.variant ?? 0}`
  const existing = cache.get(key)
  if (existing) return existing

  const cjk = isCJK(text)
  const font = cjk ? CJK_FONT : LATIN_FONT
  const glyph = 128 // logical glyph cell
  const pad = Math.round(glyph * 0.45)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  let contentW: number
  let contentH: number
  const chars = [...text]

  if (vertical) {
    contentW = glyph + pad * 2
    contentH = chars.length * glyph + pad * 2
  } else {
    ctx.font = `700 ${glyph}px ${font}`
    const m = ctx.measureText(text)
    contentW = Math.ceil(m.width) + pad * 2
    contentH = glyph + pad * 2
  }
  canvas.width = contentW
  canvas.height = contentH

  // Re-set font after resize (resizing clears state).
  ctx.font = `700 ${glyph}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  // Each "glyph cell" to paint: the whole string at centre (horizontal) or one
  // stacked character (vertical).
  const cells: { text: string; x: number; y: number }[] = vertical
    ? chars.map((ch, i) => ({ text: ch, x: contentW / 2, y: pad + glyph / 2 + i * glyph }))
    : [{ text, x: contentW / 2, y: contentH / 2 }]

  const stamp = (paint: (text: string) => void) => {
    for (const cell of cells) {
      ctx.save()
      ctx.translate(cell.x, cell.y)
      paint(cell.text)
      ctx.restore()
    }
  }

  // Pass 1: wide coloured glow halo (doubled for intensity).
  ctx.shadowColor = color
  ctx.shadowBlur = glyph * 0.6
  ctx.fillStyle = color
  stamp((t) => {
    ctx.fillText(t, 0, 0)
    ctx.fillText(t, 0, 0)
  })

  // Pass 2: coloured tube stroke.
  ctx.shadowBlur = glyph * 0.28
  ctx.lineWidth = glyph * 0.09
  ctx.strokeStyle = color
  stamp((t) => ctx.strokeText(t, 0, 0))

  // Pass 3: white-hot core.
  ctx.shadowBlur = glyph * 0.12
  ctx.fillStyle = '#fffdf6'
  stamp((t) => ctx.fillText(t, 0, 0))

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true

  const result: SignTexture = { texture, aspect: contentW / contentH }
  cache.set(key, result)
  return result
}
