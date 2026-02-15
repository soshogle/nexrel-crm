import Layout from "@/components/Layout";
import { Star } from "lucide-react";

const reviews = [
  { name: "Michael T.", rating: 5, text: "The craftsmanship on my medieval sword is outstanding. The balance is perfect and the blade is razor sharp. Worth every penny.", product: "Medieval Sword" },
  { name: "James R.", rating: 5, text: "I've collected swords for 20 years and Darksword Armory produces some of the finest battle-ready blades I've ever handled.", product: "Viking Sword" },
  { name: "Sarah K.", rating: 5, text: "Ordered a custom sword through the SwordMaker workshop. The attention to detail and communication throughout was exceptional.", product: "Custom Longsword" },
  { name: "David L.", rating: 5, text: "The Damascus steel blade is a work of art. The pattern is unique and the edge geometry is perfect for cutting.", product: "Damascus Steel Sword" },
  { name: "Robert M.", rating: 4, text: "Great sword, excellent fit and finish. Shipping took a bit longer than expected but the quality made up for it.", product: "Norman Sword" },
  { name: "Chris P.", rating: 5, text: "The armor set exceeded my expectations. Every piece fits perfectly and the metalwork is museum quality.", product: "Medieval Armor" },
  { name: "Andrew W.", rating: 5, text: "Third purchase from Darksword. Consistently excellent quality. The peened construction gives real confidence in durability.", product: "Claymore Sword" },
  { name: "Thomas B.", rating: 5, text: "The fantasy sword collection is incredible. Each piece is unique and the attention to historical detail is remarkable.", product: "Fantasy Sword" },
];

export default function ReviewsPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Testimonials</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Customer Reviews</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">What our customers say about their Darksword Armory experience.</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review, i) => (
              <div key={i} className="p-6 bg-card border border-border">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className={`w-4 h-4 ${si < review.rating ? "fill-gold text-gold" : "text-border"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{review.name}</p>
                  <p className="text-xs text-gold">{review.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
