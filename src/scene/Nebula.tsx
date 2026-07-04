import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD } from '../data/world'
import { useGame } from '../store/useGame'

/* ---------------------------------------------------------------- shaders -- */

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }

  void main(){
    vec3 dir = normalize(vDir);
    vec3 p = dir * 2.3 + vec3(0.0, 0.0, uTime * 0.012);
    float n  = fbm(p);
    float n2 = fbm(p * 1.7 + n * 1.4 + vec3(5.2, 1.3, uTime * 0.018));
    float clouds = smoothstep(0.33, 0.95, n * 0.6 + n2 * 0.6);

    vec3 deep = vec3(0.015, 0.018, 0.06);
    vec3 violet = vec3(0.16, 0.05, 0.36);
    vec3 magenta = vec3(0.95, 0.16, 0.42);
    vec3 cyan = vec3(0.02, 0.78, 0.92);

    vec3 col = mix(deep, violet, smoothstep(0.2, 0.62, n));
    col = mix(col, cyan, smoothstep(0.5, 0.95, n2) * 0.55);
    col = mix(col, magenta, clouds * 0.65);
    col *= 0.55 + 0.45 * smoothstep(-0.7, 0.7, dir.y);

    gl_FragColor = vec4(col, 1.0);
  }
`

/* ----------------------------------------------------------- cloud sprites -- */

function makeCloudTexture(): THREE.CanvasTexture {
  const s = 256
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')!
  const blob = (cx: number, cy: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.45, `rgba(255,255,255,${a * 0.35})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  }
  blob(s / 2, s / 2, s / 2, 0.85)
  for (let i = 0; i < 5; i++) {
    blob(s * (0.3 + Math.random() * 0.4), s * (0.3 + Math.random() * 0.4), s * (0.18 + Math.random() * 0.18), 0.4)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface Puff {
  pos: [number, number, number]
  scale: number
  color: string
  opacity: number
}

const PUFFS: Puff[] = [
  { pos: [-40, 10, -30], scale: 70, color: '#7a2bff', opacity: 0.5 },
  { pos: [50, -6, -60], scale: 85, color: '#05d9e8', opacity: 0.42 },
  { pos: [-30, -18, -95], scale: 75, color: '#ff2a6d', opacity: 0.4 },
  { pos: [38, 24, -120], scale: 95, color: '#b537f2', opacity: 0.46 },
  { pos: [-55, 6, -150], scale: 90, color: '#05d9e8', opacity: 0.4 },
  { pos: [20, -22, -175], scale: 80, color: '#ff2a6d', opacity: 0.38 },
  { pos: [0, 40, -90], scale: 110, color: '#3a1d6e', opacity: 0.5 },
  { pos: [-10, -30, -45], scale: 65, color: '#2a0f5e', opacity: 0.45 },
]

export function Nebula() {
  const zone = useGame((s) => s.zone)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const cloud = useMemo(makeCloudTexture, [])

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  // Beyond the portal there is no nebula — just the black.
  if (zone === 'void') return null

  return (
    <group>
      {/* Backdrop sky sphere — opaque, behind everything, ignores fog. */}
      <mesh position={WORLD.bounds.center} scale={500} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Additive cloud puffs for parallax volume near the corridor. */}
      {PUFFS.map((puff, i) => (
        <sprite key={i} position={puff.pos} scale={puff.scale}>
          <spriteMaterial
            map={cloud}
            color={puff.color}
            transparent
            opacity={puff.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  )
}
