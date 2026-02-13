"use client";

import { useEffect, useRef } from "react";

interface Logo {
  src: string;
  alt: string;
}

const logos: Logo[] = [
  { src: "/client-logos/pfizer.png", alt: "Pfizer" },
  { src: "/client-logos/darksword.png", alt: "Dark Sword Armory" },
  { src: "/client-logos/canada.png", alt: "Canada" },
  { src: "/client-logos/umontreal.png", alt: "Universite de Montreal" },
  { src: "/client-logos/popeyes.png", alt: "Popeyes" },
  { src: "/client-logos/pharmacie-berge.png", alt: "Pharmacie Berge Shater" },
  { src: "/client-logos/iga.png", alt: "IGA" },
  { src: "/client-logos/loft-beaute.png", alt: "Loft Beaute" },
  { src: "/client-logos/telus.png", alt: "Telus" },
  { src: "/client-logos/cisco.png", alt: "Cisco" },
  { src: "/client-logos/epic-games.png", alt: "Epic Games" },
  { src: "/client-logos/twilio.png", alt: "Twilio" },
  { src: "/client-logos/synthesia.png", alt: "Synthesia" },
  { src: "/client-logos/time.png", alt: "Time" },
  { src: "/client-logos/chess.png", alt: "Chess.com" },
  { src: "/client-logos/telus-digital.png", alt: "Telus Digital" },
];

export function LogoStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrameId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPosition += scrollSpeed;

      const firstChild = scrollContainer.firstElementChild as HTMLElement;
      if (firstChild) {
        const logoSetWidth = firstChild.offsetWidth;
        if (scrollPosition >= logoSetWidth) {
          scrollPosition = 0;
        }
        scrollContainer.style.transform = `translateX(-${scrollPosition}px)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const logoContainerClass =
    "flex-shrink-0 flex items-center justify-center transition-all duration-300 min-w-0";
  const logoBoxClass =
    "min-h-[40px] min-w-[80px] h-10 w-20 sm:h-12 sm:w-28 md:h-16 md:w-40 flex items-center justify-center";

  return (
    <div className="w-full overflow-hidden bg-muted/30 py-6 sm:py-8 border-y border-border/50 px-2 sm:px-0">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex items-center will-change-transform gap-4 sm:gap-8 md:gap-12"
          style={{ width: "fit-content" }}
        >
          <div className="flex items-center gap-4 sm:gap-8 md:gap-12 flex-shrink-0">
            {logos.map((logo, index) => (
              <div
                key={`logo-1-${index}`}
                className={`${logoContainerClass} ${logoBoxClass}`}
                style={{ filter: "brightness(1.4) contrast(1.2) saturate(1.1)" }}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="eager"
                  decoding="async"
                  width={80}
                  height={40}
                  className="max-h-full max-w-full w-full h-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 sm:gap-8 md:gap-12 flex-shrink-0">
            {logos.map((logo, index) => (
              <div
                key={`logo-2-${index}`}
                className={`${logoContainerClass} ${logoBoxClass}`}
                style={{ filter: "brightness(1.4) contrast(1.2) saturate(1.1)" }}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="eager"
                  decoding="async"
                  width={80}
                  height={40}
                  className="max-h-full max-w-full w-full h-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 sm:gap-8 md:gap-12 flex-shrink-0">
            {logos.map((logo, index) => (
              <div
                key={`logo-3-${index}`}
                className={`${logoContainerClass} ${logoBoxClass}`}
                style={{ filter: "brightness(1.4) contrast(1.2) saturate(1.1)" }}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="eager"
                  decoding="async"
                  width={80}
                  height={40}
                  className="max-h-full max-w-full w-full h-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
