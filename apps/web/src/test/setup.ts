import { afterEach, mock } from 'bun:test'
import { Window } from 'happy-dom'

if (typeof document === 'undefined') {
  const window = new Window({ url: 'http://localhost' })
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    File: window.File,
    FileList: window.FileList,
    Blob: window.Blob,
    FormData: window.FormData,
    Headers: window.Headers,
    Request: window.Request,
    Response: window.Response,
    URL: window.URL,
    location: window.location,
    getComputedStyle: window.getComputedStyle.bind(window),
  })
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
}

if (globalThis.window && !globalThis.window.matchMedia) {
  globalThis.window.matchMedia = globalThis.matchMedia
}

if (typeof HTMLFormElement !== 'undefined' && !HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
    const event = new Event('submit', { bubbles: true, cancelable: true })
    this.dispatchEvent(event)
  }
}

if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock'
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {}
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __testAuthUser: { id: number; clerkId: string; email: string }
  // eslint-disable-next-line no-var
  var __testAuthSession: { userId: string; orgId?: string | null; orgRole?: string | null }
}

globalThis.__testAuthUser = { id: 42, clerkId: 'user_1', email: 'test@example.com' }
globalThis.__testAuthSession = { userId: 'user_1', orgId: null, orgRole: null }

mock.module('@/lib/auth/guards', () => ({
  requireAuth: mock(async () => globalThis.__testAuthSession),
  requireAuthUser: mock(async () => globalThis.__testAuthUser),
  requireOrg: mock(async () => {
    if (!globalThis.__testAuthSession.orgId) {
      throw new Response('Organization required', { status: 403 })
    }
    return globalThis.__testAuthSession
  }),
  requireCompanyRole: mock(async () => globalThis.__testAuthSession),
  requireHireAccess: mock(async () => globalThis.__testAuthSession),
  requireHirePaid: mock(async () => globalThis.__testAuthSession),
  requireOrgLicense: mock(async () => globalThis.__testAuthSession),
  requirePersonalLicense: mock(async () => globalThis.__testAuthSession),
}))

// Clear all mocks after each test
afterEach(() => {
  mock.restore()
})

// Mock environment variables for tests
process.env.OPENROUTER_API_KEY = 'test-api-key'
