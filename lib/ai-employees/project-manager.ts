/**
 * Project Manager AI Employee
 * Creates projects, assigns teams, and manages tasks
 */

import { prisma } from '../db';
import { getCrmDb } from '@/lib/dal/db';
import { createDalContext } from '@/lib/context/industry-context';
import { aiOrchestrator } from '../ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';

interface ProjectInput {
  userId: string;
  customerId: string;
  projectData: {
    name: string;
    description?: string;
    serviceType?: string;
    budget?: number;
  };
  workflowId?: string;
}

interface ProjectOutput {
  jobId: string;
  projectId: string;
  projectName: string;
  tasksCreated: number;
  tasks: Array<{ id: string; title: string; priority: string; dueDate: Date | null }>;
  teamAssigned: string[];
  executionTime: number;
}

export class ProjectManager {
  async createProject(input: ProjectInput): Promise<ProjectOutput> {
    const { userId, customerId, projectData, workflowId } = input;
    const startTime = Date.now();

    // Create job
    const job = await aiOrchestrator.createJob({
      userId,
      employeeType: AIEmployeeType.PROJECT_MANAGER,
      jobType: 'project_creation',
      input: { customerId, projectData },
      workflowId,
      estimatedTime: 45
    });

    try {
      await aiOrchestrator.startJob(job.id);

      // Step 1: Create project (40%)
      await aiOrchestrator.updateProgress(job.id, 40, 'Creating project...');
      const deal = await this.createProjectDeal(userId, customerId, projectData);

      // Step 2: Generate and assign tasks (70%)
      await aiOrchestrator.updateProgress(job.id, 70, 'Generating tasks...');
      const tasks = await this.generateProjectTasks(userId, deal.id, projectData);

      // Step 3: Assign team members (100%)
      await aiOrchestrator.updateProgress(job.id, 100, 'Assigning team...');
      const teamAssigned = await this.assignTeam(userId, deal.id, projectData);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      const output: ProjectOutput = {
        jobId: job.id,
        projectId: deal.id,
        projectName: deal.title,
        tasksCreated: tasks.length,
        tasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate })),
        teamAssigned,
        executionTime
      };

      await aiOrchestrator.completeJob(job.id, output);

      return output;

    } catch (error: any) {
      await aiOrchestrator.failJob(job.id, error.message);
      throw error;
    }
  }

  private async createProjectDeal(userId: string, customerId: string, projectData: any) {
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);

    // Get or create a default pipeline and stage
    let pipeline = await db.pipeline.findFirst({
      where: { userId },
      include: { stages: true }
    });

    if (!pipeline) {
      // Create default pipeline if none exists
      pipeline = await db.pipeline.create({
        data: {
          userId,
          name: 'Default Pipeline',
          stages: {
            create: [
              { name: 'Active', displayOrder: 0 }
            ]
          }
        },
        include: { stages: true }
      });
    }

    const deal = await db.deal.create({
      data: {
        userId,
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        leadId: customerId,
        title: projectData.name,
        description: projectData.description || `${projectData.serviceType} project`,
        value: projectData.budget || 0,
        priority: 'HIGH'
      }
    });

    console.log(`   ✓ Project created: ${deal.title}`);
    return deal;
  }

  private async generateProjectTasks(userId: string, dealId: string, projectData: any) {
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    const taskTemplates = [
      { title: 'Project Kickoff Meeting', priority: 'HIGH' as const },
      { title: 'Requirements Gathering', priority: 'HIGH' as const },
      { title: 'Design & Planning', priority: 'MEDIUM' as const },
      { title: 'Implementation', priority: 'MEDIUM' as const },
      { title: 'Quality Review', priority: 'MEDIUM' as const },
      { title: 'Client Review & Feedback', priority: 'HIGH' as const },
      { title: 'Final Delivery', priority: 'HIGH' as const }
    ];

    const tasks = [];
    
    for (const template of taskTemplates) {
      const task = await db.task.create({
        data: {
          userId,
          dealId: dealId,
          title: template.title,
          description: `${template.title} for ${projectData.name}`,
          status: 'TODO',
          priority: template.priority,
          dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000) // Random date within 2 weeks
        }
      });
      tasks.push(task);
    }

    console.log(`   ✓ Created ${tasks.length} project tasks`);
    return tasks;
  }

  private async assignTeam(userId: string, dealId: string, projectData: any): Promise<string[]> {
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);

    // Fetch REAL team members from database
    const teamMembers = await db.teamMember.findMany({
      where: { 
        userId,
        status: 'ACTIVE'
      },
      take: 5 // Get available team members
    });

    const assignedNames: string[] = [];

    if (teamMembers.length > 0) {
      // Assign the first available team member as the primary assignee
      const primaryAssignee = teamMembers[0];
      
      try {
        await db.deal.update({
          where: { id: dealId },
          data: {
            assignedToId: primaryAssignee.id
          }
        });
        assignedNames.push(`${primaryAssignee.name} (${primaryAssignee.role}) - Primary`);
        
        // List other team members as supporting
        for (let i = 1; i < teamMembers.length; i++) {
          assignedNames.push(`${teamMembers[i].name} (${teamMembers[i].role})`);
        }
        
        console.log(`   ✅ Team assigned from database: ${assignedNames.join(', ')}`);
      } catch (error) {
        console.log(`   ⚠️ Could not assign ${primaryAssignee.name} to deal`);
      }
    } else {
      // No team members configured - inform user
      console.log(`   ⚠️ No active team members found. Add team members in Team Management to auto-assign.`);
      assignedNames.push('No team members configured - add in Team Management');
    }

    return assignedNames;
  }
}

export const projectManager = new ProjectManager();
