import { Button } from "@/app/components/ui/button";
import { Upload, Sparkles, FileText } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center text-center px-4 py-24 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-subtle)]" />

      {/* Animated glow shapes */}
      <div className="absolute top-10 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-10 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "0.8s" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          AI-Powered Quiz Generation
        </div>

        {/* ONE-LINE TITLE */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
          Turn Your Documents Into{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Interactive Quizzes Instantly
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload any PDF, Word, or PowerPoint file, and let AI generate high-quality
          multiple-choice quizzes in seconds.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" variant="hero" className="text-lg px-8 py-6 h-auto">
              <Upload className="mr-2 w-5 h-5" />
              Create Your First Quiz
            </Button>
          </Link>

          <Link href="#how-it-works">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 h-auto border-2"
            >
              <FileText className="mr-2 w-5 h-5" />
              See How It Works
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-10 justify-center pt-10">
          <div>
            <div className="text-3xl font-bold text-primary">10K+</div>
            <div className="text-sm text-muted-foreground">Quizzes Created</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">50K+</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">98%</div>
            <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
