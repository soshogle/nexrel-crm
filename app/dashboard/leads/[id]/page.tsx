export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' }
      },
      messages: {
        orderBy: { createdAt: 'desc' }
      },
      callLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { voiceAgent: { select: { name: true } } },
      },
    }
  })

  if (!lead) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <LeadDetail lead={lead} />
    </div>
  )
}
