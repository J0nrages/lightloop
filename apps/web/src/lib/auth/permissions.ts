export const COMPANY_ROLE_WEIGHTS = {
  'org:owner': 6,
  'org:admin': 5,
  'org:member': 3,
  'org:contractor': 1,
} as const

export type CompanyRole = keyof typeof COMPANY_ROLE_WEIGHTS

export const PROJECT_ROLE_WEIGHTS = {
  project_admin: 5,
  hiring_manager: 4,
  lead: 5,
  recruiter: 4,
  member: 3,
  viewer: 2,
  interviewer: 1,
} as const

export type ProjectRole = keyof typeof PROJECT_ROLE_WEIGHTS

const hasMinRole = (roleWeight: number, requiredWeight: number) =>
  roleWeight >= requiredWeight

const getCompanyRoleWeight = (role?: string | null) =>
  role && role in COMPANY_ROLE_WEIGHTS
    ? COMPANY_ROLE_WEIGHTS[role as CompanyRole]
    : 0

export const hasMinCompanyRole = (role: string | null | undefined, required: CompanyRole) =>
  hasMinRole(getCompanyRoleWeight(role), COMPANY_ROLE_WEIGHTS[required])

const getProjectRoleWeight = (role?: string | null) =>
  role && role in PROJECT_ROLE_WEIGHTS
    ? PROJECT_ROLE_WEIGHTS[role as ProjectRole]
    : 0

export const hasMinProjectRole = (role: string | null | undefined, required: ProjectRole) =>
  hasMinRole(getProjectRoleWeight(role), PROJECT_ROLE_WEIGHTS[required])
