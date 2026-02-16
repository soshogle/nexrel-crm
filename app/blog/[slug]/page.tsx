"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { MobileNav } from "@/components/landing/soshogle/mobile-nav";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  industry: string;
  problemImage?: string | null;
  solutionImage?: string | null;
  readTime: string;
  publishedAt: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black text-white">
        <MobileNav
          onBookDemo={() => (window.location.href = "mailto:info@soshogle.com")}
          onTryDemo={() => (window.location.href = "/#nexrel")}
          onOpenRoi={() => (window.location.href = "/#pricing")}
        />
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-64 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="dark min-h-screen bg-black text-white">
        <MobileNav
          onBookDemo={() => (window.location.href = "mailto:info@soshogle.com")}
          onTryDemo={() => (window.location.href = "/#nexrel")}
          onOpenRoi={() => (window.location.href = "/#pricing")}
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-black text-white">
      <MobileNav
        onBookDemo={() => (window.location.href = "mailto:info@soshogle.com")}
        onTryDemo={() => (window.location.href = "/#nexrel")}
        onOpenRoi={() => (window.location.href = "/#pricing")}
      />

      <article className="container mx-auto px-4 pt-8 pb-32">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="text-primary hover:underline text-sm mb-6 inline-block"
          >
            ← Back to Resources
          </Link>

          <header className="mb-12">
            <p className="text-sm text-primary font-semibold mb-2">
              {post.category} · {post.industry}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            <p className="text-xl text-muted-foreground mb-4">{post.excerpt}</p>
            <p className="text-sm text-muted-foreground">{post.readTime}</p>
          </header>

          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_ul]:my-4 [&_li]:my-1">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-16 p-6 rounded-2xl border border-primary/30 bg-primary/5">
            <h3 className="text-xl font-bold mb-2">Ready to transform your business?</h3>
            <p className="text-muted-foreground mb-4">
              See how Soshogle AI can solve your industry&apos;s biggest challenges.
            </p>
            <a
              href="mailto:info@soshogle.com?subject=Book%20a%20Demo%20-%20Soshogle%20AI"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              Book a Demo →
            </a>
          </div>
        </div>
      </article>

      <footer className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          <Link href="/blog" className="text-primary hover:underline">
            ← All Resources
          </Link>
          <span className="mx-2">|</span>
          <Link href="/" className="text-primary hover:underline">
            Soshogle Home
          </Link>
          <span className="mx-2">|</span>
          © Soshogle | 2025
        </div>
      </footer>
    </div>
  );
}
