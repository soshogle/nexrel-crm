
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LeadsList } from '@/components/leads/leads-list'

export const dynamic = "force-dynamic"

export default async function LeadsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const leads = await prisma.lead.findMany({
    where: { userId: session.user.id },
    include: {
      notes: {
        select: {
          id: true,
          createdAt: true,
        }
      },
      messages: {
        select: {
          id: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Manage and track your leads</p>
        </div>
      </div>

      <LeadsList leads={leads} />
    </div>
  )
}
