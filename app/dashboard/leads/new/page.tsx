
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NewLeadForm } from '@/components/leads/new-lead-form'

export default async function NewLeadPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Lead</h1>
          <p className="text-muted-foreground">Enter the lead information manually</p>
        </div>
      </div>

      <NewLeadForm />
    </div>
  )
}
