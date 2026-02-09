/**
 * AI Website Modification API
 * Processes chat messages and generates website changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { changeApproval } from '@/lib/website-builder/approval';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, message } = body;

    if (!websiteId || !message) {
      return NextResponse.json(
        { error: 'Website ID and message are required' },
        { status: 400 }
      );
    }

    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // TODO: Use AI to interpret the message and generate changes
    // For now, create a placeholder change structure
    const changes = await generateChangesFromMessage(message, website.structure as any);

    // Generate preview
    const preview = changeApproval.generatePreview(
      website.structure as any,
      changes
    );

    // Create approval request
    const approval = await prisma.websiteChangeApproval.create({
      data: {
        websiteId,
        changeType: 'AI_MODIFICATION',
        changes: changes as any,
        preview: preview as any,
        status: 'PENDING',
        requestedBy: session.user.id,
      },
    });

    // Update website with pending changes
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        pendingChanges: {
          approvalId: approval.id,
          changes,
          preview,
        },
      },
    });

    return NextResponse.json({
      success: true,
      approvalId: approval.id,
      changes,
      preview,
    });
  } catch (error: any) {
    console.error('Error processing modification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process modification' },
      { status: 500 }
    );
  }
}

/**
 * Generate changes from user message using AI
 * TODO: Integrate with OpenAI/Claude to interpret natural language
 */
async function generateChangesFromMessage(
  message: string,
  currentStructure: any
): Promise<any[]> {
  // This is a placeholder - should use AI to interpret the message
  // For now, return a simple change structure
  
  const changes: any[] = [];
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching (will be replaced with AI)
  if (lowerMessage.includes('header') && lowerMessage.includes('color')) {
    const colorMatch = message.match(/(?:color|colour)\s+(?:to\s+)?([a-z]+)/i);
    const color = colorMatch ? colorMatch[1] : 'blue';
    
    changes.push({
      type: 'update',
      path: 'globalStyles.colors.primary',
      data: `#${getColorHex(color)}`,
    });
  }

  if (lowerMessage.includes('add') && lowerMessage.includes('form')) {
    changes.push({
      type: 'add',
      path: 'pages[0].components',
      data: {
        id: `form-${Date.now()}`,
        type: 'ContactForm',
        props: {
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true },
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'message', type: 'textarea', label: 'Message', required: true },
          ],
        },
      },
    });
  }

  if (lowerMessage.includes('change') && lowerMessage.includes('title')) {
    const titleMatch = message.match(/title\s+(?:to\s+)?["']?([^"']+)["']?/i);
    const newTitle = titleMatch ? titleMatch[1] : 'New Title';
    
    changes.push({
      type: 'update',
      path: 'pages[0].seo.title',
      data: newTitle,
    });
  }

  // If no specific changes detected, return a generic update
  if (changes.length === 0) {
    changes.push({
      type: 'update',
      path: 'pages[0].components[0].props',
      data: {
        note: 'AI modification requested',
        originalMessage: message,
      },
    });
  }

  return changes;
}

/**
 * Convert color name to hex (simple mapping)
 */
function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    blue: '3B82F6',
    red: 'EF4444',
    green: '10B981',
    yellow: 'F59E0B',
    purple: '8B5CF6',
    pink: 'EC4899',
    orange: 'F97316',
    black: '000000',
    white: 'FFFFFF',
    gray: '6B7280',
    grey: '6B7280',
  };
  
  return colors[colorName.toLowerCase()] || '3B82F6';
}
