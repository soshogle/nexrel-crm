/**
 * Cron job for Google Maps scraping
 * 
 * Runs daily at 2 AM (off-peak) to scrape Google Maps for new business leads.
 * This should be scheduled using a cron job or scheduled task.
 */

import { scrapeGoogleMaps, DEFAULT_SEARCH_QUERIES } from './google-maps-scraper';
import { batchScoreLeads } from './lead-scoring-db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Run daily Google Maps scraping for all users
 */
export async function runDailyGoogleMapsScraping() {
  console.log('[CRON] Starting daily Google Maps scraping...');
  
  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        accountStatus: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`[CRON] Found ${users.length} active users`);
    
    const results = {
      usersProcessed: 0,
      totalLeadsScraped: 0,
      totalLeadsScored: 0,
      errors: 0
    };
    
    // Process each user
    for (const user of users) {
      try {
        console.log(`[CRON] Processing user: ${user.email}`);
        
        // Use first 3 default queries (rotated daily)
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const startIndex = dayOfYear % DEFAULT_SEARCH_QUERIES.length;
        const queries = DEFAULT_SEARCH_QUERIES.slice(startIndex, startIndex + 3);
        
        // Scrape Google Maps
        const scrapingResult = await scrapeGoogleMaps(user.id, queries);
        
        console.log(`[CRON] Scraped ${scrapingResult.success} leads for ${user.email}`);
        
        results.totalLeadsScraped += scrapingResult.success;
        
        // Score new leads
        if (scrapingResult.success > 0) {
          const scoringResult = await batchScoreLeads(user.id, {
            source: 'google_maps'
          });
          
          console.log(`[CRON] Scored ${scoringResult.updated} leads for ${user.email}`);
          
          results.totalLeadsScored += scoringResult.updated;
        }
        
        results.usersProcessed++;
        
        // Delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
      } catch (error) {
        console.error(`[CRON] Error processing user ${user.email}:`, error);
        results.errors++;
      }
    }
    
    console.log('[CRON] Daily Google Maps scraping completed:', results);
    
    return results;
  } catch (error) {
    console.error('[CRON] Error in daily Google Maps scraping:', error);
    throw error;
  }
}

/**
 * Cron job endpoint (for testing)
 */
export async function testCronJob() {
  console.log('[TEST] Running test Google Maps scraping...');
  
  // Get first active user
  const user = await prisma.user.findFirst({
    where: {
      accountStatus: 'ACTIVE'
    }
  });
  
  if (!user) {
    console.log('[TEST] No active users found');
    return { error: 'No active users found' };
  }
  
  console.log(`[TEST] Testing with user: ${user.email}`);
  
  // Use first 2 queries for testing
  const queries = DEFAULT_SEARCH_QUERIES.slice(0, 2).map(q => ({
    ...q,
    maxResults: 10 // Limit for testing
  }));
  
  // Scrape
  const scrapingResult = await scrapeGoogleMaps(user.id, queries);
  
  console.log('[TEST] Scraping result:', scrapingResult);
  
  // Score
  if (scrapingResult.success > 0) {
    const scoringResult = await batchScoreLeads(user.id, {
      source: 'google_maps'
    });
    
    console.log('[TEST] Scoring result:', scoringResult);
    
    return {
      success: true,
      scraping: scrapingResult,
      scoring: scoringResult
    };
  }
  
  return {
    success: true,
    scraping: scrapingResult
  };
}
