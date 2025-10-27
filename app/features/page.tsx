"use client";

import {
  Brain,
  Upload,
  FileText,
  Sparkles,
  BarChart,
  Shield,
  Clock,
} from "lucide-react";
import Footer from "../components/Footer";
import Image from "next/image";
import Navbar from "../components/NavBar";
import preview from "@/app/assets/ai-quiz-preview.png";

const features = [
  {
    icon: Upload,
    title: "Upload Your Document",
    description:
      "Simply upload a PDF, DOCX, or text file — our AI reads and understands the content instantly, preparing it for question generation.",
  },
  {
    icon: Brain,
    title: "AI-Powered Question Generation",
    description:
      "Leverage advanced AI models that analyze your material and generate meaningful, context-aware questions with multiple-choice answers.",
  },
  {
    icon: FileText,
    title: "Context-Rich Question Design",
    description:
      "The AI identifies key ideas, definitions, and insights from your document to craft relevant and accurate quiz questions.",
  },
  {
    icon: BarChart,
    title: "Performance Insights",
    description:
      "Get real-time feedback and detailed analytics on quiz attempts, helping learners track their progress and understanding.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable Platform",
    description:
      "Your uploaded documents and generated quizzes are stored securely using Supabase, ensuring privacy and data integrity.",
  },
  {
    icon: Sparkles,
    title: "Adaptive Learning",
    description:
      "The system learns from quiz performance to suggest difficulty levels and question improvements over time.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Transform Documents into Smart Quizzes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload any study material and let our AI instantly generate quiz
            questions that help learners test understanding, reinforce memory,
            and retain knowledge more effectively.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful AI-Driven Features
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md p-8 text-center transition"
              >
                <div className="flex justify-center mb-4">
                  <feature.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              Built for Educators, Students, and Professionals
            </h2>
            <p className="text-muted-foreground mb-6">
              Our AI quiz generator is designed to make learning efficient and
              assessment effortless. Whether you're preparing lessons,
              self-studying, or training a team — you can transform reading
              materials into interactive quizzes in seconds.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✅ Upload notes, books, or articles in seconds</li>
              <li>✅ Generate AI-based questions instantly</li>
              <li>✅ Edit, save, and share your quizzes</li>
              <li>✅ Track progress and performance analytics</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Image
              src={preview}
              alt="AI quiz generation dashboard preview"
              width={500}
              height={350}
              className="rounded-xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center bg-gradient-to-r from-primary to-accent text-white">
        <h2 className="text-3xl font-bold mb-4">
          Experience AI-Generated Learning
        </h2>
        <p className="mb-8 text-white/80 max-w-xl mx-auto">
          Upload your first document and see how quickly AI can turn your
          content into an engaging and interactive quiz.
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
