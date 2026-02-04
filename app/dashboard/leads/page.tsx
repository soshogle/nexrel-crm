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

    // Fetch leads without relations first to avoid potential issues
    let leads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Then fetch notes and messages separately if needed
    if (leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      const [notes, messages] = await Promise.all([
        prisma.note.findMany({
          where: { leadId: { in: leadIds } },
          select: { id: true, leadId: true, createdAt: true },
        }).catch(() => []),
        prisma.message.findMany({
          where: { leadId: { in: leadIds } },
          select: { id: true, leadId: true, createdAt: true },
        }).catch(() => []),
      ]);

      // Group notes and messages by leadId
      const notesMap = new Map<string, Array<{ id: string; createdAt: Date }>>();
      const messagesMap = new Map<string, Array<{ id: string; createdAt: Date }>>();

      notes.forEach(note => {
        if (!notesMap.has(note.leadId)) notesMap.set(note.leadId, []);
        notesMap.get(note.leadId)!.push({ id: note.id, createdAt: note.createdAt });
      });

      messages.forEach(message => {
        if (!messagesMap.has(message.leadId)) messagesMap.set(message.leadId, []);
        messagesMap.get(message.leadId)!.push({ id: message.id, createdAt: message.createdAt });
      });

      // Attach notes and messages to leads
      leads = leads.map(lead => ({
        ...lead,
        notes: (notesMap.get(lead.id) || []) as Array<{ id: string; createdAt: Date }>,
        messages: (messagesMap.get(lead.id) || []) as Array<{ id: string; createdAt: Date }>,
      })) as any[];
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
