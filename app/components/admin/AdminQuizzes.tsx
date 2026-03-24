'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ExternalLink, CircleX, MoreVertical } from "lucide-react";

interface Quiz {
  id: number;
  title: string;
  owner: string;
  creator_email: string;
  created_at: string;
  questions_count: number;
  attempts: number;
  avg_score: number;
  status: string;
}

const PER_PAGE = 20;

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filtered, setFiltered] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questionsPreview, setQuestionsPreview] = useState<any[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    activeUsers: 0,
    avgScore: 0,
    mostAttempts: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
    setPage(1);
  }, [search, statusFilter, quizzes]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: users } = await supabase
        .from("users")
        .select("id, email");

      const userMap: Record<string, string> = {};
      users?.forEach(u => userMap[u.id] = u.email);

      const { data: questions } = await supabase
        .from("questions")
        .select("quiz_id");

      const questionCountMap: Record<number, number> = {};
      questions?.forEach(q => {
        questionCountMap[q.quiz_id] = (questionCountMap[q.quiz_id] || 0) + 1;
      });

      // ✅ USE quiz_results instead
      const { data: results } = await supabase
        .from("quiz_results")
        .select("quiz_id, score, total_questions, created_at");

      const attemptsMap: Record<number, number[]> = {};
      results?.forEach(r => {
        if (!attemptsMap[r.quiz_id]) attemptsMap[r.quiz_id] = [];

        const percent =
          r.total_questions > 0
            ? (r.score / r.total_questions) * 100
            : 0;

        attemptsMap[r.quiz_id].push(percent);
      });

      const enriched: Quiz[] = quizData?.map(q => {
        const scores = attemptsMap[q.id] || [];
        const avg =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

        return {
          id: q.id,
          title: q.title,
          owner: q.owner,
          creator_email: userMap[q.owner] || "Unknown",
          created_at: q.created_at,
          questions_count: questionCountMap[q.id] || 0,
          attempts: scores.length,
          avg_score: Math.round(avg),
          status: q.is_published ? "active" : "draft",
        };
      }) || [];

      setQuizzes(enriched);

      const today = new Date().toDateString();

      const total = enriched.length;
      const createdToday = enriched.filter(q => new Date(q.created_at).toDateString() === today).length;

      const last24h = Date.now() - 24 * 60 * 60 * 1000;

      const activeUsers =
        results?.filter(r => new Date(r.created_at).getTime() > last24h).length || 0;

      const allScores = enriched.flatMap(q => attemptsMap[q.id] || []);
      const avgScore =
        allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0;

      const mostAttempts = Math.max(...enriched.map(q => q.attempts), 0);

      setStats({
        total,
        today: createdToday,
        activeUsers,
        avgScore,
        mostAttempts,
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let data = [...quizzes];

    if (search) {
      data = data.filter(q =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.creator_email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      data = data.filter(q => q.status === statusFilter);
    }

    setFiltered(data);
  };

  const loadQuizDetails = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);

    const { data } = await supabase
      .from("questions")
      .select("id, text")
      .eq("quiz_id", quiz.id)
      .limit(5);

    setQuestionsPreview(data || []);
  };

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (loading) return <p className="animate-pulse">Loading quizzes...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quizzes</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Quizzes" value={stats.total} />
        <StatCard label="Created Today" value={stats.today} />
        <StatCard label="Active Takers (24h)" value={stats.activeUsers} />
        <StatCard label="Avg Score (%)" value={stats.avgScore} />
        <StatCard label="Most Attempts" value={stats.mostAttempts} />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search title or creator..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-xl bg-background"
        />
        <select onChange={e => setStatusFilter(e.target.value)} className="border rounded-xl px-2">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="overflow-x-auto border rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th>Creator</th>
              <th>Date</th>
              <th>Questions</th>
              <th>Attempts</th>
              <th>Avg Score</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(q => (
              <tr key={q.id} className="border-b hover:bg-muted/40 transition">
                <td className="p-3 font-medium">{q.title}</td>
                <td>{q.creator_email}</td>
                <td>{new Date(q.created_at).toLocaleDateString()}</td>
                <td>{q.questions_count}</td>
                <td>{q.attempts}</td>
                <td>{q.avg_score}%</td>
                <td>{q.status}</td>
                <td className="p-3 text-right flex gap-2 justify-end">
                  <button onClick={() => loadQuizDetails(q)} className="p-2 hover:bg-muted rounded-md">
                    <ExternalLink size={18} />
                  </button>
                  <button className="p-2 hover:bg-muted rounded-md">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Prev</button>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      </div>

      {selectedQuiz && (
        <div className="fixed right-0 top-0 w-96 h-full bg-background border-l p-5 shadow-xl overflow-y-auto">
          <button onClick={() => setSelectedQuiz(null)}>
            <CircleX />
          </button>

          <h2 className="text-xl font-bold mt-4">{selectedQuiz.title}</h2>
          <p className="text-muted-foreground">{selectedQuiz.creator_email}</p>

          <div className="mt-4 space-y-2">
            <p>Questions: {selectedQuiz.questions_count}</p>
            <p>Attempts: {selectedQuiz.attempts}</p>
            <p>Avg Score: {selectedQuiz.avg_score}%</p>
          </div>

          <h3 className="mt-4 font-bold">Questions Preview</h3>
          <ul className="text-sm mt-2 space-y-2">
            {questionsPreview.map(q => (
              <li key={q.id} className="border-b pb-2">{q.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 border rounded-2xl bg-card shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <h2 className="text-xl font-bold mt-1">{value.toLocaleString()}</h2>
    </div>
  );
}