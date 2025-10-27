import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CTASection = () => {
  return (
    <section className="py-24 px-4">
      <div className="container">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent" />
          
          {/* Animated Circles */}
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          
          {/* Content */}
          <div className="relative z-10 px-8 py-20 text-center space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mx-auto">
              Ready to Transform Your Learning Experience?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join thousands of educators and learners who are already creating amazing quizzes with Quizzler.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white text-primary hover:bg-white/90 border-0 text-lg px-8 py-6 h-auto font-semibold"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
