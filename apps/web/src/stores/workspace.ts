import { create } from 'zustand'

export type WorkspaceView = 'dashboard' | 'candidates' | 'settings'

interface WorkspaceState {
  view: WorkspaceView
  setView: (view: WorkspaceView) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
}))
