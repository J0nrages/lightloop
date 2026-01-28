import { create } from 'zustand'

export type LayoutMode = 'centered' | 'split-left' | 'split-right' | 'floating'

interface LayoutState {
  mode: LayoutMode
  setMode: (mode: LayoutMode) => void
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  mode: 'centered',
  setMode: (mode) => set({ mode }),
  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}))
