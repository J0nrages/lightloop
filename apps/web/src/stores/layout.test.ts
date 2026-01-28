import { describe, it, expect } from 'bun:test'
import { useLayoutStore } from '@/stores/layout'

describe('layout store', () => {
  it('updates layout mode and sidebar state', () => {
    useLayoutStore.getState().setMode('split-right')
    expect(useLayoutStore.getState().mode).toBe('split-right')

    useLayoutStore.getState().setSidebarOpen(false)
    expect(useLayoutStore.getState().isSidebarOpen).toBe(false)
  })
})
