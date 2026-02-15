import { useRef } from "react";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface Review {
  id: number;
  name: string;
  title: string;
  text: string;
  rating: number;
  product: string;
  verified: boolean;
}

const reviews: Review[] = [
  { id: 1, name: "Michael T.", title: "Outstanding Craftsmanship", text: "The craftsmanship on my medieval sword is outstanding. The balance is perfect and the blade is razor sharp. Worth every penny.", rating: 5, product: "Medieval Sword", verified: true },
  { id: 2, name: "James R.", title: "Best Battle-Ready Blades", text: "I've collected swords for 20 years and Darksword Armory produces some of the finest battle-ready blades I've ever handled.", rating: 5, product: "Viking Sword", verified: true },
  { id: 3, name: "Sarah K.", title: "Exceptional Custom Work", text: "Ordered a custom sword through the SwordMaker workshop. The attention to detail and communication throughout was exceptional.", rating: 5, product: "Custom Longsword", verified: true },
  { id: 4, name: "David L.", title: "A Work of Art", text: "The Damascus steel blade is a work of art. The pattern is unique and the edge geometry is perfect for cutting.", rating: 5, product: "Damascus Steel Sword", verified: true },
  { id: 5, name: "Robert M.", title: "Great Quality", text: "Great sword, excellent fit and finish. Shipping took a bit longer than expected but the quality made up for it.", rating: 4, product: "Norman Sword", verified: true },
  { id: 6, name: "Chris P.", title: "Museum Quality Armor", text: "The armor set exceeded my expectations. Every piece fits perfectly and the metalwork is museum quality.", rating: 5, product: "Medieval Armor", verified: true },
  { id: 7, name: "Andrew W.", title: "Consistently Excellent", text: "Third purchase from Darksword. Consistently excellent quality. The peened construction gives real confidence in durability.", rating: 5, product: "Claymore Sword", verified: true },
  { id: 8, name: "Thomas B.", title: "Incredible Collection", text: "The fantasy sword collection is incredible. Each piece is unique and the attention to historical detail is remarkable.", rating: 5, product: "Fantasy Sword", verified: true },
];

export default function ReviewsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 400;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="py-16 lg:py-24 bg-card">
      <div className="container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-2">Customer Reviews</p>
            <h2 className="font-serif text-3xl lg:text-4xl font-semibold">What our customers say.</h2>
          </div>
          <div className="hidden sm:flex gap-2">
            <button onClick={() => scroll("left")} className="p-2.5 border border-border hover:border-gold hover:text-gold transition-colors" aria-label="Previous">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => scroll("right")} className="p-2.5 border border-border hover:border-gold hover:text-gold transition-colors" aria-label="Next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {reviews.map((review) => (
            <div key={review.id} className="flex-shrink-0 w-[340px] sm:w-[380px] snap-start p-6 bg-secondary/50 border border-border">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < review.rating ? "text-gold" : "text-muted"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <h4 className="font-serif text-lg font-semibold text-foreground mb-2">{review.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{review.text}"</p>
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-foreground">{review.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{review.product}</p>
                </div>
                {review.verified && (
                  <div className="flex items-center gap-1 text-gold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium tracking-wider uppercase">Verified</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
