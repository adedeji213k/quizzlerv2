"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

interface Choice {
  id: number;
  text: string;
  is_correct: boolean;
  question_id: number;
}

interface Question {
  id: number;
  text: string;
  choices: Choice[];
  selected_choice_id?: number | null;
}

interface QuizResult {
  id: number;
  score: number;
  total_questions: number;
  created_at: string;
  quiz_id: number;
  quizzes?: { title: string; description: string };
}

export default function QuizResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params?.id as string;

  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resultId) return;

    const loadResult = async () => {
      try {
        setLoading(true);

        // ✅ 1️⃣ Auth check
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // ✅ 2️⃣ Get quiz result + quiz info
        const { data: resultData, error: resultErr } = await supabase
          .from("quiz_results")
          .select("*, quizzes(title, description)")
          .eq("id", resultId)
          .eq("user_id", session.user.id)
          .single();

        if (resultErr || !resultData) {
          console.error("❌ Error loading result:", resultErr);
          setLoading(false);
          return;
        }

        setResult(resultData);

        // ✅ 3️⃣ Get answers
        const { data: answers, error: answersError } = await supabase
          .from("result_answers")
          .select("question_id, selected_choice_id")
          .eq("quiz_result_id", resultData.id);

        if (answersError) {
          console.error("❌ Error loading answers:", answersError);
        }

        // ✅ 4️⃣ Get questions + choices
        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select(
            `
            id,
            text,
            choices (
              id,
              text,
              is_correct,
              question_id,
              position
            )
          `
          )
          .eq("quiz_id", resultData.quiz_id)
          .order("id", { ascending: true });

        if (qError) {
          console.error("❌ Error loading questions:", qError);
          setLoading(false);
          return;
        }

        // ✅ 5️⃣ Merge answers into questions
        const merged = (questionsData || []).map((q: Question) => {
          const answer = answers?.find((a) => a.question_id === q.id);
          return {
            ...q,
            selected_choice_id: answer?.selected_choice_id ?? null,
          };
        });

        setQuestions(merged);
      } catch (err) {
        console.error("🔥 Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [resultId, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading result...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">
          ⚠️ Could not load this quiz result.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-accent transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const percentage = Math.round(
    (result.score / result.total_questions) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background px-6 py-10">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow p-8 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {result.quizzes?.title || "Quiz Results"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {result.quizzes?.description}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-accent/10 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Score Info */}
        <div className="mb-8 text-sm text-muted-foreground border-b border-border pb-4">
          <p>
            <strong>Score:</strong>{" "}
            <span className="text-foreground font-semibold">
              {result.score}/{result.total_questions} ({percentage}%)
            </span>
          </p>
          <p>
            <strong>Date Taken:</strong>{" "}
            {new Date(result.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Questions */}
        {questions.length === 0 ? (
          <p className="text-muted-foreground text-center">
            No questions found for this quiz.
          </p>
        ) : (
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="bg-background/50 border border-border rounded-lg p-5 shadow-sm"
              >
                <h3 className="font-semibold mb-3">
                  {i + 1}. {q.text}
                </h3>

                <ul className="space-y-2">
                  {q.choices.map((choice) => {
                    const isSelected = choice.id === q.selected_choice_id;
                    const isCorrect = choice.is_correct;

                    return (
                      <li
                        key={choice.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                          isCorrect
                            ? "border-green-500 bg-green-500/10"
                            : isSelected
                            ? "border-red-500 bg-red-500/10"
                            : "border-border"
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : isSelected ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <span className="w-4" />
                        )}
                        <span>{choice.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Retake Button */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => router.push(`/take-quiz/${result.quiz_id}`)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg shadow hover:opacity-90 transition"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
