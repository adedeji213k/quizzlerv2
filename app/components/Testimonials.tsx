"use client";

import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "David A.",
    school: "UNILAG",
    text: "Quizzler helped me revise 3 courses in 2 days. I actually felt confident going into my exams.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    school: "UI",
    text: "The flashcards + quizzes combo is crazy effective. I stopped cramming last minute.",
    rating: 5,
  },
  {
    name: "Emeka J.",
    school: "UNN",
    text: "I used Quizzler every night for a week and my test score improved instantly.",
    rating: 5,
  },
  {
    name: "Tobi L.",
    school: "OAU",
    text: "This is honestly better than reading notes. The quizzes just stick in your head.",
    rating: 5,
  },
  {
    name: "Zainab M.",
    school: "ABU",
    text: "I recommended this to my friends and now everyone is using it before tests.",
    rating: 5,
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);

  // Auto scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getVisible = () => {
    const prev = (index - 1 + testimonials.length) % testimonials.length;
    const next = (index + 1) % testimonials.length;

    return [testimonials[prev], testimonials[index], testimonials[next]];
  };

  const visible = getVisible();

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/40 overflow-hidden">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">
          Loved by Students Everywhere
        </h2>
        <p className="text-muted-foreground">Real results. Real students.</p>
      </div>

      {/* Carousel */}
      <div className="flex justify-center items-center gap-6">
        {visible.map((t, i) => {
          const isCenter = i === 1;

          return (
            <div
              key={i}
              className={`relative transition-all duration-500 ease-in-out ${
                isCenter ? "scale-110 opacity-100 z-10" : "scale-90 opacity-50"
              }`}
            >
              {/* Card */}
              <div
                className={`relative bg-background p-8 rounded-2xl w-[300px] md:w-[360px] transition-all duration-500 ${
                  isCenter ? "shadow-2xl ring-1 ring-primary/10" : "shadow-lg"
                }`}
              >
                {/* Quote Icon (top-right) */}
                <Quote
                  className={`absolute top-4 right-4 transition-all duration-500 ${
                    isCenter
                      ? "w-10 h-10 text-primary/40"
                      : "w-8 h-8 text-primary/20"
                  }`}
                />

                {/* Stars */}
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-lg mb-6 leading-relaxed">“{t.text}”</p>

                {/* User */}
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.school}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center mt-10 gap-2">
        {testimonials.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "bg-primary w-6" : "bg-muted w-2"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
