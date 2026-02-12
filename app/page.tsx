
 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone } from "lucide-react";
import { MobileNav } from "@/components/landing/soshogle/mobile-nav";
import { DemoModal } from "@/components/landing/soshogle/demo-modal";
import { CalendlyModal } from "@/components/landing/soshogle/calendly-modal";
import { ROICalculator } from "@/components/landing/soshogle/roi-calculator";
import { LogoStrip } from "@/components/landing/soshogle/logo-strip";
import { TestimonialsCarousel } from "@/components/landing/soshogle/testimonials-carousel";
import { PricingSection } from "@/components/landing/soshogle/pricing-section";
import { BlogSection } from "@/components/landing/soshogle/blog-section";
import { ElevenLabsAgent } from "@/components/landing/soshogle/elevenlabs-agent";
import { GeometricShapes } from "@/components/landing/soshogle/geometric-shapes";
import { useLandingLanguage } from "@/hooks/use-landing-language";

interface LandingLead {
  id: string;
  businessName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  createdAt: string;
}

interface LandingCallLog {
  id: string;
  leadId?: string | null;
  status: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  duration?: number | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  createdAt: string;
  elevenLabsConversationId?: string | null;
}

const hero = {
  title: "Breakthrough AI from",
  highlight: "Data to Deployment",
  subtitle: "We Help Small & Medium Businesses Operate Like Big Corporations With AI",
  emphasis: "without the cost",
};

const valueSteps = [
  {
    step: "1",
    title: "Drive Traffic",
    description: "Use our organic & paid lead generation systems to continuously have your pipeline full.",
  },
  {
    step: "2",
    title: "Capture Interest",
    description: "From email list building to optimized sales funnels, the power is in owning the data.",
  },
  {
    step: "3",
    title: "AI Growth Infrastructure",
    description: "Integrate our AI systems to never lose another sale, lead, or opportunity.",
  },
  {
    step: "4",
    title: "Sales and Beyond",
    description: "Generate repeat revenue from the same client while lowering acquisition costs.",
  },
];

const aiStaffFeatures = [
  {
    title: "24/7 Availability",
    description: "Your AI staff works around the clock, handling calls and booking appointments while you sleep.",
  },
  {
    title: "30+ Languages",
    description: "Communicate with customers in their preferred language, expanding your market reach.",
  },
  {
    title: "Full Business Understanding",
    description: "Trained on your packages, policies, and processes to provide accurate information.",
  },
];

const nexrelFeatures = [
  "Capture leads automatically",
  "Nurture with AI-powered campaigns",
  "Close deals faster with automation",
  "Track everything in one dashboard",
];

const featureGrid = [
  {
    title: "AI Content Creation Suite",
    description: "Generate automated posts, avatar videos, and images with AI. Never run out of content.",
  },
  {
    title: "AI Ads Simulator",
    description: "Test campaigns with 250,000 virtual users before spending a dollar. Optimize before launch.",
  },
  {
    title: "Sales Funnel Automations",
    description: "Automated funnels that convert visitors into customers 24/7.",
  },
  {
    title: "Lead Capture Automations",
    description: "Never miss a lead with intelligent capture and routing.",
  },
  {
    title: "Workflow Automations",
    description: "Automate repetitive tasks and focus on growth.",
  },
  {
    title: "Automated Referral Campaigns",
    description: "Turn customers into advocates with automated referral programs.",
  },
  {
    title: "Call Automated System",
    description: "AI-powered call handling and appointment booking.",
  },
  {
    title: "Marketing Automation",
    description: "Email, SMS, and social media campaigns on autopilot.",
  },
];

const ecosystem = {
  title: "AI Business Ecosystem",
  subtitle:
    "We don't just give you tools—we build a complete AI-powered infrastructure customized for your industry, workflow, and growth goals.",
  industry: {
    title: "Industry-Specific AI Models",
    description:
      "Our AI learns your business domain—whether you're in real estate, healthcare, e-commerce, or professional services. Every recommendation, automation, and insight is tailored to your market.",
    features: [
      "Custom training on your business data",
      "Industry-specific language and terminology",
      "Compliance and regulatory awareness",
    ],
  },
  workflow: {
    title: "Adaptive Workflow Integration",
    description:
      "Our system maps to your existing processes and enhances them with AI. No forced changes—just intelligent augmentation that makes your team more productive.",
    features: [
      "Seamless integration with existing tools",
      "Automated workflow optimization",
      "Real-time performance analytics",
    ],
  },
  stack: [
    {
      title: "Neural Lead Scoring",
      description: "AI predicts conversion probability with 94% accuracy",
    },
    {
      title: "Predictive Analytics Engine",
      description: "Forecast revenue and identify growth opportunities",
    },
    {
      title: "Autonomous Optimization",
      description: "System self-improves based on your results",
    },
  ],
};

