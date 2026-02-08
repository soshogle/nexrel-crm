
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'
import { ClinicProvider } from '@/lib/dental/clinic-context'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const dynamicParams = true

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check account approval status first (for all users except super admins and during impersonation)
  let user: { accountStatus: string | null; industry: string | null } | null = null
  
  if (
    session.user?.id && 
    session.user?.role !== 'SUPER_ADMIN' && 
    !session.user?.isImpersonating
  ) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountStatus: true, industry: true },
    });

    // If account is pending approval, redirect to pending page
    if (user?.accountStatus === 'PENDING_APPROVAL') {
      redirect('/dashboard/pending-approval');
    }

    // Check if user has selected an industry
    // BUT: Skip this check for parents, super admins, and impersonation sessions - they don't need to select an industry
    if (
      session.user?.role !== 'PARENT' && 
      !session.user?.parentRole
    ) {
      // If no industry is set, redirect to welcome page
      if (!user?.industry) {
        redirect('/welcome')
      }
    }
  }

  // Check if user is in dental industry - if so, wrap with ClinicProvider
  const isDentalUser = user?.industry === 'DENTIST'
  
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
