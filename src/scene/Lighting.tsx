/**
 * Moody nebula lighting: a cool key from above-front, a soft hemisphere fill, and
 * two big coloured rim glows (cyan / magenta) that wash the corridor like distant
 * nebula light. Station signage + engines are emissive, so this stays subtle.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#3a3f6e" />
      <hemisphereLight intensity={0.45} color="#5be9ff" groundColor="#2a0d3a" />
      <directionalLight position={[12, 20, 14]} intensity={0.9} color="#cfe0ff" />
      <pointLight position={[-70, 20, -60]} intensity={1.6} distance={260} decay={1.4} color="#05d9e8" />
      <pointLight position={[80, -10, -120]} intensity={1.6} distance={280} decay={1.4} color="#b537f2" />
      <pointLight position={[0, 30, -180]} intensity={1.2} distance={260} decay={1.4} color="#ff2a6d" />
    </>
  )
}
