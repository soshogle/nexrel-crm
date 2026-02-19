import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

const HERO_VIDEO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/sEtEIXrTDqiEpiTb.mp4";

const HERO_BLACKSMITH = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/przmHnuDaniVceYf.jpg";
const HERO_COLLECTION = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/vRMEACSuzKwMsiRu.jpg";
const HERO_SWORD = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663115065429/VrGkFqHcKdSKbPkM.jpg";

const slides = [
  {
    image: HERO_BLACKSMITH,
    title: "Hand forged medieval\nswords & armor.",
    subtitle: "Individually crafted in Canada since 1996.",
    cta1: { text: "Shop best sellers", href: "/shop" },
    cta2: { text: "Explore collection", href: "/category/medieval-swords" },
  },
  {
    image: HERO_COLLECTION,
    title: "Battle ready.\nMuseum quality.",
    subtitle: "5160 high carbon steel, properly heat treated and tempered.",
    cta1: { text: "Shop swords", href: "/category/medieval-swords" },
    cta2: { text: "View armor", href: "/category/medieval-armor" },
  },
  {
    image: HERO_SWORD,
    title: "The art of\nthe blade.",
    subtitle: "Each sword recreated from museum originals and private collections.",
    cta1: { text: "Shop new arrivals", href: "/category/new-products" },
    cta2: { text: "Custom swords", href: "/shop" },
  },
];

export default function HeroSection() {
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoFading, setVideoFading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-advance slides after video ends
  useEffect(() => {
    if (videoPlaying) return;
    const timer = setInterval(() => {
      goToSlide((current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [current, videoPlaying]);

  const handleVideoEnd = () => {
    setVideoFading(true);
    setTimeout(() => {
      setVideoPlaying(false);
      setVideoFading(false);
    }, 800);
  };

  const handleSkipVideo = () => {
    setVideoFading(true);
    setTimeout(() => {
      setVideoPlaying(false);
      setVideoFading(false);
    }, 600);
  };

  const goToSlide = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 400);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const touchStartX = useRef(0);
  const currentRef = useRef(current);
  currentRef.current = current;
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      const c = currentRef.current;
      const next = dx > 0 ? (c - 1 + slides.length) % slides.length : (c + 1) % slides.length;
      goToSlide(next);
    }
  }, []);

  const slide = slides[current];

  return (
    <section
      className="relative w-full h-[85vh] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] max-h-[900px] overflow-hidden touch-pan-y"
      onTouchStart={!videoPlaying ? handleTouchStart : undefined}
      onTouchEnd={!videoPlaying ? handleTouchEnd : undefined}
    >
      {/* === VIDEO PHASE === */}
      {videoPlaying && (
        <div className={`absolute inset-0 z-20 transition-opacity duration-800 ${videoFading ? "opacity-0" : "opacity-100"}`}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={HERO_VIDEO}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
          />
          {/* Dark overlay on video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Video overlay content */}
          <div className="relative h-full container flex flex-col justify-center">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] text-white whitespace-pre-line animate-fade-in-up">
                Hand crafted medieval{"\n"}swords and armors
              </h1>
              <p className="mt-4 lg:mt-6 text-base lg:text-lg text-white/80 font-light max-w-md animate-fade-in-up-delay">
                Darksword Armory — forging battle ready medieval weapons since 1996.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 animate-fade-in-up-delay-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center px-7 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-[#d4b85c] transition-colors"
                >
                  Shop best sellers
                </Link>
                <Link
                  href="/category/medieval-swords"
                  className="inline-flex items-center px-7 py-3.5 border border-white/40 text-white text-sm font-medium tracking-[0.1em] uppercase hover:border-gold hover:text-gold transition-colors"
                >
                  Explore collection
                </Link>
              </div>
            </div>
          </div>

          {/* Video controls */}
          <div className="absolute bottom-8 right-6 flex items-center gap-3 z-30">
            <button
              onClick={toggleMute}
              className="p-2.5 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSkipVideo}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 text-white text-xs font-medium tracking-[0.1em] uppercase backdrop-blur-sm transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-30">
            <div className="h-full bg-gold animate-video-progress" />
          </div>
        </div>
      )}

      {/* === IMAGE CAROUSEL PHASE === */}
      {/* Background image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundImage: `url(${slide.image})` }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Content */}
      {!videoPlaying && (
        <>
          <div className="relative h-full container flex flex-col justify-center z-10">
            <div className="max-w-2xl">
              <h1
                className={`font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] text-white whitespace-pre-line transition-all duration-700 ${
                  isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
              >
                {slide.title}
              </h1>
              <p
                className={`mt-4 lg:mt-6 text-base lg:text-lg text-white/80 font-light max-w-md transition-all duration-700 delay-100 ${
                  isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
              >
                {slide.subtitle}
              </p>
              <div
                className={`mt-8 flex flex-wrap gap-4 transition-all duration-700 delay-200 ${
                  isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
              >
                <Link
                  href={slide.cta1.href}
                  className="inline-flex items-center px-7 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-[#d4b85c] transition-colors"
                >
                  {slide.cta1.text}
                </Link>
                <Link
                  href={slide.cta2.href}
                  className="inline-flex items-center px-7 py-3.5 border border-white/40 text-white text-sm font-medium tracking-[0.1em] uppercase hover:border-gold hover:text-gold transition-colors"
                >
                  {slide.cta2.text}
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => goToSlide((current - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white transition-colors backdrop-blur-sm z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goToSlide((current + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white transition-colors backdrop-blur-sm z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === current ? "bg-gold w-8" : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
