export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'

export default async function DashboardPage() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return null

    // Fetch dashboard data
    const [leads, recentLeadsRaw] = await Promise.all([
      leadService.findMany(ctx, {
        select: {
          id: true,
          status: true,
          createdAt: true,
        } as any,
      }),
      leadService.findMany(ctx, {
        select: {
          id: true,
          businessName: true,
          status: true,
          createdAt: true,
          email: true,
          phone: true,
        } as any,
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    ])

    // Serialize dates for client component
    const recentLeads = recentLeadsRaw.map(lead => ({
      ...lead,
      createdAt: lead.createdAt.toISOString(),
    }))

    // Calculate stats
    const totalLeads = leads.length
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const stats = {
      totalLeads,
      newLeads: statusCounts.NEW || 0,
      qualifiedLeads: statusCounts.QUALIFIED || 0,
      convertedLeads: statusCounts.CONVERTED || 0,
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your CRM overview</p>
          </div>
        </div>

        <DashboardOverview stats={stats} recentLeads={recentLeads} />
      </div>
    )
  } catch (error) {
    console.error('Dashboard page error:', error)
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Dashboard</h1>
        <p className="text-muted-foreground">
          There was an error loading your dashboard. Please try refreshing the page.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          If this persists, please contact support.
        </p>
      </div>
    )
  }
}
