export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { redirect, notFound } from 'next/navigation'
import { LeadDetail } from '@/components/leads/lead-detail'

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const ctx = getDalContextFromSession(session)
  if (!ctx) redirect('/auth/signin')

  const lead = await leadService.findUnique(ctx, params.id, {
    notes: { orderBy: { createdAt: 'desc' } },
    messages: { orderBy: { createdAt: 'desc' } },
    callLogs: {
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { voiceAgent: { select: { name: true } } },
    },
  } as any)

  if (!lead) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <LeadDetail lead={lead} />
    </div>
  )
}
