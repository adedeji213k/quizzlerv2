"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, Edit, Trash2, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  duration: number | null;
}

export default function MyQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDuration, setNewDuration] = useState<number>(10);
  const router = useRouter();

  // ✅ Fetch user's quizzes
  const fetchQuizzes = async () => {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Error fetching session:", sessionError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, description, created_at, duration")
      .eq("owner", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quizzes:", error.message);
    } else {
      setQuizzes(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // ✅ Handle Create Quiz
  const handleCreateQuiz = () => {
    router.push("/create-quiz");
  };

  // ✅ Handle Delete Quiz
  const handleDeleteQuiz = async (quizId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = confirm(
      "Are you sure you want to delete this quiz? This will remove all related questions, choices, and attempts."
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

    if (error) {
      alert("Error deleting quiz: " + error.message);
    } else {
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    }
  };

  // ✅ Handle Edit Quiz
  const handleEditQuiz = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigating when clicking edit
    setEditingQuiz(quiz);
    setNewTitle(quiz.title);
    setNewDescription(quiz.description || "");
    setNewDuration(quiz.duration || 10);
    setShowEditModal(true);
  };

  // ✅ Save changes
  const handleSaveEdit = async () => {
    if (!editingQuiz) return;

    const { error } = await supabase
      .from("quizzes")
      .update({
        title: newTitle,
        description: newDescription,
        duration: newDuration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingQuiz.id);

    if (error) {
      alert("Error updating quiz: " + error.message);
    } else {
      setShowEditModal(false);
      setEditingQuiz(null);
      fetchQuizzes();
    }
  };

  // ✅ Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your quizzes...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Quizzes
        </h2>
        <button
          onClick={handleCreateQuiz}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-2 px-4 rounded-lg shadow hover:opacity-90 transition"
        >
          <PlusCircle className="w-5 h-5" /> Create Quiz
        </button>
      </div>

      {/* Quiz Cards */}
      {quizzes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>You haven’t created any quizzes yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              onClick={() => router.push(`/quiz/${quiz.id}`)} // ✅ navigate on click
              className="cursor-pointer bg-card border border-border rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
            >
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition">
                  {quiz.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                  {quiz.description || "No description provided."}
                </p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" /> Duration: {quiz.duration || 10} min
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={(e) => handleEditQuiz(quiz, e)}
                  className="flex items-center gap-2 bg-primary/10 text-primary font-medium py-2 px-3 rounded-lg hover:bg-primary/20 transition"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                  className="flex items-center gap-2 bg-destructive/10 text-destructive font-medium py-2 px-3 rounded-lg hover:bg-destructive/20 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md border border-border">
            <h3 className="text-xl font-semibold mb-4">Edit Quiz</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
