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

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com'
    // Preserve mock behavior only for the dedicated demo account
    let leadsToUse = Array.isArray(leads) ? leads : []
    let recentLeadsToUse = Array.isArray(recentLeadsRaw) ? recentLeadsRaw : []
    if (isOrthoDemo && leadsToUse.length === 0) {
      const { MOCK_LEADS } = await import('@/lib/mock-data')
      leadsToUse = MOCK_LEADS.map((l) => ({
        id: l.id,
        status: l.status,
        createdAt: new Date(l.createdAt),
      })) as any
      recentLeadsToUse = MOCK_LEADS.slice(0, 5).map((l) => ({
        id: l.id,
        businessName: l.businessName,
        status: l.status,
        createdAt: new Date(l.createdAt),
        email: l.email,
        phone: l.phone,
      })) as any
    }

    // Serialize dates for client component
    const recentLeads = recentLeadsToUse.map((lead: any) => ({
      ...lead,
      createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
    }))

    // Calculate stats
    const totalLeads = leadsToUse.length
    const statusCounts = leadsToUse.reduce((acc: Record<string, number>, lead: any) => {
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
