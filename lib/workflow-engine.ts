
/**
 * Workflow Execution Engine
 * 
 * This service executes workflow actions when triggers are fired.
 * It handles action execution, delays, conditional logic, and error handling.
 */

import { prisma } from './db';
import { workflowJobQueue } from './workflow-job-queue';
import { conditionEvaluator, type ConditionalBranch } from './workflow-conditions';
import { executeDentalAction } from './dental/workflow-actions';
import { multiChannelOrchestrator } from './workflow-multi-channel';
import { GmailService } from './messaging-sync/gmail-service';
import { TwilioService } from './messaging-sync/twilio-service';
import { FacebookService } from './messaging-sync/facebook-service';
import { InstagramService } from './messaging-sync/instagram-service';
import { WhatsAppService } from './messaging-sync/whatsapp-service';
import { facebookMessengerService } from './facebook-messenger-service';
import type {
  Workflow,
  WorkflowAction,
  WorkflowEnrollment,
  WorkflowActionExecution,
  Lead,
  Deal,
  ConversationMessage,
} from '@prisma/client';

export interface ExecutionContext {
  userId: string;
  leadId?: string;
  dealId?: string;
  conversationId?: string;
  messageId?: string;
  variables?: Record<string, any>;
}

export class WorkflowEngine {
  /**
   * Trigger a workflow based on event type
   */
  async triggerWorkflow(
    triggerType: string,
    context: ExecutionContext,
    triggerData?: any
  ): Promise<void> {
    try {
      // Find active workflows matching this trigger
      const workflows = await prisma.workflow.findMany({
        where: {
          userId: context.userId,
          status: 'ACTIVE',
          triggerType: triggerType as any,
        },
        include: {
          actions: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      // Execute each matching workflow
      for (const workflow of workflows) {
        // Check if trigger conditions are met
        if (this.shouldExecuteWorkflow(workflow, context, triggerData)) {
          await this.enrollAndExecute(workflow, context);
        }
      }
    } catch (error) {
      console.error('Workflow trigger failed:', error);
    }
  }

  /**
   * Check if workflow trigger conditions are met
   */
  private shouldExecuteWorkflow(
    workflow: Workflow,
    context: ExecutionContext,
    triggerData?: any
  ): boolean {
    const config = workflow.triggerConfig as any;

    // Check channel type filter (if specified)
    // If channelTypes is specified, workflow only runs for those channels
    // If not specified, workflow runs for all channels (default behavior)
    if (config?.channelTypes && Array.isArray(config.channelTypes) && config.channelTypes.length > 0) {
      const messageChannelType = context.variables?.channelType;
      if (!messageChannelType) {
        // If no channel type in context, skip channel filtering (for non-message triggers)
        // But for message triggers, we need channel type
        if (workflow.triggerType === 'MESSAGE_RECEIVED' || workflow.triggerType === 'MESSAGE_WITH_KEYWORDS') {
          return false; // Message triggers require channel type
        }
      } else {
        // Check if message channel matches allowed channels
        const allowedChannels = config.channelTypes.map((ch: string) => ch.toUpperCase());
        if (!allowedChannels.includes(messageChannelType.toUpperCase())) {
          return false; // Channel doesn't match filter
        }
      }
    }

    switch (workflow.triggerType) {
      case 'MESSAGE_WITH_KEYWORDS':
        return this.checkKeywords(triggerData?.messageContent, config?.keywords);
      
      case 'LEAD_STATUS_CHANGED':
        return config?.toStatus ? triggerData?.newStatus === config.toStatus : true;
      
      case 'DEAL_STAGE_CHANGED':
        return config?.toStageId ? triggerData?.newStageId === config.toStageId : true;
      
      default:
        return true; // Execute for simple triggers
    }
  }

  /**
   * Check if message contains keywords
   */
  private checkKeywords(messageContent?: string, keywords?: string[]): boolean {
    if (!messageContent || !keywords?.length) return false;
    
    const lowerContent = messageContent.toLowerCase();
    return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
  }

  /**
   * Enroll entity in workflow and execute actions
   */
  private async enrollAndExecute(
    workflow: Workflow & { actions: WorkflowAction[] },
    context: ExecutionContext
  ): Promise<void> {
    try {
      // Create enrollment
      const enrollment = await prisma.workflowEnrollment.create({
        data: {
          workflowId: workflow.id,
          userId: context.userId,
          leadId: context.leadId,
          dealId: context.dealId,
          status: 'ACTIVE',
        },
      });

      // Execute actions sequentially
      for (const action of workflow.actions) {
        await this.executeAction(action, enrollment, context);
      }

      // Mark enrollment as completed
      await prisma.workflowEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a single workflow action (public for job queue access)
   */
  async executeAction(
    action: WorkflowAction,
    enrollment: WorkflowEnrollment,
    context: ExecutionContext
  ): Promise<any> {
    try {
      // Handle delay if specified - use job queue for production
      if (action.delayMinutes && action.delayMinutes > 0) {
        await workflowJobQueue.scheduleAction(
          enrollment.id,
          action.id,
          action.delayMinutes
        );
        return { action: 'scheduled', delayMinutes: action.delayMinutes };
      }

      // Execute the action based on type
      const result = await this.executeActionByType(action, context, enrollment);

      // Handle conditional branching
      if (action.type === 'CONDITIONAL_SPLIT') {
        return await this.handleConditionalSplit(action, enrollment, context, result);
      }

      return result;
    } catch (error: any) {
      console.error('Action execution failed:', error);
      throw error;
    }
  }

  /**
   * Handle conditional split logic
   */
  private async handleConditionalSplit(
    action: WorkflowAction,
    enrollment: WorkflowEnrollment,
    context: ExecutionContext,
    evaluationData: any
  ): Promise<any> {
    const branch = action.actionConfig as unknown as ConditionalBranch;
    
    // Get lead/deal data for condition evaluation
    const data = await this.getContextData(context);
    
    // Evaluate conditions
    const branchPath = conditionEvaluator.getBranchPath(branch, data);
    
    // Get child actions to execute based on branch
    const actionsToExecute = branchPath === 'true' 
      ? await prisma.workflowAction.findMany({
          where: { id: { in: branch.trueActions } },
          orderBy: { displayOrder: 'asc' },
        })
      : await prisma.workflowAction.findMany({
          where: { id: { in: branch.falseActions } },
          orderBy: { displayOrder: 'asc' },
        });
    
    // Execute branch actions
    for (const childAction of actionsToExecute) {
      await this.executeAction(childAction, enrollment, context);
    }
    
    return { branch: branchPath, actionsExecuted: actionsToExecute.length };
  }

  /**
   * Get context data for condition evaluation
   */
  private async getContextData(context: ExecutionContext): Promise<any> {
    const data: any = { ...context.variables };
    
    if (context.leadId) {
      data.lead = await prisma.lead.findUnique({ where: { id: context.leadId } });
    }
    
    if (context.dealId) {
      data.deal = await prisma.deal.findUnique({ where: { id: context.dealId } });
    }
    
    return data;
  }

  /**
   * Execute action based on its type
   */
  private async executeActionByType(
    action: WorkflowAction,
    context: ExecutionContext,
    enrollment?: WorkflowEnrollment
  ): Promise<any> {
    const config = action.actionConfig as any;
    const actionType = action.type as string;

    switch (actionType) {
      case 'CONDITIONAL_SPLIT':
        // This is handled in executeAction
        return { action: 'conditional_evaluated' };
      
      case 'AI_GENERATE_MESSAGE':
        return this.aiGenerateMessage(context, config);
      
      case 'AI_SCORE_LEAD':
        return this.aiScoreLead(context, config);
      
      case 'WEBHOOK':
        return this.sendWebhook(context, config);
      
      case 'CREATE_LEAD_FROM_MESSAGE':
        return this.createLeadFromMessage(context, config);
      
      case 'CREATE_DEAL_FROM_LEAD':
        return this.createDealFromLead(context, config);
      
      case 'AUTO_REPLY':
      case 'SEND_MESSAGE':
        return this.sendMessage(context, config);
      
      case 'SEND_SMS':
        return this.sendSMS(context, config);
      
      case 'SEND_EMAIL':
        return this.sendEmail(context, config);
      
      case 'UPDATE_LEAD':
        return this.updateLead(context, config);
      
      case 'CHANGE_LEAD_STATUS':
        return this.changeLeadStatus(context, config);
      
      case 'UPDATE_DEAL':
        return this.updateDeal(context, config);
      
      case 'MOVE_DEAL_STAGE':
        return this.moveDealStage(context, config);
      
      // Dental-specific actions (Clinical)
      case 'CREATE_TREATMENT_PLAN':
      case 'UPDATE_ODONTOGRAM':
      case 'SCHEDULE_FOLLOWUP_APPOINTMENT':
      case 'SEND_TREATMENT_UPDATE_TO_PATIENT':
      case 'CREATE_CLINICAL_NOTE':
      case 'REQUEST_XRAY_REVIEW':
      case 'GENERATE_TREATMENT_REPORT':
      case 'UPDATE_TREATMENT_PLAN':
      case 'LOG_PROCEDURE':
      // Dental-specific actions (Admin)
      case 'SEND_APPOINTMENT_REMINDER':
      case 'PROCESS_PAYMENT':
      case 'SUBMIT_INSURANCE_CLAIM':
      case 'GENERATE_INVOICE':
      case 'UPDATE_PATIENT_INFO':
      case 'CREATE_LAB_ORDER':
      case 'GENERATE_PRODUCTION_REPORT':
      case 'NOTIFY_TEAM_MEMBER':
      case 'RESCHEDULE_APPOINTMENT':
      case 'SEND_BILLING_REMINDER':
      case 'UPDATE_APPOINTMENT_STATUS':
      // Legacy dental actions (for backward compatibility)
      case 'DENTAL_SEND_APPOINTMENT_REMINDER':
      case 'DENTAL_SEND_TREATMENT_PLAN_NOTIFICATION':
      case 'DENTAL_SEND_XRAY_NOTIFICATION':
      case 'DENTAL_CREATE_FOLLOWUP_APPOINTMENT':
      case 'DENTAL_SEND_INSURANCE_VERIFICATION_REQUEST':
      case 'DENTAL_SEND_PAYMENT_REMINDER':
      case 'DENTAL_CREATE_TREATMENT_TASK':
      case 'DENTAL_SEND_POST_VISIT_FOLLOWUP':
      case 'DENTAL_UPDATE_PATIENT_STATUS':
        return this.executeDentalAction(action, context, enrollment);
      
      case 'CREATE_TASK':
        return this.createTask(context, config);
      
      case 'NOTIFY_USER':
        return this.notifyUser(context, config);
      
      case 'ADD_TAG':
        return this.addTag(context, config);
      
      case 'WAIT_DELAY':
        return { action: 'wait', duration: config.minutes };
      
      case 'MAKE_OUTBOUND_CALL':
        return this.makeOutboundCall(context, config);
      
      default:
        console.warn(`Unknown action type: ${action.type}`);
        return { action: action.type, status: 'skipped' };
    }
  }

  /**
   * Create lead from message
   */
  private async createLeadFromMessage(context: ExecutionContext, config: any) {
    if (!context.conversationId) {
      throw new Error('No conversation found for lead creation');
    }

    // Get conversation details
    const conversation = await prisma.conversation.findUnique({
      where: { id: context.conversationId },
      include: { channelConnection: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if lead already exists for this contact
    const existingLead = await prisma.lead.findFirst({
      where: {
        userId: context.userId,
        OR: [
          { phone: conversation.contactIdentifier },
          { email: conversation.contactIdentifier },
        ],
      },
    });

    if (existingLead) {
      // Link conversation to existing lead
      await prisma.conversation.update({
        where: { id: context.conversationId },
        data: { leadId: existingLead.id },
      });
      return { leadId: existingLead.id, action: 'linked_existing' };
    }

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        userId: context.userId,
        businessName: conversation.contactName,
        contactPerson: conversation.contactName,
        status: config.status || 'NEW',
        source: config.source || 'messaging',
        phone: conversation.channelConnection.channelType === 'SMS' || conversation.channelConnection.channelType === 'WHATSAPP'
          ? conversation.contactIdentifier
          : undefined,
        email: conversation.channelConnection.channelType === 'EMAIL'
          ? conversation.contactIdentifier
          : undefined,
      },
    });

    // Link conversation to new lead
    await prisma.conversation.update({
      where: { id: context.conversationId },
      data: { leadId: lead.id },
    });

    return { leadId: lead.id, action: 'created' };
  }

  /**
   * Create deal from lead
   */
  private async createDealFromLead(context: ExecutionContext, config: any) {
    if (!context.leadId) {
      throw new Error('No lead found for deal creation');
    }

    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get default pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        userId: context.userId,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: { displayOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (!pipeline || !pipeline.stages[0]) {
      throw new Error('No default pipeline found');
    }

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        userId: context.userId,
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        leadId: lead.id,
        title: this.replaceVariables(config.title || '{{businessName}} - New Deal', lead),
        description: config.description,
        priority: config.priority || 'MEDIUM',
        value: config.value || 0,
      },
    });

    // Create activity
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId: context.userId,
        type: 'CREATED',
        description: 'Deal created automatically by workflow',
      },
    });

    return { dealId: deal.id, action: 'created' };
  }

