"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ExternalLink, CircleX, MoreVertical } from "lucide-react";

interface FlashcardSet {
  id: string;
  title: string;
  owner: string;
  creator_email: string;
  created_at: string;
  cards_count: number;
  linked_quiz: number | null;
  status: string;
}

const PER_PAGE = 20;

export default function AdminFlashcards() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [filtered, setFiltered] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [cardsPreview, setCardsPreview] = useState<any[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    totalCards: 0,
    avgCardsPerSet: 0,
    mostCards: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
    setPage(1);
  }, [search, statusFilter, sets]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Flashcard sets
      const { data: setData } = await supabase
        .from("flashcard_sets")
        .select("*")
        .order("created_at", { ascending: false });

      // Users
      const { data: users } = await supabase
        .from("users")
        .select("id, email");

      const userMap: Record<string, string> = {};
      users?.forEach(u => (userMap[u.id] = u.email));

      // Flashcards
      const { data: cards } = await supabase
        .from("flashcards")
        .select("set_id");

      const cardsMap: Record<string, number> = {};
      cards?.forEach(c => {
        cardsMap[c.set_id] = (cardsMap[c.set_id] || 0) + 1;
      });

      const enriched: FlashcardSet[] =
        setData?.map(s => ({
          id: s.id,
          title: s.title,
          owner: s.owner,
          creator_email: userMap[s.owner] || "Unknown",
          created_at: s.created_at,
          cards_count: cardsMap[s.id] || 0,
          linked_quiz: s.quiz_id,
          status: s.quiz_id ? "linked" : "standalone",
        })) || [];

      setSets(enriched);

      // Stats
      const today = new Date().toDateString();

      const total = enriched.length;
      const createdToday = enriched.filter(
        s => new Date(s.created_at).toDateString() === today
      ).length;

      const totalCards = enriched.reduce((sum, s) => sum + s.cards_count, 0);

      const avgCardsPerSet =
        total > 0 ? Math.round(totalCards / total) : 0;

      const mostCards = Math.max(
        ...enriched.map(s => s.cards_count),
        0
      );

      setStats({
        total,
        today: createdToday,
        totalCards,
        avgCardsPerSet,
        mostCards,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let data = [...sets];

    if (search) {
      data = data.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.creator_email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      data = data.filter(s => s.status === statusFilter);
    }

    setFiltered(data);
  };

  const loadSetDetails = async (set: FlashcardSet) => {
    setSelectedSet(set);

    const { data } = await supabase
      .from("flashcards")
      .select("id, front, back")
      .eq("set_id", set.id)
      .limit(5);

    setCardsPreview(data || []);
  };

  const paginated = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (loading) return <p className="animate-pulse">Loading flashcards...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Flashcards</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Sets" value={stats.total} />
        <StatCard label="Created Today" value={stats.today} />
        <StatCard label="Total Cards" value={stats.totalCards} />
        <StatCard label="Avg Cards/Set" value={stats.avgCardsPerSet} />
        <StatCard label="Most Cards" value={stats.mostCards} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search title or creator..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-xl bg-background"
        />

        <select
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-xl px-2"
        >
          <option value="all">All</option>
          <option value="linked">Linked to Quiz</option>
          <option value="standalone">Standalone</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th>Creator</th>
              <th>Date</th>
              <th>Cards</th>
              <th>Linked Quiz</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {paginated.map(s => (
              <tr
                key={s.id}
                className="border-b hover:bg-muted/40 transition"
              >
                <td className="p-3 font-medium">{s.title}</td>
                <td>{s.creator_email}</td>
                <td>
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td>{s.cards_count}</td>
                <td>{s.linked_quiz || "-"}</td>
                <td>{s.status}</td>

                <td className="p-3 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => loadSetDetails(s)}
                    className="p-2 hover:bg-muted rounded-md"
                  >
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Prev
          </button>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Drawer */}
      {selectedSet && (
        <div className="fixed right-0 top-0 w-96 h-full bg-background border-l p-5 shadow-xl overflow-y-auto">
          <button onClick={() => setSelectedSet(null)}>
            <CircleX />
          </button>

          <h2 className="text-xl font-bold mt-4">
            {selectedSet.title}
          </h2>

          <p className="text-muted-foreground">
            {selectedSet.creator_email}
          </p>

          <div className="mt-4 space-y-2">
            <p>Cards: {selectedSet.cards_count}</p>
            <p>Status: {selectedSet.status}</p>
          </div>

          <h3 className="mt-4 font-bold">Preview</h3>

          <ul className="text-sm mt-2 space-y-3">
            {cardsPreview.map(c => (
              <li key={c.id} className="border-b pb-2">
                <p className="font-medium">{c.front}</p>
                <p className="text-muted-foreground text-xs">
                  {c.back}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="p-4 border rounded-2xl bg-card shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <h2 className="text-xl font-bold mt-1">
        {value.toLocaleString()}
      </h2>
    </div>
  );
}