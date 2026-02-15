const HERO_COLLECTION = "https://private-us-east-1.manuscdn.com/sessionFile/MQRR3qTAvxSPfnO38lbBPR/sandbox/hNHJuts0MOWVbWlrmtMZo4-img-3_1770974313000_na1fn_aGVyby1jb2xsZWN0aW9u.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTVFSUjNxVEF2eFNQZm5PMzhsYkJQUi9zYW5kYm94L2hOSEp1dHMwTU9XVmJXbHJtdE1abzQtaW1nLTNfMTc3MDk3NDMxMzAwMF9uYTFmbl9hR1Z5YnkxamIyeHNaV04wYVc5dS5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=fdeQbBJB3vrap7xu47Zb5HvChc3hwnxz3SM-MizW~KJAwVCZ~IiNveWKQBobVugr67wkaWJQoDiayaXs~Uk1bCT0gsUvYnyw19q3f1tvmbT~i0HXqUkj55UaZur1P8O8d3f2zfNelYFVx-qrTD22kBo2TLVBI9snIkmgH0sfhOb1FbRRKUd6Gzc-VBewxLMkvgyvSTCqjNyiyp9W3zG-ZX8-0HRGXKv4~d3gL8o4n61wWJLKdD4eI0WFeG-QDRpaD8cvumTJrFfpZsTp-3YKM22ERlYSOAdHT56T5ZTubvO4M65a8~SGjhlVmdzPQTa6YiRwvVzoepT2VZdjFo-edQ__";

export default function BrandStory() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_COLLECTION})` }}
      />
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative container text-center max-w-3xl mx-auto">
        <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-4">
          Our Heritage
        </p>
        <h2 className="font-serif text-3xl lg:text-5xl font-bold text-white leading-tight mb-6">
          Where history meets the forge.
        </h2>
        <p className="text-base lg:text-lg text-white/70 leading-relaxed mb-8 max-w-2xl mx-auto">
          Since 1996, Darksword Armory has been dedicated to recreating historically accurate medieval swords and armor. Each piece is individually hand forged in our Canadian workshop using traditional techniques passed down through generations of master smiths.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://www.darksword-armory.com/about-us/"
            className="inline-flex items-center px-7 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors"
          >
            Our Story
          </a>
          <a
            href="https://www.darksword-armory.com/videos/"
            className="inline-flex items-center px-7 py-3.5 border border-white/40 text-white text-sm font-medium tracking-[0.1em] uppercase hover:border-gold hover:text-gold transition-colors"
          >
            Watch Videos
          </a>
        </div>
      </div>
    </section>
  );
}
