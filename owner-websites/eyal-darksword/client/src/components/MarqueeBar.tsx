interface MarqueeBarProps {
  variant?: "primary" | "secondary";
}

const primaryItems = [
  "29+ years of master craftsmanship",
  "Free shipping on orders over $500",
  "Hand forged in Canada",
  "5160 High Carbon Steel",
  "Battle ready & museum quality",
];

const secondaryItems = [
  "Free shipping on orders over $500",
  "Featured in Hollywood blockbusters",
  "Satisfaction guaranteed",
  "Hand forged since 1996",
];

export default function MarqueeBar({ variant = "primary" }: MarqueeBarProps) {
  const items = variant === "primary" ? primaryItems : secondaryItems;
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className={`overflow-hidden py-3 ${variant === "primary" ? "bg-secondary" : "bg-card"}`}>
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center mx-6 text-xs sm:text-sm font-medium tracking-wider uppercase text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-gold mr-4 shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
