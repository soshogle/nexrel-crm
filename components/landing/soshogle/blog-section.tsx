"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, TrendingUp, Lightbulb } from "lucide-react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  industry: string;
  readTime: string;
  publishedAt: string;
}

const FALLBACK_POSTS = [
  {
    slug: "placeholder-1",
    title: "10 Ways Soshogle AI Can Transform Your Sales Process in 2025",
    excerpt:
      "Discover how leading businesses are using Soshogle AI to automate lead qualification, personalize outreach, and close deals faster.",
    category: "AI Automation Guide",
    readTime: "8 min read",
    gradient: "from-purple-500/20 to-pink-500/20",
    icon: <Lightbulb className="w-6 h-6" />,
  },
  {
    slug: "placeholder-2",
    title: "How MedCare Group Reduced No-Shows by 60% with Soshogle AI",
    excerpt:
      "A deep dive into how a mid-sized healthcare provider implemented Soshogle's AI appointment system and transformed patient engagement.",
    category: "Case Study",
    readTime: "12 min read",
    gradient: "from-cyan-500/20 to-blue-500/20",
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    slug: "placeholder-3",
    title: "The ROI of Soshogle AI: What 10,000 Users Taught Us",
    excerpt:
      "Data-driven insights from our platform showing how businesses achieve 3-5x ROI within 6 months of implementing Soshogle AI automation.",
    category: "Industry Insights",
    readTime: "10 min read",
    gradient: "from-green-500/20 to-emerald-500/20",
    icon: <TrendingUp className="w-6 h-6" />,
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "AI Automation Guide": <Lightbulb className="w-6 h-6" />,
  "Case Study": <BookOpen className="w-6 h-6" />,
  "Industry Insights": <TrendingUp className="w-6 h-6" />,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "AI Automation Guide": "from-purple-500/20 to-pink-500/20",
  "Case Study": "from-cyan-500/20 to-blue-500/20",
  "Industry Insights": "from-green-500/20 to-emerald-500/20",
};

export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog?limit=6")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const displayPosts = posts.length > 0 ? posts : [];

  return (
    <section id="resources" className="container mx-auto px-4 pt-8 pb-32">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-light mb-6">
          Resources & Insights
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn how Soshogle AI automation is transforming businesses. Explore
          guides, case studies, and industry insights.
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-white/10 bg-background/50 p-8 animate-pulse"
            >
              <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
              <div className="h-6 bg-white/10 rounded w-full mb-3" />
              <div className="h-4 bg-white/10 rounded w-full mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : displayPosts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {displayPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <article className="group relative rounded-3xl border border-white/10 bg-background/50 backdrop-blur-sm p-8 transition-all hover:scale-105 hover:border-primary/50 cursor-pointer h-full">
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${
                    CATEGORY_GRADIENTS[post.category] ||
                    "from-gray-500/20 to-gray-600/20"
                  } opacity-0 group-hover:opacity-100 transition-opacity -z-10`}
                />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20">
                    {CATEGORY_ICONS[post.category] || (
                      <BookOpen className="w-6 h-6" />
                    )}
                  </div>
                  <span className="text-sm text-primary font-semibold">
                    {post.category}
                    {post.industry ? ` · ${post.industry}` : ""}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {post.readTime}
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {FALLBACK_POSTS.map((post, index) => (
            <Link key={index} href="/blog">
              <article className="group relative rounded-3xl border border-white/10 bg-background/50 backdrop-blur-sm p-8 transition-all hover:scale-105 hover:border-primary/50 cursor-pointer">
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${post.gradient} opacity-0 group-hover:opacity-100 transition-opacity -z-10`}
                />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20">
                    {post.icon}
                  </div>
                  <span className="text-sm text-primary font-semibold">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {post.readTime}
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <Button
          variant="outline"
          size="lg"
          asChild
          className="border-white/20 hover:bg-white/10"
        >
          <Link href="/blog">View All Resources →</Link>
        </Button>
      </div>
    </section>
  );
}
