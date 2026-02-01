"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, TrendingUp, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface BlogPost {
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  icon: React.ReactNode;
  gradient: string;
}

const blogPosts: BlogPost[] = [
  {
    category: "AI Automation Guide",
    title: "10 Ways AI Can Transform Your Sales Process in 2025",
    excerpt: "Discover how leading businesses are using AI to automate lead qualification, personalize outreach, and close deals faster. Learn practical strategies you can implement today.",
    readTime: "8 min read",
    icon: <Lightbulb className="w-6 h-6" />,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    category: "Case Study",
    title: "How MedCare Group Reduced No-Shows by 60% with AI",
    excerpt: "A deep dive into how a mid-sized healthcare provider implemented Soshogle's AI appointment system and transformed patient engagement while saving $250K monthly.",
    readTime: "12 min read",
    icon: <BookOpen className="w-6 h-6" />,
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  {
    category: "Industry Insights",
    title: "The ROI of AI: What 10,000 Users Taught Us About Business Growth",
    excerpt: "Data-driven insights from our platform showing how businesses across industries achieve 3-5x ROI within 6 months of implementing AI automation.",
    readTime: "10 min read",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    category: "AI Automation Guide",
    title: "Building Your AI Business Ecosystem: A Step-by-Step Framework",
    excerpt: "Learn how to design and deploy a custom AI ecosystem tailored to your business needs, from initial assessment to full-scale implementation.",
    readTime: "15 min read",
    icon: <Lightbulb className="w-6 h-6" />,
    gradient: "from-orange-500/20 to-red-500/20",
  },
  {
    category: "Case Study",
    title: "From 50 to 5,000 Leads: TechFlow's AI-Powered Growth Story",
    excerpt: "How a small SaaS startup used Soshogle's AI automation to scale their lead generation 100x while maintaining personalized customer experiences.",
    readTime: "9 min read",
    icon: <BookOpen className="w-6 h-6" />,
    gradient: "from-indigo-500/20 to-purple-500/20",
  },
  {
    category: "Industry Insights",
    title: "AI vs. Traditional Nexrel: The Data Speaks for Itself",
    excerpt: "Comprehensive comparison of AI-powered Nexrels versus traditional systems, backed by real performance metrics from 10,000+ businesses.",
    readTime: "11 min read",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-pink-500/20 to-rose-500/20",
  },
];

export function BlogSection() {
  const handleCardClick = (postIndex: number) => {
    const post = blogPosts[postIndex];
    toast.info(`${post.category}: ${post.title}`, {
      description: "This content is coming soon. Stay tuned for our latest insights and case studies!",
    });
  };

  const handleViewAll = () => {
    toast.info("Resources Library Coming Soon", {
      description: "We're building a comprehensive library of guides, case studies, and insights. Check back soon!",
    });
  };

  return (
    <section id="resources" className="container mx-auto px-4 pt-8 pb-32">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-light mb-6">Resources & Insights</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn how AI automation is transforming businesses. Explore guides, case studies, and industry insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {blogPosts.map((post, index) => (
          <article
            key={index}
            onClick={() => handleCardClick(index)}
            className="group relative rounded-3xl border border-white/10 bg-background/50 backdrop-blur-sm p-8 transition-all hover:scale-105 hover:border-primary/50 cursor-pointer"
          >
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${post.gradient} opacity-0 group-hover:opacity-100 transition-opacity -z-10`} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                {post.icon}
              </div>
              <span className="text-sm text-primary font-semibold">{post.category}</span>
            </div>

            <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h3>

            <p className="text-muted-foreground mb-4 leading-relaxed">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{post.readTime}</span>
              <ArrowRight className="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" />
            </div>
          </article>
        ))}
      </div>

      <div className="text-center mt-12">
        <Button
          variant="outline"
          size="lg"
          onClick={handleViewAll}
          className="border-white/20 hover:bg-white/10"
        >
          View All Resources →
        </Button>
      </div>
    </section>
  );
}
