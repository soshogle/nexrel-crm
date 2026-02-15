import { Link, useParams } from "wouter";
import Layout from "@/components/Layout";
import { getPostBySlug, blogPosts } from "@/data/posts";
import { ChevronRight } from "lucide-react";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = getPostBySlug(slug || "");

  if (!post) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog" className="inline-flex items-center px-6 py-3 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-wider uppercase">Back to Blog</Link>
        </div>
      </Layout>
    );
  }

  const otherPosts = blogPosts.filter(p => p.id !== post.id).slice(0, 3);

  return (
    <Layout>
      <div className="container py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-gold transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground line-clamp-1">{post.title}</span>
        </div>
      </div>

      <article className="container pb-16">
        <div className="max-w-3xl mx-auto">
          {post.thumbnail && (
            <div className="aspect-[16/9] overflow-hidden mb-8">
              <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
            </div>
          )}
          {post.categories[0] && (
            <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">{post.categories[0]}</p>
          )}
          <h1 className="font-serif text-3xl lg:text-4xl font-bold mb-4">{post.title}</h1>
          {post.date && <p className="text-sm text-muted-foreground mb-8">{new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>}
          <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
            {post.content.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="mb-4">{para}</p>
            ))}
          </div>
        </div>

        {otherPosts.length > 0 && (
          <div className="max-w-3xl mx-auto mt-16 pt-12 border-t border-border">
            <h2 className="font-serif text-2xl font-semibold mb-8">More from the Blog</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {otherPosts.map(op => (
                <Link key={op.id} href={`/blog/${op.slug}`} className="group block">
                  {op.thumbnail && (
                    <div className="aspect-[16/10] overflow-hidden mb-3">
                      <img src={op.thumbnail} alt={op.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                    </div>
                  )}
                  <h3 className="text-sm font-medium group-hover:text-gold transition-colors line-clamp-2">{op.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
}
