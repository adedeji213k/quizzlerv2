"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Quiz {
  title: string;
}

interface QuizResult {
  id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  created_at: string;
  quizzes?: Quiz[];
}

export default function Results() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          created_at,
          quizzes!quiz_results_quiz_id_fkey(title)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setResults(data);
      }

      setLoading(false);
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading results...
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

          const quizTitle =
            result.quizzes?.[0]?.title || result.quizzes?.title || "Untitled Quiz";

          return (
            <button
              key={result.id}
              // ✅ Go to `/results/[result_id]`
              onClick={() => router.push(`/results/${result.id}`)}
              className={`w-full text-left border rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${colorClass}`}
            >
              <h3 className="font-semibold text-lg mb-2 truncate">{quizTitle}</h3>

              <div className="mt-2 text-sm">
                <p>
                  Score:{" "}
                  <strong className="font-bold">
                    {result.score}/{result.total_questions}
                  </strong>
                </p>

                <div className="w-full h-2 mt-2 bg-muted rounded-full overflow-hidden">
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
                  {new Date(result.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
