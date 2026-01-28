import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { dbOps, type User } from '@/lib/schema'

export type AuthContext = {
  userId: string | null
  isSignedIn: boolean
  orgId?: string | null
  orgRole?: string | null
  orgPermissions?: string[]
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth()

  return {
    userId: session.userId ?? null,
    isSignedIn: Boolean(session.userId),
    orgId: session.orgId ?? null,
    orgRole: session.orgRole ?? null,
    orgPermissions: (session as { orgPermissions?: string[] }).orgPermissions ?? [],
  }
}

type ClerkUserEmails = {
  primaryEmailAddress?: { emailAddress?: string | null } | null
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
}

const getPrimaryEmail = (user: ClerkUserEmails) => {
  const primary = user.primaryEmailAddress?.emailAddress
  if (primary) return primary
  const fallback = user.emailAddresses?.[0]?.emailAddress
  return fallback ?? null
}

export async function getOrCreateUserByClerkId(clerkId: string): Promise<User> {
  const existing = dbOps.getUserByClerkId(clerkId)
  if (existing) return existing

  const clerk = clerkClient()
  const clerkUser = await clerk.users.getUser(clerkId)
  const email = getPrimaryEmail(clerkUser)

  if (!email) {
    throw new Error('Clerk user missing email address')
  }

  try {
    dbOps.createUser({ clerkId, email })
  } catch {
    // Race condition: another request created the user
  }

  const created = dbOps.getUserByClerkId(clerkId)
  if (!created) {
    throw new Error('Failed to create local user')
  }
  return created
}

export async function syncOrgFromClerk(clerkOrgId: string) {
  const existing = dbOps.getOrgByClerkId(clerkOrgId)
  if (existing) return existing

  const clerk = clerkClient()
  const org = await clerk.organizations.getOrganization({ organizationId: clerkOrgId })
  try {
    dbOps.createOrg({ clerkOrgId, name: org.name })
  } catch {
    // ignore race
  }
  const created = dbOps.getOrgByClerkId(clerkOrgId)
  if (!created) {
    throw new Error('Failed to create local org')
  }
  return created
}

export async function syncOrgMembership(clerkUserId: string, clerkOrgId: string, role: string) {
  const user = await getOrCreateUserByClerkId(clerkUserId)
  const org = await syncOrgFromClerk(clerkOrgId)
  dbOps.upsertOrgMember(org.id, user.id, role)
  return { user, org }
}
