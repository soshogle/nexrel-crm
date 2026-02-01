export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ReferralsList } from '@/components/referrals/referrals-list'
import { redirect } from 'next/navigation'

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage customer referrals
          </p>
        </div>
      </div>

      <ReferralsList />
    </div>
  )
}