  /**
   * Send message via conversation
   */
  private async sendMessage(context: ExecutionContext, config: any) {
    if (!context.conversationId) {
      throw new Error('No conversation found');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: context.conversationId },
      include: { 
        lead: true,
        channelConnection: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.channelConnection) {
      throw new Error('No channel connection found for conversation');
    }

    const message = this.replaceVariables(config.message, conversation.lead || {});
    const connection = conversation.channelConnection;
    let externalMessageId: string | undefined;

    // Create message record first (will be updated after sending)
    const conversationMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: context.conversationId,
        userId: context.userId,
        direction: 'OUTBOUND',
        status: 'PENDING',
        content: message,
      },
    });

    // Route to appropriate service based on channel type
    try {
      switch (connection.channelType) {
        case 'EMAIL':
          if (!connection.accessToken) {
            throw new Error('No access token for email');
          }
          const gmailService = new GmailService(
            connection.accessToken,
            connection.refreshToken || undefined
          );
          const threadId = conversation.metadata as any;
          externalMessageId = await gmailService.sendEmail({
            to: conversation.contactIdentifier,
            subject: config.subject || 'Re: Previous conversation',
            body: message,
            threadId: threadId?.threadId,
          });
          break;

        case 'SMS':
          const providerData = connection.providerData as any;
          if (!providerData?.accountSid || !providerData?.authToken) {
            throw new Error('Missing Twilio credentials');
          }
          if (!connection.channelIdentifier) {
            throw new Error('Missing channel identifier for SMS');
          }
          const twilioService = new TwilioService(
            providerData.accountSid,
            providerData.authToken,
            connection.channelIdentifier
          );
          externalMessageId = await twilioService.sendSMS({
            to: conversation.contactIdentifier,
            body: message,
          });
          break;

        case 'FACEBOOK_MESSENGER':
          if (!connection.accessToken) {
            throw new Error('No access token for Facebook');
          }
          // Use the new messenger service for direct messenger integration
          if (connection.channelIdentifier && conversation.contactIdentifier) {
            const result = await facebookMessengerService.sendMessage({
              pageId: connection.channelIdentifier,
              recipientId: conversation.contactIdentifier,
              message,
              accessToken: connection.accessToken,
            });
            if (!result.success) {
              throw new Error(result.error || 'Failed to send Messenger message');
            }
            externalMessageId = result.messageId;
          } else {
            // Fallback to old Facebook service if needed
            const facebookService = new FacebookService(
              connection.accessToken,
              connection.providerAccountId!
            );
            externalMessageId = await facebookService.sendMessage({
              recipientId: conversation.contactIdentifier,
              message,
            });
          }
          break;

        case 'INSTAGRAM':
          if (!connection.accessToken) {
            throw new Error('No access token for Instagram');
          }
          const instagramService = new InstagramService(
            connection.accessToken,
            connection.providerAccountId!
          );
          externalMessageId = await instagramService.sendMessage({
            recipientId: conversation.contactIdentifier,
            message,
          });
          break;

        case 'WHATSAPP':
          if (!connection.accessToken) {
            throw new Error('No access token for WhatsApp');
          }
          const whatsappProviderData = connection.providerData as any;
          const whatsappService = new WhatsAppService(
            connection.accessToken,
            connection.providerAccountId!,
            whatsappProviderData?.businessAccountId
          );
          externalMessageId = await whatsappService.sendMessage({
            to: conversation.contactIdentifier,
            message,
          });
          break;

        default:
          throw new Error(`Unsupported channel type: ${connection.channelType}`);
      }

      // Update message record with external message ID and mark as sent
      await prisma.conversationMessage.update({
        where: { id: conversationMessage.id },
        data: {
          externalMessageId,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: context.conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message.substring(0, 100),
        },
      });

      return { messageId: conversationMessage.id, externalMessageId, action: 'sent' };
    } catch (error: any) {
      console.error(`Error sending message via ${connection.channelType}:`, error);
      
      // Update message record with error status
      await prisma.conversationMessage.update({
        where: { id: conversationMessage.id },
        data: {
          status: 'FAILED',
          providerData: {
            error: error.message,
          },
        },
      });

      throw new Error(`Failed to send message via ${connection.channelType}: ${error.message}`);
    }
  }

  /**
   * Send SMS
   */
  private async sendSMS(context: ExecutionContext, config: any) {
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
    }) : null;

    if (!lead?.phone) {
      throw new Error('No phone number found');
    }

    const message = this.replaceVariables(config.message, lead);

    // TODO: Integrate with Twilio
    console.log(`Would send SMS to ${lead.phone}: ${message}`);

    return { phone: lead.phone, action: 'sms_sent' };
  }

  /**
   * Send email
   */
  private async sendEmail(context: ExecutionContext, config: any) {
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
    }) : null;

    if (!lead?.email) {
      throw new Error('No email found');
    }

    const subject = this.replaceVariables(config.subject, lead);
    const message = this.replaceVariables(config.message, lead);

    // TODO: Integrate with email service
    console.log(`Would send email to ${lead.email}: ${subject}`);

    return { email: lead.email, action: 'email_sent' };
  }

  /**
   * Update lead
   */
  private async updateLead(context: ExecutionContext, config: any) {
    if (!context.leadId) {
      throw new Error('No lead to update');
    }

    const updateData: any = {};
    if (config.status) updateData.status = config.status;
    if (config.businessCategory) updateData.businessCategory = config.businessCategory;

    await prisma.lead.update({
      where: { id: context.leadId },
      data: updateData,
    });

    return { leadId: context.leadId, action: 'updated' };
  }

  /**
   * Change lead status
   */
  private async changeLeadStatus(context: ExecutionContext, config: any) {
    if (!context.leadId) {
      throw new Error('No lead to update');
    }

    await prisma.lead.update({
      where: { id: context.leadId },
      data: { status: config.status },
    });

    return { leadId: context.leadId, newStatus: config.status };
  }

  /**
   * Update deal
   */
  private async updateDeal(context: ExecutionContext, config: any) {
    if (!context.dealId) {
      throw new Error('No deal to update');
    }

    const updateData: any = {};
    if (config.value) updateData.value = config.value;
    if (config.priority) updateData.priority = config.priority;

    await prisma.deal.update({
      where: { id: context.dealId },
      data: updateData,
    });

    return { dealId: context.dealId, action: 'updated' };
  }

  /**
   * Move deal to different stage
   */
  private async moveDealStage(context: ExecutionContext, config: any) {
    if (!context.dealId) {
      throw new Error('No deal to move');
    }

    await prisma.deal.update({
      where: { id: context.dealId },
      data: { stageId: config.stageId },
    });

    // Create activity
    await prisma.dealActivity.create({
      data: {
        dealId: context.dealId,
        userId: context.userId,
        type: 'STAGE_CHANGED',
        description: 'Stage changed automatically by workflow',
      },
    });

    return { dealId: context.dealId, newStageId: config.stageId };
  }

  /**
   * Create task
   */
  private async createTask(context: ExecutionContext, config: any) {
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
    }) : null;

    const dueDate = config.dueInDays
      ? new Date(Date.now() + config.dueInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const task = await prisma.task.create({
      data: {
        userId: context.userId,
        title: this.replaceVariables(config.title, lead || {}),
        description: config.description,
        priority: config.priority || 'MEDIUM',
        dueDate,
        leadId: context.leadId,
        dealId: context.dealId,
      },
    });

    return { taskId: task.id, action: 'created' };
  }

  /**
   * Notify user
   */
  private async notifyUser(context: ExecutionContext, config: any) {
    // TODO: Implement notification system (email, push, in-app)
    console.log('Notification:', config.message);
    return { action: 'notified', message: config.message };
  }

  /**
   * Add tag
   */
  private async addTag(context: ExecutionContext, config: any) {
    // TODO: Implement tagging system
    console.log('Add tag:', config.tag);
    return { action: 'tagged', tag: config.tag };
  }

  /**
   * AI Generate Message
   */
  private async aiGenerateMessage(context: ExecutionContext, config: any): Promise<any> {
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
    }) : null;

    // Get user's language preference
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { language: true },
    });
    const userLanguage = user?.language || 'en';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate the message ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer le message UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar el mensaje SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成消息。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    const prompt = config.prompt || 'Generate a professional follow-up message';
    const tone = config.tone || 'professional';

    // Call AI API to generate message
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `${languageInstruction}\n\nYou are a ${tone} CRM assistant. Generate a brief, engaging message for: ${prompt}. Context: Lead name is ${lead?.contactPerson || 'the lead'}, business is ${lead?.businessName || 'their business'}.`
          }],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedMessage = data.choices?.[0]?.message?.content || 'Hello! Following up on our previous conversation.';

      return { message: generatedMessage, action: 'ai_generated' };
    } catch (error) {
      console.error('AI message generation failed:', error);
      return { message: 'Hello! Following up on our previous conversation.', action: 'fallback' };
    }
  }

  /**
   * AI Score Lead
   */
  private async aiScoreLead(context: ExecutionContext, config: any): Promise<any> {
    if (!context.leadId) {
      throw new Error('No lead to score');
    }

    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId },
      include: {
        conversations: {
          include: { messages: true },
        },
        deals: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Simple lead scoring based on engagement
    let score = 0;

    // Business category bonus
    if (lead.businessCategory) score += 10;

    // Website bonus
    if (lead.website) score += 10;

    // Contact info completeness
    if (lead.email) score += 15;
    if (lead.phone) score += 15;

    // Engagement scoring
    const totalMessages = lead.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    score += Math.min(totalMessages * 5, 30); // Max 30 points for engagement

    // Deal history
    score += lead.deals.length * 10;

    // Cap at 100
    score = Math.min(score, 100);

    // Create a note with the lead score
    await prisma.note.create({
      data: {
        userId: lead.userId,
        leadId: lead.id,
        content: `🎯 Lead Score: ${score}/100 (Auto-generated by workflow on ${new Date().toLocaleDateString()})`,
      },
    });

    return { leadId: lead.id, score, action: 'scored' };
  }

  /**
   * Send Webhook
   */
  private async sendWebhook(context: ExecutionContext, config: any): Promise<any> {
    const url = config.url;
    const method = config.method || 'POST';
    const payload = {
      ...config.payload,
      leadId: context.leadId,
      dealId: context.dealId,
      userId: context.userId,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      return {
        action: 'webhook_sent',
        status: response.status,
        success: response.ok,
      };
    } catch (error: any) {
      console.error('Webhook failed:', error);
      return {
        action: 'webhook_failed',
        error: error.message,
      };
    }
  }

  /**
   * Make outbound call via voice AI agent
   */
  private async makeOutboundCall(context: ExecutionContext, config: any): Promise<any> {
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
      include: { user: true },
    }) : null;

    if (!lead?.phone) {
      throw new Error('No phone number found for lead');
    }

    // Get default active voice agent for user
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: {
        userId: context.userId,
        status: 'ACTIVE',
        elevenLabsAgentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!voiceAgent) {
      throw new Error('No active voice agent found');
    }

    // Replace variables in purpose and notes
    const purpose = this.replaceVariables(config.purpose || 'Workflow call', lead);
    const notes = config.notes ? this.replaceVariables(config.notes, lead) : null;

    const contactName = lead.contactPerson || lead.businessName || 'Contact';
    
    // Create outbound call record
    const outboundCall = await prisma.outboundCall.create({
      data: {
        userId: context.userId,
        voiceAgentId: voiceAgent.id,
        leadId: lead.id,
        name: contactName,
        phoneNumber: lead.phone,
        status: config.immediate !== false ? 'IN_PROGRESS' : 'SCHEDULED',
        scheduledFor: config.scheduledFor ? new Date(config.scheduledFor) : undefined,
        purpose: purpose,
        notes: notes,
      },
    });

    // If immediate, initiate the call
    if (config.immediate !== false) {
      try {
        const { elevenLabsService } = await import('./elevenlabs');
        const callResult = await elevenLabsService.initiatePhoneCall(
          voiceAgent.elevenLabsAgentId!,
          lead.phone
        );

        // Create call log
        const callLog = await prisma.callLog.create({
          data: {
            userId: context.userId,
            voiceAgentId: voiceAgent.id,
            leadId: lead.id,
            direction: 'OUTBOUND',
            status: 'INITIATED',
            fromNumber: voiceAgent.twilioPhoneNumber || 'System',
            toNumber: lead.phone,
            elevenLabsConversationId: callResult.conversation_id || callResult.call_id || callResult.id || undefined,
          },
        });

        // Update outbound call
        await prisma.outboundCall.update({
          where: { id: outboundCall.id },
          data: {
            status: 'IN_PROGRESS',
            callLogId: callLog.id,
            attemptCount: 1,
            lastAttemptAt: new Date(),
          },
        });
      } catch (callError: any) {
        console.error('Error initiating call in workflow:', callError);
        await prisma.outboundCall.update({
          where: { id: outboundCall.id },
          data: { status: 'FAILED' },
        });
        throw new Error(`Failed to initiate call: ${callError.message}`);
      }
    }

    return {
      action: 'call_initiated',
      outboundCallId: outboundCall.id,
      phone: lead.phone,
      contactName: contactName,
    };
  }

  /**
   * Replace variables in text with actual values
   */
  private replaceVariables(text: string, data: any): string {
    if (!text) return '';
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      // Map common variable names to lead fields
      const mapping: Record<string, string> = {
        contactName: 'contactPerson',
        contactPerson: 'contactPerson',
        businessName: 'businessName',
        email: 'email',
        phone: 'phone',
        leadId: 'id',
      };
      
      const fieldName = mapping[key] || key;
      return data[fieldName] || match;
    });
  }

  /**
   * Execute dental-specific workflow action
   */
  private async executeDentalAction(
    action: WorkflowAction,
    context: ExecutionContext,
    enrollment?: WorkflowEnrollment
  ): Promise<any> {
    if (!enrollment) {
      throw new Error('Enrollment is required for dental actions');
    }
    // Convert context to match dental workflow actions ExecutionContext type
    const dentalContext = {
      userId: context.userId,
      leadId: context.leadId ?? null,
      dealId: context.dealId ?? null,
      variables: context.variables || {},
    };
    return executeDentalAction(action, enrollment, dentalContext);
  }
}

export const workflowEngine = new WorkflowEngine();
