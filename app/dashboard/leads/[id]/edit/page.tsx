
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { EditLeadForm } from '@/components/leads/edit-lead-form'

export const dynamic = "force-dynamic"

export default async function EditLeadPage({
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
    }
  })

  if (!lead) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Lead</h1>
          <p className="text-muted-foreground">Update the lead information</p>
        </div>
      </div>

      <EditLeadForm lead={lead} />
    </div>
  )
}
