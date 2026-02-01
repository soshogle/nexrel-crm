"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  calculateROI,
  estimateFromWebsite,
  formatCurrency,
  formatCompactNumber,
  ROIInput,
  ROIOutput,
} from "@/lib/roi-calculator";

interface ROICalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onBookDemo?: () => void;
}

export function ROICalculator({ isOpen, onClose, onBookDemo }: ROICalculatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [formData, setFormData] = useState<ROIInput>({
    websiteUrl: "",
    avgTicketPrice: 1500,
    callsPerDay: 10,
    missedCallsPerDay: 3,
    lostCustomerPercentage: 0.5,
    customerLifetimeValue: 5000,
    lostReferralsPerMonth: 2,
    manualFollowupHoursPerWeek: 10,
    badReviewsPerMonth: 1,
    hourlyRate: 35,
    badReviewImpactValue: 300,
  });

  const [results, setResults] = useState<ROIOutput | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const questions = [
    {
      key: "website",
      label: "Business Website",
      helper: "Enter your website URL and we will prefill key values.",
      type: "url",
    },
    {
      key: "avgTicketPrice",
      label: "Average Ticket Price",
      helper: "Average revenue per customer.",
      type: "number",
    },
    {
      key: "callsPerDay",
      label: "Calls Per Day",
      helper: "Total inbound calls per day.",
      type: "number",
    },
    {
      key: "missedCallsPerDay",
      label: "Missed Calls Per Day",
      helper: "How many calls are missed daily?",
      type: "number",
    },
    {
      key: "lostCustomerPercentage",
      label: "Lost Customer Rate",
      helper: "Percentage of missed calls that become lost customers.",
      type: "range",
      min: 0,
      max: 100,
    },
    {
      key: "customerLifetimeValue",
      label: "Customer Lifetime Value",
      helper: "Total revenue per customer over their lifetime.",
      type: "number",
    },
    {
      key: "lostReferralsPerMonth",
      label: "Lost Referrals Per Month",
      helper: "Estimated missed referral opportunities.",
      type: "number",
    },
    {
      key: "manualFollowupHoursPerWeek",
      label: "Manual Follow-up Hours",
      helper: "Weekly hours spent on manual follow-up.",
      type: "number",
    },
    {
      key: "badReviewsPerMonth",
      label: "Bad Reviews Per Month",
      helper: "Estimated negative reviews per month.",
      type: "number",
    },
  ];

  const handleWebsiteChange = (url: string) => {
    setWebsiteUrl(url);
    if (url && url.includes(".")) {
      const estimates = estimateFromWebsite(url);
      setFormData((prev) => ({
        ...prev,
        websiteUrl: url,
        avgTicketPrice: estimates.estimatedAvgTicketPrice,
        callsPerDay: estimates.estimatedCallsPerDay,
      }));
    }
  };

  const handleInputChange = (key: string, value: number) => {
    if (key === "lostCustomerPercentage") {
      setFormData((prev) => ({
        ...prev,
        [key]: value / 100,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleCalculate = () => {
    const roiResults = calculateROI(formData);
    setResults(roiResults);
    setShowResults(true);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCalculate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !results) return;

    setIsSubmittingEmail(true);
    try {
      const response = await fetch("/api/roi/send-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          roiData: results,
          businessData: formData,
          language: "en",
        }),
      });

      await fetch("/api/roi/send-demo-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "ROI Calculator User",
          email: userEmail,
          language: "en",
          source: "homepage",
        }),
      });

      await fetch("/api/nexrel/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "ROI Calculator",
          lastName: "User",
          email: userEmail,
          phone: "",
          companyName: "",
          industry: "",
          websiteUrl: formData.websiteUrl || "",
          avgTicketPrice: formData.avgTicketPrice,
          callsPerDay: formData.callsPerDay,
          missedCallsPerDay: formData.missedCallsPerDay,
          lostCustomerPercentage: Math.round(formData.lostCustomerPercentage * 100),
          customerLifetimeValue: formData.customerLifetimeValue,
          lostReferralsPerMonth: formData.lostReferralsPerMonth,
          manualFollowupHoursPerWeek: formData.manualFollowupHoursPerWeek,
          badReviewsPerMonth: formData.badReviewsPerMonth,
          annualLoss: Math.round(results.annualLoss),
          monthlyRecovery: Math.round(results.monthlyRecoveryWithSoshogle),
          annualRecovery: Math.round(results.annualRecoveryWithSoshogle),
          source: "homepage_modal",
        }),
      });

      if (response.ok) {
        setEmailSubmitted(true);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setShowResults(false);
    setResults(null);
    setWebsiteUrl("");
    setUserEmail("");
    setEmailSubmitted(false);
    setFormData({
      websiteUrl: "",
      avgTicketPrice: 1500,
      callsPerDay: 10,
      missedCallsPerDay: 3,
      lostCustomerPercentage: 0.5,
      customerLifetimeValue: 5000,
      lostReferralsPerMonth: 2,
      manualFollowupHoursPerWeek: 10,
      badReviewsPerMonth: 1,
      hourlyRate: 35,
      badReviewImpactValue: 300,
    });
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentStep];
  const currentValue = formData[currentQuestion.key as keyof ROIInput];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card border border-white/10 rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!showResults ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">ROI Calculator</h2>
              <p className="text-sm text-muted-foreground">
                Answer a few questions to estimate how much revenue you can recover with Soshogle.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {questions.length}
                </span>
                <span className="text-xs font-medium">
                  {Math.round(((currentStep + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">
                {currentQuestion.label}
              </label>
              <p className="text-xs text-muted-foreground mb-4">
                {currentQuestion.helper}
              </p>

              {currentQuestion.type === "url" && (
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => handleWebsiteChange(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                />
              )}

              {currentQuestion.type === "number" && (
                <input
                  type="number"
                  value={currentValue as number}
                  onChange={(e) =>
                    handleInputChange(currentQuestion.key, Number(e.target.value))
                  }
                  className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  min="0"
                />
              )}

              {currentQuestion.type === "range" && (
                <div className="space-y-4">
                  <input
                    type="range"
                    min={currentQuestion.min || 0}
                    max={currentQuestion.max || 100}
                    value={(currentValue as number) * 100}
                    onChange={(e) =>
                      handleInputChange(currentQuestion.key, Number(e.target.value))
                    }
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center">
                    <span className="text-2xl font-light text-primary">
                      {Math.round((currentValue as number) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {currentStep === questions.length - 1 ? "Calculate" : "Next"}
              </Button>
            </div>
          </>
        ) : results ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-4">Your Business Impact Analysis</h2>

              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Current Annual Loss</div>
                <div className="text-2xl font-light text-red-400">
                  {formatCompactNumber(results.annualLoss)}
                </div>
              </div>

              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Annual Loss With Soshogle</div>
                <div className="text-2xl font-light text-yellow-400">
                  {formatCompactNumber(results.annualLoss - results.annualRecoveryWithSoshogle)}
                </div>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Your Annual Savings</div>
                <div className="text-3xl font-light text-green-400">
                  {formatCompactNumber(results.annualRecoveryWithSoshogle)}
                </div>
              </div>
            </div>

            <div className="mb-8 space-y-3">
              <h3 className="text-sm font-medium">Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Missed calls</span>
                  <span>{formatCurrency(results.breakdown.missedCallsLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lost referrals</span>
                  <span>{formatCurrency(results.breakdown.lostReferralsLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manual follow-up</span>
                  <span>{formatCurrency(results.breakdown.manualFollowupCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bad reviews</span>
                  <span>{formatCurrency(results.breakdown.badReviewsLoss)}</span>
                </div>
              </div>
            </div>

            {!emailSubmitted ? (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email me the results
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingEmail || !userEmail}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmittingEmail ? "Sending..." : "Email Results"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (onBookDemo) {
                      onBookDemo();
                    } else {
                      window.location.href = "https://calendly.com/soshogle/30min";
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Book a Demo
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400 font-medium">
                    Email sent successfully!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check your inbox for your personalized ROI analysis.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (onBookDemo) {
                      onBookDemo();
                    } else {
                      window.location.href = "https://calendly.com/soshogle/30min";
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Book a Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
                >
                  Run Calculator Again
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
