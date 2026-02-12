"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, TrendingUp, Lightbulb } from "lucide-react";
import { MobileNav } from "@/components/landing/soshogle/mobile-nav";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  industry: string;
  readTime: string;
  problemImage?: string | null;
  solutionImage?: string | null;
  publishedAt: string;
}

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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog?limit=24")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dark min-h-screen bg-black text-white">
      <MobileNav
        onBookDemo={() => window.location.href = "mailto:info@soshogle.com"}
        onTryDemo={() => window.location.href = "/#nexrel"}
        onOpenRoi={() => window.location.href = "/#pricing"}
      />

      <main className="container mx-auto px-4 pt-8 pb-32">
        <div className="max-w-4xl mx-auto mb-16">
          <Link href="/" className="text-primary hover:underline text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-light mb-6">
            Resources & Insights
          </h1>
          <p className="text-xl text-muted-foreground">
            How Soshogle AI is transforming businesses across industries. Problem → Solution.
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
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground max-w-2xl mx-auto">
            <p className="text-lg mb-4">
              No posts yet. New industry insights are published automatically—check back soon!
            </p>
            <Link href="/#resources" className="text-primary hover:underline">
              View placeholder resources on the home page →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <article className="group relative rounded-3xl border border-white/10 bg-background/50 backdrop-blur-sm p-8 transition-all hover:scale-105 hover:border-primary/50 cursor-pointer h-full">
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${
                      CATEGORY_GRADIENTS[post.category] || "from-gray-500/20 to-gray-600/20"
                    } opacity-0 group-hover:opacity-100 transition-opacity -z-10`}
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/20">
                      {CATEGORY_ICONS[post.category] || <BookOpen className="w-6 h-6" />}
                    </div>
                    <span className="text-sm text-primary font-semibold">
                      {post.category} · {post.industry}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{post.readTime}</span>
                    <ArrowRight className="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Soshogle
          </Link>
          <span className="mx-2">|</span>
          © Soshogle | 2025 | All rights reserved
        </div>
      </footer>
    </div>
  );
}
