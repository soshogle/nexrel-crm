import Layout from "@/components/Layout";
import { Link } from "wouter";

export default function AboutPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Our Story</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">About Darksword Armory</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Crafting battle-ready medieval swords and armor since 1996.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-8 text-muted-foreground leading-relaxed">
            <p>
              Darksword Armory is a Canadian company that has been producing high quality, battle ready medieval swords, daggers, and armor since 1996. Founded by Eyal Azerad, the company has grown from a small workshop into one of the most respected names in the sword-making industry.
            </p>
            <p>
              Every sword produced by Darksword Armory is individually hand forged from 5160 high carbon steel, heat treated, and tempered to achieve the perfect balance of hardness and flexibility. Our blades are designed to be functional, battle-ready weapons that also serve as beautiful works of art.
            </p>

            <div className="grid md:grid-cols-2 gap-8 py-8">
              <div className="p-6 bg-secondary/50 border border-border">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">Our Mission</h3>
                <p className="text-sm">To produce the finest hand-forged medieval swords and weapons available, combining historical accuracy with modern metallurgy and craftsmanship.</p>
              </div>
              <div className="p-6 bg-secondary/50 border border-border">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">Our Craft</h3>
                <p className="text-sm">Each blade is individually forged, ground, and polished by hand. We use traditional techniques combined with modern steel to create weapons that are both historically authentic and functionally superior.</p>
              </div>
            </div>

            <h2 className="font-serif text-2xl font-bold text-foreground pt-4">The Forge</h2>
            <p>
              Our workshop is equipped with both traditional and modern forging equipment. Every sword begins as a bar of 5160 high carbon steel, which is heated, hammered, and shaped into a blade. The blade is then heat treated through a process of oil quenching and tempering to achieve a hardness of 50-53 HRC.
            </p>
            <p>
              After heat treatment, each blade is carefully ground and polished by hand. The hilts are assembled using traditional peened construction, ensuring that every component is securely fastened without the use of threaded pommels or epoxy.
            </p>

            <h2 className="font-serif text-2xl font-bold text-foreground pt-4">Materials & Quality</h2>
            <p>
              We use only the finest materials in our swords. Our blades are forged from 5160 high carbon spring steel, known for its excellent edge retention and flexibility. Hilts are crafted from mild steel, and grips are wrapped in genuine leather. Every sword is individually inspected and tested before shipping.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
              <div className="text-center p-4">
                <p className="font-serif text-3xl font-bold text-gold mb-1">1996</p>
                <p className="text-xs tracking-wider uppercase">Founded</p>
              </div>
              <div className="text-center p-4">
                <p className="font-serif text-3xl font-bold text-gold mb-1">5160</p>
                <p className="text-xs tracking-wider uppercase">Carbon Steel</p>
              </div>
              <div className="text-center p-4">
                <p className="font-serif text-3xl font-bold text-gold mb-1">300+</p>
                <p className="text-xs tracking-wider uppercase">Products</p>
              </div>
              <div className="text-center p-4">
                <p className="font-serif text-3xl font-bold text-gold mb-1">28+</p>
                <p className="text-xs tracking-wider uppercase">Years</p>
              </div>
            </div>

            <div className="text-center pt-8">
              <Link href="/shop" className="inline-flex items-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors">
                Browse Our Collection
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
