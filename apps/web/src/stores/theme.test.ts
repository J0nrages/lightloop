import { describe, it, expect } from 'bun:test'
import { applyTheme } from '@/stores/theme'

describe('theme', () => {
  it('applies light and dark classes', () => {
    const root = document.documentElement

    applyTheme('dark')
    expect(root.classList.contains('dark')).toBe(true)

    applyTheme('light')
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('applies system theme based on matchMedia', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = () =>
      ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList

    applyTheme('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    window.matchMedia = originalMatchMedia
  })
})
