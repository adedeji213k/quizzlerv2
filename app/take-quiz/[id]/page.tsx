"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft } from "lucide-react";

interface Question {
  id: number;
  text: string;
  choices: { id: number; text: string; is_correct: boolean }[];
}

export default function TakeQuizPage() {
  const { id } = useParams(); // quiz ID from URL
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [saving, setSaving] = useState(false);

  // Fetch quiz questions + choices
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);

      const { data: questionsData, error: qError } = await supabase
        .from("questions")
        .select("id, text, choices(id, text, is_correct)")
        .eq("quiz_id", id)
        .order("id", { ascending: true });

      if (qError) {
        console.error("Error fetching questions:", qError);
      } else {
        setQuestions(questionsData || []);
      }

      setLoading(false);
    };

    fetchQuestions();
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (showResults || loading) return;
    if (timeLeft <= 0) {
      handleFinishQuiz();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, showResults, loading]);

  const handleAnswerSelect = (questionId: number, choiceId: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    let correctCount = 0;
    questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      const correctChoice = q.choices.find((c) => c.is_correct);
      if (selected && selected === correctChoice?.id) correctCount++;
    });

    setScore(correctCount);
    setShowResults(true);

    // Save result to Supabase
    try {
      setSaving(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("No session found, cannot save result.");
        return;
      }

      const { error } = await supabase.from("quiz_results").insert({
        user_id: session.user.id,
        quiz_id: id,
        score: correctCount,
        total_questions: questions.length,
        created_at: new Date().toISOString(),
      });

      if (error) console.error("Error saving result:", error);
    } catch (err) {
      console.error("Unexpected error saving result:", err);
    } finally {
      setSaving(false);
    }
  };

  // Format timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading quiz...
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions found for this quiz.</p>
      </div>
    );
  }

  // Show results
  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <h2 className="text-3xl font-bold mb-4">Quiz Completed 🎉</h2>
        <p className="text-lg mb-6">
          You scored{" "}
          <span className="font-semibold text-primary">{score}</span> out of{" "}
          {questions.length}
        </p>

        <div className="space-y-6 mb-8">
          {questions.map((q, idx) => {
            const selectedId = selectedAnswers[q.id];
            const correct = q.choices.find((c) => c.is_correct);
            const isCorrect = selectedId === correct?.id;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  isCorrect
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <p className="font-medium mb-2">
                  {idx + 1}. {q.text}
                </p>
                {q.choices.map((choice) => (
                  <div
                    key={choice.id}
                    className={`text-sm p-2 rounded ${
                      choice.id === correct?.id
                        ? "bg-green-100 font-semibold"
                        : choice.id === selectedId
                        ? "bg-red-100"
                        : ""
                    }`}
                  >
                    {choice.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {saving && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Saving your results...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Active quiz view
  const currentQuestion = questions[currentIndex];
  const selected = selectedAnswers[currentQuestion.id];

  return (
    <div className="max-w-2xl mx-auto py-10">
      {/* Timer and progress */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Time Left:{" "}
          <span className="font-semibold text-primary">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Question {currentIndex + 1} / {questions.length}
        </p>
      </div>

      <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <h3 className="text-xl font-semibold mb-4">{currentQuestion.text}</h3>

      <div className="space-y-3 mb-6">
        {currentQuestion.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleAnswerSelect(currentQuestion.id, choice.id)}
            className={`block w-full text-left border rounded-lg px-4 py-2 transition ${
              selected === choice.id
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted"
            }`}
          >
            {choice.text}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleNext}
          disabled={!selected}
          className={`px-4 py-2 rounded-lg font-medium ${
            !selected
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-primary text-white hover:opacity-90"
          }`}
        >
          {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next"}
        </button>
      </div>
    </div>
  );
}
