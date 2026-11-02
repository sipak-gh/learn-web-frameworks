import { atom } from 'jotai/vanilla'

export const itemsAtom = atom<string[]>([])

// A derived (read-only) atom.
export const countAtom = atom((get) => get(itemsAtom).length)

// Write-only atoms act as actions.
export const addAtom = atom(null, (get, set, name: string) => {
  set(itemsAtom, [...get(itemsAtom), name])
})
export const clearAtom = atom(null, (_get, set) => set(itemsAtom, []))
