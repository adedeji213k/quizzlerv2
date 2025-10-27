"use client";

import { Upload, Brain, ListChecks, BarChart3, Sparkles } from "lucide-react";
import Image from "next/image";
import Navbar from "../components/NavBar";
import Footer from "../components/Footer";

// ✅ Import your images from /app/assets (replace these with your actual files)
import step1 from "@/app/assets/how-step-1.png";
import step2 from "@/app/assets/how-step-2.png";
import step3 from "@/app/assets/how-step-3.png";
import step4 from "@/app/assets/how-step-4.png";
import step5 from "@/app/assets/how-step-5.png";

const steps = [
  {
    icon: Upload,
    title: "1. Upload Your Document",
    description:
      "Start by uploading a study material — it can be a PDF, DOCX, or text file. Our system securely processes your document to prepare it for analysis.",
    image: step1,
  },
  {
    icon: Brain,
    title: "2. AI Reads and Understands It",
    description:
      "Our intelligent AI engine scans through the content, identifies key concepts, and extracts important points for quiz creation.",
    image: step2,
  },
  {
    icon: ListChecks,
    title: "3. Quiz Questions Are Generated",
    description:
      "In seconds, the AI creates a complete quiz — including questions, multiple-choice options, and correct answers — all based on your uploaded material.",
    image: step3,
  },
  {
    icon: BarChart3,
    title: "4. Review and Customize",
    description:
      "You can review each question, make edits, add custom questions, or adjust the difficulty before saving or publishing your quiz.",
    image: step4,
  },
  {
    icon: Sparkles,
    title: "5. Share and Track Results",
    description:
      "Share the quiz with others or take it yourself. Track scores, time, and performance analytics directly from your dashboard.",
    image: step5,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            How It Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From document upload to AI-powered quiz generation — here’s how our
            platform turns your content into engaging learning experiences in
            just a few steps.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`grid md:grid-cols-2 gap-10 items-center ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Text Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold">{step.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Image Section */}
                <div className="flex justify-center">
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={500}
                    height={350}
                    className="rounded-xl shadow-md border border-border"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center bg-gradient-to-r from-primary to-accent text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to See It in Action?</h2>
        <p className="mb-8 text-white/80 max-w-xl mx-auto">
          Upload your first document and watch AI transform it into a quiz
          within seconds. Simple, fast, and incredibly smart.
        </p>
        <a
          href="/upload"
          className="bg-white text-primary font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition"
        >
          Upload a Document
        </a>
      </section>

      <Footer />
    </div>
  );
}
