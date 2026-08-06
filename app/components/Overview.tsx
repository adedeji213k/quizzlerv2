"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  PlayCircle,
  PlusCircle,
  FileText,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Clock3,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  owner: string;
  is_published: boolean;
  created_at: string;

  questions: {
    count: number;
  }[];
}

interface OverviewProps {
  setActiveTab: (tab: string) => void;
}

export default function Overview({ setActiveTab }: OverviewProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [flashcardsCount, setFlashcardsCount] = useState(0);
  const [results, setResults] = useState<
    {
      quiz_id: number;
      score: number;
      total_questions: number;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch quizzes (your quizzes + published quizzes)
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select(
          `
  *,
  questions(count)
`,
        )
        .or(`owner.eq.${userId},is_published.eq.true`)
        .order("created_at", { ascending: false });

      // Fetch quiz results including total_questions
      const { data: resultsData } = await supabase
        .from("quiz_results")
        .select(
          `
  quiz_id,
  score,
  total_questions,
  created_at
`,
        )
        .order("created_at", { ascending: true })
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
  const uniqueQuizzesTaken = Array.from(new Set(results.map((r) => r.quiz_id)));
  const totalQuizzesTaken = uniqueQuizzesTaken.length;

  // Calculate average percentage score
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce(
            (sum, r) =>
              sum +
              (r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0),
            0,
          ) / results.length,
        )
      : 0;

  const progressChartData = results.map((result, index) => ({
    attempt: index + 1,
    percentage:
      result.total_questions > 0
        ? Math.round((result.score / result.total_questions) * 100)
        : 0,
  }));

  const recentScoresData = results.slice(-6).map((result, index) => ({
    name: `${index + 1}`,
    score:
      result.total_questions > 0
        ? Math.round((result.score / result.total_questions) * 100)
        : 0,
  }));

  return (
    <div className="space-y-8">
      {/* Results Summary */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-5">
          Results Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group rounded-2xl border border-border/70 bg-card px-5 py-4  transition-all duration-200 hover:-translate-y-0.5 shadow-md">
            <p className="mt-2 text-sm font-medium text-foreground">
              Quizzes Taken
            </p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {totalQuizzesTaken}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Your completed quizzes
            </p>
          </div>

          <div className="group rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="mt-2 text-sm font-medium text-foreground">
              Average Score
            </p>
            <p className="text-3xl font-semibold tracking-tight text-primary">
              {avgScore}%
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Across every attempt
            </p>
          </div>

          <div className="group rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="mt-2 text-sm font-medium text-foreground">
              Flashcards Created
            </p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {flashcardsCount}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">Ready to study</p>
          </div>
        </div>
      </div>

      {/* Learning Analytics */}

      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-5">
          Learning Analytics
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Progress */}

          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-md">
            <div className="mb-4">
              <h3 className="font-semibold">Learning Progress</h3>

              <p className="text-sm text-muted-foreground">
                Your score across all quiz attempts
              </p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.15}
                  />

                  <XAxis dataKey="attempt" tickLine={false} axisLine={false} />

                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Scores */}

          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-md">
            <div className="mb-4">
              <h3 className="font-semibold">Recent Scores</h3>

              <p className="text-sm text-muted-foreground">Last six quizzes</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentScoresData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.15}
                  />

                  <XAxis dataKey="name" tickLine={false} axisLine={false} />

                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />

                  <Tooltip />

                  <Bar
                    dataKey="score"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab("myQuizzes")}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-gradient-to-r from-primary/10 to-accent/10 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlusCircle className="h-5 w-5" />
              </div>

              <div className="text-left">
                <p className="font-medium">Create Quiz</p>
                <p className="text-xs text-muted-foreground">
                  Build a new quiz
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => setActiveTab("takeQuiz")}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-gradient-to-r from-primary/10 to-accent/10 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlayCircle className="h-5 w-5" />
              </div>

              <div className="text-left">
                <p className="font-medium">Take Quiz</p>
                <p className="text-xs text-muted-foreground">
                  Practice your knowledge
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => setActiveTab("myFlashcards")}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-gradient-to-r from-primary/10 to-accent/10 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>

              <div className="text-left">
                <p className="font-medium">Create Flashcards</p>
                <p className="text-xs text-muted-foreground">
                  Generate study cards
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => setActiveTab("myFlashcards")}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-gradient-to-r from-primary/10 to-accent/10 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="text-left">
                <p className="font-medium">Review Flashcards</p>
                <p className="text-xs text-muted-foreground">
                  Continue studying
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Recent Activity
          </h2>

          <button
            onClick={() => setActiveTab("myQuizzes")}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>

        <div className="space-y-3">
          {quizzes.slice(0, 3).map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => setActiveTab("myQuizzes")}
              className="group w-full rounded-2xl border border-border/60 bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-gradient-to-r from-primary/10 to-accent/10hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-semibold">{quiz.title}</h3>

                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{quiz.questions?.[0]?.count ?? 0} questions</span>

                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Recently edited
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
