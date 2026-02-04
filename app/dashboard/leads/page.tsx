export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LeadsList } from '@/components/leads/leads-list'
import { redirect } from 'next/navigation'

export default async function LeadsPage() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      redirect('/login')
    }

    let leads;
    try {
      leads = await prisma.lead.findMany({
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
    } catch (dbError: any) {
      console.error('Database error fetching leads:', dbError);
      console.error('Error code:', dbError?.code);
      console.error('Error meta:', dbError?.meta);
      // Return empty array on error to prevent crash
      leads = [];
    }

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
  } catch (error: any) {
    console.error('Error in LeadsPage:', error);
    // Return a safe fallback UI instead of crashing
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">Manage and track your leads</p>
          </div>
        </div>
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">
            Unable to load leads. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-sm text-red-500 mt-2">{error?.message}</p>
          )}
        </div>
      </div>
    )
  }
}
