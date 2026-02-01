
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  workflowTemplates, 
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateCategories
} from '@/lib/workflow-templates';

/**
 * GET /api/workflows/templates
 * Retrieve workflow templates with optional filtering
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const templateId = searchParams.get('id');

    // Get specific template by ID
    if (templateId) {
      const template = getTemplateById(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template });
    }

    // Search templates
    if (search) {
      const results = searchTemplates(search);
      return NextResponse.json({ templates: results, count: results.length });
    }

    // Filter by category
    if (category) {
      const results = getTemplatesByCategory(category);
      return NextResponse.json({ templates: results, count: results.length });
    }

    // Return all templates
    return NextResponse.json({ 
      templates: workflowTemplates, 
      count: workflowTemplates.length,
      categories: getTemplateCategories()
    });

  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
