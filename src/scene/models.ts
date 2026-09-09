import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

/**
 * Bundled CC0 / CC-BY model assets (see README credits). All are meshopt-
 * compressed GLBs decoded by drei's bundled MeshoptDecoder — no CDN fetches.
 */
export const MODEL_URLS = {
  ship: asset('models/ship.glb'),
  satellite: asset('models/satellite.glb'),
}

function asset(path: string): string {
  return import.meta.env.BASE_URL + path
}

const box = new THREE.Box3()
const size = new THREE.Vector3()
const center = new THREE.Vector3()

/**
 * Load a GLB and return a per-call clone, centered at the origin and uniformly
 * scaled so its largest dimension equals `targetSize`. Geometry + materials
 * stay shared with the cached source scene; only the node tree is cloned.
 */
export function useFittedModel(url: string, targetSize: number): THREE.Group {
  const { scene } = useGLTF(url, false)
  return useMemo(() => {
    const root = scene.clone(true)
    box.setFromObject(root)
    box.getSize(size)
    box.getCenter(center)
    const holder = new THREE.Group()
    root.position.sub(center)
    holder.add(root)
    holder.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 1e-4))
    return holder
  }, [scene, targetSize])
}

// Warm the loader cache during the loading gate.
for (const url of Object.values(MODEL_URLS)) useGLTF.preload(url, false)
