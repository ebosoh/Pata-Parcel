import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';

export function HomeNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-1 shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/logo.jpg"
              alt="Pata Parcel emblem"
              className="h-9 w-9 object-contain rounded-lg"
            />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground block leading-tight">
              Pata Parcel
            </span>
            <span className="text-[10px] font-bold text-primary tracking-wide uppercase block">
              Delivering Trust
            </span>
          </div>
        </Link>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-lg px-4 py-4 space-y-3 text-xs font-semibold">
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-foreground hover:text-primary"
          >
            How It Works
          </a>
          <a
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-foreground hover:text-primary"
          >
            For Online Sellers
          </a>
          <a
            href="#network"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-foreground hover:text-primary"
          >
            100+ Partner SACCOs
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-foreground hover:text-primary"
          >
            FAQ
          </a>
        </div>
      )}
    </header>
  );
}
