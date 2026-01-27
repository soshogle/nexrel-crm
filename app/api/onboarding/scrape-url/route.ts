import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🔵 Scrape API called');
  
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    let { url } = body;

    if (!url || !url.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'URL is required' 
      }, { status: 400 });
    }

    // Normalize URL
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log('🔵 Fetching URL:', url);

    // Fetch the website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SoshogleCRM/1.0)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('🔵 Got HTML, length:', html.length);

    // Extract data from HTML
    const extractedData = {
      companyName: extractCompanyName(html, url),
      email: extractEmail(html),
      phone: extractPhone(html),
      address: extractAddress(html),
      description: extractDescription(html),
    };

    console.log('🔵 Extracted data:', extractedData);

    // Return the extracted data
    return NextResponse.json({
      success: true,
      extractedData,
      url
    });

  } catch (error: any) {
    console.error('❌ Scrape error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to extract data from website',
      details: error.message,
    }, { status: 500 });
  }
}

// Helper functions for data extraction
function extractCompanyName(html: string, url: string): string {
  // Try og:site_name
  const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteName?.[1]) return cleanText(ogSiteName[1]);

  // Try title tag
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) {
    const cleaned = cleanText(title[1]);
    // Remove common suffixes
    return cleaned.replace(/\s*[-–|]\s*(Home|Welcome|Official Site).*$/i, '').trim();
  }

  // Fallback to domain name
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return '';
  }
}

function extractEmail(html: string): string {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = html.match(emailRegex) || [];
  
  // Filter out common non-business emails and image URLs
  const validEmails = emails.filter(email => {
    const lower = email.toLowerCase();
    return !lower.includes('example') &&
           !lower.includes('test') &&
           !lower.includes('noreply') &&
           !lower.includes('donotreply') &&
           !lower.includes('.png') &&
           !lower.includes('.jpg') &&
           !lower.includes('.gif') &&
           !lower.includes('.svg') &&
           !lower.includes('sentry');
  });
  
  return validEmails[0] || '';
}

function extractPhone(html: string): string {
  // Match various phone formats
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = html.match(phoneRegex) || [];
  return phones[0] || '';
}

function extractAddress(html: string): string {
  // Try schema.org markup
  const schemaAddress = html.match(/<[^>]*itemprop=["']address["'][^>]*>([^<]+)<\//i);
  if (schemaAddress?.[1]) return cleanText(schemaAddress[1]);

  // Try address tag
  const addressTag = html.match(/<address[^>]*>([^<]+)<\/address>/i);
  if (addressTag?.[1]) return cleanText(addressTag[1]);

  return '';
}

function extractDescription(html: string): string {
  // Try meta description
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDesc?.[1]) return cleanText(metaDesc[1]);

  // Try og:description
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDesc?.[1]) return cleanText(ogDesc[1]);

  return '';
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
