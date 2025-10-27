"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Loader2 } from "lucide-react";

interface Quiz {
  title: string;
}

interface QuizResult {
  id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  created_at: string;
  quizzes: Quiz[]; // quizzes is an array
}

export default function Results() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quiz_results")
        .select("id, quiz_id, score, total_questions, created_at, quizzes(title)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching results:", error.message);
      } else if (data) {
        // Normalize quizzes to ensure it's always an array with proper type
        const normalized = data.map((item: any) => ({
          ...item,
          quizzes: Array.isArray(item.quizzes)
            ? item.quizzes.map((q: any) => ({ title: String(q.title) }))
            : [],
        }));

        setResults(normalized);
      } else {
        setResults([]);
      }

      setLoading(false);
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading results...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-70" />
        <p>No quiz results yet — take a quiz to see your progress!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
        <Trophy className="w-6 h-6 text-primary" /> Your Quiz Results
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => {
          const percentage =
            result.total_questions > 0
              ? Math.round((result.score / result.total_questions) * 100)
              : 0;

          const colorClass =
            percentage >= 80
              ? "text-green-500 border-green-500/30 bg-green-500/5"
              : percentage >= 50
              ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5"
              : "text-red-500 border-red-500/30 bg-red-500/5";

          return (
            <div
              key={result.id}
              className={`border rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${colorClass}`}
            >
              <h3 className="font-semibold text-lg mb-2 truncate">
                {result.quizzes[0]?.title || "Untitled Quiz"}
              </h3>

              <div className="flex justify-between text-sm mb-1">
                <span>Score:</span>
                <span className="font-semibold">{result.score}</span>
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span>Total Questions:</span>
                <span>{result.total_questions}</span>
              </div>

              <div className="flex justify-between text-sm mb-3">
                <span>Percentage:</span>
                <span className="font-semibold">{percentage}%</span>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    percentage >= 80
                      ? "bg-green-500"
                      : percentage >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Taken on{" "}
                {new Date(result.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
