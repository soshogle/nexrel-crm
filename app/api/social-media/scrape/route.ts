import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// Read Apify API token from secrets file
function getApifyToken(): string | null {
  try {
    const secretsPath = '/home/ubuntu/.config/abacusai_auth_secrets.json';
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      return secrets.apify?.secrets?.api_token?.value || null;
    }
  } catch (error) {
    console.error('Error reading Apify token:', error);
  }
  return null;
}

interface ScrapeRequest {
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';
  scraperType: string;
  searchQuery: string;
  maxResults: number;
  templateId: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ScrapeRequest = await request.json();
    const { platform, scraperType, searchQuery, maxResults, templateId } = body;

    if (!platform || !scraperType || !searchQuery) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, scraperType, searchQuery' },
        { status: 400 }
      );
    }

    // Get Apify token
    const apifyToken = getApifyToken();
    if (!apifyToken) {
      return NextResponse.json(
        { error: 'Apify API token not configured. Please configure it in the system.' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting ${platform} scrape:`, { scraperType, searchQuery, maxResults });

    // Configure scraper input based on template
    let scraperInput: any = {
      resultsLimit: maxResults || 100,
    };

    // Platform-specific configurations
    if (platform === 'INSTAGRAM') {
      if (templateId.includes('hashtag')) {
        scraperInput.hashtags = [searchQuery.replace('#', '')];
        scraperInput.resultsType = 'posts';
      } else if (templateId.includes('location')) {
        scraperInput.searchQuery = searchQuery;
        scraperInput.searchType = 'place';
      } else {
        // Profile/followers
        scraperInput.usernames = [searchQuery.replace('@', '')];
        scraperInput.resultsType = 'details';
      }
    } else if (platform === 'FACEBOOK') {
      if (templateId.includes('group')) {
        scraperInput.startUrls = [`https://www.facebook.com/groups/${searchQuery}`];
      } else {
        scraperInput.startUrls = [`https://www.facebook.com/${searchQuery}`];
      }
    } else if (platform === 'TIKTOK') {
      if (templateId.includes('hashtag')) {
        scraperInput.hashtags = [searchQuery.replace('#', '')];
      } else {
        scraperInput.profiles = [searchQuery.replace('@', '')];
      }
    }

    // Call Apify API to run the scraper
    const actorResponse = await fetch(
      `https://api.apify.com/v2/acts/${scraperType}/runs?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scraperInput),
      }
    );

    if (!actorResponse.ok) {
      const errorText = await actorResponse.text();
      console.error('Apify API error:', errorText);
      return NextResponse.json(
        { error: `Apify scraper failed: ${errorText}` },
        { status: 500 }
      );
    }

    const runData = await actorResponse.json();
    const runId = runData.data.id;
    console.log(`✅ Apify run started:`, runId);

    // Wait for the run to finish (poll every 5 seconds, max 2 minutes)
    let runStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes total

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
      );
      const statusData = await statusResponse.json();
      runStatus = statusData.data.status;
      attempts++;
      
      console.log(`⏳ Run status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: `Scraper did not complete successfully. Status: ${runStatus}` },
        { status: 500 }
      );
    }

    // Fetch the results
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`
    );
    const results = await resultsResponse.json();

    console.log(`📊 Scraped ${results.length} profiles`);

    // Process results and create leads
    let leadsCreated = 0;
    let duplicatesSkipped = 0;

    for (const profile of results) {
      try {
        // Extract common fields based on platform
        let leadData: any = {
          userId: session.user.id,
          source: `${platform} Scraper`,
          status: 'NEW',
          tags: [platform.toLowerCase(), templateId],
        };

        // Platform-specific field mapping
        if (platform === 'INSTAGRAM') {
          leadData.contactPerson = profile.fullName || profile.username || 'Unknown';
          leadData.businessName = profile.username || profile.fullName;
          leadData.email = profile.email || null;
          leadData.phone = profile.phoneNumber || null;
          leadData.website = profile.externalUrl || null;
          leadData.notes = `Bio: ${profile.biography || 'N/A'}\nFollowers: ${profile.followersCount || 0}\nFollowing: ${profile.followsCount || 0}\nPosts: ${profile.postsCount || 0}`;
        } else if (platform === 'FACEBOOK') {
          leadData.contactPerson = profile.name || 'Unknown';
          leadData.businessName = profile.name;
          leadData.website = profile.url || null;
          leadData.notes = `Likes: ${profile.likes || 0}\nFollowers: ${profile.followers || 0}`;
        } else if (platform === 'TIKTOK') {
          leadData.contactPerson = profile.authorMeta?.name || profile.authorMeta?.nickName || 'Unknown';
          leadData.businessName = profile.authorMeta?.name || profile.text?.substring(0, 50);
          leadData.notes = `Followers: ${profile.authorMeta?.fans || 0}\nLikes: ${profile.diggCount || 0}\nViews: ${profile.playCount || 0}`;
        }

        // Check for duplicates (by contact person name)
        const existing = await prisma.lead.findFirst({
          where: {
            userId: session.user.id,
            contactPerson: leadData.contactPerson,
          },
        });

        if (existing) {
          duplicatesSkipped++;
          continue;
        }

        // Create the lead
        await prisma.lead.create({ data: leadData });
        leadsCreated++;
      } catch (error) {
        console.error('Error creating lead from profile:', error);
      }
    }

    console.log(`✅ Created ${leadsCreated} leads, skipped ${duplicatesSkipped} duplicates`);

    return NextResponse.json({
      success: true,
      runId,
      profilesScraped: results.length,
      leadsCreated,
      duplicatesSkipped,
      platform,
      templateId,
    });
  } catch (error: any) {
    console.error('Social media scraping error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape social media' },
      { status: 500 }
    );
  }
}
