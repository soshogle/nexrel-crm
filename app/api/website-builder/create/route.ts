/**
 * Create Website API Endpoint
 * Handles website creation flow (rebuild or new)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteScraper } from '@/lib/website-builder/scraper';
import { websiteBuilder } from '@/lib/website-builder/builder';
import { resourceProvisioning } from '@/lib/website-builder/provisioning';
import { websiteVoiceAI } from '@/lib/website-builder/voice-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type, // 'REBUILT' | 'SERVICE_TEMPLATE' | 'PRODUCT_TEMPLATE'
      sourceUrl, // Required if type is 'REBUILT'
      templateType, // 'SERVICE' | 'PRODUCT' - Required if type is template
      templateId, // Optional: specific template ID to use
      questionnaireAnswers, // Required if type is template
      enableVoiceAI = false,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (type === 'REBUILT' && !sourceUrl) {
      return NextResponse.json(
        { error: 'Source URL is required for rebuilt websites' },
        { status: 400 }
      );
    }

    if ((type === 'SERVICE_TEMPLATE' || type === 'PRODUCT_TEMPLATE') && !templateType) {
      return NextResponse.json(
        { error: 'Template type is required for template-based websites' },
        { status: 400 }
      );
    }

    // Process website build
    const buildConfig = {
      type,
      sourceUrl,
      templateType,
      templateId, // Include templateId in config
      questionnaireAnswers,
      enableVoiceAI,
    };

    // Create website record
    const website = await prisma.website.create({
      data: {
        userId: session.user.id,
        name,
        type: type as any,
        sourceUrl: type === 'REBUILT' ? sourceUrl : null,
        templateType: templateType as any,
        status: 'BUILDING',
        buildProgress: 0,
        structure: {},
        seoData: {},
        questionnaireAnswers: questionnaireAnswers || null,
        voiceAIEnabled: enableVoiceAI,
      },
    });

    // Create build record
    const build = await prisma.websiteBuild.create({
      data: {
        websiteId: website.id,
        buildType: 'INITIAL',
        status: 'IN_PROGRESS',
        progress: 0,
        sourceUrl: sourceUrl || null,
      },
    });

    // Start build process asynchronously
    processWebsiteBuild(website.id, build.id, buildConfig).catch(error => {
      console.error('Website build failed:', error);
      // Update build status to failed
      prisma.websiteBuild.update({
        where: { id: build.id },
        data: { status: 'FAILED', error: error.message },
      });
      prisma.website.update({
        where: { id: website.id },
        data: { status: 'FAILED' },
      });
    });

    return NextResponse.json({
      success: true,
      website: {
        id: website.id,
        name: website.name,
        status: website.status,
        buildProgress: website.buildProgress,
      },
      buildId: build.id,
    });
  } catch (error: any) {
    console.error('Website creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create website' },
      { status: 500 }
    );
  }
}

/**
 * Process website build asynchronously
 */
async function processWebsiteBuild(
  websiteId: string,
  buildId: string,
  config: {
    type: string;
    sourceUrl?: string;
    templateType?: string;
    templateId?: string;
    questionnaireAnswers?: any;
    enableVoiceAI: boolean;
  }
) {
  try {
    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 10 },
    });

    let structure: any;
    let seoData: any;
    let extractedData: any = null;

    if (config.type === 'REBUILT') {
      // Scrape existing website
      await prisma.websiteBuild.update({
        where: { id: buildId },
        data: { progress: 20 },
      });

      const scrapedData = await websiteScraper.scrapeWebsite(config.sourceUrl!);
      extractedData = scrapedData;

      // Convert scraped data to website structure
      structure = convertScrapedToStructure(scrapedData);
      seoData = scrapedData.seo;
    } else {
      // Build from template
      await prisma.websiteBuild.update({
        where: { id: buildId },
        data: { progress: 30 },
      });

      structure = await websiteBuilder.buildFromQuestionnaire(
        config.questionnaireAnswers!,
        config.templateType as any,
        config.templateId // Pass templateId if provided
      );
      seoData = structure.pages[0]?.seo || {};
    }

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 50 },
    });

    // Provision resources (GitHub, Neon, Vercel)
    const provisioningResult = await resourceProvisioning.provisionResources(
      websiteId,
      `website-${websiteId}`,
      (await prisma.website.findUnique({ where: { id: websiteId } }))!.userId
    );

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 70 },
    });

    // Create voice AI agent if enabled
    let voiceAIConfig = null;
    if (config.enableVoiceAI) {
      const website = await prisma.website.findUnique({ where: { id: websiteId } });
      const businessInfo = config.questionnaireAnswers || {
        businessName: website!.name,
        businessDescription: '',
      };
      
      voiceAIConfig = await websiteVoiceAI.createVoiceAIAgent(
        websiteId,
        website!.name,
        website!.userId,
        businessInfo
      );
    }

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 90 },
    });

    // Update website with final data
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        structure,
        seoData,
        extractedData,
        status: 'READY',
        buildProgress: 100,
        githubRepoUrl: provisioningResult.githubRepoUrl,
        neonDatabaseUrl: provisioningResult.neonDatabaseUrl,
        vercelProjectId: provisioningResult.vercelProjectId,
        vercelDeploymentUrl: provisioningResult.vercelDeploymentUrl,
        elevenLabsAgentId: voiceAIConfig?.agentId || null,
        voiceAIConfig: voiceAIConfig || null,
      },
    });

    // Mark build as completed
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Build process error:', error);
    throw error;
  }
}

/**
 * Convert scraped data to website structure
 */
function convertScrapedToStructure(scrapedData: any): any {
  // TODO: Implement conversion logic
  // This would convert scraped HTML/structure into our component-based format
  return {
    pages: [
      {
        id: 'home',
        name: 'Home',
        path: '/',
        components: [],
        seo: scrapedData.seo,
      },
    ],
    globalStyles: {
      colors: {
        primary: scrapedData.styles?.colors?.[0] || '#3B82F6',
        secondary: scrapedData.styles?.colors?.[1] || '#1E40AF',
        accent: scrapedData.styles?.colors?.[2] || '#60A5FA',
        background: '#FFFFFF',
        text: '#1F2937',
      },
      fonts: {
        heading: scrapedData.styles?.fonts?.[0] || 'Inter, sans-serif',
        body: scrapedData.styles?.fonts?.[0] || 'Inter, sans-serif',
      },
      spacing: { unit: 8 },
    },
    navigation: { items: [], style: 'horizontal' },
    footer: { sections: [], copyright: '' },
  };
}
