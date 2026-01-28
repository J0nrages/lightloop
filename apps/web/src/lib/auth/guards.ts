import { auth } from '@clerk/tanstack-react-start/server'
import { createClerkClient } from '@clerk/backend'
import { getOrCreateUserByClerkId, syncOrgMembership } from '@/lib/auth/context'
import { hasMinCompanyRole, type CompanyRole } from '@/lib/auth/permissions'
import { hasOrgLicense, type OrgLicense, hasPersonalLicense, type PersonalLicense } from '@/lib/auth/licenses'

export type AuthSession = Awaited<ReturnType<typeof auth>>
type AuthSessionWithUser = AuthSession & { userId: string }

const clerkBackend = (() => {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return null
  return createClerkClient({ secretKey })
})()

const hasClerkSecretKey = Boolean(process.env.CLERK_SECRET_KEY)

function getAuthDebugContext(session: AuthSession | null, request?: Request) {
  const cookieHeader = request?.headers.get('cookie') ?? ''
  const authHeader = request?.headers.get('authorization') ?? ''
  return {
    method: request?.method,
    url: request?.url,
    hasCookie: Boolean(cookieHeader),
    hasSessionCookie: cookieHeader.includes('__session='),
    hasAuthHeader: Boolean(authHeader),
    usingClerkBackend: Boolean(clerkBackend && request),
    hasClerkSecretKey,
    sessionUserId: session?.userId ?? null,
    sessionOrgId: session?.orgId ?? null,
    sessionOrgRole: session?.orgRole ?? null,
  }
}

function logAuthFailure(
  message: string,
  session: AuthSession | null,
  request?: Request,
  error?: unknown
) {
  const context = getAuthDebugContext(session, request)
  console.warn(`[auth] ${message}`, context)
  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error)
    console.error(`[auth] ${message} error`, errorMessage)
  }
}

async function getAuthSession(request?: Request): Promise<AuthSession | null> {
  try {
    if (!request || !clerkBackend) {
      return auth()
    }

    const state = await clerkBackend.authenticateRequest(request, { acceptsToken: 'any' })
    const authObject = state.toAuth()
    return authObject as AuthSession | null
  } catch (error) {
    logAuthFailure('Failed to authenticate request', null, request, error)
    throw error
  }
}

function assertAuthUser(
  session: AuthSession | null,
  request?: Request
): asserts session is AuthSessionWithUser {
  if (!session?.userId) {
    logAuthFailure('Unauthorized: missing Clerk session', session, request)
    throw new Response('Unauthorized', { status: 401 })
  }
}

export async function requireAuth(request?: Request): Promise<AuthSessionWithUser> {
  const session = await getAuthSession(request)
  assertAuthUser(session, request)
  return session
}

export async function requireAuthUser(request?: Request) {
  const session = await requireAuth(request)
  try {
    return await getOrCreateUserByClerkId(session.userId)
  } catch (error) {
    logAuthFailure('Failed to load Clerk user', session, request, error)
    throw error
  }
}

export async function requireOrg(request?: Request) {
  const session = await requireAuth(request)
  if (!session.orgId) {
    throw new Response('Organization required', { status: 403 })
  }
  await syncOrgMembership(session.userId, session.orgId, session.orgRole ?? 'org:member')
  return session
}

export async function requireCompanyRole(required: CompanyRole, request?: Request) {
  const session = await requireOrg(request)
  if (!hasMinCompanyRole(session.orgRole ?? null, required)) {
    throw new Response('Forbidden', { status: 403 })
  }
  return session
}

const isCompanyAdmin = (role: string | null | undefined) =>
  role === 'org:owner' || role === 'org:admin'

export async function requireOrgLicense(required: OrgLicense, request?: Request) {
  const session = await requireOrg(request)
  if (isCompanyAdmin(session.orgRole ?? null)) {
    return session
  }
  const orgId = session.orgId
  if (!orgId) {
    throw new Response('Organization required', { status: 403 })
  }
  const allowed = await hasOrgLicense(orgId, required)
  if (!allowed) {
    throw new Response('License required', { status: 403 })
  }
  return session
}

export async function requireHireAccess(request?: Request) {
  const session = await requireOrg(request)
  if (isCompanyAdmin(session.orgRole ?? null)) {
    return session
  }
  const orgId = session.orgId
  if (!orgId) {
    throw new Response('Organization required', { status: 403 })
  }
  const hasFree = await hasOrgLicense(orgId, 'hire_free')
  const hasPaid = await hasOrgLicense(orgId, 'hire_paid')
  if (!hasFree && !hasPaid) {
    throw new Response('Hire license required', { status: 403 })
  }
  return session
}

export async function requireHirePaid(request?: Request) {
  return requireOrgLicense('hire_paid', request)
}

export async function requirePersonalLicense(required: PersonalLicense, request?: Request) {
  const session = await requireAuth(request)
  const allowed = await hasPersonalLicense(session.userId, required)
  if (!allowed) {
    throw new Response('License required', { status: 403 })
  }
  return session
}
