import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, User, ShoppingCart, Menu, X, Heart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "MEDIEVAL SWORDS", href: "/category/medieval-swords" },
  { label: "ARMORS", href: "/category/medieval-armor" },
  { label: "DAGGERS", href: "/category/medieval-daggers" },
  { label: "AXES", href: "/category/medieval-axes" },
  { label: "SAMURAI SWORDS", href: "/category/samurai-swords-katanas-japanese-swords" },
  { label: "JEWELRY", href: "/category/medieval-jewelry" },
  { label: "SALE", href: "/category/swords-armors-weapons-sale" },
  { label: "NEW", href: "/category/new-products" },
  { label: "BLOG", href: "/blog" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const { count, setIsOpen } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16 lg:h-20 gap-4">
        {/* Logo — top left on all screens */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="https://www.darksword-armory.com/wp-content/uploads/2017/06/cropped-darksword-armory-logo-1.png"
            alt="Darksword Armory"
            className="h-10 lg:h-14 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="font-serif text-xl font-bold text-gold">DARKSWORD ARMORY</span>';
            }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-3 py-2 text-[11px] font-medium tracking-[0.15em] uppercase transition-colors hover:text-gold ${
                link.label === "SALE" ? "text-[#8B0000]" : "text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu + Right actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -m-2 hover:text-gold transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -m-2 hover:text-gold transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <Link
            href="/wishlist"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -m-2 hover:text-gold transition-colors hidden sm:block"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
          </Link>
          <Link
            href="/account"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -m-2 hover:text-gold transition-colors hidden sm:block"
            aria-label="Account"
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -m-2 hover:text-gold transition-colors relative"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 bg-gold text-[#0D0D0D] text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border p-4 z-50">
          <div className="container">
            <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-2xl mx-auto">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search swords, armor, daggers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-foreground text-lg outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border z-50 max-h-[70vh] overflow-y-auto">
          <nav className="container py-4 flex flex-col gap-1">
            <Link
              href="/shop"
              className="px-4 py-3 text-sm font-medium tracking-[0.1em] uppercase border-b border-border/50 transition-colors hover:text-gold text-gold"
              onClick={() => setMobileOpen(false)}
            >
              SHOP ALL
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`px-4 py-3 text-sm font-medium tracking-[0.1em] uppercase border-b border-border/50 transition-colors hover:text-gold ${
                  link.label === "SALE" ? "text-[#8B0000]" : "text-foreground"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/about"
              className="px-4 py-3 text-sm font-medium tracking-[0.1em] uppercase border-b border-border/50 transition-colors hover:text-gold"
              onClick={() => setMobileOpen(false)}
            >
              ABOUT
            </Link>
            <Link
              href="/contact"
              className="px-4 py-3 text-sm font-medium tracking-[0.1em] uppercase border-b border-border/50 transition-colors hover:text-gold"
              onClick={() => setMobileOpen(false)}
            >
              CONTACT
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
