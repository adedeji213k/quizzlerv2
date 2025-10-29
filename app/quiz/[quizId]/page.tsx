"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

interface Choice {
  id: number;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  text: string;
  type: string;
  choices: Choice[];
}

export default function QuizDetailsPage() {
  const { quizId } = useParams();
  const router = useRouter();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        // ✅ Load quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        // ✅ Load questions only
        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select("id, text, type")
          .eq("quiz_id", quizId);

        if (qError) throw qError;

        // ✅ Load all choices at once
        const questionIds = questionsData.map((q) => q.id);
        const { data: choicesData, error: cError } = await supabase
          .from("choices")
          .select("id, text, is_correct, question_id")
          .in("question_id", questionIds);

        if (cError) throw cError;

        // ✅ Format data by grouping choices by question
        const formatted = questionsData.map((q) => ({
          ...q,
          choices: choicesData.filter((c) => c.question_id === q.id),
        }));

        setQuestions(formatted);
      } catch (err: any) {
        console.error("❌ Error loading quiz:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (quizId) fetchQuizData();
  }, [quizId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading quiz...</span>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Quiz not found.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-accent transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background px-6 py-10">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow p-8 border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {quiz.title}
            </h1>
            <p className="text-muted-foreground mt-1">{quiz.description}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-accent/10 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Quiz Info */}
        <div className="mb-8 text-sm text-muted-foreground border-b border-border pb-4">
          <p>
            <strong>Created:</strong>{" "}
            {new Date(quiz.created_at).toLocaleDateString()}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {quiz.is_published ? (
              <span className="text-green-500 font-medium">Published</span>
            ) : (
              <span className="text-yellow-500 font-medium">Draft</span>
            )}
          </p>
        </div>

        {/* Questions */}
        {questions.length === 0 ? (
          <p className="text-muted-foreground text-center">
            No questions available yet.
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
                  {q.choices.map((choice) => (
                    <li
                      key={choice.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                        choice.is_correct
                          ? "border-green-500 bg-green-50/5"
                          : "border-border"
                      }`}
                    >
                      {choice.is_correct ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span>{choice.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Start Quiz */}
        {questions.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => alert("Start quiz feature coming soon!")}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg shadow hover:opacity-90 transition"
            >
              Start Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
