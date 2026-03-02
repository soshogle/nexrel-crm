
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiErrors } from '@/lib/api-error';

// GET /api/credit-scoring/score - Get user's credit score

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    let creditScore = await prisma.creditScore.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        applications: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    })

    // If no credit score exists, create one with defaults
    if (!creditScore) {
      creditScore = await prisma.creditScore.create({
        data: {
          userId: session.user.id,
          score: 650, // Default starting score
          riskLevel: 'MEDIUM',
          creditLimit: 500000, // $5,000 default limit
          availableCredit: 500000,
        },
        include: {
          applications: true,
        },
      })
    }

    return NextResponse.json(creditScore)
  } catch (error) {
    console.error('Error fetching credit score:', error)
    return apiErrors.internal('Failed to fetch credit score')
  }
}

// POST /api/credit-scoring/score/update - Update credit score with AI Trust Score
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    // Call Python AI Trust Score service on port 8000
    let trustScore = null
    let aiInsights = null

    try {
      const aiResponse = await fetch('http://localhost:8000/api/trust-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        trustScore = aiData.trust_score
        aiInsights = aiData.insights
      }
    } catch (aiError) {
      console.warn('AI Trust Score service unavailable, using default values')
    }

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com'

    // Deterministic scoring model from real user history (non-demo users).
    const [existingScore, applications] = await Promise.all([
      prisma.creditScore.findUnique({ where: { userId: session.user.id } }),
      prisma.creditApplication.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    let nextScore = existingScore?.score || 650
    const totalApps = applications.length
    const approvedApps = applications.filter((a) => a.status === 'APPROVED').length
    const deniedApps = applications.filter((a) => a.status === 'DENIED' || a.status === 'EXPIRED').length
    const pendingApps = applications.filter((a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length

    if (isOrthoDemo) {
      // Keep stable curated demo range for the demo account.
      nextScore = 720
    } else {
      const approvalRate = totalApps > 0 ? approvedApps / totalApps : 0
      const pendingPenalty = Math.min(25, pendingApps * 2)
      const denialPenalty = Math.min(60, deniedApps * 8)
      const approvalBoost = Math.min(40, Math.round(approvalRate * 40))

      // Utilization proxy from existing credit profile.
      const utilization =
        existingScore && existingScore.creditLimit > 0
          ? Math.max(0, Math.min(1, 1 - (existingScore.availableCredit / existingScore.creditLimit)))
          : 0.5
      const utilizationPenalty = Math.round(utilization * 35)

      nextScore = 650 + approvalBoost - denialPenalty - pendingPenalty - utilizationPenalty
      nextScore = Math.max(300, Math.min(850, nextScore))
    }

    const riskLevel =
      nextScore >= 750 ? 'LOW' :
      nextScore >= 650 ? 'MEDIUM' :
      nextScore >= 550 ? 'HIGH' : 'CRITICAL'

    const creditScore = await prisma.creditScore.upsert({
      where: { userId: session.user.id },
      update: {
        score: nextScore,
        scoreDate: new Date(),
        trustScore,
        trustScoreDate: trustScore ? new Date() : null,
        riskLevel,
        insights: aiInsights,
        recommendations: [
          'Pay bills on time to improve payment history',
          'Keep credit utilization below 30%',
          'Avoid opening too many new accounts',
        ],
      },
      create: {
        userId: session.user.id,
        score: nextScore,
        trustScore,
        trustScoreDate: trustScore ? new Date() : null,
        riskLevel,
        creditLimit: 500000,
        availableCredit: 500000,
        recommendations: [
          'Pay bills on time to improve payment history',
          'Keep credit utilization below 30%',
          'Avoid opening too many new accounts',
        ],
      },
      include: {
        applications: true,
      },
    })

    return NextResponse.json(creditScore)
  } catch (error) {
    console.error('Error updating credit score:', error)
    return apiErrors.internal('Failed to update credit score')
  }
}
