"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Sparkles,
  GraduationCap,
  Rocket,
  CreditCard,
  Globe,
  Coins,
} from "lucide-react";
import Navbar from "../components/NavBar";
import Footer from "../components/Footer";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    price: 0,
    period: "/month",
    description: "Perfect for users exploring Quizler for the first time.",
    features: [
      "Upload up to 3 documents per month",
      "Generate up to 50 AI questions per month",
      "Store up to 10 quizzes total",
      "Take quizzes and view past scores",
    ],
    highlight: false,
  },
  {
    id: "standard",
    name: "Standard",
    icon: <GraduationCap className="w-6 h-6 text-primary" />,
    price: 1500,
    period: "/month",
    description:
      "For teachers, students, and professionals who create quizzes regularly.",
    features: [
      "Upload up to 15 documents per month",
      "Generate 300–400 AI questions per month",
      "Store up to 50 quizzes total",
      "Take unlimited quizzes",
      "Faster AI generation speed (priority queue)",
      "Access to basic quiz analytics",
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Rocket className="w-6 h-6 text-primary" />,
    price: 4000,
    period: "/month",
    description:
      "Built for institutions, educators, and teams that rely heavily on AI quiz generation.",
    features: [
      "Unlimited document uploads",
      "Unlimited AI question generation",
      "Unlimited quiz storage",
      "Fastest AI generation speed",
      "Advanced analytics and performance insights",
      "Early access to new features",
    ],
    highlight: false,
  },
];

const creditBundles = [
  {
    id: "small",
    name: "Starter Credits",
    credits: 5,
    price: 200,
  },
  {
    id: "medium",
    name: "Boost Pack",
    credits: 15,
    price: 500,
    popular: true,
  },
  {
    id: "large",
    name: "Power Pack",
    credits: 35,
    price: 1000,
  },
];

export default function PricingPage() {
  const [usdRate, setUsdRate] = useState<number | null>(null);

  // Fetch FX rate (NGN → USD)
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/NGN"
        );
        const data = await res.json();
        setUsdRate(data.rates.USD);
      } catch {
        setUsdRate(0.00065); // fallback
      }
    }
    fetchRate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="py-20 text-center bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Flexible Pricing for Every Learner
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Subscribe monthly or buy credits when you need them. Upgrade anytime.
          </p>

          {/* International Payments */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span>
              International payments supported 
            </span>
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-20">
        <div className="container mx-auto px-6 grid gap-10 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-card p-8 shadow-md transition relative ${
                plan.highlight
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  {plan.icon}
                </div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
              </div>

              <p className="text-muted-foreground mb-6">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ₦{plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {plan.period}
                </span>

                {usdRate && (
                  <div className="text-[11px] text-muted-foreground mt-1 opacity-70">
                    ≈ ${(plan.price * usdRate).toFixed(2)} USD
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-6 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                className={`block text-center font-semibold py-3 rounded-lg transition ${
                  plan.highlight
                    ? "bg-gradient-to-r from-primary to-accent text-white"
                    : "bg-muted hover:bg-muted/70"
                }`}
              >
                {plan.id === "free" ? "Start for Free" : "Subscribe Now"}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Credit Bundles */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Need More Without Subscribing?
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Buy AI credits anytime. No monthly commitment.
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            {creditBundles.map((bundle) => (
              <div
                key={bundle.id}
                className={`rounded-2xl border bg-card p-8 text-center shadow-sm ${
                  bundle.popular ? "ring-2 ring-primary" : ""
                }`}
              >
                <Coins className="w-8 h-8 mx-auto mb-4 text-primary" />

                <h3 className="text-xl font-bold mb-1">{bundle.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {bundle.credits} AI credits
                </p>

                <div className="text-3xl font-bold mb-1">
                  ₦{bundle.price.toLocaleString()}
                </div>

                {usdRate && (
                  <div className="text-[11px] text-muted-foreground mb-6 opacity-70">
                    ≈ ${(bundle.price * usdRate).toFixed(2)} USD
                  </div>
                )}

                <a
                  href="/dashboard/billing"
                  className="block bg-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Buy Credits
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-r from-primary to-accent text-white">
        <h2 className="text-3xl font-bold mb-4">
          Study Smarter with Quizler
        </h2>
        <p className="mb-8 text-white/80 max-w-xl mx-auto">
          Whether you subscribe or buy credits, Quizler adapts to your learning
          style.
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
