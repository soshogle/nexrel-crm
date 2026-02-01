"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail, Phone } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing-tiers";

interface PricingSectionProps {
  onBookDemo: () => void;
}

export function PricingSection({ onBookDemo }: PricingSectionProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("pricing_gate_token");
    if (storedToken) {
      setIsUnlocked(true);
    }
  }, []);

  const unlockPricing = async () => {
    if (!email) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/pricing-gate/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok && data?.token) {
        localStorage.setItem("pricing_gate_token", data.token);
        setIsUnlocked(true);
        setShowGate(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneCall = () => {
    fetch("/api/landing/call-click", { method: "POST" }).catch(() => undefined);
    window.location.href = "tel:+14509901011";
  };

  const handleEmail = () => {
    window.location.href = "mailto:info@soshogle.com";
  };

  const handleCTA = (ctaAction: "demo" | "contact" | "checkout") => {
    if (ctaAction === "demo") {
      onBookDemo();
      return;
    }
    if (ctaAction === "contact") {
      handleEmail();
      return;
    }
    handleEmail();
  };

  return (
    <section id="pricing" className="container mx-auto px-4 pt-8 pb-32">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-light mb-6">Flexible pricing for every team</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Choose the plan that fits your business. Upgrade anytime as your AI workforce grows.
        </p>
        {!isUnlocked && (
          <div className="mt-6">
            <Button
              onClick={() => setShowGate(true)}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              View Pricing Details
            </Button>
          </div>
        )}
      </div>

      <div id="pricing-plans" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-3xl border p-8 transition-all hover:scale-105 ${
              tier.popular
                ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/50 shadow-xl shadow-primary/20"
                : "bg-background/50 backdrop-blur-sm border-white/10"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-sm font-semibold">
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              {tier.idealFor && (
                <div className="mb-3">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide">{tier.idealFor}</p>
                </div>
              )}

            <div className="flex items-baseline gap-2 mb-3 relative">
              {tier.priceMonthly > 0 ? (
                <>
                  <span
                    className={`text-5xl font-bold transition ${
                      isUnlocked ? "" : "blur-md select-none"
                    }`}
                  >
                    ${tier.priceMonthly}
                  </span>
                  <span
                    className={`text-muted-foreground transition ${
                      isUnlocked ? "" : "blur-sm select-none"
                    }`}
                  >
                    /month
                  </span>
                </>
              ) : (
                <span className="text-5xl font-bold">Custom</span>
              )}
            </div>
              <p className="text-muted-foreground text-sm">{tier.description}</p>
            </div>

            <div className="mb-6 space-y-2 pb-6 border-b border-white/10">
              {tier.voiceMinutes && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Voice Minutes</span>
                  <span className="font-semibold">{tier.voiceMinutes}</span>
                </div>
              )}
              {tier.smsMessages && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SMS Messages</span>
                  <span className="font-semibold">{tier.smsMessages}</span>
                </div>
              )}
              {tier.emails && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Emails</span>
                  <span className="font-semibold">{tier.emails}</span>
                </div>
              )}
              {tier.teamMembers && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <span className="font-semibold">{tier.teamMembers}</span>
                </div>
              )}
              {tier.contacts && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contacts</span>
                  <span className="font-semibold">{tier.contacts}</span>
                </div>
              )}
            </div>

            {tier.nexrelHub && tier.nexrelHub.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-primary">Nexrel Intelligence Hub</h4>
                <ul className="space-y-2">
                  {tier.nexrelHub.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.apiAccess && tier.apiAccess.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-primary">API Access</h4>
                <ul className="space-y-2">
                  {tier.apiAccess.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.aiWorkforce && tier.aiWorkforce.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-primary">AI Workforce</h4>
                <ul className="space-y-2">
                  {tier.aiWorkforce.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.growthMarketing && tier.growthMarketing.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-primary">Growth & Marketing</h4>
                <ul className="space-y-2">
                  {tier.growthMarketing.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.advancedOps && tier.advancedOps.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-primary">Advanced Operations</h4>
                <ul className="space-y-2">
                  {tier.advancedOps.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.analyticsReporting && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2 text-primary">Analytics & Reporting</h4>
                <p className="text-xs">{tier.analyticsReporting}</p>
              </div>
            )}

            {tier.onboardingSupport && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2 text-primary">Onboarding & Support</h4>
                <p className="text-xs">{tier.onboardingSupport}</p>
              </div>
            )}

            <Button
              onClick={() => {
                if (!isUnlocked) {
                  setShowGate(true);
                  return;
                }
                handleCTA(tier.ctaAction);
              }}
              className={`w-full ${
                tier.popular
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-secondary hover:bg-secondary/90"
              }`}
            >
              {isUnlocked ? tier.ctaText : "Unlock Pricing"}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">
          Still have questions? We&apos;re here to help.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button variant="outline" onClick={handlePhoneCall}>
            <Phone className="mr-2 h-4 w-4" />
            Call Us
          </Button>
          <Button variant="outline" onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Email Sales
          </Button>
        </div>
      </div>

      {showGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-2xl font-light">Unlock Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Enter your email to view detailed pricing.
              </p>
            </div>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={unlockPricing}
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? "Unlocking..." : "View Pricing"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowGate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
