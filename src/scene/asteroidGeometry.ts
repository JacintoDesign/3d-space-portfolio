import * as THREE from 'three'

/** Deterministic rocky silhouettes, eroded impact bowls, and mineral face colors. */
export function createAsteroidGeometry(variant: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 5)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const point = new THREE.Vector3()
  const craters = Array.from({ length: 7 }, (_, i) => {
    const a = i * 2.39996 + variant * 1.7
    const y = -0.78 + i * 0.26
    return { direction: new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - y * y), y, Math.sin(a) * Math.sqrt(1 - y * y)), width: 0.16 + (i % 3) * 0.065 }
  })
  const palette = [new THREE.Color('#77685b'), new THREE.Color('#667078'), new THREE.Color('#887664')]
  const base = palette[variant % palette.length]
  let maxRadius = 0
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).normalize()
    const noise = Math.sin(point.x * 5.3 + variant * 4) * Math.cos(point.y * 4.1 - point.z * 3.7) * 0.09
      + Math.sin(point.z * 11 + point.x * 7 + variant) * 0.028
    let erosion = 0
    for (const crater of craters) {
      const distance = point.distanceTo(crater.direction)
      const t = distance / crater.width
      if (t < 1) erosion -= 0.14 * (1 - t * t) ** 2
      else if (t < 1.3) erosion += 0.023 * Math.sin((t - 1) / 0.3 * Math.PI)
    }
    const radius = 0.88 + noise + erosion
    point.multiplyScalar(radius)
    point.x *= variant === 1 ? 0.77 : 1
    point.y *= variant === 2 ? 0.7 : 0.91
    maxRadius = Math.max(maxRadius, point.length())
    positions.setXYZ(i, point.x, point.y, point.z)
    const mineral = 0.77 + noise * 1.8 + erosion * 1.5 + Math.sin(point.x * 27 + point.y * 19) * 0.06
    colors[i * 3] = base.r * mineral
    colors[i * 3 + 1] = base.g * mineral
    colors[i * 3 + 2] = base.b * mineral
  }
  // Every vertex stays inside the collision sphere, including all rotations.
  geometry.scale(1 / maxRadius, 1 / maxRadius, 1 / maxRadius)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
