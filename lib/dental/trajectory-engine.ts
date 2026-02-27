/**
 * Patient Trajectory Engine
 *
 * Takes a patient's full clinical history (periodontal exams, odontogram
 * snapshots, x-ray AI analyses, treatment plans, recall compliance) and
 * projects tooth-by-tooth deterioration at 6-month and 12-month horizons.
 *
 * When historical data exists the engine computes a *personal* progression
 * rate per tooth/site. With no history it falls back to evidence-based
 * population averages from periodontal literature.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PdSite {
  pd: number;
  bop?: boolean;
  recession?: number;
}

export interface ToothPerioData {
  mesial?: PdSite;
  buccal?: PdSite;
  distal?: PdSite;
  lingual?: PdSite;
}

export interface PerioExam {
  id: string;
  date: string; // ISO
  measurements: Record<string, ToothPerioData>;
}

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'crown'
  | 'filling'
  | 'missing'
  | 'extraction'
  | 'implant'
  | 'root_canal';

export interface ToothConditionSnapshot {
  condition: ToothCondition;
  treatment?: string;
  completed?: boolean;
  date?: string;
  notes?: string;
}

export interface OdontogramSnapshot {
  date: string; // ISO
  data: Record<string, ToothConditionSnapshot>;
}

export interface XrayFinding {
  id: string;
  date: string;
  xrayType: string;
  teethIncluded: string[];
  findings: string;
  recommendations: string;
  confidence?: number;
}

export interface TreatmentPlanItem {
  procedureCode?: string;
  description?: string;
  toothNumber?: string;
  cost?: number;
  status?: string; // PENDING, IN_PROGRESS, COMPLETED, DECLINED
}

export interface TreatmentPlan {
  id: string;
  planName: string;
  status: string;
  procedures: TreatmentPlanItem[];
  totalCost: number;
  patientConsent: boolean;
  createdDate: string;
}

export interface RecallRecord {
  status: string; // ACTIVE, OVERDUE, COMPLETED
  nextDueDate: string;
  lastVisitDate?: string;
  remindersSent: number;
}

export interface PatientRiskFactors {
  smoker?: boolean;
  diabetic?: boolean;
  immunocompromised?: boolean;
  poorOralHygiene?: boolean;
  bruxism?: boolean;
  age?: number;
}

export interface PatientHistoryInput {
  perioExams: PerioExam[];
  odontogramSnapshots: OdontogramSnapshot[];
  xrayFindings: XrayFinding[];
  treatmentPlans: TreatmentPlan[];
  recalls: RecallRecord[];
  riskFactors?: PatientRiskFactors;
}

// ─── Output types ───────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'moderate' | 'estimated';

export interface SiteProjection {
  currentPd: number;
  projectedPd6mo: number;
  projectedPd12mo: number;
  currentBop: boolean;
  projectedBop6mo: boolean;
  projectedBop12mo: boolean;
  ratePerMonth: number; // mm/month — the patient's personal rate
  dataSource: 'personal' | 'blended' | 'population';
}

export interface ToothProjection {
  toothNumber: string;
  currentCondition: ToothCondition;
  projectedCondition6mo: ToothCondition;
  projectedCondition12mo: ToothCondition;
  sites: {
    mesial: SiteProjection;
    buccal: SiteProjection;
    distal: SiteProjection;
    lingual: SiteProjection;
  };
  worstCurrentPd: number;
  worstPd6mo: number;
  worstPd12mo: number;
  boneLossRateMmPerYear: number;
  mobilityRisk6mo: 0 | 1 | 2 | 3;
  mobilityRisk12mo: 0 | 1 | 2 | 3;
  extractionRisk12mo: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  alerts: string[];
  treatNowCost: number;
  treatLaterCost6mo: number;
  treatLaterCost12mo: number;
}

export interface TrajectoryResult {
  patientConfidence: ConfidenceLevel;
  examCount: number;
  historySpanMonths: number;
  teeth: Record<string, ToothProjection>;
  summary: {
    teethAtRisk: number;
    teethCritical: number;
    projectedExtractions12mo: number;
    totalTreatNowCost: number;
    totalTreatLaterCost12mo: number;
    costDelta: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    topAlerts: string[];
  };
  aiAnalysisSummary: string[];
  declinedTreatments: Array<{
    toothNumber: string;
    procedure: string;
    declinedDate: string;
    consequenceNow: string;
  }>;
  trendData: Record<string, Array<{
    date: string;
    pd: number;
    type: 'measured' | 'projected';
  }>>;
}

// ─── Population baseline rates (from periodontal literature) ────────────────

const POP_PD_RATE_PER_MONTH = 0.04;          // ~0.5mm/year untreated
const POP_PD_RATE_WITH_BOP = 0.07;            // ~0.84mm/year with active inflammation
const POP_BONE_LOSS_MM_PER_YEAR = 0.2;        // Healthy, slow progression
const POP_BONE_LOSS_WITH_DISEASE = 1.0;       // Active periodontitis
const POP_CARIES_PROGRESSION_MONTHS = 8;      // Enamel → dentin
const POP_CARIES_TO_PULP_MONTHS = 16;         // Dentin → pulp involvement

// ─── Risk multipliers ───────────────────────────────────────────────────────────

function computeRiskMultiplier(
  riskFactors: PatientRiskFactors | undefined,
  recalls: RecallRecord[],
  hasBop: boolean,
): number {
  let m = 1.0;

  if (hasBop) m *= 1.2;
  if (riskFactors?.smoker) m *= 1.4;
  if (riskFactors?.diabetic) m *= 1.3;
  if (riskFactors?.immunocompromised) m *= 1.2;
  if (riskFactors?.poorOralHygiene) m *= 1.25;
  if (riskFactors?.bruxism) m *= 1.1;

  // Missed recall appointments
  const overdueRecalls = recalls.filter(r => r.status === 'OVERDUE');
  if (overdueRecalls.length > 0) m *= 1.0 + (overdueRecalls.length * 0.15);

  return Math.min(m, 3.0); // cap at 3x
}

// ─── Cost escalation tables (CAD, typical Ontario fee guide) ────────────────

const PROCEDURE_COSTS: Record<string, { now: number; escalated6mo: number; escalated12mo: number; description: string }> = {
  filling:        { now: 250,  escalated6mo: 450,   escalated12mo: 2800,  description: 'Filling → Root Canal + Crown' },
  caries:         { now: 250,  escalated6mo: 450,   escalated12mo: 2800,  description: 'Caries Treatment → Root Canal + Crown' },
  crown:          { now: 1200, escalated6mo: 1500,   escalated12mo: 3500,  description: 'Crown → Extraction + Implant' },
  root_canal:     { now: 1500, escalated6mo: 1800,   escalated12mo: 4200,  description: 'Root Canal → Extraction + Implant' },
  scaling:        { now: 380,  escalated6mo: 1200,   escalated12mo: 2200,  description: 'Scaling → Surgical Perio' },
  perio_moderate: { now: 600,  escalated6mo: 1800,   escalated12mo: 3500,  description: 'Deep Cleaning → Gum Surgery' },
  perio_severe:   { now: 1800, escalated6mo: 3500,   escalated12mo: 5500,  description: 'Perio Surgery → Extraction + Bone Graft + Implant' },
  extraction:     { now: 350,  escalated6mo: 350,    escalated12mo: 350,   description: 'Extraction' },
  implant:        { now: 4500, escalated6mo: 5000,   escalated12mo: 6500,  description: 'Implant + Bone Graft' },
};

function getCostsForTooth(
  currentCondition: ToothCondition,
  worstPd: number,
  projectedPd6mo: number,
  projectedPd12mo: number,
): { now: number; at6mo: number; at12mo: number } {
  // Restorative costs
  if (currentCondition === 'caries' || currentCondition === 'filling') {
    const base = PROCEDURE_COSTS.caries;
    return { now: base.now, at6mo: base.escalated6mo, at12mo: base.escalated12mo };
  }

  // Periodontal costs
  if (worstPd >= 7 || projectedPd12mo >= 8) {
    const base = PROCEDURE_COSTS.perio_severe;
    return { now: base.now, at6mo: base.escalated6mo, at12mo: base.escalated12mo };
  }
  if (worstPd >= 4 || projectedPd6mo >= 5) {
    const base = PROCEDURE_COSTS.perio_moderate;
    return { now: base.now, at6mo: base.escalated6mo, at12mo: base.escalated12mo };
  }

  if (currentCondition === 'crown' || currentCondition === 'root_canal') {
    const base = PROCEDURE_COSTS[currentCondition];
    return { now: base.now, at6mo: base.escalated6mo, at12mo: base.escalated12mo };
  }

  return { now: 0, at6mo: 0, at12mo: 0 };
}

// ─── Core: compute personal progression rate per site ───────────────────────

interface RateResult {
  rate: number; // mm/month
  source: 'personal' | 'blended' | 'population';
}

function computeSiteRate(
  toothNum: string,
  siteKey: 'mesial' | 'buccal' | 'distal' | 'lingual',
  exams: PerioExam[],
  riskMultiplier: number,
  currentBop: boolean,
): RateResult {
  // Gather historical measurements for this tooth+site, sorted by date
  const points: Array<{ date: Date; pd: number }> = [];

  for (const exam of exams) {
    const td = exam.measurements[toothNum];
    const site = td?.[siteKey];
    if (site && typeof site.pd === 'number' && site.pd > 0) {
      points.push({ date: new Date(exam.date), pd: site.pd });
    }
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  const popRate = (currentBop ? POP_PD_RATE_WITH_BOP : POP_PD_RATE_PER_MONTH) * riskMultiplier;

  if (points.length >= 3) {
    // Linear regression for 3+ points
    const rate = linearRegressionSlope(points);
    // Personal rate — still apply a floor of 0 (PD doesn't spontaneously improve)
    const personalRate = Math.max(rate, 0) * riskMultiplier;
    return { rate: personalRate, source: 'personal' };
  }

  if (points.length === 2) {
    const monthsBetween = monthsDiff(points[0].date, points[1].date);
    if (monthsBetween > 0) {
      const rawRate = (points[1].pd - points[0].pd) / monthsBetween;
      const personalRate = Math.max(rawRate, 0) * riskMultiplier;
      // Blend 60% personal, 40% population
      const blended = personalRate * 0.6 + popRate * 0.4;
      return { rate: blended, source: 'blended' };
    }
  }

  return { rate: popRate, source: 'population' };
}

function linearRegressionSlope(points: Array<{ date: Date; pd: number }>): number {
  const n = points.length;
  if (n < 2) return 0;

  const t0 = points[0].date.getTime();
  const xs = points.map(p => (p.date.getTime() - t0) / (1000 * 60 * 60 * 24 * 30.44)); // months
  const ys = points.map(p => p.pd);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

function monthsDiff(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

// ─── Condition progression ──────────────────────────────────────────────────

function projectCondition(
  current: ToothCondition,
  monthsSinceOnset: number,
  months: number,
  worstPd: number,
  projectedPd: number,
  riskMultiplier: number,
): ToothCondition {
  if (current === 'missing' || current === 'extraction' || current === 'implant') return current;

  // Caries progression
  if (current === 'caries') {
    const adjustedMonths = monthsSinceOnset + months;
    const threshold = POP_CARIES_TO_PULP_MONTHS / riskMultiplier;
    if (adjustedMonths >= threshold) return 'root_canal';
    return 'caries';
  }

  // Filling may fail over time under disease pressure
  if (current === 'filling' && projectedPd >= 6) {
    return months >= 12 ? 'root_canal' : 'filling';
  }

  // Crown under severe perio → extraction risk
  if (current === 'crown' && projectedPd >= 8) {
    return months >= 12 ? 'extraction' : 'crown';
  }

  // Healthy tooth developing issues under severe perio
  if (current === 'healthy' && projectedPd >= 7 && months >= 12) {
    return 'extraction';
  }

  return current;
}

// ─── Extract AI analysis insights ───────────────────────────────────────────

function extractAiInsights(xrayFindings: XrayFinding[]): {
  summary: string[];
  toothAlerts: Record<string, string[]>;
} {
  const summary: string[] = [];
  const toothAlerts: Record<string, string[]> = {};

  for (const xray of xrayFindings) {
    if (xray.findings) {
      summary.push(`[${xray.xrayType}] ${xray.findings}`);
    }
    if (xray.recommendations) {
      summary.push(`Recommendations: ${xray.recommendations}`);
    }

    // Extract per-tooth mentions from findings
    for (const toothNum of xray.teethIncluded) {
      if (!toothAlerts[toothNum]) toothAlerts[toothNum] = [];

      const findingsLower = xray.findings.toLowerCase();
      // Look for specific findings mentioning this tooth
      const patterns = [
        { regex: new RegExp(`#?${toothNum}[^0-9].*?(caries|cavity|decay)`, 'i'), msg: `Caries detected on x-ray (${xray.xrayType})` },
        { regex: new RegExp(`#?${toothNum}[^0-9].*?(bone loss|bone level)`, 'i'), msg: `Bone loss noted on x-ray (${xray.xrayType})` },
        { regex: new RegExp(`#?${toothNum}[^0-9].*?(periapical|abscess|lesion)`, 'i'), msg: `Periapical finding on x-ray (${xray.xrayType})` },
        { regex: new RegExp(`#?${toothNum}[^0-9].*?(fracture|crack)`, 'i'), msg: `Possible fracture noted on x-ray (${xray.xrayType})` },
        { regex: new RegExp(`#?${toothNum}[^0-9].*?(fill|restor)`, 'i'), msg: `Restoration noted on x-ray (${xray.xrayType})` },
      ];

      for (const p of patterns) {
        if (p.regex.test(xray.findings)) {
          toothAlerts[toothNum].push(p.msg);
        }
      }
    }
  }

  return { summary, toothAlerts };
}

// ─── Find declined treatments ───────────────────────────────────────────────

function findDeclinedTreatments(plans: TreatmentPlan[]): Array<{
  toothNumber: string;
  procedure: string;
  declinedDate: string;
  consequenceNow: string;
}> {
  const declined: Array<{
    toothNumber: string;
    procedure: string;
    declinedDate: string;
    consequenceNow: string;
  }> = [];

  for (const plan of plans) {
    if (plan.status === 'CANCELLED' || !plan.patientConsent) {
      for (const proc of plan.procedures || []) {
        if (proc.toothNumber) {
          const monthsAgo = monthsDiff(new Date(plan.createdDate), new Date());
          let consequence = 'Condition may have progressed since recommendation was declined.';
          if (monthsAgo > 6) {
            consequence = `Recommended ${Math.round(monthsAgo)} months ago — significant progression likely.`;
          } else if (monthsAgo > 3) {
            consequence = `Recommended ${Math.round(monthsAgo)} months ago — moderate progression expected.`;
          }

          declined.push({
            toothNumber: proc.toothNumber,
            procedure: proc.description || proc.procedureCode || 'Treatment',
            declinedDate: plan.createdDate,
            consequenceNow: consequence,
          });
        }
      }
    }
  }

  return declined;
}

// ─── Build trend data for sparklines ────────────────────────────────────────

function buildTrendData(
  toothNum: string,
  siteKey: string,
  exams: PerioExam[],
  projectedPd6mo: number,
  projectedPd12mo: number,
): Array<{ date: string; pd: number; type: 'measured' | 'projected' }> {
  const points: Array<{ date: string; pd: number; type: 'measured' | 'projected' }> = [];

  const sorted = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const exam of sorted) {
    const td = exam.measurements[toothNum];
    const site = td?.[siteKey as keyof ToothPerioData];
    if (site?.pd) {
      points.push({ date: exam.date, pd: site.pd, type: 'measured' });
    }
  }

  const now = new Date();
  const in6 = new Date(now);
  in6.setMonth(in6.getMonth() + 6);
  const in12 = new Date(now);
  in12.setMonth(in12.getMonth() + 12);

  points.push({ date: in6.toISOString(), pd: projectedPd6mo, type: 'projected' });
  points.push({ date: in12.toISOString(), pd: projectedPd12mo, type: 'projected' });

  return points;
}

// ─── Main engine ────────────────────────────────────────────────────────────

export function computeTrajectory(input: PatientHistoryInput): TrajectoryResult {
  const { perioExams, odontogramSnapshots, xrayFindings, treatmentPlans, recalls, riskFactors } = input;

  // Sort exams chronologically
  const sortedExams = [...perioExams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Current state: use most recent exam + most recent odontogram
  const latestExam = sortedExams[sortedExams.length - 1];
  const latestOdontogram = odontogramSnapshots.length > 0
    ? [...odontogramSnapshots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // Confidence based on data availability
  const historySpanMonths = sortedExams.length >= 2
    ? monthsDiff(new Date(sortedExams[0].date), new Date(sortedExams[sortedExams.length - 1].date))
    : 0;

  let confidence: ConfidenceLevel = 'estimated';
  if (sortedExams.length >= 3 && historySpanMonths >= 12) confidence = 'high';
  else if (sortedExams.length >= 2) confidence = 'moderate';

  // AI insights
  const aiInsights = extractAiInsights(xrayFindings);

  // Declined treatments
  const declinedTreatments = findDeclinedTreatments(treatmentPlans);

  // Process each tooth
  const teeth: Record<string, ToothProjection> = {};
  const trendData: Record<string, Array<{ date: string; pd: number; type: 'measured' | 'projected' }>> = {};

  const SITES = ['mesial', 'buccal', 'distal', 'lingual'] as const;

  for (let t = 1; t <= 32; t++) {
    const toothNum = String(t);

    // Current condition
    const currentCondition: ToothCondition =
      latestOdontogram?.data[toothNum]?.condition || 'healthy';

    // Skip missing/extracted teeth
    if (currentCondition === 'missing' || currentCondition === 'extraction') {
      teeth[toothNum] = createMissingToothProjection(toothNum, currentCondition);
      continue;
    }

    // Per-site analysis
    const currentPerio = latestExam?.measurements[toothNum];
    const hasBopAnywhere = SITES.some(s => currentPerio?.[s]?.bop);
    const riskMultiplier = computeRiskMultiplier(riskFactors, recalls, hasBopAnywhere);

    const siteProjections: Record<string, SiteProjection> = {};

    for (const site of SITES) {
      const currentSite = currentPerio?.[site];
      const currentPd = currentSite?.pd ?? 2;
      const currentBop = currentSite?.bop ?? false;

      const { rate, source } = computeSiteRate(toothNum, site, sortedExams, riskMultiplier, currentBop);

      const projPd6 = Math.round((currentPd + rate * 6) * 10) / 10;
      const projPd12 = Math.round((currentPd + rate * 12) * 10) / 10;

      // BOP tends to persist and spread when PD increases
      const projBop6 = currentBop || projPd6 >= 4;
      const projBop12 = currentBop || projPd12 >= 4;

      siteProjections[site] = {
        currentPd,
        projectedPd6mo: Math.max(projPd6, currentPd), // PD doesn't improve without treatment
        projectedPd12mo: Math.max(projPd12, currentPd),
        currentBop,
        projectedBop6mo: projBop6,
        projectedBop12mo: projBop12,
        ratePerMonth: rate,
        dataSource: source,
      };
    }

    const worstCurrent = Math.max(...SITES.map(s => siteProjections[s].currentPd));
    const worst6 = Math.max(...SITES.map(s => siteProjections[s].projectedPd6mo));
    const worst12 = Math.max(...SITES.map(s => siteProjections[s].projectedPd12mo));

    // Bone loss rate
    const boneLoss = worstCurrent >= 4
      ? POP_BONE_LOSS_WITH_DISEASE * riskMultiplier
      : POP_BONE_LOSS_MM_PER_YEAR * riskMultiplier;

    // Mobility risk
    const mobilityRisk6: 0 | 1 | 2 | 3 = worst6 >= 8 ? 2 : worst6 >= 6 ? 1 : 0;
    const mobilityRisk12: 0 | 1 | 2 | 3 = worst12 >= 9 ? 3 : worst12 >= 7 ? 2 : worst12 >= 5 ? 1 : 0;

    // Condition progression
    const conditionAge = latestOdontogram?.data[toothNum]?.date
      ? monthsDiff(new Date(latestOdontogram.data[toothNum].date!), new Date())
      : 0;

    const projCondition6 = projectCondition(currentCondition, conditionAge, 6, worstCurrent, worst6, riskMultiplier);
    const projCondition12 = projectCondition(currentCondition, conditionAge, 12, worstCurrent, worst12, riskMultiplier);

    // Extraction risk
    const extractionRisk = worst12 >= 9 || projCondition12 === 'extraction';

    // Risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (extractionRisk) riskLevel = 'critical';
    else if (worst12 >= 6 || projCondition12 !== currentCondition) riskLevel = 'high';
    else if (worst6 >= 4 || hasBopAnywhere) riskLevel = 'moderate';

    // Alerts
    const alerts: string[] = [];
    if (hasBopAnywhere) alerts.push('Active bleeding on probing — inflammation present');
    if (worst6 >= 5) alerts.push(`Pocket depth projected to reach ${worst6}mm in 6 months`);
    if (worst12 >= 7) alerts.push(`Severe pocket depth projected at 12 months (${worst12}mm)`);
    if (extractionRisk) alerts.push('Tooth at risk of extraction within 12 months');
    if (projCondition6 !== currentCondition) {
      alerts.push(`Condition may progress from ${currentCondition} to ${projCondition6} by 6 months`);
    }
    if (projCondition12 !== currentCondition && projCondition12 !== projCondition6) {
      alerts.push(`Further progression to ${projCondition12} by 12 months`);
    }

    // AI x-ray alerts for this tooth
    const aiToothAlerts = aiInsights.toothAlerts[toothNum] || [];
    alerts.push(...aiToothAlerts);

    // Declined treatment alerts
    const declinedForTooth = declinedTreatments.filter(d => d.toothNumber === toothNum);
    for (const d of declinedForTooth) {
      alerts.push(`Previously recommended: ${d.procedure}. ${d.consequenceNow}`);
    }

    // Costs
    const costs = getCostsForTooth(currentCondition, worstCurrent, worst6, worst12);

    // Trend data (use worst site for the sparkline)
    const worstSite = SITES.reduce((best, s) =>
      siteProjections[s].currentPd > siteProjections[best].currentPd ? s : best, SITES[0]);
    trendData[toothNum] = buildTrendData(
      toothNum, worstSite, sortedExams,
      siteProjections[worstSite].projectedPd6mo,
      siteProjections[worstSite].projectedPd12mo,
    );

    teeth[toothNum] = {
      toothNumber: toothNum,
      currentCondition,
      projectedCondition6mo: projCondition6,
      projectedCondition12mo: projCondition12,
      sites: siteProjections as ToothProjection['sites'],
      worstCurrentPd: worstCurrent,
      worstPd6mo: worst6,
      worstPd12mo: worst12,
      boneLossRateMmPerYear: boneLoss,
      mobilityRisk6mo: mobilityRisk6,
      mobilityRisk12mo: mobilityRisk12,
      extractionRisk12mo: extractionRisk,
      riskLevel,
      alerts,
      treatNowCost: costs.now,
      treatLaterCost6mo: costs.at6mo,
      treatLaterCost12mo: costs.at12mo,
    };
  }

  // Summary
  const allTeeth = Object.values(teeth);
  const atRisk = allTeeth.filter(t => t.riskLevel === 'moderate' || t.riskLevel === 'high' || t.riskLevel === 'critical');
  const critical = allTeeth.filter(t => t.riskLevel === 'critical');
  const projectedExtractions = allTeeth.filter(t => t.extractionRisk12mo).length;
  const totalNow = allTeeth.reduce((s, t) => s + t.treatNowCost, 0);
  const totalLater = allTeeth.reduce((s, t) => s + t.treatLaterCost12mo, 0);

  let overallRisk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  if (critical.length > 0) overallRisk = 'critical';
  else if (atRisk.filter(t => t.riskLevel === 'high').length > 2) overallRisk = 'high';
  else if (atRisk.length > 0) overallRisk = 'moderate';

  // Top alerts — deduplicate and take most important
  const allAlerts = allTeeth.flatMap(t => t.alerts.map(a => `Tooth #${t.toothNumber}: ${a}`));
  const topAlerts = [...new Set(allAlerts)]
    .sort((a, b) => {
      const priority = (s: string) =>
        s.includes('extraction') ? 0 : s.includes('critical') ? 1 : s.includes('severe') ? 2 :
        s.includes('Previously recommended') ? 3 : s.includes('progress') ? 4 : 5;
      return priority(a) - priority(b);
    })
    .slice(0, 8);

  return {
    patientConfidence: confidence,
    examCount: sortedExams.length,
    historySpanMonths: Math.round(historySpanMonths),
    teeth,
    summary: {
      teethAtRisk: atRisk.length,
      teethCritical: critical.length,
      projectedExtractions12mo: projectedExtractions,
      totalTreatNowCost: totalNow,
      totalTreatLaterCost12mo: totalLater,
      costDelta: totalLater - totalNow,
      overallRisk,
      topAlerts,
    },
    aiAnalysisSummary: aiInsights.summary,
    declinedTreatments,
    trendData,
  };
}

// ─── Helper: missing tooth projection ───────────────────────────────────────

function createMissingToothProjection(toothNum: string, condition: ToothCondition): ToothProjection {
  const emptySite: SiteProjection = {
    currentPd: 0, projectedPd6mo: 0, projectedPd12mo: 0,
    currentBop: false, projectedBop6mo: false, projectedBop12mo: false,
    ratePerMonth: 0, dataSource: 'population',
  };

  return {
    toothNumber: toothNum,
    currentCondition: condition,
    projectedCondition6mo: condition,
    projectedCondition12mo: condition,
    sites: { mesial: emptySite, buccal: emptySite, distal: emptySite, lingual: emptySite },
    worstCurrentPd: 0, worstPd6mo: 0, worstPd12mo: 0,
    boneLossRateMmPerYear: 0,
    mobilityRisk6mo: 0, mobilityRisk12mo: 0,
    extractionRisk12mo: false,
    riskLevel: 'low',
    alerts: [],
    treatNowCost: 0, treatLaterCost6mo: 0, treatLaterCost12mo: 0,
  };
}
