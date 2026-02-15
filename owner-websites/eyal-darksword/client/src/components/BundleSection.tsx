import { Link } from "wouter";
import { products } from "@/data/products";

const BUNDLE_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/SFvHxHQIoVnLTOkI.jpg";

const bundleProducts = products.filter(p => p.image && p.price).slice(0, 3);

export default function BundleSection() {
  return (
    <section className="py-16 lg:py-24 bg-card">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={BUNDLE_IMG}
              alt="Sword Collection Bundle"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-[#8B0000] text-white px-4 py-2 text-xs font-bold tracking-wider uppercase">
              Save 15%
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">
              Limited Offer
            </p>
            <h2 className="font-serif text-3xl lg:text-4xl font-semibold mb-4">
              Build your collection.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Start or expand your medieval weapon collection with our curated bundles. 
              Purchase any three swords together and receive 15% off your entire order. 
              Each sword comes with a certificate of authenticity and free shipping.
            </p>

            {/* Bundle items */}
            <div className="space-y-4 mb-8">
              {bundleProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`} className="flex items-center gap-4 p-3 bg-secondary/50 border border-border hover:border-gold/30 transition-colors">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-16 h-16 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1528938102132-4a9276b8e320?w=100&h=100&fit=crop"; }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.categories[0] || ""}</p>
                  </div>
                  <p className="text-sm font-semibold text-gold">
                    USD${parseFloat(product.price).toFixed(2)}
                  </p>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-6 p-4 bg-gold/10 border border-gold/20">
              <div>
                <p className="text-xs text-muted-foreground tracking-wider uppercase">Bundle Price</p>
                <p className="text-2xl font-serif font-bold text-gold">USD$1,560.75</p>
              </div>
              <div className="ml-auto">
                <p className="text-xs text-muted-foreground line-through">USD$1,835.00</p>
                <p className="text-xs text-[#8B0000] font-semibold">You save $274.25</p>
              </div>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-[#d4b85c] transition-colors w-full justify-center"
            >
              Shop All Swords
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
