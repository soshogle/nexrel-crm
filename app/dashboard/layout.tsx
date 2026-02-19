import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
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

  // Use session data from JWT (no DB query) - industry and accountStatus are in the token
  const accountStatus = session.user?.accountStatus
  const industry = session.user?.industry

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

  const isDentalUser = industry === 'DENTIST'
  
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
