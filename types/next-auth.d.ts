
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string | null
      agencyId?: string | null
      agencyName?: string | null
      parentRole?: boolean
      industry?: string | null
      onboardingCompleted?: boolean
      // Impersonation context
      isImpersonating?: boolean
      superAdminId?: string
      superAdminName?: string
    }
  }

  interface User {
    id: string
    role?: string | null
    agencyId?: string | null
    agencyName?: string | null
    parentRole?: boolean
    industry?: string | null
    onboardingCompleted?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role?: string | null
    agencyId?: string | null
    agencyName?: string | null
    parentRole?: boolean
    industry?: string | null
    onboardingCompleted?: boolean
    // Impersonation context
    isImpersonating?: boolean
    superAdminId?: string
    superAdminName?: string
  }
}
