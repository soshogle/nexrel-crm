/**
 * Periodontal AI Analysis API
 * Combines perio chart data + x-ray findings → LLM → structured assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { chatCompletion } from '@/lib/openai-client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PdSite { pd: number; bop?: boolean }
interface ToothMeasurements { mesial?: PdSite; buccal?: PdSite; distal?: PdSite; lingual?: PdSite }

function computePerioMetrics(measurements: Record<string, ToothMeasurements>) {
  const sites = ['mesial', 'buccal', 'distal', 'lingual'] as const;
  let totalSites = 0;
  let healthySites = 0;
  let moderateSites = 0;
  let severeSites = 0;
  let bopSites = 0;
  let worstPd = 0;
  const problemTeeth: Array<{ tooth: number; maxPd: number; bop: boolean; sites: string[] }> = [];

  for (const [toothNum, td] of Object.entries(measurements)) {
    let toothMax = 0;
    let toothBop = false;
    const toothProblemSites: string[] = [];

    for (const s of sites) {
      const site = td[s];
      if (!site) continue;
      totalSites++;
      const pd = site.pd ?? 0;
      if (pd <= 3) healthySites++;
      else if (pd <= 6) { moderateSites++; toothProblemSites.push(`${s}:${pd}mm`); }
      else { severeSites++; toothProblemSites.push(`${s}:${pd}mm(severe)`); }
      if (site.bop) { bopSites++; toothBop = true; }
      if (pd > toothMax) toothMax = pd;
      if (pd > worstPd) worstPd = pd;
    }

    if (toothMax > 3) {
      problemTeeth.push({ tooth: parseInt(toothNum), maxPd: toothMax, bop: toothBop, sites: toothProblemSites });
    }
  }

  problemTeeth.sort((a, b) => b.maxPd - a.maxPd);

  const healthPct = totalSites > 0 ? Math.round((healthySites / totalSites) * 100) : 0;
  const bopPct = totalSites > 0 ? Math.round((bopSites / totalSites) * 100) : 0;

  let pattern = 'healthy';
  if (severeSites > 0 && problemTeeth.length > 8) pattern = 'generalized severe';
  else if (severeSites > 0) pattern = 'localized severe';
  else if (moderateSites > 0 && problemTeeth.length > 8) pattern = 'generalized moderate';
  else if (moderateSites > 0) pattern = 'localized moderate';

  return { totalSites, healthySites, moderateSites, severeSites, bopSites, healthPct, bopPct, worstPd, pattern, problemTeeth };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized('Authentication required');
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const { leadId, measurements } = body;

    if (!leadId || !measurements) {
      return apiErrors.badRequest('leadId and measurements are required');
    }

    // Compute rule-based metrics
    const metrics = computePerioMetrics(measurements);

    // Fetch any existing x-ray AI analyses for this patient
    let xrayFindings: string[] = [];
    try {
      const xrays = await (db as any).dentalXRay.findMany({
        where: { leadId, userId: session.user.id, aiAnalysis: { not: null } },
        orderBy: { dateTaken: 'desc' },
        take: 5,
        select: { xrayType: true, dateTaken: true, aiAnalysis: true, teethIncluded: true },
      });

      for (const xr of xrays) {
        const analysis = xr.aiAnalysis as any;
        if (analysis?.findings) {
          xrayFindings.push(
            `[${xr.xrayType} x-ray, ${new Date(xr.dateTaken).toLocaleDateString()}] ${analysis.findings}`
          );
        }
      }
    } catch (e) {
      // X-ray table may not exist yet — non-fatal
    }

    // Fetch patient info for context
    let patientName = 'Unknown Patient';
    try {
      const lead = await db.lead.findUnique({
        where: { id: leadId },
        select: { contactPerson: true },
      });
      if (lead?.contactPerson) patientName = lead.contactPerson;
    } catch { }

    // Build the LLM prompt
    const problemTeethSummary = metrics.problemTeeth.slice(0, 10).map(pt =>
      `  Tooth #${pt.tooth}: max PD ${pt.maxPd}mm${pt.bop ? ' + BOP' : ''} (${pt.sites.join(', ')})`
    ).join('\n');

    const xraySummary = xrayFindings.length > 0
      ? `\n\nX-RAY AI FINDINGS (from prior analyses):\n${xrayFindings.join('\n\n')}`
      : '\n\n(No x-ray analyses available for this patient.)';

    const systemPrompt = `You are a periodontal clinical decision support system. You combine probing data and radiographic findings to produce a structured assessment.

IMPORTANT DISCLAIMERS you must include:
- This is AI-assisted clinical decision support, NOT a diagnosis.
- All findings require verification by a licensed dental professional.
- Do not make definitive diagnostic statements; use language like "findings suggest", "consistent with", "may indicate".

Respond ONLY with valid JSON matching this exact schema:
{
  "severity": "healthy" | "mild" | "moderate" | "severe",
  "classification": "string (e.g. 'Stage III Grade B Periodontitis' or 'Gingivitis' or 'Healthy')",
  "summary": "string (2-3 sentence plain-English overview)",
  "keyFindings": ["string", "string", ...],
  "toothFindings": [
    { "tooth": number, "severity": "mild"|"moderate"|"severe", "finding": "string", "suggestion": "string" }
  ],
  "suggestedActions": ["string", "string", ...],
  "riskFactors": ["string", ...],
  "disclaimer": "string"
}`;

    const userPrompt = `Analyze this patient's periodontal status.

PATIENT: ${patientName}

PERIODONTAL CHART METRICS:
- Total sites measured: ${metrics.totalSites}
- Healthy sites (≤3mm): ${metrics.healthySites} (${metrics.healthPct}%)
- Moderate sites (4-6mm): ${metrics.moderateSites}
- Severe sites (>6mm): ${metrics.severeSites}
- BOP sites: ${metrics.bopSites} (${metrics.bopPct}%)
- Worst pocket depth: ${metrics.worstPd}mm
- Pattern: ${metrics.pattern}
- Number of affected teeth: ${metrics.problemTeeth.length}

PROBLEM TEETH (worst first):
${problemTeethSummary || '  None — all sites ≤3mm'}
${xraySummary}

Produce the JSON assessment.`;

    const response = await chatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw = response.choices[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    let analysis: any;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    } catch {
      analysis = {
        severity: metrics.severeSites > 0 ? 'severe' : metrics.moderateSites > 0 ? 'moderate' : 'healthy',
        classification: metrics.pattern,
        summary: raw.slice(0, 300),
        keyFindings: [],
        toothFindings: [],
        suggestedActions: [],
        riskFactors: [],
        disclaimer: 'AI-assisted analysis. Requires professional verification.',
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      metrics,
      xrayDataAvailable: xrayFindings.length > 0,
    });
  } catch (error: any) {
    console.error('[Perio AI Analysis] Error:', error);
    return apiErrors.internal('Failed to generate AI analysis: ' + (error.message || 'Unknown error'));
  }
}
