export const dynamic = 'force-dynamic';

import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NewLeadForm } from '@/components/leads/new-lead-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function NewLeadPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/leads" className="flex items-center gap-2" title="Back to Leads">
              <ArrowLeft className="h-4 w-4" />
              Back to Leads
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Add New Lead</h1>
            <p className="text-muted-foreground">Enter the lead information manually</p>
          </div>
        </div>
      </div>

      <NewLeadForm />
    </div>
  )
}
