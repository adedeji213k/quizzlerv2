"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft } from "lucide-react";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  explanation?: string | null;
}

export default function FlashcardSetPage() {
  const { id } = useParams(); // flashcard set ID
  const router = useRouter();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", id)
          .order("id", { ascending: true });

        if (error) throw error;
        setFlashcards(data || []);
      } catch (err: any) {
        console.error("❌ Error fetching flashcards:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchFlashcards();
  }, [id]);

  const nextCard = () => {
    setFlipped(false);
    setShowExplanation(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setShowExplanation(false);
    setCurrentIndex(
      (prev) => (prev - 1 + flashcards.length) % flashcards.length,
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading flashcards...
        </span>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">No flashcards found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-muted rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  const card = flashcards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-2xl relative">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute top-0 left-0 flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-accent/10 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Flashcard */}
        <div
          className="flex justify-center mt-8"
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="relative w-full max-w-md aspect-[3/4] cursor-pointer perspective">
            <div
              className={`relative h-full w-full transition-transform duration-700 transform-style-preserve-3d ${
                flipped ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT */}
              <div className="absolute inset-0 backface-hidden rounded-3xl border bg-gradient-to-b from-card to-card/90 shadow-2xl p-8 flex flex-col">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Front
                </span>

                <div className="flex-1 flex items-center justify-center">
                  <p className="text-2xl font-semibold text-center leading-relaxed">
                    {card.front}
                  </p>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  Click anywhere to flip
                </p>
              </div>

              {/* BACK */}
              <div className="absolute inset-0 rotate-y-180 backface-hidden rounded-3xl border bg-gradient-to-b from-card to-card/90 shadow-2xl p-8 flex flex-col">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Answer
                </span>

                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-2xl font-semibold text-center leading-relaxed">
                    {card.back}
                  </p>

                  {card.explanation && (
                    <div className="mt-8 flex flex-col items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExplanation((s) => !s);
                        }}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        {showExplanation
                          ? "Hide Explanation"
                          : "View Explanation"}
                      </button>

                      {showExplanation && (
                        <div className="mt-5 w-full rounded-2xl bg-muted/50 border p-4">
                          <p className="text-sm leading-7 text-muted-foreground text-center">
                            {card.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  Click anywhere to flip back
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between w-full max-w-xs mx-auto">
          <button
            onClick={prevCard}
            className="px-4 py-2 bg-muted rounded-lg hover:bg-accent/10 transition"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {flashcards.length}
          </span>
          <button
            onClick={nextCard}
            className="px-4 py-2 bg-muted rounded-lg hover:bg-accent/10 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Flip CSS */}
      <style jsx>{`
        .perspective {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}
