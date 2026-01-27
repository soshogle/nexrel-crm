export const dynamic = "force-dynamic";

/**
 * FSBO Listing Enrichment API
 * Fetches contact information from individual listing detail pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface EnrichmentResult {
  listingId: string;
  success: boolean;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  daysOnMarket?: number;
  error?: string;
}

// Extract contact info from DuProprio listing page
async function enrichDuProprioListing(listingUrl: string): Promise<{
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  daysOnMarket?: number;
}> {
  try {
    // Fetch the listing page
    const response = await fetch(listingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch listing: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract phone number - DuProprio typically shows this in the contact section
    // Common patterns:
    // - data-phone attribute
    // - tel: links
    // - Phone number format: (XXX) XXX-XXXX or XXX-XXX-XXXX
    let sellerPhone: string | undefined;
    let sellerName: string | undefined;
    let daysOnMarket: number | undefined;
    
    // Look for phone in tel: links
    const telMatch = html.match(/href="tel:([^"]+)"/i);
    if (telMatch) {
      sellerPhone = telMatch[1].replace(/[^0-9+]/g, '');
    }
    
    // Look for phone in data attributes
    const dataPhoneMatch = html.match(/data-phone="([^"]+)"/i);
    if (dataPhoneMatch && !sellerPhone) {
      sellerPhone = dataPhoneMatch[1];
    }
    
    // Look for phone number patterns in common elements
    if (!sellerPhone) {
      // Canadian format: (514) 123-4567 or 514-123-4567
      const phonePatterns = [
        /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
        /1[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g
      ];
      
      // Look in contact/owner sections
      const contactSectionMatch = html.match(/class="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
      if (contactSectionMatch) {
        for (const section of contactSectionMatch) {
          for (const pattern of phonePatterns) {
            const match = section.match(pattern);
            if (match) {
              sellerPhone = match[0].replace(/[^0-9]/g, '');
              break;
            }
          }
          if (sellerPhone) break;
        }
      }
    }
    
    // Look for seller name in owner/vendor sections
    const ownerMatch = html.match(/class="[^"]*owner-name[^"]*"[^>]*>([^<]+)/i)
      || html.match(/class="[^"]*seller-name[^"]*"[^>]*>([^<]+)/i)
      || html.match(/class="[^"]*vendor-name[^"]*"[^>]*>([^<]+)/i)
      || html.match(/itemprop="name"[^>]*>([^<]+)/i);
    if (ownerMatch) {
      sellerName = ownerMatch[1].trim();
    }
    
    // Look for days on market or listing date
    const dateMatch = html.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)/i)
      || html.match(/On the market since[:\s]*([^<]+)/i)
      || html.match(/Listed[:\s]*([^<]+)/i)
      || html.match(/Date[:\s]*([^<]+)/i);
    if (dateMatch) {
      try {
        const dateStr = dateMatch[1].trim();
        const listedDate = new Date(dateStr);
        if (!isNaN(listedDate.getTime())) {
          daysOnMarket = Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    
    // Try to find structured data (JSON-LD)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const ldScript of jsonLdMatch) {
        try {
          const jsonStr = ldScript.replace(/<[^>]+>/g, '');
          const data = JSON.parse(jsonStr);
          if (data['@type'] === 'RealEstateListing' || data['@type'] === 'Product') {
            if (data.telephone && !sellerPhone) sellerPhone = data.telephone;
            if (data.seller?.name && !sellerName) sellerName = data.seller.name;
            if (data.datePosted && !daysOnMarket) {
              const posted = new Date(data.datePosted);
              daysOnMarket = Math.floor((Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24));
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
    
    return { sellerName, sellerPhone, daysOnMarket };
  } catch (error) {
    console.error('DuProprio enrichment error:', error);
    return {};
  }
}

// Extract contact info based on source
async function enrichListing(source: string, listingUrl: string): Promise<{
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  daysOnMarket?: number;
}> {
  switch (source.toUpperCase()) {
    case 'DUPROPRIO':
      return enrichDuProprioListing(listingUrl);
    // Add other sources here
    default:
      return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingIds, enrichAll } = body;

    if (!listingIds && !enrichAll) {
      return NextResponse.json({ error: 'listingIds or enrichAll required' }, { status: 400 });
    }

    // Get listings to enrich
    let listings;
    if (enrichAll) {
      // Enrich all listings without contact info
      listings = await prisma.rEFSBOListing.findMany({
        where: {
          assignedUserId: session.user.id,
          sellerPhone: null
        },
        take: 20 // Limit to prevent timeout
      });
    } else {
      listings = await prisma.rEFSBOListing.findMany({
        where: {
          id: { in: listingIds },
          assignedUserId: session.user.id
        }
      });
    }

    const results: EnrichmentResult[] = [];

    for (const listing of listings) {
      try {
        console.log(`Enriching listing ${listing.id}: ${listing.sourceUrl}`);
        
        const enrichedData = await enrichListing(listing.source, listing.sourceUrl);
        
        if (enrichedData.sellerPhone || enrichedData.sellerName || enrichedData.daysOnMarket) {
          // Update the listing
          await prisma.rEFSBOListing.update({
            where: { id: listing.id },
            data: {
              ...(enrichedData.sellerPhone && { sellerPhone: enrichedData.sellerPhone }),
              ...(enrichedData.sellerName && { sellerName: enrichedData.sellerName }),
              ...(enrichedData.daysOnMarket !== undefined && { daysOnMarket: enrichedData.daysOnMarket })
            }
          });
          
          results.push({
            listingId: listing.id,
            success: true,
            ...enrichedData
          });
        } else {
          results.push({
            listingId: listing.id,
            success: false,
            error: 'No contact info found on page'
          });
        }
        
        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          listingId: listing.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const enrichedCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      enriched: enrichedCount,
      results
    });
  } catch (error) {
    console.error('FSBO enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich listings' },
      { status: 500 }
    );
  }
}
