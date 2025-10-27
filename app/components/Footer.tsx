import { Sparkles, Twitter, Linkedin, Github, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-gradient-to-b from-background to-muted py-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Logo and Tagline */}
        <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quizzler
            </span>
          </div>
          <p className="text-muted-foreground max-w-sm">
            Turn your documents into engaging quizzes instantly — powered by AI.
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#about" className="hover:text-primary transition-colors">
            About
          </a>
          <a href="#contact" className="hover:text-primary transition-colors">
            Contact
          </a>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="container mx-auto mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Quizzler. All rights reserved.</p>

        <div className="flex gap-4">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="mailto:hello@quizzler.ai"
            className="hover:text-primary transition-colors"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
