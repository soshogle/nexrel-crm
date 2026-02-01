/**
 * ROI Calculator Logic (ported from Soshogle site)
 */

export interface ROIInput {
  websiteUrl?: string;
  avgTicketPrice: number;
  callsPerDay: number;
  missedCallsPerDay: number;
  lostCustomerPercentage: number;
  customerLifetimeValue: number;
  lostReferralsPerMonth: number;
  manualFollowupHoursPerWeek: number;
  badReviewsPerMonth: number;
  hourlyRate: number;
  badReviewImpactValue: number;
}

export interface ROIOutput {
  monthlyLoss: number;
  annualLoss: number;
  monthlyRecoveryWithSoshogle: number;
  annualRecoveryWithSoshogle: number;
  netMonthlySavings: number;
  netAnnualSavings: number;
  roiPercentage: number;
  breakdown: {
    missedCallsLoss: number;
    lostReferralsLoss: number;
    manualFollowupCost: number;
    badReviewsLoss: number;
  };
}

const SOSHOGLE_MONTHLY_COST = 199;
const MISSED_CALL_RECOVERY_RATE = 1.0;
const AUTOMATION_EFFICIENCY_GAIN = 1.0;
const BAD_REVIEW_REDUCTION = 1.0;

export function calculateROI(input: ROIInput): ROIOutput {
  const missedCallsLoss =
    input.missedCallsPerDay *
    input.lostCustomerPercentage *
    input.avgTicketPrice *
    30;

  const lostReferralsLoss = input.lostReferralsPerMonth * input.avgTicketPrice;
  const manualFollowupCost =
    (input.manualFollowupHoursPerWeek * input.hourlyRate * 52) / 12;
  const badReviewsLoss = input.badReviewsPerMonth * input.badReviewImpactValue;

  const monthlyLoss =
    missedCallsLoss + lostReferralsLoss + manualFollowupCost + badReviewsLoss;
  const annualLoss = monthlyLoss * 12;

  const recoveredMissedCalls = missedCallsLoss * MISSED_CALL_RECOVERY_RATE;
  const recoveredFollowupCost = manualFollowupCost * AUTOMATION_EFFICIENCY_GAIN;
  const reducedBadReviews = badReviewsLoss * BAD_REVIEW_REDUCTION;

  const monthlyRecoveryWithSoshogle =
    recoveredMissedCalls + recoveredFollowupCost + reducedBadReviews;
  const annualRecoveryWithSoshogle = monthlyRecoveryWithSoshogle * 12;

  const netMonthlySavings = monthlyRecoveryWithSoshogle - SOSHOGLE_MONTHLY_COST;
  const netAnnualSavings = netMonthlySavings * 12;
  const roiPercentage =
    ((netAnnualSavings - SOSHOGLE_MONTHLY_COST * 12) /
      (SOSHOGLE_MONTHLY_COST * 12)) *
    100;

  return {
    monthlyLoss,
    annualLoss,
    monthlyRecoveryWithSoshogle,
    annualRecoveryWithSoshogle,
    netMonthlySavings,
    netAnnualSavings,
    roiPercentage,
    breakdown: {
      missedCallsLoss,
      lostReferralsLoss,
      manualFollowupCost,
      badReviewsLoss,
    },
  };
}

export interface WebsiteMetricsEstimate {
  estimatedAvgTicketPrice: number;
  estimatedCallsPerDay: number;
  industry: string;
}

export function estimateFromWebsite(url: string): WebsiteMetricsEstimate {
  const urlLower = url.toLowerCase();
  let industry = "general";
  let estimatedAvgTicketPrice = 1500;
  let estimatedCallsPerDay = 10;

  if (urlLower.includes("real") || urlLower.includes("estate") || urlLower.includes("property")) {
    industry = "real-estate";
    estimatedAvgTicketPrice = 5000;
    estimatedCallsPerDay = 15;
  } else if (urlLower.includes("restaurant") || urlLower.includes("food") || urlLower.includes("cafe")) {
    industry = "restaurant";
    estimatedAvgTicketPrice = 50;
    estimatedCallsPerDay = 50;
  } else if (urlLower.includes("health") || urlLower.includes("medical") || urlLower.includes("clinic")) {
    industry = "healthcare";
    estimatedAvgTicketPrice = 200;
    estimatedCallsPerDay = 30;
  } else if (urlLower.includes("salon") || urlLower.includes("spa") || urlLower.includes("beauty")) {
    industry = "beauty";
    estimatedAvgTicketPrice = 100;
    estimatedCallsPerDay = 20;
  } else if (urlLower.includes("gym") || urlLower.includes("fitness") || urlLower.includes("sport")) {
    industry = "fitness";
    estimatedAvgTicketPrice = 80;
    estimatedCallsPerDay = 25;
  } else if (urlLower.includes("service") || urlLower.includes("plumb") || urlLower.includes("electric")) {
    industry = "services";
    estimatedAvgTicketPrice = 300;
    estimatedCallsPerDay = 12;
  }

  return {
    estimatedAvgTicketPrice,
    estimatedCallsPerDay,
    industry,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}
