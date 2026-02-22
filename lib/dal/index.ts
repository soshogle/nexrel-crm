/**
 * Data Access Layer (DAL)
 * Phase 1: Foundation for Multi-DB Per-Industry architecture
 *
 * All CRM data access should go through these services.
 * Phase 1: single DB (current prisma)
 * Phase 3: routing by industry via getIndustryDb()
 */

export { getCrmDb } from './db';
export { leadService } from './lead-service';
export { dealService } from './deal-service';
export { campaignService } from './campaign-service';
export { websiteService } from './website-service';
export { taskService } from './task-service';
export { conversationService } from './conversation-service';
export { workflowTemplateService } from './workflow-template-service';
export { noteService } from './note-service';
export { messageService } from './message-service';
export type { DalContext, Industry } from './types';
