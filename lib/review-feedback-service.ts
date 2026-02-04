/**
 * Review Feedback Service
 * 
 * Automatically collects feedback after service completion to prevent negative reviews.
 * - Triggers immediately after appointment/service completion
 * - Sends SMS or initiates voice AI call to collect feedback
 * - Routes positive feedback to review requests
 * - Routes negative feedback to resolution offers (discounts, solutions)
 */

import { prisma } from './db';
import { elevenLabsService } from './elevenlabs';

export interface FeedbackRequest {
  leadId: string;
  userId: string;
  appointmentId?: string;
  serviceType?: string;
  preferredMethod?: 'SMS' | 'VOICE' | 'BOTH';
}

export interface FeedbackResponse {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  rating?: number;
  feedbackText?: string;
  resolutionOffered?: boolean;
  reviewRequested?: boolean;
}

export class ReviewFeedbackService {
  /**
   * Trigger feedback collection after service completion
   */
  async triggerFeedbackCollection(request: FeedbackRequest): Promise<void> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: request.leadId },
      });

      if (!lead) {
        console.error('Lead not found for feedback collection:', request.leadId);
        return;
      }

      // Check if feedback was already collected for this appointment
      if (request.appointmentId) {
        const existingFeedback = await prisma.feedbackCollection.findFirst({
          where: {
            appointmentId: request.appointmentId,
            userId: request.userId,
          },
        });

        if (existingFeedback) {
          console.log('Feedback already collected for appointment:', request.appointmentId);
          return;
        }
      }

      // Determine preferred method (default to SMS if phone available, otherwise voice)
      const method = request.preferredMethod || (lead.phone ? 'SMS' : 'VOICE');

      // Create feedback collection record
      const feedbackRecord = await prisma.feedbackCollection.create({
        data: {
          userId: request.userId,
          leadId: request.leadId,
          appointmentId: request.appointmentId,
          method: method === 'SMS' ? 'SMS' : 'VOICE',
          status: 'PENDING',
          triggeredAt: new Date(),
        },
      });

      // Send feedback request
      if (method === 'SMS' && lead.phone) {
        await this.sendFeedbackSMS(lead, feedbackRecord.id);
      } else if (method === 'VOICE' && lead.phone) {
        await this.initiateFeedbackCall(lead, feedbackRecord.id, request.userId);
      } else if (method === 'BOTH') {
        if (lead.phone) {
          await this.sendFeedbackSMS(lead, feedbackRecord.id);
          await this.initiateFeedbackCall(lead, feedbackRecord.id, request.userId);
        }
      }

      console.log('✅ Feedback collection triggered:', {
        leadId: request.leadId,
        appointmentId: request.appointmentId,
        method,
      });
    } catch (error) {
      console.error('Error triggering feedback collection:', error);
    }
  }

  /**
   * Send SMS feedback request
   */
  private async sendFeedbackSMS(lead: any, feedbackId: string): Promise<void> {
    try {
      const message = `Hi ${lead.contactPerson || lead.businessName}! We just completed your service and would love to hear your feedback. How was your experience? Reply with 1-5 stars and any comments.`;

      // Get the user ID from the feedback collection record
      const feedback = await prisma.feedbackCollection.findUnique({
        where: { id: feedbackId },
        select: { userId: true },
      });

      if (!feedback) {
        console.error('Feedback collection not found:', feedbackId);
        return;
      }

      // Use your SMS service here (Twilio, etc.)
      // For now, we'll create a message record
      await prisma.message.create({
        data: {
          userId: feedback.userId,
          leadId: lead.id,
          content: message,
          messageType: 'feedback_request',
        },
      });

      console.log('📱 Feedback SMS sent to:', lead.phone);
    } catch (error) {
      console.error('Error sending feedback SMS:', error);
    }
  }

  /**
   * Initiate voice AI call for feedback
   */
  private async initiateFeedbackCall(
    lead: any,
    feedbackId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get an active voice agent for the user
      const voiceAgent = await prisma.docpenVoiceAgent.findFirst({
        where: {
          userId,
          isActive: true,
        },
      });

      if (!voiceAgent) {
        console.warn('No active voice agent found for feedback call');
        return;
      }

      // Create outbound call record
      const outboundCall = await prisma.outboundCall.create({
        data: {
          userId,
          leadId: lead.id,
          voiceAgentId: voiceAgent.id,
          name: `Feedback Collection - ${lead.contactPerson || lead.businessName || 'Customer'}`,
          phoneNumber: lead.phone!,
          purpose: 'Collect service feedback',
          notes: `Automated feedback collection call after service completion. Ask about their experience and listen for positive or negative sentiment. Feedback Collection ID: ${feedbackId}`,
          status: 'SCHEDULED',
          scheduledFor: new Date(),
        },
      });

      // Initiate the call immediately
      if (!voiceAgent.elevenLabsAgentId) {
        console.warn('Voice agent does not have an ElevenLabs agent ID configured');
        return;
      }

      await elevenLabsService.initiatePhoneCall(
        voiceAgent.elevenLabsAgentId,
        lead.phone!
      );

      console.log('📞 Feedback call initiated to:', lead.phone);
    } catch (error) {
      console.error('Error initiating feedback call:', error);
    }
  }

  /**
   * Process feedback response (called from webhook or message handler)
   */
  async processFeedbackResponse(
    feedbackId: string,
    response: FeedbackResponse
  ): Promise<void> {
    try {
      const feedback = await prisma.feedbackCollection.findUnique({
        where: { id: feedbackId },
        include: { lead: true },
      });

      if (!feedback) {
        console.error('Feedback collection not found:', feedbackId);
        return;
      }

      // Update feedback record
      await prisma.feedbackCollection.update({
        where: { id: feedbackId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          sentiment: response.sentiment,
          rating: response.rating,
          feedbackText: response.feedbackText,
          metadata: {
            resolutionOffered: response.resolutionOffered,
            reviewRequested: response.reviewRequested,
          } as any,
        },
      });

      // Route based on sentiment
      if (response.sentiment === 'POSITIVE' && response.rating && response.rating >= 4) {
        // Encourage public review
        await this.requestPublicReview(feedback.lead, feedback.userId, response);
      } else if (response.sentiment === 'NEGATIVE' || (response.rating && response.rating <= 2)) {
        // Offer resolution
        await this.offerResolution(feedback.lead, feedback.userId, response);
      }

      console.log('✅ Feedback processed:', {
        feedbackId,
        sentiment: response.sentiment,
        rating: response.rating,
      });
    } catch (error) {
      console.error('Error processing feedback response:', error);
    }
  }

  /**
   * Request public review for positive feedback
   */
  private async requestPublicReview(
    lead: any,
    userId: string,
    feedback: FeedbackResponse
  ): Promise<void> {
    try {
      // Find or create a reviews campaign
      let campaign = await prisma.campaign.findFirst({
        where: {
          userId,
          name: 'Review Collection',
          type: 'REVIEW_REQUEST',
        },
      });

      if (!campaign) {
        campaign = await prisma.campaign.create({
          data: {
            userId,
            name: 'Review Collection',
            type: 'REVIEW_REQUEST',
            status: 'ACTIVE',
          },
        });
      }

      // Send review request message
      const reviewRequestMessage = `Thank you for the ${feedback.rating}-star feedback! We'd love it if you could share your experience publicly. Would you mind leaving us a review? [Review Link]`;

      await prisma.message.create({
        data: {
          userId,
          leadId: lead.id,
          content: reviewRequestMessage,
          messageType: 'review_request',
        },
      });

      console.log('⭐ Review request sent to:', lead.businessName);
    } catch (error) {
      console.error('Error requesting public review:', error);
    }
  }

  /**
   * Offer resolution for negative feedback
   */
  private async offerResolution(
    lead: any,
    userId: string,
    feedback: FeedbackResponse
  ): Promise<void> {
    try {
      // Send resolution offer message
      const resolutionMessage = `We're sorry to hear about your experience. We'd like to make it right! Please reply with what would help - we can offer a discount, refund, or another solution. Your feedback is valuable and we want to ensure your satisfaction.`;

      await prisma.message.create({
        data: {
          userId,
          leadId: lead.id,
          content: resolutionMessage,
          messageType: 'resolution_offer',
        },
      });

      // Create a task for follow-up
      await prisma.task.create({
        data: {
          userId,
          leadId: lead.id,
          title: `Follow up on negative feedback - ${lead.businessName}`,
          description: `Customer provided ${feedback.rating}-star feedback: ${feedback.feedbackText || 'No text provided'}. Resolution offer sent.`,
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'PENDING',
        },
      });

      console.log('🔧 Resolution offer sent to:', lead.businessName);
    } catch (error) {
      console.error('Error offering resolution:', error);
    }
  }
}

export const reviewFeedbackService = new ReviewFeedbackService();
