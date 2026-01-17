"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

interface Choice {
  id: number;
  text: string;
  is_correct: boolean;
  question_id: number;
  position: number; // ✅ 0-based
}

interface Explanation {
  correct: string;
  incorrect: Record<string, string>; // A, B, C, D
}

interface Question {
  id: number;
  text: string;
  choices: Choice[];
  selected_choice_id?: number | null;
  metadata?: {
    explanation?: Explanation;
  };
}

interface ShareResult {
  id: number;
  score: number;
  total_questions: number;
  created_at: string;
  quiz_id: number;
  participant_name: string;
  quizzes?: { title: string; description: string };
}

export default function ShareResultPage() {
  const { id } = useParams();
  const router = useRouter();

  const [result, setResult] = useState<ShareResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const LogoHeader = () => (
    <div className="flex items-center gap-3 mb-6 justify-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Quizzler
      </span>
    </div>
  );

  useEffect(() => {
    if (!id) return;

    const loadShareResult = async () => {
      setLoading(true);
      try {
        // 1️⃣ Shared quiz result
        const { data: resultData, error: resultError } = await supabase
          .from("share_quiz_results")
          .select("*, quizzes(title, description)")
          .eq("id", id)
          .single();

        if (resultError || !resultData) throw resultError;
        setResult(resultData);

        // 2️⃣ Answers
        const { data: answers } = await supabase
          .from("share_quiz_result_answers")
          .select("question_id, selected_choice_id")
          .eq("share_quiz_result_id", resultData.id);

        // 3️⃣ Questions (WITH metadata)
        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select("id, text, metadata")
          .eq("quiz_id", resultData.quiz_id)
          .order("id", { ascending: true });

        if (qError || !questionsData) throw qError;

        // 4️⃣ Choices (WITH position)
        const questionIds = questionsData.map((q) => q.id);
        const { data: choicesData, error: cError } = await supabase
          .from("choices")
          .select("id, text, is_correct, question_id, position")
          .in("question_id", questionIds);

        if (cError || !choicesData) throw cError;

        // 5️⃣ Merge everything
        const merged: Question[] = questionsData.map((q: Question) => {
          const questionChoices = choicesData
            .filter((c) => c.question_id === q.id)
            .sort((a, b) => a.position - b.position);

          const answer = answers?.find((a) => a.question_id === q.id);

          return {
            ...q,
            choices: questionChoices,
            selected_choice_id: answer?.selected_choice_id ?? null,
          };
        });

        setQuestions(merged);
      } catch (err) {
        console.error("Error loading share result:", err);
      } finally {
        setLoading(false);
      }
    };

    loadShareResult();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading result...
        </span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">
          ⚠️ Could not load this shared result.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-muted rounded-lg"
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
        <LogoHeader />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {result.quizzes?.title || "Quiz Result"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {result.quizzes?.description}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Participant:{" "}
              <span className="font-semibold">
                {result.participant_name}
              </span>
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Score */}
        <div className="mb-8 text-sm border-b border-border pb-4">
          <p>
            <strong>Score:</strong>{" "}
            <span className="font-semibold">
              {result.score}/{result.total_questions} (
              {percentage}%)
            </span>
          </p>
          <p>
            <strong>Date Taken:</strong>{" "}
            {new Date(result.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, i) => {
            const explanation = q.metadata?.explanation;

            return (
              <div
                key={q.id}
                className="bg-background/50 border border-border rounded-xl p-5 shadow-sm"
              >
                <h3 className="font-semibold mb-3">
                  {i + 1}. {q.text}
                </h3>

                <ul className="space-y-2">
                  {q.choices.map((choice) => {
                    const isSelected =
                      choice.id === q.selected_choice_id;
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

                {/* ✅ Explanations */}
                {explanation && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-3">
                    <div>
                      <strong>Why the correct answer is correct</strong>
                      <p className="text-muted-foreground mt-1">
                        {explanation.correct}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Why the other options are incorrect
                      </strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                        {q.choices
                          .filter((c) => !c.is_correct)
                          .map((c) => {
                            const letter = String.fromCharCode(
                              65 + c.position
                            );

                            return (
                              <li key={c.id}>
                                <span className="font-medium">
                                  {letter}. {c.text}:
                                </span>{" "}
                                {explanation.incorrect?.[letter] ??
                                  "No explanation provided."}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Retake */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() =>
              router.push(`/share-quiz/${result.quiz_id}`)
            }
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
