"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";

const APP_LOGO = "/soshogle-logo.png";

interface MobileNavProps {
  onBookDemo: () => void;
  onTryDemo: () => void;
  onOpenRoi: () => void;
}

export function MobileNav({ onBookDemo, onTryDemo, onOpenRoi }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={APP_LOGO} alt="Soshogle" className="h-7 w-7" />
          <span className="text-lg font-bold">SOSHOGLE</span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm hover:text-primary transition-colors">Features</a>
          <a href="#ai-staff" className="text-sm hover:text-primary transition-colors">AI Staff</a>
          <a href="#nexrel" className="text-sm hover:text-primary transition-colors">Nexrel</a>
          <a href="#pricing" className="text-sm hover:text-primary transition-colors">Pricing</a>
          <a href="/blog" className="text-sm hover:text-primary transition-colors">Blog</a>
          <a href="/about" className="text-sm hover:text-primary transition-colors">About</a>
          <a href="#contact" className="text-sm hover:text-primary transition-colors">Contact</a>
          <button
            className="text-sm hover:text-primary transition-colors font-semibold"
            onClick={onTryDemo}
          >
            Try Demo
          </button>
          <button
            className="text-sm hover:text-primary transition-colors"
            onClick={onOpenRoi}
          >
            AI ROI Analyzer
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => window.location.href = "/auth/signin"}
          >
            Nexrel
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-xs px-3"
            onClick={onBookDemo}
          >
            Book Demo →
          </Button>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-black backdrop-blur-xl z-40">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <a
              href="#features"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              Features
            </a>
            <a
              href="#ai-staff"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              AI Staff
            </a>
            <a
              href="#nexrel"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              Nexrel
            </a>
            <a
              href="#pricing"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              Pricing
            </a>
            <a
              href="/blog"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              Blog
            </a>
            <a
              href="/about"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              About
            </a>
            <a
              href="#contact"
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10"
              onClick={closeMenu}
            >
              Contact
            </a>
            <button
              className="text-lg py-3 font-semibold text-primary border-b border-white/10 text-left"
              onClick={() => {
                closeMenu();
                onTryDemo();
              }}
            >
              Try Demo
            </button>
            <button
              className="text-lg py-3 hover:text-primary transition-colors border-b border-white/10 text-left"
              onClick={() => {
                closeMenu();
                onOpenRoi();
              }}
            >
              AI ROI Analyzer
            </button>

            <div className="flex flex-col gap-3 mt-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  closeMenu();
                  window.location.href = "/auth/signin";
                }}
              >
                Nexrel
              </Button>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => {
                  closeMenu();
                  onBookDemo();
                }}
              >
                Book Demo →
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