function HomePage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);
  const [isRoiOpen, setIsRoiOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [showHeroAgent, setShowHeroAgent] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLeads, setAdminLeads] = useState<LandingLead[]>([]);
  const [adminCalls, setAdminCalls] = useState<LandingCallLog[]>([]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const homeAgentId =
    process.env.NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID ||
    "agent_3901k9zczeavedss273jfg525gnb";
  const heroAgentId =
    process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID ||
    "agent_0301kap49d2afq5vp04v0r6p5k6q";
  const preferredLanguage = useLandingLanguage();

  const scrollToPricing = () => {
    const section = document.getElementById("pricing");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadAdminData = async (tokenOverride?: string) => {
    const token = tokenOverride || adminToken;
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await fetch("/api/landing-admin/summary", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        setAdminError("Invalid admin token.");
        setAdminLoading(false);
        return;
      }
      const data = await response.json();
      setAdminLeads(data.leads || []);
      setAdminCalls(data.calls || []);
    } catch (error) {
      setAdminError("Failed to load admin data.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("landing_admin_token");
    setAdminToken(null);
    setAdminLeads([]);
    setAdminCalls([]);
  };

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await fetch("/api/landing-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        setAdminError("Invalid credentials.");
        setAdminLoading(false);
        return;
      }
      setAdminToken(data.token);
      localStorage.setItem("landing_admin_token", data.token);
      setShowAdminLogin(false);
      await loadAdminData(data.token);
    } catch (error) {
      setAdminError("Failed to sign in.");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("landing_admin_token");
    if (token) {
      setAdminToken(token);
      loadAdminData(token);
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        setShowAdminLogin(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="dark min-h-screen bg-black text-white">
      <MobileNav
        onBookDemo={() => setIsCalendlyOpen(true)}
        onTryDemo={() => setIsDemoOpen(true)}
        onOpenRoi={() => setIsRoiOpen(true)}
      />
      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
      <CalendlyModal isOpen={isCalendlyOpen} onClose={() => setIsCalendlyOpen(false)} />
      <ROICalculator
        isOpen={isRoiOpen}
        onClose={() => setIsRoiOpen(false)}
        onBookDemo={() => setIsCalendlyOpen(true)}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-light mb-6 leading-tight">
                {hero.title}{' '}
                <span className="gradient-text">{hero.highlight}</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8">
                {hero.subtitle}{' '}
                <span className="text-secondary font-medium">{hero.emphasis}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => setIsCalendlyOpen(true)}>
                  Book a Demo →
                </Button>
                <Button size="lg" variant="outline" className="border-white/20" onClick={() => setIsDemoOpen(true)}>
                  Try Interactive Demo →
                </Button>
                <Button size="lg" variant="outline" className="border-white/20" onClick={() => setIsRoiOpen(true)}>
                  AI ROI Analyzer →
                </Button>
              </div>
            </div>
            <div className="relative">
              {!showHeroAgent ? (
                <div className="relative">
                  <div className="relative h-[300px] md:h-[400px] lg:h-[500px]">
                    <GeometricShapes audioLevel={audioLevel} isAgentSpeaking={isAgentSpeaking} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => setShowHeroAgent(true)}
                        className="group p-8 rounded-full bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 hover:border-primary/50 transition-all hover:scale-110"
                      >
                        <svg className="w-16 h-16 md:w-20 md:h-20 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <ElevenLabsAgent
                    agentId={heroAgentId}
                    onAudioLevel={setAudioLevel}
                    onAgentSpeakingChange={setIsAgentSpeaking}
                    onConversationEnd={() => undefined}
                    dynamicVariables={{
                      company_name: "Soshogle",
                      website_url: "https://www.soshogle.com",
                      user_name: "Visitor",
                      industry: "Technology",
                      preferred_language: preferredLanguage,
                    }}
                  />
                  <button
                    onClick={() => setShowHeroAgent(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-4">
            <button
              onClick={scrollToPricing}
              className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 transition-all"
            >
              Small & Medium Businesses
            </button>
            <button
              onClick={scrollToPricing}
              className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 transition-all"
            >
              Enterprises
            </button>
            <button
              onClick={scrollToPricing}
              className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 transition-all"
            >
              Agencies
            </button>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl md:text-4xl font-light mb-6">Our Partners & Clients</h2>
          </div>
        </div>
      </section>

      <LogoStrip />

      {/* Value */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-4">
              Add An Extra <span className="gradient-text">$500k+</span> in Annual Recurring Revenue
            </h2>
            <p className="text-xl text-gray-400">Follow our simple 4-step process to transform your business</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {valueSteps.map((item) => (
              <Card key={item.step} className="p-6 bg-gray-900 border-gray-800">
                <div className="text-5xl font-light text-primary/40 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Staff */}
      <section id="ai-staff" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-light mb-4">AI Staff That Never Sleeps</h2>
            <p className="text-xl text-gray-400">Answer up to 200 calls per minute. Never miss an opportunity.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {aiStaffFeatures.map((feature) => (
              <Card key={feature.title} className="p-6 bg-gray-900 border-gray-800">
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </Card>
            ))}
          </div>
          <div className="mt-12">
            <ElevenLabsAgent
              agentId={homeAgentId}
              dynamicVariables={{ preferred_language: preferredLanguage }}
            />
          </div>
        </div>
      </section>

      {/* Nexrel */}
      <section id="nexrel" className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <span className="text-sm font-medium text-primary">
                Next-Generation Relationship Intelligence & Orchestration
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-light mb-4">
              <span className="gradient-text">Nexrel</span>
            </h2>
            <p className="text-lg text-gray-400 italic mb-6">
              Nexrel is an AI brain hub that manages every relationship in your ecosystem—customers, tools, workflows,
              and data—by cloning and integrating app capabilities on demand.
            </p>
            <div className="space-y-3">
              {nexrelFeatures.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="mt-8 bg-primary hover:bg-primary/90" asChild>
              <Link href="/features">Explore Nexrel Features →</Link>
            </Button>
          </div>
          <div className="bg-card border border-white/10 rounded-2xl overflow-hidden">
            <video
              src="/nexrel-ecosystem-flow.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-auto"
              poster="/video-thumbnail-hero.jpg"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-light">
              Everything You Need. <span className="gradient-text">Nothing You Don&apos;t.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featureGrid.map((feature) => (
              <Card key={feature.title} className="p-6 bg-gray-900 border-gray-800">
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-light mb-4">
              <span className="gradient-text">{ecosystem.title}</span> Tailored for You
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">{ecosystem.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="p-8 bg-gray-900 border-gray-800">
              <h3 className="text-2xl font-semibold mb-4 gradient-text">{ecosystem.industry.title}</h3>
              <p className="text-gray-400 mb-6">{ecosystem.industry.description}</p>
              <ul className="space-y-3">
                {ecosystem.industry.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-8 bg-gray-900 border-gray-800">
              <h3 className="text-2xl font-semibold mb-4 gradient-text">{ecosystem.workflow.title}</h3>
              <p className="text-gray-400 mb-6">{ecosystem.workflow.description}</p>
              <ul className="space-y-3">
                {ecosystem.workflow.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-white/10 p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-center">
              Proprietary Nexrel Technology Stack
            </h3>
            <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
              Built from the ground up with cutting-edge AI, our platform combines multiple breakthrough technologies
              into one unified system.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {ecosystem.stack.map((item) => (
                <div key={item.title} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-primary/40" />
                  </div>
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-light mb-4">Who we worked with</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              From small businesses to enterprise organizations, our clients have transformed their operations with AI.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/20 border border-primary/30 mt-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary font-semibold">10k+ users on our platform</span>
            </div>
          </div>
          <TestimonialsCarousel />
        </div>
      </section>
      <PricingSection onBookDemo={() => setIsCalendlyOpen(true)} />

      <BlogSection />

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl border border-white/10 p-12 md:p-20 text-center">
            <h2 className="text-4xl md:text-6xl font-light mb-6">Ready to Transform Your Business?</h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of businesses already growing with Soshogle.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6" asChild>
              <Link href="#contact">Get Started Today →</Link>
            </Button>
          </div>
        </div>
      </section>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-2xl font-light">Admin Sign In</h3>
              <p className="text-sm text-muted-foreground">
                Enter your admin credentials to access landing analytics.
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={adminUsername}
                onChange={(event) => setAdminUsername(event.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
              />
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleAdminLogin}
                disabled={adminLoading || !adminUsername || !adminPassword}
              >
                {adminLoading ? "Signing in..." : "Sign In"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowAdminLogin(false)}
              >
                Cancel
              </Button>
              {adminError && <p className="text-sm text-red-400">{adminError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h2>
          <p className="text-xl text-gray-400 mb-10">We&apos;re here to help you transform your business with AI</p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-gray-900 border-gray-800">
              <div className="text-4xl mb-4">
                <Mail className="h-8 w-8 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <a href="mailto:info@soshogle.com" className="text-primary hover:underline text-lg">
                info@soshogle.com
              </a>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800">
              <div className="text-4xl mb-4">
                <Phone className="h-8 w-8 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Call Us</h3>
              <a
                href="tel:+14509901011"
                onClick={() => fetch("/api/landing/call-click", { method: "POST" }).catch(() => undefined)}
                className="text-primary hover:underline text-lg"
              >
                +1 (450) 990-1011
              </a>
            </Card>
          </div>
        </div>
      </section>

      {adminToken && (
        <section id="landing-admin" className="py-20">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-light">Landing Admin</h2>
              <p className="text-gray-400">
                View leads and call recordings captured from the landing page.
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={handleAdminLogout}>
                  Log out
                </Button>
              </div>
            </div>

            <div className="space-y-12">
              <section>
                <h3 className="text-2xl font-light mb-4">Captured Leads</h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/5 text-left">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLeads.map((lead) => (
                        <tr key={lead.id} className="border-t border-white/10">
                          <td className="px-4 py-3 text-gray-300">
                            {new Date(lead.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{lead.contactPerson || "—"}</td>
                          <td className="px-4 py-3">{lead.email || "—"}</td>
                          <td className="px-4 py-3">{lead.phone || "—"}</td>
                          <td className="px-4 py-3">{lead.source || "—"}</td>
                          <td className="px-4 py-3">{lead.businessName}</td>
                        </tr>
                      ))}
                      {adminLeads.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-gray-400" colSpan={6}>
                            No leads yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-light mb-4">Calls & Conversations</h3>
                <div className="space-y-4">
                  {adminCalls.map((call) => {
                    const audioUrl =
                      call.recordingUrl ||
                      (call.elevenLabsConversationId
                        ? `/api/calls/audio/${call.elevenLabsConversationId}`
                        : null);

                    return (
                      <div key={call.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-gray-400">
                              {new Date(call.createdAt).toLocaleString()}
                            </div>
                            <div className="text-base font-semibold">
                              {call.direction} • {call.status}
                            </div>
                            <div className="text-sm text-gray-300">
                              From {call.fromNumber} → {call.toNumber}
                            </div>
                          </div>
                          {call.duration && (
                            <div className="text-sm text-gray-300">Duration: {call.duration}s</div>
                          )}
                        </div>
                        {audioUrl && (
                          <div className="mt-3">
                            <audio controls src={audioUrl} className="w-full" />
                          </div>
                        )}
                        {call.transcript && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-primary">View transcript</summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-300">
                              {call.transcript}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                  {adminCalls.length === 0 && (
                    <div className="text-gray-400">No conversations logged yet.</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold gradient-text mb-3">Soshogle</h4>
              <p className="text-sm text-gray-400">AI-powered business growth platform</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="#features" className="block hover:text-white">
                  Features
                </Link>
                <Link href="#nexrel" className="block hover:text-white">
                  Nexrel
                </Link>
                <Link href="#ai-staff" className="block hover:text-white">
                  AI Sales
                </Link>
                <Link href="/blog" className="block hover:text-white">
                  Blog
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="/about" className="block hover:text-white">
                  About
                </Link>
                <Link href="/contact" className="block hover:text-white">
                  Contact
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="/privacy" className="block hover:text-white">
                  Privacy
                </Link>
                <Link href="/terms" className="block hover:text-white">
                  Terms
                </Link>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © Soshogle | 2025 | All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
