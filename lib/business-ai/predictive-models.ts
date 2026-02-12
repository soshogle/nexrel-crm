/**
 * Statistical Predictive Models for Business Analytics
 * Uses proper statistical methods (regression, confidence intervals) instead of simple extrapolation.
 * LLM is used only for explanations, not for the prediction math.
 */

import { linearRegression, linearRegressionLine, standardDeviation } from 'simple-statistics';
import type { BusinessDataSnapshot } from './data-pipeline';

export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
  method: 'linear_regression' | 'bayesian_estimate' | 'stage_weighted' | 'historical_rate';
  explanation?: string;
}

/**
 * Wilson score interval for binomial proportion confidence.
 * More accurate than normal approximation for small samples.
 */
function wilsonScore(successes: number, trials: number, z = 1.96): number {
  if (trials === 0) return 0;
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);
  const lower = (center - spread) / denominator;
  const upper = (center + spread) / denominator;
  // Return width of interval as inverse of confidence (narrower = more confident)
  const width = upper - lower;
  return Math.max(50, Math.min(95, 100 - width * 100));
}

/**
 * Revenue forecast using linear regression on daily revenue trend.
 * Projects next 30 days and sums for "next month" prediction.
 */
function forecastRevenue(data: BusinessDataSnapshot): Prediction | null {
  const byPeriod = data.revenue.byPeriod;
  if (!byPeriod || byPeriod.length < 7) {
    return null;
  }

  const points = byPeriod.map((p, i) => [i, p.revenue] as [number, number]);
  const validPoints = points.filter(([, y]) => y >= 0);

  if (validPoints.length < 5) return null;

  let regression: { m: number; b: number };
  try {
    regression = linearRegression(validPoints);
  } catch {
    return null;
  }

  const line = linearRegressionLine(regression);
  const currentRevenue = data.revenue.thisMonth;
  const lastDayIndex = byPeriod.length - 1;

  // Project next 30 days (indices lastDayIndex+1 to lastDayIndex+30)
  let predictedNext30Days = 0;
  for (let i = 1; i <= 30; i++) {
    predictedNext30Days += Math.max(0, line(lastDayIndex + i));
  }

  const growthRate = data.revenue.growthRate;
  const stdDev = standardDeviation(byPeriod.map((p) => p.revenue));
  const meanRevenue = currentRevenue / 30;
  const cv = meanRevenue > 0 ? stdDev / meanRevenue : 1;
  const confidence = Math.min(92, Math.max(55, 85 - cv * 30 + Math.min(growthRate, 20)));

  return {
    metric: 'revenue',
    currentValue: currentRevenue,
    predictedValue: Math.round(predictedNext30Days * 100) / 100,
    confidence: Math.round(confidence),
    timeframe: 'next 30 days',
    method: 'linear_regression',
    factors: [
      `Linear trend from ${byPeriod.length} days of revenue`,
      `Daily growth rate: ${(regression.m * 100).toFixed(2)}%`,
      `Pipeline value: $${data.deals.totalValue.toFixed(2)}`,
      `Historical volatility: ${(cv * 100).toFixed(1)}%`,
    ],
  };
}

/**
 * Lead conversion prediction using historical conversion rate with Wilson score confidence.
 */
function forecastLeadConversions(data: BusinessDataSnapshot): Prediction {
  const conversionRate = data.leads.conversionRate / 100;
  const newLeads = data.leads.new;
  const totalLeads = data.leads.total;
  const converted = data.leads.converted;

  const predictedConversions = newLeads * conversionRate;
  const confidence = totalLeads >= 10
    ? wilsonScore(converted, totalLeads)
    : Math.max(50, 75 - (10 - totalLeads) * 5);

  return {
    metric: 'leadConversions',
    currentValue: data.leads.converted,
    predictedValue: Math.round(predictedConversions * 100) / 100,
    confidence: Math.round(confidence),
    timeframe: 'next 30 days',
    method: 'historical_rate',
    factors: [
      `Historical conversion rate: ${data.leads.conversionRate.toFixed(1)}%`,
      `New leads in pipeline: ${newLeads}`,
      `Sample size: ${totalLeads} leads (affects confidence)`,
      `Average lead score: ${data.leads.averageScore.toFixed(1)}`,
    ],
  };
}

/**
 * Deal closure prediction using stage-weighted probability.
 * Later stages have higher close probability based on typical sales funnel.
 */
function forecastDealClosure(data: BusinessDataSnapshot): Prediction {
  const winRate = data.deals.winRate / 100;
  const byStage = data.deals.openByStage || data.deals.byStage || [];
  const openPipelineValue = data.deals.openPipelineValue ?? data.deals.totalValue;

  const stageWeights: Record<string, number> = {
    qualified: 0.25,
    proposal: 0.4,
    negotiation: 0.6,
    closed: 1,
    won: 1,
    lost: 0,
    discovery: 0.15,
    qualification: 0.2,
    demo: 0.35,
    evaluation: 0.5,
    contract: 0.75,
    // catch common variations
  };

  let weightedValue = 0;
  let totalStageValue = 0;

  byStage.forEach((stage) => {
    const name = stage.stageName.toLowerCase();
    let weight = winRate;
    for (const [key, w] of Object.entries(stageWeights)) {
      if (name.includes(key)) {
        weight = w * winRate;
        break;
      }
    }
    weightedValue += stage.value * weight;
    totalStageValue += stage.value;
  });

  const predictedWonValue =
    totalStageValue > 0 ? weightedValue : openPipelineValue * winRate;
  const confidence =
    data.deals.open >= 5
      ? Math.min(90, Math.max(50, winRate * 100 + 10))
      : Math.max(45, 60 - (5 - data.deals.open) * 5);

  return {
    metric: 'dealValue',
    currentValue: data.deals.totalValue,
    predictedValue: Math.round(predictedWonValue * 100) / 100,
    confidence: Math.round(confidence),
    timeframe: 'next 30 days',
    method: 'stage_weighted',
    factors: [
      `Historical win rate: ${data.deals.winRate.toFixed(1)}%`,
      `Stage-weighted pipeline: ${byStage.length} stages`,
      `Open deals: ${data.deals.open}`,
      `Average sales cycle: ${data.deals.averageSalesCycle.toFixed(1)} days`,
    ],
  };
}

/**
 * Generate all predictions using statistical models.
 */
export function generatePredictions(data: BusinessDataSnapshot): Prediction[] {
  const predictions: Prediction[] = [];

  const revenuePred = forecastRevenue(data);
  if (revenuePred) {
    predictions.push(revenuePred);
  }

  predictions.push(forecastLeadConversions(data));
  predictions.push(forecastDealClosure(data));

  return predictions;
}
