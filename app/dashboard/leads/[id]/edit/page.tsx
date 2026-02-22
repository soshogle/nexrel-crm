export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { redirect, notFound } from 'next/navigation'
import { EditLeadForm } from '@/components/leads/edit-lead-form'

export default async function EditLeadPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  const ctx = getDalContextFromSession(session)

  if (!ctx) {
    redirect('/auth/signin')
  }

  const lead = await leadService.findUnique(ctx, params.id)

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
