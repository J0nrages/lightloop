import { describe, it, expect, mock, afterAll } from 'bun:test'

const warnMock = mock(() => 'notification-id')
const errorMock = mock(() => 'notification-id')

mock.module('@/lib/model-validation', () => ({
  validateModelId: mock(async () => ({
    valid: true,
    probe: { ok: false, error: 'probe failed' },
  })),
}))

mock.module('@/stores/notifications', () => ({
  notify: {
    warning: warnMock,
    error: errorMock,
  },
  useNotificationsStore: () => ({
    notifications: [],
    removeNotification: () => {},
  }),
}))

// Minimal localStorage polyfill for zustand persist
const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

const { useModelStore, AVAILABLE_MODELS } = await import('@/stores/model')

describe('model store validation', () => {
  it('warns (not errors) when probe fails after a valid model match', async () => {
    await useModelStore.getState().setSelectedModel(AVAILABLE_MODELS[0])
    expect(warnMock).toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})

afterAll(() => {
  mock.restore()
})
