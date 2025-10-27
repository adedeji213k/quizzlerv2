"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, PlayCircle } from "lucide-react";

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  owner: string;
  is_published: boolean;
  created_at: string;
}

export default function TakeQuiz() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .or(`owner.eq.${session.user.id},is_published.eq.true`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quizzes:", error.message);
      } else {
        setQuizzes(data || []);
      }

      setLoading(false);
    };

    fetchQuizzes();
  }, []);

  const handleStartQuiz = (quizId: number) => {
    // Navigate to /take-quiz/[id]
    router.push(`/take-quiz/${quizId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading quizzes...
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No quizzes available yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Available Quizzes
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-card border border-border rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition"
          >
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {quiz.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                {quiz.description || "No description provided."}
              </p>
            </div>

            <button
              onClick={() => handleStartQuiz(quiz.id)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-2 px-4 rounded-lg shadow hover:opacity-90 transition"
            >
              <PlayCircle className="w-5 h-5" /> Start Quiz
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
