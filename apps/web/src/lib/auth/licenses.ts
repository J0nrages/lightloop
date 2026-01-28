import { dbOps } from '@/lib/schema'

export type PersonalLicense = 'pro' | 'research'
export type OrgLicense = 'hire_free' | 'hire_paid'

export async function getPersonalLicenses(clerkUserId: string): Promise<PersonalLicense[]> {
  const licenses = dbOps.getUserLicenses(clerkUserId)
  return licenses.filter((license): license is PersonalLicense =>
    license === 'pro' || license === 'research'
  )
}

export async function getOrgLicenses(orgId: string): Promise<OrgLicense[]> {
  const licenses = dbOps.getOrgLicenses(orgId)
  return licenses.filter((license): license is OrgLicense =>
    license === 'hire_free' || license === 'hire_paid'
  )
}

export async function hasPersonalLicense(clerkUserId: string, license: PersonalLicense) {
  const licenses = await getPersonalLicenses(clerkUserId)
  return licenses.includes(license)
}

export async function hasOrgLicense(orgId: string, license: OrgLicense) {
  const licenses = await getOrgLicenses(orgId)
  return licenses.includes(license)
}
