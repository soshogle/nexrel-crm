import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getMetaDb } from '@/lib/db/meta-db'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'
import { ClinicProvider } from '@/lib/dental/clinic-context'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Use session data from JWT - industry and accountStatus are in the token
  let accountStatus = session.user?.accountStatus
  let industry = session.user?.industry

  // Fallback: if JWT has no industry but DB does (e.g. set-industry ran, update() didn't persist), fetch from auth DB
  if (
    !industry &&
    session.user?.id &&
    session.user?.role !== 'SUPER_ADMIN' &&
    !session.user?.parentRole
  ) {
    try {
      const dbUser = await getMetaDb().user.findUnique({
        where: { id: session.user.id },
        select: { industry: true, accountStatus: true },
      })
      if (dbUser?.industry) {
        industry = dbUser.industry
        if (dbUser.accountStatus) accountStatus = dbUser.accountStatus
      }
    } catch {
      // Ignore - use session values
    }
  }

  if (
    session.user?.role !== 'SUPER_ADMIN' &&
    !session.user?.isImpersonating
  ) {
    if (accountStatus === 'PENDING_APPROVAL') {
      redirect('/dashboard/pending-approval')
    }

    if (
      session.user?.role !== 'PARENT' &&
      !session.user?.parentRole &&
      !industry
    ) {
      redirect('/welcome')
    }
  }

  // ClinicProvider required for dental/orthodontist pages (SharedDashboardLayout, CustomDocumentUpload, etc.)
  const isDentalUser = industry === 'DENTIST' || industry === 'ORTHODONTIST'
  
  const content = (
    <DashboardWrapper>
      {children}
    </DashboardWrapper>
  )

  // Wrap with ClinicProvider for dental users
  if (isDentalUser) {
    return <ClinicProvider>{content}</ClinicProvider>
  }

  return content
}
