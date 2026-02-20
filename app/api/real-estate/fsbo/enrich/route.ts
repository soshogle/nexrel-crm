export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface EnrichmentJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  listingId: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  error?: string;
  message?: string;
  startedAt: number;
}

const enrichmentJobs = new Map<string, EnrichmentJob>();

setInterval(() => {
  const now = Date.now();
  enrichmentJobs.forEach((job, id) => {
    if (now - job.startedAt > 10 * 60 * 1000) {
      enrichmentJobs.delete(id);
    }
  });
}, 60000);

async function runEnrichment(jobId: string, listingId: string, userId: string) {
  const job = enrichmentJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';

    const listing = await prisma.rEFSBOListing.findFirst({
      where: { id: listingId },
    });

    if (!listing) {
      job.status = 'failed';
      job.error = 'Listing not found';
      return;
    }

    if (listing.sellerPhone || listing.sellerEmail) {
      job.status = 'completed';
      job.phone = listing.sellerPhone || undefined;
      job.email = listing.sellerEmail || undefined;
      job.ownerName = listing.sellerName || undefined;
      job.message = 'Contact info already on file';
      return;
    }

    // Simulate enrichment processing time (2-5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Try web-based contact extraction using source URL
    let extractedPhone: string | undefined;
    let extractedEmail: string | undefined;
    let extractedName: string | undefined;

    const sourceUrl = listing.sourceUrl;

    // Attempt to fetch the source page for contact info
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const pageRes = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NexrelBot/1.0)',
        },
      });
      clearTimeout(timeout);

      if (pageRes.ok) {
        const html = await pageRes.text();

        const phoneMatch = html.match(
          /(?:tel:|phone|call)[^"'<>]*?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i
        ) || html.match(
          /(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/
        );
        if (phoneMatch) {
          extractedPhone = phoneMatch[1].replace(/[^\d]/g, '');
          if (extractedPhone.length === 10) {
            extractedPhone = `+1${extractedPhone}`;
          }
        }

        const emailMatch = html.match(
          /(?:mailto:|email)[^"'<>]*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
        ) || html.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) {
          const candidate = emailMatch[1].toLowerCase();
          if (!candidate.includes('noreply') && !candidate.includes('support@') && !candidate.includes('info@')) {
            extractedEmail = candidate;
          }
        }

        const nameMatch = html.match(
          /(?:owner|seller|listed by|contact)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)/i
        );
        if (nameMatch) {
          extractedName = nameMatch[1];
        }
      }
    } catch {
      // Page fetch failed — continue without web extraction
    }

    // If no contact found via web, generate plausible contact using address-based lookup simulation
    if (!extractedPhone && !extractedEmail) {
      // In production, this would call a skip-tracing or property records API
      // For now, mark as unable to extract rather than returning fake data
      job.status = 'completed';
      job.message = 'Could not extract contact information from the listing. Try visiting the listing page directly or use a skip-tracing service.';
      return;
    }

    // Save extracted data to the listing
    const updateData: any = {};
    if (extractedPhone) updateData.sellerPhone = extractedPhone;
    if (extractedEmail) updateData.sellerEmail = extractedEmail;
    if (extractedName) updateData.sellerName = extractedName;

    if (Object.keys(updateData).length > 0) {
      await prisma.rEFSBOListing.update({
        where: { id: listingId },
        data: updateData,
      });
    }

    job.status = 'completed';
    job.phone = extractedPhone;
    job.email = extractedEmail;
    job.ownerName = extractedName;
    job.message = extractedPhone
      ? `Contact extracted: ${extractedPhone}`
      : extractedEmail
      ? `Email found: ${extractedEmail}`
      : 'Partial data extracted';
  } catch (error: any) {
    console.error(`[FSBO Enrich] Job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = error.message || 'Enrichment failed';
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check status of existing job
    if (body.action === 'check_status' && body.jobId) {
      const job = enrichmentJobs.get(body.jobId);
      if (!job) {
        return NextResponse.json({ status: 'failed', error: 'Job not found' });
      }
      return NextResponse.json({
        status: job.status,
        phone: job.phone,
        email: job.email,
        ownerName: job.ownerName,
        error: job.error,
        message: job.message,
      });
    }

    // Start new enrichment job
    const { listingIds } = body;
    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json({ error: 'listingIds array required' }, { status: 400 });
    }

    const listingId = listingIds[0]; // Process one at a time
    const jobId = `enrich_${listingId}_${Date.now()}`;

    const job: EnrichmentJob = {
      id: jobId,
      status: 'pending',
      listingId,
      startedAt: Date.now(),
    };
    enrichmentJobs.set(jobId, job);

    // Fire and forget — enrichment runs in background
    runEnrichment(jobId, listingId, session.user.id).catch((err) => {
      console.error('[FSBO Enrich] Background job error:', err);
      const j = enrichmentJobs.get(jobId);
      if (j) {
        j.status = 'failed';
        j.error = 'Internal error';
      }
    });

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('FSBO enrich error:', error);
    return NextResponse.json({ error: 'Failed to start enrichment' }, { status: 500 });
  }
}
