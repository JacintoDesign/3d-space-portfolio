import { create } from 'zustand'

export interface Marker {
  id: string
  kind: string
  color: string
  sign: string
  /** Normalised screen coords in [-1,1] (y up), mirrored when behind the camera. */
  x: number
  y: number
  onScreen: boolean
  dist: number
  visited: boolean
}

interface MarkersState {
  markers: Marker[]
  setMarkers: (m: Marker[]) => void
}

export const useMarkers = create<MarkersState>((set) => ({
  markers: [],
  setMarkers: (markers) => set({ markers }),
}))
