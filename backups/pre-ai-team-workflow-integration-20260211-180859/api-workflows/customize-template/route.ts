
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTemplateById } from '@/lib/workflow-templates';

/**
 * POST /api/workflows/customize-template
 * AI-powered template customization
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, customization } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Use AI to customize the template based on user's business
    const llmApiKey = process.env.OPENAI_API_KEY;
    if (!llmApiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const customizationPrompt = `
You are a marketing automation expert helping customize a workflow template.

Template: ${template.name}
Description: ${template.description}
Variables to customize: ${template.variables.join(', ')}

User's business information:
${JSON.stringify(customization, null, 2)}

Task: Provide customized values for the template variables based on the user's business.
Return a JSON object with:
- customizedVariables: object with all template variables filled in
- suggestions: array of improvement suggestions
- estimatedPerformance: object with expected metrics

Be specific and actionable. Use the user's industry, products, and business goals.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a marketing automation specialist. Return valid JSON only.'
          },
          {
            role: 'user',
            content: customizationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error('AI customization failed');
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let customizedData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || 
                        aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      customizedData = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      customizedData = {
        customizedVariables: {},
        suggestions: ['Unable to generate customizations automatically. Please fill in variables manually.'],
        estimatedPerformance: {}
      };
    }

    // Merge customized variables with template
    const customizedTemplate = {
      ...template,
      customizedVariables: customizedData.customizedVariables || {},
      suggestions: customizedData.suggestions || [],
      estimatedPerformance: customizedData.estimatedPerformance || {}
    };

    return NextResponse.json({
      success: true,
      customizedTemplate,
      message: 'Template customized successfully'
    });

  } catch (error) {
    console.error('Error customizing template:', error);
    return NextResponse.json(
      { error: 'Failed to customize template' },
      { status: 500 }
    );
  }
}
