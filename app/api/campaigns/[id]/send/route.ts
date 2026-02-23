import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { campaignService, getCrmDb } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { sendSMS } from '@/lib/twilio'
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// POST - Send SMS messages for campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    // Get campaign
    const campaign: any = await campaignService.findUnique(ctx, params.id, {
      campaignLeads: {
        where: { status: 'PENDING' },
        include: {
          lead: true,
        },
      },
    } as any)

    if (!campaign) {
      return apiErrors.notFound('Campaign not found')
    }

    if (campaign.campaignLeads.length === 0) {
      return apiErrors.badRequest('No pending leads to send messages to')
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Send SMS to each lead
    for (const campaignLead of campaign.campaignLeads) {
      const lead = campaignLead.lead

      if (!lead.phone) {
        await getCrmDb(ctx).campaignLead.update({
          where: { id: campaignLead.id },
          data: {
            status: 'FAILED',
            errorMessage: 'No phone number available',
          },
        })
        results.failed++
        results.errors.push(`${lead.businessName}: No phone number`)
        continue
      }

      try {
        // Personalize message
        const personalizedMessage = (campaign.smsTemplate || '')
          .replace(/\{businessName\}/g, lead.businessName || 'there')
          .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
          .replace(/\{reviewUrl\}/g, campaign.reviewUrl || '')
          .replace(/\{referralReward\}/g, campaign.referralReward || '')

        // Send SMS via Twilio
        const twilioResponse = await sendSMS(lead.phone, personalizedMessage)

        // Update campaign lead status
        await getCrmDb(ctx).campaignLead.update({
          where: { id: campaignLead.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            twilioSid: twilioResponse.sid,
          },
        })

        results.sent++
      } catch (error: any) {
        console.error(`Error sending SMS to ${lead.phone}:`, error)
        
        await getCrmDb(ctx).campaignLead.update({
          where: { id: campaignLead.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message || 'Failed to send SMS',
          },
        })

        results.failed++
        results.errors.push(`${lead.businessName}: ${error.message}`)
      }
    }

    // Update campaign status to ACTIVE if messages were sent
    if (results.sent > 0) {
      await campaignService.update(ctx, params.id, { status: 'ACTIVE' })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error sending campaign messages:', error)
    return apiErrors.internal('Failed to send campaign messages')
  }
}
