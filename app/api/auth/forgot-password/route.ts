import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { EmailService } from '@/lib/email-service'

const emailService = new EmailService()

const RESET_TOKEN_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, password: true },
    })

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ success: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiry: expiresAt,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.nexrel.soshogle.com'
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`

    const sent = await emailService.sendEmail({
      to: user.email,
      subject: 'Reset your Soshogle AI CRM password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>Reset your password</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}" style="font-weight: bold; color: #9333ea;">Reset password</a></p>
          <p>This link expires in ${RESET_TOKEN_EXPIRY_HOURS} hour(s).</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>— Soshogle AI CRM</p>
        </div>
      `,
    })

    if (!sent) {
      console.error('Failed to send password reset email to', user.email)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
