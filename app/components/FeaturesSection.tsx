import { Upload, Sparkles, Share2, Zap } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";

const features = [
  {
    icon: Upload,
    title: "Upload Any Document",
    description: "Support for PDFs, Word docs, PowerPoint, and more. Just drag and drop.",
    gradient: "from-primary to-primary/70",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Our advanced AI analyzes your content and creates relevant, engaging questions.",
    gradient: "from-accent to-accent/70",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get your quiz in seconds, not hours. Ready to use immediately.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share quizzes with students, colleagues, or friends with a single link.",
    gradient: "from-accent to-primary",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need to Create Amazing Quizzes
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features that make quiz creation effortless and fun
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 pt-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
