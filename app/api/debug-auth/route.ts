import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || 'soshogle@gmail.com'
  
  try {
    // Test database connection
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        email: true, 
        name: true,
        password: true,
        accountStatus: true,
        role: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ 
        dbConnected: true, 
        userFound: false,
        email 
      })
    }

    // Test password
    const testPassword = 'Soshogle2024!'
    const passwordMatch = user.password ? await bcrypt.compare(testPassword, user.password) : false
    
    return NextResponse.json({
      dbConnected: true,
      userFound: true,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      accountStatus: user.accountStatus,
      role: user.role,
      passwordTestResult: passwordMatch
    })
  } catch (error: any) {
    return NextResponse.json({
      dbConnected: false,
      error: error.message,
      errorCode: error.code
    }, { status: 500 })
  }
}
