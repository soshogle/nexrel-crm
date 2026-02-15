import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const announcements = [
  { text: "Free shipping on orders over $500", link: "#" },
  { text: "Hand forged in Canada since 1996", link: "#" },
  { text: "29+ years of master craftsmanship", link: "#" },
];

export default function AnnouncementBar() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gold text-[#0D0D0D] py-2 relative z-50">
      <div className="container flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrent((prev) => (prev - 1 + announcements.length) % announcements.length)}
          className="p-0.5 hover:opacity-70 transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <a
          href={announcements[current].link}
          className="text-xs sm:text-sm font-medium tracking-wide uppercase text-center transition-opacity duration-300"
        >
          {announcements[current].text}
        </a>
        <button
          onClick={() => setCurrent((prev) => (prev + 1) % announcements.length)}
          className="p-0.5 hover:opacity-70 transition-opacity"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
