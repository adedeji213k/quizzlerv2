import { Button } from "@/app/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
          <div className="flex items-center gap-2">
            
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quizzler
            </span>
            
          </div>
          </Link>
          
          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/features" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Features
            </a>
            <a href="/how-it-works" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              How It Works
            </a>
            <a href="/pricing" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Pricing
            </a>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign In
            </Button>
            </Link>
            <Link href="/register">
            <Button variant="hero">
              Get Started
            </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
