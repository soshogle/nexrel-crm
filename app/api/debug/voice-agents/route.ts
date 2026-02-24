/**
 * Debug endpoint: /api/debug/voice-agents
 * Returns session info, user lookup, and agent counts to diagnose why My Voice Agents shows empty.
 * Remove or protect in production.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionUserId = session.user.id;
    const sessionEmail = session.user.email;

    const userByEmail = sessionEmail
      ? await prisma.user.findUnique({
          where: { email: sessionEmail },
          select: { id: true, email: true, name: true, industry: true },
        })
      : null;
    const userById = sessionUserId && !userByEmail
      ? await prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, email: true, name: true, industry: true },
        })
      : null;

    const userId = userByEmail?.id ?? userById?.id ?? sessionUserId;

    const [industryCount, industrySample, profCount, reCount, voiceCount] = await Promise.all([
      prisma.industryAIEmployeeAgent.count({
        where: { userId, status: 'active' },
      }),
      prisma.industryAIEmployeeAgent.findMany({
        where: { userId },
        select: { id: true, name: true, industry: true, employeeType: true, elevenLabsAgentId: true, status: true },
        take: 5,
      }),
      prisma.professionalAIEmployeeAgent.count({
        where: { userId },
      }),
      prisma.rEAIEmployeeAgent.count({
        where: { userId },
      }),
      prisma.voiceAgent.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      session: {
        userId: sessionUserId,
        email: sessionEmail,
        industry: (session.user as any).industry,
      },
      userLookup: {
        byEmail: userByEmail,
        byId: userById,
        resolvedUserId: userId,
      },
      agentCounts: {
        industry: industryCount,
        professional: profCount,
        re: reCount,
        voiceAgent: voiceCount,
        total: industryCount + profCount + reCount + voiceCount,
      },
      industrySample,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Debug failed', stack: err?.stack },
      { status: 500 }
    );
  }
}
