"use client";

import { Check, Sparkles, Rocket, GraduationCap } from "lucide-react";
import Navbar from "../components/NavBar";
import Footer from "../components/Footer";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    price: "$0",
    period: "/month",
    description: "Perfect for casual users trying out Quizler for the first time.",
    features: [
      "Upload 1 document per month (1 quiz)",
      "Generate up to 10 AI questions/month",
      "Take quizzes and view past scores",
      "Store up to 5 quizzes",
    ],
    limits: [
      { name: "Document uploads", value: "1 / month" },
      { name: "AI-generated questions", value: "10 / month" },
      { name: "Quiz storage", value: "5 total" },
    ],
    highlight: false,
  },
  {
    id: "standard",
    name: "Standard",
    icon: <GraduationCap className="w-6 h-6 text-primary" />,
    price: "$9.99",
    period: "/month",
    description:
      "Ideal for teachers and active learners who create quizzes frequently.",
    features: [
      "Upload up to 10 documents/month (10 quizzes)",
      "Generate up to 250 AI questions/month",
      "Access basic quiz analytics (accuracy, averages)",
      "Priority AI generation speed",
      "Store up to 50 quizzes",
      "Take unlimited quizzes",
    ],
    limits: [
      { name: "Document uploads", value: "10 / month" },
      { name: "AI-generated questions", value: "250 / month" },
      { name: "Quiz storage", value: "50 total" },
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Rocket className="w-6 h-6 text-primary" />,
    price: "$29.99",
    period: "/month",
    description:
      "Built for schools, teams, and organizations running frequent quizzes.",
    features: [
      "Unlimited document uploads",
      "Unlimited AI question generation",
      "Advanced analytics & performance insights",
      "Fastest AI generation speed",
      "Unlimited quiz storage",
      "Early access to new features",
    ],
    limits: [
      { name: "Document uploads", value: "Unlimited" },
      { name: "AI-generated questions", value: "Unlimited" },
      { name: "Quiz storage", value: "Unlimited" },
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 text-center bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Choose the Perfect Plan for You
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a casual learner or a large institution, Quizler has a
            plan tailored to your needs — start for free and grow as you do.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 grid gap-10 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border border-border bg-card p-8 shadow-md hover:shadow-lg transition relative ${
                plan.highlight
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }`}
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">{plan.icon}</div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
              </div>

              <p className="text-muted-foreground mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                className={`block text-center font-semibold py-3 rounded-lg transition ${
                  plan.highlight
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md hover:opacity-90"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {plan.id === "free" ? "Start for Free" : "Subscribe Now"}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center bg-gradient-to-r from-primary to-accent text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="mb-8 text-white/80 max-w-xl mx-auto">
          Unlock the power of AI-generated quizzes and transform your learning
          experience — all in one place.
        </p>
        <a
          href="/register"
          className="bg-white text-primary font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition"
        >
          Get Started
        </a>
      </section>

      <Footer />
    </div>
  );
}
