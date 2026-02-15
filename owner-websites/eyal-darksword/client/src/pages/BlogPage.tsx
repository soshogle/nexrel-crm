import { Link } from "wouter";
import Layout from "@/components/Layout";
import { blogPosts } from "@/data/posts";

export default function BlogPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Our Journal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">The Sword Blog</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Stories of craftsmanship, history, and the art of the blade.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {blogPosts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block bg-card border border-border hover:border-gold/30 transition-colors overflow-hidden">
                {post.thumbnail && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  </div>
                )}
                <div className="p-5">
                  {post.categories[0] && (
                    <p className="text-gold text-[10px] font-medium tracking-[0.15em] uppercase mb-2">{post.categories[0]}</p>
                  )}
                  <h2 className="font-serif text-lg font-semibold group-hover:text-gold transition-colors line-clamp-2 mb-2">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
                  )}
                  <span className="text-xs text-gold font-medium tracking-wider uppercase">Read More →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
