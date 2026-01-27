
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { aiResponseService } from '@/lib/ai-response-service';
import { workflowEngine } from '@/lib/workflow-engine';

/**
 * Webhook endpoint for incoming messages from all channels
 * This receives messages from Twilio, Facebook, Instagram, Email, etc.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      conversationId,
      channelType,
      contactName,
      contactIdentifier,
      messageContent,
      channelConnectionId,
    } = body;

    // Validate required fields
    if (!userId || !messageContent || !channelType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 10,
            },
          },
        })
      : null;

    if (!conversation && channelConnectionId && contactIdentifier) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId,
          channelConnectionId,
          contactName: contactName || contactIdentifier,
          contactIdentifier,
          status: 'ACTIVE',
          unreadCount: 1,
          lastMessageAt: new Date(),
          lastMessagePreview: messageContent.substring(0, 100),
        },
        include: {
          messages: true,
        },
      });
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Could not find or create conversation' },
        { status: 400 }
      );
    }

    // Store incoming message
    const incomingMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        direction: 'INBOUND',
        status: 'DELIVERED',
        content: messageContent,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: messageContent.substring(0, 100),
        unreadCount: { increment: 1 },
        status: 'UNREAD',
      },
    });

    // Trigger workflows for MESSAGE_RECEIVED
    workflowEngine.triggerWorkflow('MESSAGE_RECEIVED', {
      userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: conversation.contactName,
        messageContent,
        channelType,
      },
    }, {
      messageContent,
    }).catch(err => console.error('Workflow trigger failed:', err));

    // Trigger workflows for MESSAGE_WITH_KEYWORDS
    workflowEngine.triggerWorkflow('MESSAGE_WITH_KEYWORDS', {
      userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: conversation.contactName,
        messageContent,
        channelType,
      },
    }, {
      messageContent,
    }).catch(err => console.error('Keyword workflow trigger failed:', err));

    // Check if auto-reply is enabled
    const autoReplySettings = await prisma.autoReplySettings.findUnique({
      where: { userId },
    });

    if (!autoReplySettings || !autoReplySettings.isEnabled) {
      // Just acknowledge receipt, don't generate response
      return NextResponse.json({
        success: true,
        messageId: incomingMessage.id,
        autoReplyEnabled: false,
      });
    }

    // Check channel-specific settings
    const channelSettings = autoReplySettings.channelSettings as any;
    if (channelSettings && channelSettings[channelType]?.enabled === false) {
      return NextResponse.json({
        success: true,
        messageId: incomingMessage.id,
        autoReplyEnabled: false,
        reason: 'Channel auto-reply disabled',
      });
    }

    // Generate AI response
    try {
      const conversationHistory = conversation.messages?.map((msg: any) => ({
        role: msg.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
        timestamp: msg.sentAt,
      }));

      const aiResponse = await aiResponseService.generateResponse({
        conversationId: conversation.id,
        userId,
        incomingMessage: messageContent,
        contactName: conversation.contactName,
        channelType,
        conversationHistory,
      });

      // Save AI-generated response
      const responseMessage = await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          userId,
          direction: 'OUTBOUND',
          status: 'SENT',
          content: aiResponse.response,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // Message intelligence data stored in message providerData for future analysis
      await prisma.conversationMessage.update({
        where: { id: responseMessage.id },
        data: {
          providerData: {
            aiGenerated: true,
            confidence: aiResponse.confidence,
            sentiment: aiResponse.sentiment,
            intent: aiResponse.intent,
            needsHumanReview: aiResponse.needsHumanReview,
            escalationReason: aiResponse.escalationReason,
            detectedLanguage: aiResponse.detectedLanguage,
            keyTopics: aiResponse.keyTopics,
            suggestedActions: aiResponse.suggestedActions,
          },
        },
      });

      // Update conversation status if needs human review
      if (aiResponse.needsHumanReview) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'UNREAD',
            metadata: {
              needsHumanReview: true,
              escalationReason: aiResponse.escalationReason,
            },
          },
        });

        // Send notification if enabled
        if (autoReplySettings.notifyOnEscalation && autoReplySettings.notificationEmail) {
          // TODO: Send email notification
          console.log('Escalation notification needed for:', autoReplySettings.notificationEmail);
        }
      }

      // Here you would send the actual response via the appropriate channel
      // For now, we're just saving it to the database
      // In production, you'd call Twilio, Facebook API, etc. to send the message

      return NextResponse.json({
        success: true,
        messageId: incomingMessage.id,
        responseId: responseMessage.id,
        aiResponse: {
          content: aiResponse.response,
          needsHumanReview: aiResponse.needsHumanReview,
          confidence: aiResponse.confidence,
          sentiment: aiResponse.sentiment,
        },
      });
    } catch (aiError) {
      console.error('AI response generation failed:', aiError);
      
      // Mark conversation as needing human review
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'UNREAD',
          metadata: {
            needsHumanReview: true,
            escalationReason: 'AI generation failed',
          },
        },
      });

      return NextResponse.json({
        success: true,
        messageId: incomingMessage.id,
        autoReplyEnabled: true,
        autoReplyFailed: true,
        error: 'AI response generation failed, conversation flagged for human review',
      });
    }
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Failed to process incoming message' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Incoming message webhook endpoint',
    status: 'active',
  });
}
