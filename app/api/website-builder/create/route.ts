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
import { seoAutomation } from '@/lib/website-builder/seo-automation';
import { googleSearchConsole } from '@/lib/website-builder/google-search-console';
import { buildQuestionnaireFromUser } from '@/lib/website-builder/prefill-from-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const internalSecret = request.headers.get('x-internal-secret');
    const internalUserId = body._internalUserId;
    const isInternalCall = internalSecret === process.env.NEXTAUTH_SECRET && internalUserId;

    let userId: string;
    if (isInternalCall) {
      userId = internalUserId;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    let {
      name,
      type, // 'REBUILT' | 'SERVICE_TEMPLATE' | 'PRODUCT_TEMPLATE'
      sourceUrl, // Required if type is 'REBUILT'
      templateType, // 'SERVICE' | 'PRODUCT' - Required if type is template
      templateId, // Optional: specific template ID to use
      questionnaireAnswers, // Required if type is template; can be pre-filled from user
      prefillFromUser, // If true and questionnaireAnswers empty, fill from onboarding/user
      enableVoiceAI = false,
      // Google Search Console credentials (optional)
      googleSearchConsoleAccessToken,
      googleSearchConsoleRefreshToken,
      googleSearchConsoleTokenExpiry,
      googleSearchConsoleSiteUrl,
    } = body;

    // Pre-fill questionnaire from user/onboarding when building from template
    if ((type === 'SERVICE_TEMPLATE' || type === 'PRODUCT_TEMPLATE') && prefillFromUser && !questionnaireAnswers?.businessName) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          website: true,
          businessDescription: true,
          legalEntityName: true,
          legalJurisdiction: true,
          companyLogoUrl: true,
          productsServices: true,
          targetAudience: true,
          industryNiche: true,
          businessCategory: true,
          operatingLocation: true,
        },
      });
      if (user) {
        questionnaireAnswers = buildQuestionnaireFromUser(user);
      }
    }

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

    // One website per profile: reject if user already has any website
    const existingCount = await prisma.website.count({
      where: { userId },
    });
    if (existingCount >= 1) {
      return NextResponse.json(
        { error: 'You already have a website. You can modify it from the Websites page.' },
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
        userId,
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
        // Google Search Console credentials (if provided)
        ...(googleSearchConsoleAccessToken && {
          googleSearchConsoleAccessToken,
          googleSearchConsoleRefreshToken: googleSearchConsoleRefreshToken || null,
          googleSearchConsoleTokenExpiry: googleSearchConsoleTokenExpiry
            ? new Date(googleSearchConsoleTokenExpiry)
            : null,
          googleSearchConsoleSiteUrl: googleSearchConsoleSiteUrl || null,
          googleSearchConsoleVerified: false, // Will be verified during build
        }),
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
    processWebsiteBuild(website.id, build.id, buildConfig).catch(async (error) => {
      console.error('Website build failed:', error);
      await Promise.all([
        prisma.websiteBuild.update({
          where: { id: build.id },
          data: { status: 'FAILED', error: error?.message || String(error) },
        }),
        prisma.website.update({
          where: { id: website.id },
          data: { status: 'FAILED', buildProgress: 0 },
        }),
      ]);
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
    const message = error?.message || error?.cause?.message || 'Failed to create website';
    return NextResponse.json(
      { error: String(message) },
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
    // Update progress (sync to Website so list page shows progress)
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 10 },
    });
    await prisma.website.update({
      where: { id: websiteId },
      data: { buildProgress: 10 },
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
      await prisma.website.update({
        where: { id: websiteId },
        data: { buildProgress: 20 },
      });

      // Get user ID for image storage
      const website = await prisma.website.findUnique({
        where: { id: websiteId },
        select: { userId: true, name: true },
      });

      // Scrape website - use Playwright for JS-rendered sites (SPAs, React, etc.)
      const downloadImages = process.env.ENABLE_IMAGE_DOWNLOAD === 'true';
      // Use Playwright for JS-rendered sites (SPAs, React, etc.). Set ENABLE_JS_SCRAPING=true to enable.
      const useJsRendering = process.env.ENABLE_JS_SCRAPING === 'true';
      console.log(`[Website Build] Scraping URL: ${config.sourceUrl} (JS rendering: ${useJsRendering})`);
      const scrapedData = await websiteScraper.scrapeWebsite(
        config.sourceUrl!,
        website?.userId,
        websiteId,
        downloadImages,
        useJsRendering
      );
      extractedData = scrapedData;
      console.log(`[Website Build] Scrape complete: ${scrapedData?.images?.length || 0} images, ${scrapedData?.forms?.length || 0} forms, ${scrapedData?.videos?.length || 0} videos`);

      // If template selected, merge scraped content into template; otherwise use scraped structure
      if (config.templateId) {
        const questionnaireFromScraped = buildQuestionnaireFromScraped(scrapedData, website?.name);
        structure = await websiteBuilder.buildFromTemplate(questionnaireFromScraped, config.templateId);
        console.log(`[Website Build] Using template ${config.templateId}: ${structure?.pages?.[0]?.components?.length || 0} sections`);
      } else {
        structure = convertScrapedToStructure(scrapedData);
        console.log(`[Website Build] Using scraped structure (no template): ${structure?.pages?.[0]?.components?.length || 0} sections`);
      }
      seoData = scrapedData.seo;
    } else {
      // Build from template
      await prisma.websiteBuild.update({
        where: { id: buildId },
        data: { progress: 30 },
      });
      await prisma.website.update({
        where: { id: websiteId },
        data: { buildProgress: 30 },
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
    await prisma.website.update({
      where: { id: websiteId },
      data: { buildProgress: 50 },
    });

    // Provision resources (GitHub, Neon, Vercel) - with 3min timeout to avoid stuck builds
    const provisioningResult = await Promise.race([
      resourceProvisioning.provisionResources(
        websiteId,
        `website-${websiteId}`,
        (await prisma.website.findUnique({ where: { id: websiteId } }))!.userId
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Provisioning timed out after 3 minutes')), 180000)
      ),
    ]);

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 70 },
    });
    await prisma.website.update({
      where: { id: websiteId },
      data: { buildProgress: 70 },
    });

    // Create voice AI agent if enabled (with timeout to avoid stuck builds)
    let voiceAIConfig = null;
    if (config.enableVoiceAI) {
      try {
        const website = await prisma.website.findUnique({ where: { id: websiteId } });
        const businessInfo = config.questionnaireAnswers || {
          businessName: website!.name,
          businessDescription: '',
        };
        voiceAIConfig = await Promise.race([
          websiteVoiceAI.createVoiceAIAgent(
            websiteId,
            website!.name,
            website!.userId,
            businessInfo
          ),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Voice AI setup timed out')), 60000)
          ),
        ]);
      } catch (e: any) {
        console.warn('Voice AI agent creation failed (continuing without):', e?.message || e);
      }
    }

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 85 },
    });
    await prisma.website.update({
      where: { id: websiteId },
      data: { buildProgress: 85 },
    });

    // Get website to access Google credentials
    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      throw new Error('Website not found');
    }

    // SEO Automation (if Google credentials are provided)
    let seoFiles: { sitemap?: string; robots?: string; structuredData?: any } = {};
    try {
      const questionnaireAnswers = config.questionnaireAnswers || {};
      const deploymentUrl = provisioningResult.vercelDeploymentUrl || `https://${website.name.toLowerCase().replace(/\s+/g, '-')}.com`;
      
      const seoConfig = {
        websiteUrl: deploymentUrl,
        businessName: questionnaireAnswers.businessName || website.name,
        businessDescription: questionnaireAnswers.businessDescription || '',
        contactEmail: questionnaireAnswers.contactInfo?.email,
        contactPhone: questionnaireAnswers.contactInfo?.phone,
        address: questionnaireAnswers.contactInfo?.address ? {
          street: questionnaireAnswers.contactInfo.address,
        } : undefined,
      };

      // Generate sitemap.xml
      const sitemapXml = seoAutomation.generateSitemap(structure, seoConfig);
      seoFiles.sitemap = sitemapXml;

      // Generate robots.txt
      const robotsTxt = seoAutomation.generateRobotsTxt(seoConfig);
      seoFiles.robots = robotsTxt;

      // Generate structured data for homepage
      const homepage = structure.pages?.find((p: any) => p.path === '/' || p.id === 'home');
      if (homepage) {
        const structuredData = seoAutomation.generatePageStructuredData(homepage, seoConfig);
        seoFiles.structuredData = structuredData;
      }

      // If Google Search Console credentials are available, submit sitemap and request indexing
      if (
        website.googleSearchConsoleAccessToken &&
        website.googleSearchConsoleRefreshToken &&
        website.vercelDeploymentUrl
      ) {
        try {
          const googleClientId = process.env.GOOGLE_CLIENT_ID;
          const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
          const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;

          if (googleClientId && googleClientSecret) {
            // Refresh token if needed
            let accessToken = website.googleSearchConsoleAccessToken;
            let refreshToken = website.googleSearchConsoleRefreshToken;
            
            if (website.googleSearchConsoleTokenExpiry && new Date(website.googleSearchConsoleTokenExpiry) < new Date()) {
              const refreshed = await googleSearchConsole.refreshAccessToken({
                accessToken,
                refreshToken,
                clientId: googleClientId,
                clientSecret: googleClientSecret,
                redirectUri: googleRedirectUri,
              });
              accessToken = refreshed.accessToken;
              if (refreshed.refreshToken) {
                refreshToken = refreshed.refreshToken;
              }
            }

            const searchConsoleConfig = {
              accessToken,
              refreshToken,
              clientId: googleClientId,
              clientSecret: googleClientSecret,
              redirectUri: googleRedirectUri,
            };

            // Submit sitemap
            const sitemapUrl = `${deploymentUrl}/sitemap.xml`;
            const sitemapResult = await googleSearchConsole.submitSitemap(
              deploymentUrl,
              sitemapUrl,
              searchConsoleConfig
            );

            if (sitemapResult.success) {
              console.log(`✅ Sitemap submitted to Google Search Console: ${sitemapUrl}`);
            } else {
              console.warn(`⚠️ Failed to submit sitemap: ${sitemapResult.error}`);
            }

            // Request indexing for homepage and key pages
            const keyPages = [
              deploymentUrl, // Homepage
              ...(structure.pages?.slice(0, 5).map((p: any) => `${deploymentUrl}${p.path}`) || []),
            ];

            const indexingResult = await googleSearchConsole.requestIndexingForKeyPages(
              deploymentUrl,
              keyPages,
              searchConsoleConfig
            );

            console.log(`✅ Indexing requested: ${indexingResult.success} succeeded, ${indexingResult.failed} failed`);
            if (indexingResult.errors.length > 0) {
              console.warn('Indexing errors:', indexingResult.errors);
            }

            // Update tokens if refreshed
            if (accessToken !== website.googleSearchConsoleAccessToken) {
              await prisma.website.update({
                where: { id: websiteId },
                data: {
                  googleSearchConsoleAccessToken: accessToken,
                  googleSearchConsoleRefreshToken: refreshToken,
                  googleSearchConsoleTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
                },
              });
            }
          }
        } catch (seoError: any) {
          // Don't fail the build if SEO automation fails
          console.warn('SEO automation error (non-critical):', seoError.message);
        }
      }
    } catch (seoError: any) {
      // Don't fail the build if SEO file generation fails
      console.warn('SEO file generation error (non-critical):', seoError.message);
    }

    // Update progress
    await prisma.websiteBuild.update({
      where: { id: buildId },
      data: { progress: 95 },
    });
    await prisma.website.update({
      where: { id: websiteId },
      data: { buildProgress: 95 },
    });

    // Update website with final data (including SEO files in seoData)
    const finalSeoData = {
      ...seoData,
      sitemap: seoFiles.sitemap,
      robots: seoFiles.robots,
      structuredData: seoFiles.structuredData,
    };

    await prisma.website.update({
      where: { id: websiteId },
      data: {
        structure,
        seoData: finalSeoData,
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
 * Build questionnaire answers from scraped website data for template merge
 */
function buildQuestionnaireFromScraped(scrapedData: any, defaultName?: string): any {
  const seo = scrapedData.seo || {};
  const metadata = scrapedData.metadata || {};
  const forms = scrapedData.forms || [];

  // Extract contact info from forms or metadata
  let contactEmail = '';
  let contactPhone = '';
  for (const form of forms) {
    for (const field of form.fields || []) {
      if (field.type === 'email' && field.name) contactEmail = field.name;
      if ((field.type === 'tel' || field.name?.toLowerCase().includes('phone')) && field.name) contactPhone = field.name;
    }
  }

  const contentSections = scrapedData.contentSections;
  const heroTitle = contentSections?.hero?.title;
  const heroSubtitle = contentSections?.hero?.subtitle;
  const aboutContent = contentSections?.sections?.find((s: any) =>
    (s.title || '').toLowerCase().includes('about')
  )?.content || contentSections?.sections?.[0]?.content;

  return {
    businessName: metadata.businessName || heroTitle || seo.title || defaultName || 'My Business',
    businessDescription: heroSubtitle || aboutContent || seo.description || metadata.description || '',
    contactInfo: {
      email: contactEmail || metadata.email,
      phone: contactPhone || metadata.phone,
      address: metadata.address,
    },
    services: metadata.services || [],
    products: scrapedData.products?.map((p: any) => ({
      name: p.name,
      description: p.description,
      price: p.price,
    })) || [],
    legalEntityName: metadata.legalEntityName || metadata.businessName || seo.title,
    legalJurisdiction: metadata.jurisdiction || 'United States',
    brandColors: scrapedData.styles?.colors || [],
    images: scrapedData.images?.map((img: any) => img.url) || [],
  };
}

/**
 * Convert scraped data to website structure with multiple sections from the cloned site
 */
function convertScrapedToStructure(scrapedData: any): any {
  const components: any[] = [];
  const ts = Date.now();

  // 1. Hero section - from SEO title/description + first image
  const heroImage = scrapedData.images?.[0]?.url;
  components.push({
    id: `hero-${ts}`,
    type: 'Hero',
    props: {
      title: scrapedData.seo?.title || 'Welcome',
      subtitle: scrapedData.seo?.description || '',
      imageUrl: heroImage || undefined,
      image: heroImage || undefined,
      ctaText: 'Get in Touch',
      ctaLink: '#contact',
    },
  });

  // 2. About/Text section - from SEO description
  if (scrapedData.seo?.description) {
    components.push({
      id: `about-${ts}`,
      type: 'AboutSection',
      props: {
        title: 'About Us',
        description: scrapedData.seo.description,
        ctaText: 'Learn More',
        ctaLink: '/about',
      },
    });
  }

  // 3. Image sections - from additional images (skip first, used in hero)
  const extraImages = (scrapedData.images || []).slice(1, 4);
  extraImages.forEach((img: any, i: number) => {
    components.push({
      id: `image-${ts}-${i}`,
      type: 'ImageSection',
      props: {
        title: img.alt || `Image ${i + 2}`,
        imageUrl: img.url,
        alt: img.alt || '',
      },
    });
  });

  // 4. Video section - from first video embed
  const firstVideo = scrapedData.videos?.[0];
  if (firstVideo) {
    const videoId = firstVideo.embedId || (firstVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)/)?.[1]);
    components.push({
      id: `video-${ts}`,
      type: 'VideoSection',
      props: {
        title: 'Watch',
        videoUrl: firstVideo.url || '',
        videoType: firstVideo.type === 'vimeo' ? 'vimeo' : 'youtube',
        videoId: videoId || '',
      },
    });
  }

  // 5. Contact form - from scraped forms
  const form = scrapedData.forms?.[0];
  if (form?.fields?.length) {
    const fields = form.fields.map((f: any) => ({
      name: f.name,
      type: f.type || 'text',
      label: (f.name || '').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      required: !!f.required,
    }));
    components.push({
      id: `form-${ts}`,
      type: 'ContactForm',
      props: { fields },
    });
  } else {
    // Default contact form if none found
    components.push({
      id: `form-${ts}`,
      type: 'ContactForm',
      props: {
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'message', type: 'textarea', label: 'Message', required: true },
        ],
      },
    });
  }

  // 6. CTA section at the end
  components.push({
    id: `cta-${ts}`,
    type: 'CTASection',
    props: {
      title: 'Get in Touch',
      description: 'Contact us today to learn more',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
    },
  });

  return {
    pages: [
      {
        id: 'home',
        name: 'Home',
        path: '/',
        components,
        seo: scrapedData.seo || {},
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
