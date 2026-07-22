import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LANDMARKS, WORLD } from '../data/world'
import { Station } from '../stations/Station'
import { useGame } from '../store/useGame'

/* ------------------------------------------------ portal membrane shader -- */

const PORTAL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// A dark event horizon: near-black centre, slow wavy swirl, and an iridescent
// cyan/violet fringe that shimmers along the rim.
const PORTAL_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    float r = length(c);
    // atan(0,0) is undefined (NaN on some GPUs) — dead-center guard. The rim
    // term is 0 there anyway, so the angle value doesn't matter visually.
    float ang = (r > 1e-4) ? atan(c.y, c.x) : 0.0;

    // layered angular waves — the surface never sits still
    float w =
      sin(ang * 5.0 - uTime * 0.9 + r * 7.0) * 0.5 +
      sin(ang * 9.0 + uTime * 1.3 - r * 11.0) * 0.3 +
      sin(ang * 3.0 + uTime * 0.5) * 0.2;

    // deep dark centre
    vec3 deep = vec3(0.004, 0.005, 0.014);

    // shimmering iridescent fringe hugging the rim, warped by the waves
    float rim = smoothstep(0.55, 1.0, r + w * 0.07);
    vec3 iri = mix(vec3(0.02, 0.85, 0.91), vec3(0.71, 0.22, 0.95), 0.5 + 0.5 * sin(ang * 2.0 + uTime * 0.4));
    vec3 col = deep + iri * rim * (0.4 + 0.35 * sin(uTime * 2.0 + ang * 7.0 + w * 2.0));

    // faint concentric ripples drifting inward across the dark surface
    col += vec3(0.05, 0.08, 0.16) * (0.5 + 0.5 * sin(r * 24.0 - uTime * 2.4 + w * 3.0)) * (1.0 - rim) * 0.4;

    float alpha = smoothstep(1.0, 0.985, r);
    gl_FragColor = vec4(col, alpha);
  }
`

/* -------------------------------------------------------------- gateway -- */

/**
 * The hero landmark: a colossal jump-gate at the end of the lane. Its dark,
 * shimmering membrane is a real portal — fly through and the ship warps to the
 * void beyond the nebula (and back). Rendered in BOTH zones so it's always the
 * way home.
 */
function GatewayRing() {
  const spin = useRef<THREE.Group>(null)
  const innerSpin = useRef<THREE.Group>(null)
  const R = WORLD.gateway.radius

  const portalMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PORTAL_VERT,
        fragmentShader: PORTAL_FRAG,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  )

  // Greeble ring: pseudo-random hull blocks studding the structural torus.
  const greebles = useMemo(() => {
    const rand = (i: number, s: number) => {
      const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    return Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2
      return {
        a,
        w: 1.6 + rand(i, 1) * 3.4,
        h: 1.2 + rand(i, 2) * 2.2,
        d: 1.2 + rand(i, 3) * 2.6,
        out: 2.2 + rand(i, 4) * 1.4,
      }
    })
  }, [])

  useFrame((_, delta) => {
    portalMat.uniforms.uTime.value += delta
    if (spin.current) spin.current.rotation.z += delta * 0.03
    if (innerSpin.current) innerSpin.current.rotation.z -= delta * 0.11
  })

  return (
    <group position={WORLD.gateway.position} rotation={[0.12, 0, 0]}>
      <group ref={spin}>
        {/* massive structural ring */}
        <mesh>
          <torusGeometry args={[R, 2.6, 14, 120]} />
          <meshStandardMaterial color="#0a0e20" metalness={0.9} roughness={0.38} flatShading />
        </mesh>
        {/* hull greebles studding the ring */}
        {greebles.map((g, i) => (
          <mesh
            key={i}
            position={[Math.cos(g.a) * (R + g.out - 2.2), Math.sin(g.a) * (R + g.out - 2.2), 0]}
            rotation={[0, 0, g.a]}
          >
            <boxGeometry args={[g.w, g.h, g.d]} />
            <meshStandardMaterial color="#0d1226" metalness={0.85} roughness={0.42} flatShading />
          </mesh>
        ))}
        {/* segment lights */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * R, Math.sin(a) * R, 1.9]}>
              <octahedronGeometry args={[0.55, 0]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#ff2a6d' : i % 3 === 1 ? '#05d9e8' : '#b537f2'} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      {/* counter-rotating inner energy assembly */}
      <group ref={innerSpin}>
        <mesh>
          <torusGeometry args={[R - 2.2, 0.45, 8, 100]} />
          <meshBasicMaterial color="#05d9e8" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[R - 4.4, 0.16, 6, 100]} />
          <meshBasicMaterial color="#b537f2" toneMapped={false} transparent opacity={0.8} />
        </mesh>
        {/* claw pylons biting inward from the ring */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <group key={i} rotation={[0, 0, a]}>
              <mesh position={[R - 3.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.9, 3.6, 4]} />
                <meshStandardMaterial color="#10162e" metalness={0.85} roughness={0.4} flatShading />
              </mesh>
              <mesh position={[R - 5.4, 0, 0]}>
                <octahedronGeometry args={[0.4, 0]} />
                <meshBasicMaterial color="#9fe9ff" toneMapped={false} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* the event horizon — dark, wavy, shimmering */}
      <mesh material={portalMat}>
        <circleGeometry args={[R - 2.6, 96]} />
      </mesh>

      <pointLight color="#05d9e8" intensity={4} distance={160} decay={1.5} />
    </group>
  )
}

/** Places every station along the corridor plus the hero gateway-ring. */
export function Sector() {
  const zone = useGame((s) => s.zone)
  return (
    <group>
      {/* Stations live on the nebula side only; the gateway spans both zones. */}
      {zone === 'nebula' &&
        LANDMARKS.map((l) => <Station key={l.id} landmark={l} />)}
      <GatewayRing />
    </group>
  )
}
