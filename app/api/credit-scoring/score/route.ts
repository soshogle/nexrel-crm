
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/credit-scoring/score - Get user's credit score
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json(
      { error: 'Failed to fetch credit score' },
      { status: 500 }
    )
  }
}

// POST /api/credit-scoring/score/update - Update credit score with AI Trust Score
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate mock credit score update (simulation)
    const mockScore = Math.floor(Math.random() * (850 - 300) + 300)
    const riskLevel = 
      mockScore >= 750 ? 'LOW' :
      mockScore >= 650 ? 'MEDIUM' :
      mockScore >= 550 ? 'HIGH' : 'CRITICAL'

    const creditScore = await prisma.creditScore.upsert({
      where: { userId: session.user.id },
      update: {
        score: mockScore,
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
        score: mockScore,
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
    return NextResponse.json(
      { error: 'Failed to update credit score' },
      { status: 500 }
    )
  }
}
