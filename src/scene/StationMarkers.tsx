import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LANDMARKS, WORLD } from '../data/world'
import { useGame } from '../store/useGame'
import { useMarkers, type Marker } from '../store/useMarkers'

const v = new THREE.Vector3()
const UPDATE_DT = 1 / 15

function project(
  camera: THREE.Camera,
  pos: readonly [number, number, number],
  id: string,
  kind: string,
  color: string,
  sign: string,
  visited: boolean,
): Marker {
  v.set(pos[0], pos[1], pos[2])
  const dist = v.distanceTo(camera.position)
  v.project(camera)
  const behind = v.z > 1
  const x = behind ? -v.x : v.x
  const y = behind ? -v.y : v.y
  const onScreen = !behind && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1
  return { id, kind, color, sign, x, y, onScreen, dist, visited }
}

/**
 * Projects each station's world position to screen space every ~15Hz and pushes
 * the result to the marker store, which the DOM <Waypoints> layer renders as
 * off-screen direction chevrons. In the void beyond the portal only the gateway
 * marker survives — it's the way home. Lives inside the Canvas for the camera.
 */
export function StationMarkers() {
  const camera = useThree((s) => s.camera)
  const acc = useRef(0)

  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current < UPDATE_DT) return
    acc.current = 0

    const { visited, zone } = useGame.getState()
    const out: Marker[] = []
    if (zone === 'nebula') {
      for (const l of LANDMARKS) {
        out.push(project(camera, l.position, l.id, l.kind, l.color, l.sign, visited.includes(l.id)))
      }
    }
    // The gateway is always findable, on both sides of the membrane.
    out.push(project(camera, WORLD.gateway.position, 'gateway', 'gateway', '#9fe9ff', 'GATEWAY', false))
    useMarkers.getState().setMarkers(out)
  })

  return null
}
