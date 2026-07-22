import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/useGame'

/**
 * A big procedural moon hanging in the midground of the sector — pure shader, no
 * texture files. fbm noise paints maria + cratering; a fixed "sun" direction
 * gives a crisp lit crescent, and a fresnel limb catches the nebula's glow. It
 * sits off to the side and beyond the play bounds, so you can admire it but
 * never fly into it. Nebula side only (the void stays empty + dark).
 */
const MOON_POS: [number, number, number] = [-140, 100, -300]
const MOON_RADIUS = 78

const MOON_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vView;
  void main() {
    vLocal = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const MOON_FRAG = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uLit;
  uniform vec3 uDark;
  uniform vec3 uRim;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vView;

  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.05; a *= 0.5; } return v; }

  void main(){
    vec3 n = normalize(vNormalW);
    vec3 sp = normalize(vLocal);
    float maria = fbm(sp * 2.3);          // large dark seas
    float crater = fbm(sp * 13.0);        // fine cratering
    float surf = maria * 0.72 + crater * 0.28;
    // High-contrast albedo: dark maria vs bright highlands, speckled by craters.
    float albedo = mix(0.16, 1.1, smoothstep(0.28, 0.74, surf)) * (0.82 + 0.18 * crater);

    // Fixed sun → a crisp lit crescent and a genuinely dark far side.
    float ndl = dot(n, normalize(uSun));
    float lit = smoothstep(-0.04, 0.3, ndl);
    vec3 col = mix(uDark, uLit, lit) * albedo + uDark * 0.08;

    // Subtle fresnel limb catching the nebula glow (kept low so it stays a moon,
    // not a light bulb). The dot MUST be clamped above too: fp32 rounding can
    // push it past 1.0, and pow(negative, 3.5) is NaN — one NaN pixel here gets
    // smeared over the whole frame by Bloom's mip chain (the black flicker bug).
    float fres = pow(clamp(1.0 - dot(n, normalize(vView)), 0.0, 1.0), 3.5);
    col += uRim * fres * (0.25 + 0.35 * lit);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function Moon() {
  const isVoid = useGame((s) => s.zone === 'void')
  const spin = useRef<THREE.Group>(null)

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: MOON_VERT,
        fragmentShader: MOON_FRAG,
        uniforms: {
          // Side-lit from screen-right (toward the lane) so the terminator reads.
          uSun: { value: new THREE.Vector3(0.85, 0.25, 0.45).normalize() },
          uLit: { value: new THREE.Color('#d7d4cc') },
          uDark: { value: new THREE.Color('#050510') },
          uRim: { value: new THREE.Color('#3d5f8a') },
        },
        toneMapped: false,
      }),
    [],
  )

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.012
  })

  if (isVoid) return null

  return (
    <group position={MOON_POS}>
      <group ref={spin} rotation={[0.3, 0, 0.1]}>
        <mesh material={mat}>
          <sphereGeometry args={[MOON_RADIUS, 64, 48]} />
        </mesh>
      </group>
      {/* faint atmosphere ring so the moon lifts off the nebula + feeds bloom */}
      <mesh scale={1.05}>
        <sphereGeometry args={[MOON_RADIUS, 32, 24]} />
        <meshBasicMaterial
          color="#243a5c"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
