/**
 * Dental Workflow Templates API
 * Returns role-specific workflow templates for dental practices
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DENTAL_WORKFLOW_TEMPLATES } from '@/lib/dental/workflow-extensions';
import { getUserDentalRole } from '@/lib/dental/role-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/workflows/templates - Get workflow templates for user's role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'practitioner' | 'admin_assistant' | 'practice_owner' | 'hybrid' | null;
    
    // Get user's dental role
    const userRole = role || getUserDentalRole(session.user.role || undefined, session.user);
    
    // Determine which templates to return
    let templates: any[] = [];
    
    if (userRole === 'practitioner') {
      templates = DENTAL_WORKFLOW_TEMPLATES.clinical;
    } else if (userRole === 'admin_assistant') {
      templates = [
        ...DENTAL_WORKFLOW_TEMPLATES.admin,
        ...DENTAL_WORKFLOW_TEMPLATES.calls, // Admin handles calls
      ];
    } else if (userRole === 'practice_owner' || userRole === 'hybrid') {
      // Return all templates
      templates = [
        ...DENTAL_WORKFLOW_TEMPLATES.clinical,
        ...DENTAL_WORKFLOW_TEMPLATES.admin,
        ...DENTAL_WORKFLOW_TEMPLATES.calls,
      ];
    }

    return NextResponse.json({
      success: true,
      role: userRole,
      templates: templates.map((template, index) => {
        // Determine category based on which array it came from
        let category: 'clinical' | 'admin' | 'calls' = 'admin';
        if (DENTAL_WORKFLOW_TEMPLATES.clinical.includes(template as any)) {
          category = 'clinical';
        } else if (DENTAL_WORKFLOW_TEMPLATES.calls.includes(template as any)) {
          category = 'calls';
        }
        
        return {
          id: `dental-template-${index}`,
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          actions: template.actions,
          category,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching dental workflow templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
}
