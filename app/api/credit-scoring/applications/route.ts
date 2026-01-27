
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/credit-scoring/applications - List credit applications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const applications = await prisma.creditApplication.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        creditScore: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching credit applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

// POST /api/credit-scoring/applications - Submit a new credit application
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      applicationType,
      requestedAmount,
      purpose,
      annualIncome,
      employmentStatus,
      employerName,
      housingStatus,
      monthlyRent,
    } = body

    if (!applicationType || !requestedAmount) {
      return NextResponse.json(
        { error: 'Application type and requested amount are required' },
        { status: 400 }
      )
    }

    // Get current credit score
    const creditScore = await prisma.creditScore.findUnique({
      where: { userId: session.user.id },
    })

    // Simulate approval decision based on credit score
    const isApproved = creditScore && creditScore.score >= 600
    const approvedAmount = isApproved 
      ? Math.min(parseInt(requestedAmount), creditScore.creditLimit)
      : 0

    const application = await prisma.creditApplication.create({
      data: {
        userId: session.user.id,
        creditScoreId: creditScore?.id,
        applicationType,
        requestedAmount: parseInt(requestedAmount),
        purpose,
        annualIncome: annualIncome ? parseInt(annualIncome) : null,
        employmentStatus,
        employerName,
        housingStatus,
        monthlyRent: monthlyRent ? parseInt(monthlyRent) : null,
        status: 'UNDER_REVIEW',
        // Auto-decision (in real app, this would be manual review)
        decision: isApproved ? 'APPROVED' : 'NEEDS MANUAL REVIEW',
        decisionDate: new Date(),
        approvedAmount: isApproved ? approvedAmount : null,
        riskAssessment: {
          score: creditScore?.score || 0,
          riskLevel: creditScore?.riskLevel || 'UNKNOWN',
          factors: ['Credit score', 'Income', 'Employment status'],
        },
      },
      include: {
        creditScore: true,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error creating credit application:', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}
