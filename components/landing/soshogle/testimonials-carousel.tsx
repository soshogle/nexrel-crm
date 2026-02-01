"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CaseStudy {
  id: string;
  company: string;
  industry: string;
  logo: string;
  testimonial: string;
  author: string;
  role: string;
  metrics: {
    label1: string;
    value1: string;
    desc1: string;
    label2: string;
    value2: string;
    desc2: string;
    label3: string;
    value3: string;
    desc3: string;
  };
}

const caseStudies: CaseStudy[] = [
  {
    id: "testimonial1",
    company: "Meesho",
    industry: "E-commerce • Marketplace",
    logo: "https://soshogle.com/meesho-logo.png",
    testimonial: "Meesho automates over 60,000 customer support calls per day in Hindi and English",
    author: "Operations Team",
    role: "Customer Support",
    metrics: {
      label1: "Calls Automated",
      value1: "60K/day",
      desc1: "multilingual support calls",
      label2: "Languages",
      value2: "2 languages",
      desc2: "Hindi and English",
      label3: "Cost Reduction",
      value3: "75% savings",
      desc3: "in support costs",
    },
  },
  {
    id: "testimonial2",
    company: "99acres & NoBroker",
    industry: "Real Estate • PropTech",
    logo: "https://soshogle.com/99acres-logo.png",
    testimonial: "99acres and NoBroker use natural-sounding AI agents to qualify leads and schedule site visits",
    author: "Sales Team",
    role: "Lead Management",
    metrics: {
      label1: "Lead Qualification",
      value1: "24/7",
      desc1: "automated qualification",
      label2: "Conversion Rate",
      value2: "40% increase",
      desc2: "in qualified leads",
      label3: "Response Time",
      value3: "Instant",
      desc3: "immediate engagement",
    },
  },
  {
    id: "testimonial3",
    company: "Cars24",
    industry: "Automotive • Marketplace",
    logo: "https://soshogle.com/cars24-logo.png",
    testimonial: "Cars24 uses voice AI tech to turn 20,000 multilingual customer conversations each month into actionable insights leading to a 50% faster issue resolution",
    author: "Customer Success",
    role: "Operations Manager",
    metrics: {
      label1: "Conversations",
      value1: "20K/month",
      desc1: "multilingual conversations",
      label2: "Resolution Speed",
      value2: "50% faster",
      desc2: "issue resolution",
      label3: "Insights",
      value3: "Real-time",
      desc3: "actionable data",
    },
  },
  {
    id: "testimonial4",
    company: "Pocket FM, Kuku FM, Sharechat",
    industry: "Media • Content Creation",
    logo: "https://soshogle.com/pocketfm-logo.png",
    testimonial: "Pocket FM, Kuku FM, Sharechat use voice AI to produce multilingual storytelling, trailers, and audiobooks reducing up to 90% production cost",
    author: "Content Team",
    role: "Production Manager",
    metrics: {
      label1: "Cost Savings",
      value1: "90% reduction",
      desc1: "in production costs",
      label2: "Languages",
      value2: "15+ languages",
      desc2: "multilingual content",
      label3: "Production Speed",
      value3: "10x faster",
      desc3: "content creation",
    },
  },
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % caseStudies.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + caseStudies.length) % caseStudies.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % caseStudies.length);
  };

  const currentCase = caseStudies[currentIndex];

  return (
    <div className="relative">
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl border border-white/10 p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 flex items-center justify-center bg-white rounded-xl p-3">
                <img src={currentCase.logo} alt={`${currentCase.company} logo`} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{currentCase.company}</h3>
                <p className="text-muted-foreground">{currentCase.industry}</p>
              </div>
            </div>

            <blockquote className="text-lg leading-relaxed mb-6">
              &quot;{currentCase.testimonial}&quot;
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold">
                {currentCase.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{currentCase.author}</p>
                <p className="text-sm text-muted-foreground">{currentCase.role}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="text-sm text-muted-foreground mb-2">{currentCase.metrics.label1}</div>
              <div className="text-4xl font-bold gradient-text">{currentCase.metrics.value1}</div>
              <div className="text-sm text-muted-foreground mt-1">{currentCase.metrics.desc1}</div>
            </div>

            <div className="bg-background/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="text-sm text-muted-foreground mb-2">{currentCase.metrics.label2}</div>
              <div className="text-4xl font-bold gradient-text">{currentCase.metrics.value2}</div>
              <div className="text-sm text-muted-foreground mt-1">{currentCase.metrics.desc2}</div>
            </div>

            <div className="bg-background/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="text-sm text-muted-foreground mb-2">{currentCase.metrics.label3}</div>
              <div className="text-2xl font-bold text-primary">{currentCase.metrics.value3}</div>
              <div className="text-sm text-muted-foreground mt-1">{currentCase.metrics.desc3}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <Button variant="outline" size="icon" onClick={goToPrevious} className="rounded-full border-white/20">
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex gap-2">
          {caseStudies.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsAutoPlaying(false);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-primary w-8" : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <Button variant="outline" size="icon" onClick={goToNext} className="rounded-full border-white/20">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
