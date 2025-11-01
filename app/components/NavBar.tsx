"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Sparkles, Menu, X } from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quizzler
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/features"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              Pricing
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="hero">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground hover:text-primary transition"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-4 flex flex-col items-start gap-4 border-t border-border pt-4 animate-in slide-in-from-top duration-200">
            <Link
              href="/features"
              onClick={() => setMenuOpen(false)}
              className="w-full text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMenuOpen(false)}
              className="w-full text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="w-full text-foreground/80 hover:text-foreground transition-colors font-medium"
            >
              Pricing
            </Link>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button variant="hero" className="w-full justify-center">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
