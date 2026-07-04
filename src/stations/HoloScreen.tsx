import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { ProjectScreen } from '../buildings/ProjectScreen'
import { useOptionalVideoTexture } from '../buildings/useOptionalVideoTexture'

interface HoloScreenProps {
  label: string
  subtitle?: string
  color: string
  video?: string
  active: boolean
  size?: [number, number]
  position?: [number, number, number]
}

/**
 * Scanline + rolling-refresh hologram treatment, laid over the screen content.
 * Normal blending with soft edges so the projection reads as light, not glass.
 */
const HOLO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const HOLO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // fine scanlines
    float scan = 0.5 + 0.5 * sin(vUv.y * 240.0 + uTime * 6.0);
    // slow rolling refresh band sweeping upward
    float roll = 1.0 - smoothstep(0.0, 0.22, abs(fract(vUv.y * 0.5 + uTime * 0.07) - 0.5));
    // soft rectangular falloff so the projection has no hard border
    float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) *
                 smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
    float a = (scan * 0.10 + roll * 0.16) * edge;
    gl_FragColor = vec4(uColor, a);
  }
`

/** One corner bracket — two thin luminous bars forming an L. */
function Bracket({ x, y, sx, sy, color }: { x: number; y: number; sx: number; sy: number; color: string }) {
  const L = 0.5
  const T = 0.05
  return (
    <group position={[x, y, 0.01]}>
      <mesh position={[(-sx * L) / 2 + (sx * T) / 2, 0, 0]}>
        <planeGeometry args={[L, T]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, (-sy * L) / 2 + (sy * T) / 2, 0]}>
        <planeGeometry args={[T, L]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

/**
 * Station holo projection — an emitter node casts a frameless light-screen
 * bracketed by HUD corner ticks, wrapped in two counter-rotating orbital arcs.
 * Shows a real demo clip when /videos/<id>.mp4 exists, else the procedural
 * animated screen; both get the scanline/refresh hologram treatment.
 */
export function HoloScreen({
  label,
  subtitle,
  color,
  video,
  active,
  size = [5, 2.8],
  position = [0, 0, 0],
}: HoloScreenProps) {
  const tex = useOptionalVideoTexture(video, active)
  const root = useRef<THREE.Group>(null)
  const basePos = useMemo(() => new THREE.Vector3(...position), [position])
  const panel = useRef<THREE.Group>(null)
  const arcA = useRef<THREE.Mesh>(null)
  const arcB = useRef<THREE.Mesh>(null)
  const emitter = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const [w, h] = size

  const holoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HOLO_VERT,
        fragmentShader: HOLO_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  )

  const arcR = Math.hypot(w, h) * 0.58

  useFrame((_, delta) => {
    t.current += delta
    holoMat.uniforms.uTime.value = t.current
    // Grow the projection + float it forward/up when docked so the demo reads
    // big and clears the station body in the parked framing.
    if (root.current) {
      const k = Math.min(1, delta * 4)
      const s = root.current.scale.x + ((active ? 1.55 : 1) - root.current.scale.x) * k
      root.current.scale.setScalar(s)
      const ty = basePos.y + (active ? 2 : 0)
      const tz = basePos.z + (active ? 5.5 : 0)
      root.current.position.x = basePos.x
      root.current.position.y += (ty - root.current.position.y) * k
      root.current.position.z += (tz - root.current.position.z) * k
    }
    if (panel.current) {
      panel.current.position.y = Math.sin(t.current * 1.2) * 0.08
      // occasional hologram stutter
      const glitch = Math.sin(t.current * 23.0) > 0.985 ? 0.94 : 1
      panel.current.scale.setScalar((0.985 + Math.sin(t.current * 9) * 0.012) * glitch)
    }
    if (arcA.current) arcA.current.rotation.z += delta * 0.5
    if (arcB.current) arcB.current.rotation.z -= delta * 0.32
    if (emitter.current) {
      emitter.current.rotation.y += delta * 1.4
      const s = 1 + Math.sin(t.current * 5) * 0.12
      emitter.current.scale.setScalar(s)
    }
  })

  return (
    <group position={position} ref={root}>
      <Billboard>
        <group ref={panel}>
          {/* screen content */}
          {tex ? (
            <mesh>
              <planeGeometry args={size} />
              <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={0.88} />
            </mesh>
          ) : (
            <ProjectScreen label={label} subtitle={subtitle} color={color} size={size} active={active} />
          )}

          {/* hologram scan treatment over the content */}
          <mesh position={[0, 0, 0.012]} material={holoMat}>
            <planeGeometry args={[w, h]} />
          </mesh>

          {/* HUD corner brackets instead of a frame */}
          <Bracket x={-w / 2} y={h / 2} sx={-1} sy={1} color={color} />
          <Bracket x={w / 2} y={h / 2} sx={1} sy={1} color={color} />
          <Bracket x={-w / 2} y={-h / 2} sx={-1} sy={-1} color={color} />
          <Bracket x={w / 2} y={-h / 2} sx={1} sy={-1} color={color} />

          {/* counter-rotating orbital arcs around the projection */}
          <mesh ref={arcA}>
            <torusGeometry args={[arcR, 0.025, 6, 64, Math.PI * 0.7]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={arcB} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[arcR * 1.08, 0.018, 6, 64, Math.PI * 0.45]} />
            <meshBasicMaterial
              color="#9fe9ff"
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* emitter node + light thread up to the screen */}
          <group position={[0, -h / 2 - 1.05, 0]}>
            <mesh ref={emitter}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <planeGeometry args={[0.045, 1]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      </Billboard>
    </group>
  )
}
