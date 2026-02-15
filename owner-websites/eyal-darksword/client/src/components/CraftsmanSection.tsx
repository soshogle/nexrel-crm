import { useState } from "react";

const CRAFTSMAN_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/yXUYAkkhRjIJUXMq.jpg";

export default function CraftsmanSection() {
  const [bioExpanded, setBioExpanded] = useState(false);

  return (
    <section className="py-16 lg:py-24 bg-card">
      <div className="container">
        <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-center mb-4">
          Built on tradition. Backed by mastery.
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Every blade carries 29 years of dedication to the ancient art of sword making.
        </p>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
          {/* Image */}
          <div className="relative">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={CRAFTSMAN_IMG}
                alt="Master Swordsmith"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <p className="text-gold text-sm font-medium tracking-wider uppercase">Founder & Master Swordsmith</p>
              <p className="text-white text-xl font-serif font-semibold">Eyal Azerad</p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">
              Master Craftsman
            </p>
            <h3 className="font-serif text-2xl lg:text-3xl font-semibold mb-6">
              Eyal Azerad
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Founder of Darksword Armory and master swordsmith with over 29 years of experience in forging historically accurate medieval weapons. Eyal has travelled throughout the world to document and examine various sword and armor collections, in both world-class museums and by invitation to private collections.
            </p>

            {bioExpanded && (
              <div className="space-y-4 mb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The painstaking research and experience in handling various medieval weapons allows Darksword Armory to accurately create their historical counterparts, while remaining faithful to the weight, balance, and feel of the originals.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Each sword is forged with 5160 High Carbon steel, properly heat treated and tempered. This commitment to forging fully functional real swords is at the core of Darksword Armory's success — a commitment that has earned a reputation for crafting some of the most resistant battle-ready swords on the market.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Darksword Armory's medieval swords are also featured in Hollywood blockbuster movies, documentary films, and used among theatrical groups worldwide.
                </p>
              </div>
            )}

            <button
              onClick={() => setBioExpanded(!bioExpanded)}
              className="text-gold text-sm font-medium tracking-wider uppercase hover:text-gold-light transition-colors underline underline-offset-4"
            >
              {bioExpanded ? "Read less" : "Read full bio"}
            </button>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-10 pt-8 border-t border-border">
              <div>
                <p className="font-serif text-3xl font-bold text-gold">29+</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">Years</p>
              </div>
              <div>
                <p className="font-serif text-3xl font-bold text-gold">367+</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">Products</p>
              </div>
              <div>
                <p className="font-serif text-3xl font-bold text-gold">5160</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">Carbon Steel</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
