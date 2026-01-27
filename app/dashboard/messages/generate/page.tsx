
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { MessageGenerator } from '@/components/messages/message-generator'

export const dynamic = "force-dynamic"

export default async function GenerateMessagePage({
  searchParams,
}: {
  searchParams: { leadId?: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  if (!searchParams.leadId) {
    redirect('/dashboard/leads')
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: searchParams.leadId,
      userId: session.user.id,
    }
  })

  if (!lead) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generate AI Message</h1>
          <p className="text-muted-foreground">Create a personalized outreach message for {lead.businessName}</p>
        </div>
      </div>

      <MessageGenerator lead={lead} />
    </div>
  )
}
