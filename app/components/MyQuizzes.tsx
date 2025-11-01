"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
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
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDuration, setNewDuration] = useState<number>(10);
  const router = useRouter();

  // Load quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, description, created_at, duration")
      .eq("owner", session.user.id)
      .order("created_at", { ascending: false });

    if (!error) setQuizzes(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleCreateQuiz = () => router.push("/create-quiz");

  // ✅ Delete Quiz
  const handleDeleteQuiz = async (quizId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = confirm("Delete this quiz and its file?");
    if (!confirmDelete) return;

    setDeletingQuizId(quizId);

    try {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, storage_path")
        .eq("quiz_id", quizId)
        .maybeSingle();

      if (docs?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([docs.storage_path]);
        if (storageError) throw new Error("Failed to delete storage file");

        await supabase.from("documents").delete().eq("id", docs.id);
      }

      const { error: quizError } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (quizError) throw quizError;

      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setSuccessMessage("Quiz deleted successfully ✅");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleEditQuiz = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQuiz(quiz);
    setNewTitle(quiz.title);
    setNewDescription(quiz.description || "");
    setNewDuration(quiz.duration ?? 10);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuiz) return;
    await supabase
      .from("quizzes")
      .update({
        title: newTitle,
        description: newDescription,
        duration: newDuration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingQuiz.id);

    setShowEditModal(false);
    setEditingQuiz(null);
    fetchQuizzes();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-muted-foreground text-sm sm:text-base">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your quizzes...
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6">
      {/* ✅ Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm sm:text-base z-50">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Quizzes
        </h2>
        <button
          onClick={handleCreateQuiz}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-2 px-4 rounded-lg shadow hover:opacity-90 transition text-sm sm:text-base w-full sm:w-auto"
        >
          <PlusCircle className="w-5 h-5" /> Create Quiz
        </button>
      </div>

      {/* Quiz Cards */}
      {quizzes.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm sm:text-base">
          You haven’t created any quizzes yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              onClick={() => router.push(`/quiz/${quiz.id}`)}
              className="cursor-pointer bg-card border border-border rounded-xl shadow-md p-5 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
            >
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition break-words">
                  {quiz.title}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-3 break-words">
                  {quiz.description || "No description provided."}
                </p>
                <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1 shrink-0" /> Duration:{" "}
                  {quiz.duration ?? 10} min
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2 sm:gap-0">
                <button
                  onClick={(e) => handleEditQuiz(quiz, e)}
                  className="flex items-center justify-center gap-2 bg-primary/10 text-primary font-medium px-3 py-2 rounded-lg hover:bg-primary/20 transition text-sm w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>

                <button
                  onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                  className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive font-medium px-3 py-2 rounded-lg hover:bg-destructive/20 transition text-sm w-full sm:w-auto"
                  disabled={deletingQuizId === quiz.id}
                >
                  {deletingQuizId === quiz.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4 sm:px-0">
          <div className="bg-card p-5 sm:p-6 rounded-xl shadow-lg w-full max-w-md border border-border">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Edit Quiz</h3>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Title
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm sm:text-base"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Description
                <textarea
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm sm:text-base"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Duration (minutes)
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm sm:text-base"
                  min={1}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition text-sm sm:text-base w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition text-sm sm:text-base w-full sm:w-auto"
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
