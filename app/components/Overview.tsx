"use client";

import { useEffect, useState } from "react";
import { Loader2, PlayCircle, PlusCircle, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  owner: string;
  is_published: boolean;
}

interface OverviewProps {
  setActiveTab: (tab: string) => void;
}

export default function Overview({ setActiveTab }: OverviewProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [flashcardsCount, setFlashcardsCount] = useState(0);
  const [results, setResults] = useState<{ quiz_id: number; score: number; total_questions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch quizzes (your quizzes + published quizzes)
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*")
        .or(`owner.eq.${userId},is_published.eq.true`)
        .order("created_at", { ascending: false });

      // Fetch quiz results including total_questions
      const { data: resultsData } = await supabase
        .from("quiz_results")
        .select("quiz_id, score, total_questions")
        .eq("user_id", userId);

      // Fetch flashcards count from flashcard_sets
      const { count: flashcardsTotal } = await supabase
        .from("flashcard_sets")
        .select("*", { count: "exact", head: true })
        .eq("owner", userId);

      setQuizzes(quizzesData || []);
      setResults(resultsData || []);
      setFlashcardsCount(flashcardsTotal || 0);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading overview...
      </div>
    );
  }

  // ✅ Calculate summary
  const uniqueQuizzesTaken = Array.from(new Set(results.map(r => r.quiz_id)));
  const totalQuizzesTaken = uniqueQuizzesTaken.length;

  // Calculate average percentage score
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0), 0) /
            results.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab("myQuizzes")}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow hover:shadow-lg transition"
          >
            <PlusCircle className="w-6 h-6 mb-2 text-primary" />
            Create Quiz
          </button>

          <button
            onClick={() => setActiveTab("takeQuiz")}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow hover:shadow-lg transition"
          >
            <PlayCircle className="w-6 h-6 mb-2 text-primary" />
            Take Quiz
          </button>

          <button
            onClick={() => setActiveTab("myFlashcards")}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow hover:shadow-lg transition"
          >
            <FileText className="w-6 h-6 mb-2 text-primary" />
            Create Flashcards
          </button>

          <button
            onClick={() => setActiveTab("myFlashcards")}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow hover:shadow-lg transition"
          >
            <CheckCircle2 className="w-6 h-6 mb-2 text-primary" />
            Review Flashcards
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Results Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow text-center">
            <p className="text-sm text-muted-foreground mb-1">Quizzes Taken</p>
            <p className="text-2xl font-bold text-primary">{totalQuizzesTaken}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow text-center">
            <p className="text-sm text-muted-foreground mb-1">Average Score</p>
            <p className="text-2xl font-bold text-primary">{avgScore}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow text-center">
            <p className="text-sm text-muted-foreground mb-1">Flashcards Created</p>
            <p className="text-2xl font-bold text-primary">{flashcardsCount}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.slice(0, 3).map((quiz) => (
            <div key={quiz.id} className="bg-card border border-border rounded-xl p-4 shadow">
              <h3 className="text-lg font-semibold">{quiz.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {quiz.description || "No description"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}