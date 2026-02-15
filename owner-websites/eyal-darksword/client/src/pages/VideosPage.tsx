import Layout from "@/components/Layout";

export default function VideosPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Watch</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Videos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Watch our swords in action — forging, cutting tests, and reviews.</p>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Darksword Armory — The Forge", id: "placeholder1" },
              { title: "Medieval Sword Cutting Test", id: "placeholder2" },
              { title: "Hand Forging a Viking Sword", id: "placeholder3" },
              { title: "Sword Review — The Sage", id: "placeholder4" },
            ].map((video, i) => (
              <div key={i} className="bg-card border border-border overflow-hidden">
                <div className="aspect-video bg-[#111] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Video Player</p>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-base font-semibold">{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
