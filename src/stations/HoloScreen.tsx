import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/useGame'
import { ProjectScreen } from '../buildings/ProjectScreen'
import { useOptionalVideoTexture } from '../buildings/useOptionalVideoTexture'
import { useOptionalImageTexture } from '../buildings/useOptionalImageTexture'

interface HoloScreenProps {
  label: string
  subtitle?: string
  color: string
  video?: string
  /** Screenshot fallback when there's no demo clip (or while it loads). */
  image?: string
  active: boolean
  size?: [number, number]
  position?: [number, number, number]
}

/**
 * Subtle static scanlines and a slow refresh band over stable screen content.
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
    float scan = 0.5 + 0.5 * sin(vUv.y * 100.0);
    // slow rolling refresh band sweeping upward
    float roll = 1.0 - smoothstep(0.0, 0.22, abs(fract(vUv.y * 0.5 + uTime * 0.07) - 0.5));
    // soft rectangular falloff so the projection has no hard border
    float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) *
                 smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
    float a = (scan * 0.025 + roll * 0.025) * edge;
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
 * bracketed by HUD corner ticks, wrapped in two counter-rotating orbital arcs. The content itself stays still.
 * Shows a real demo clip when /videos/<id>.mp4 exists, else the procedural
 * animated screen; both get the scanline/refresh hologram treatment.
 */
export function HoloScreen({
  label,
  subtitle,
  color,
  video,
  image,
  active,
  size = [5, 2.8],
  position = [0, 0, 0],
}: HoloScreenProps) {
  const videoTex = useOptionalVideoTexture(video, active)
  const imageTex = useOptionalImageTexture(image, size[0] / size[1])
  const tex = videoTex ?? imageTex
  const root = useRef<THREE.Group>(null)
  const basePos = useMemo(() => new THREE.Vector3(...position), [position])
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
    const reduced = useGame.getState().reducedMotion
    if (!reduced) t.current += Math.min(delta, 0.05)
    holoMat.uniforms.uTime.value = t.current
    // Enlarge within the overhead layout without drifting outside the camera frame.
    if (root.current) {
      const k = Math.min(1, delta * 4)
      const s = root.current.scale.x + ((active ? 1.25 : 1) - root.current.scale.x) * k
      root.current.scale.setScalar(s)
      const ty = basePos.y
      const tz = basePos.z
      root.current.position.x = basePos.x
      root.current.position.y += (ty - root.current.position.y) * k
      root.current.position.z += (tz - root.current.position.z) * k
    }
    if (arcA.current && !reduced) arcA.current.rotation.z += delta * 0.5
    if (arcB.current && !reduced) arcB.current.rotation.z -= delta * 0.32
    if (emitter.current && !reduced) {
      emitter.current.rotation.y += delta * 1.4
      const s = 1 + Math.sin(t.current * 5) * 0.12
      emitter.current.scale.setScalar(s)
    }
  })

  return (
    <group position={position} ref={root}>
      <group>
          {/* screen content */}
          {tex ? (
            <mesh>
              <planeGeometry args={size} />
              <meshBasicMaterial map={tex} color="#d4dce8" toneMapped={false} />
            </mesh>
          ) : (
            <ProjectScreen label={label} subtitle={subtitle} color={color} size={size} active={active} />
          )}

          {/* hologram scan treatment over the content */}
          <mesh position={[0, 0, 0.02]} material={holoMat} renderOrder={1}>
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
          <group position={[0, -h / 2 - 0.55, 0]}>
            <mesh ref={emitter}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <planeGeometry args={[0.035, 0.5]} />
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
    </group>
  )
}
