import Layout from "@/components/Layout";

const videos = [
  { title: "Aggressive Wood Split Destruction Test", id: "WmrKgZEXpuo" },
  { title: "Murphy Musket's Norman Sword Destruction Test", id: "PLT23yu78WY" },
  { title: "Destructive Testing of Darksword Armory blade", id: "y509ikssP8A" },
  { title: "Darksword Armory: History and Battle Ready Swords (2014) — Part 1", id: "lyy33o_PCo8" },
  { title: "Darksword Armory: History and Battle Ready Swords (2014) — Part 2", id: "LJlwlqL9wnc" },
  { title: "The Mortal Instruments: City of Bones (2013)", id: "hc4CiTvQ-YE" },
];

export default function VideosPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Watch</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Videos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Take a look at our videos and join us on our{" "}
            <a
              href="https://www.youtube.com/user/DarkswordArmory/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light transition-colors font-semibold"
            >
              YouTube Channel
            </a>
          </p>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((video, i) => (
              <div key={i} className="bg-card border border-border overflow-hidden">
                <div className="aspect-video bg-[#111]">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
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
