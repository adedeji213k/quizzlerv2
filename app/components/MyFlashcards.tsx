"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export default function MyFlashcards() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const router = useRouter();

  // ✅ Fetch flashcard sets
  const fetchSets = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("id, title, description, created_at")
      .eq("owner", session.user.id)
      .order("created_at", { ascending: false });

    if (!error) setSets(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleCreate = () => router.push("/create-flashcards");

  // ✅ Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = confirm("Delete this flashcard set and its file?");
    if (!confirmDelete) return;

    setDeletingId(id);

    try {
      // delete document if exists
      const { data: docs } = await supabase
        .from("documents")
        .select("id, storage_path")
        .eq("flashcard_set_id", id)
        .maybeSingle();

      if (docs?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([docs.storage_path]);

        if (storageError) throw new Error("Failed to delete storage file");

        await supabase.from("documents").delete().eq("id", docs.id);
      }

      // delete flashcard set (will cascade delete flashcards)
      const { error } = await supabase
        .from("flashcard_sets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSets((prev) => prev.filter((s) => s.id !== id));
      setSuccessMessage("Flashcard set deleted ✅");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ Edit
  const handleEdit = (set: FlashcardSet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSet(set);
    setNewTitle(set.title);
    setNewDescription(set.description || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSet) return;

    await supabase
      .from("flashcard_sets")
      .update({
        title: newTitle,
        description: newDescription,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingSet.id);

    setShowEditModal(false);
    setEditingSet(null);
    fetchSets();
  };

  // ✅ Share
  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const link = `${window.location.origin}/flashcards/share/${id}`;
      await navigator.clipboard.writeText(link);

      setSuccessMessage("Link copied ✅");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch {
      alert("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading your flashcards...
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6">
      {/* Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Flashcards
        </h2>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          <PlusCircle className="w-5 h-5" />
          Create Set
        </button>
      </div>

      {/* Empty */}
      {sets.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          You haven’t created any flashcard sets yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sets.map((set) => (
            <div
              key={set.id}
              onClick={() => router.push(`/flashcards/${set.id}`)}
              className="relative cursor-pointer bg-card border rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition group"
            >
              {/* Share */}
              <button
                onClick={(e) => handleShare(set.id, e)}
                className="absolute top-3 right-3 p-2 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition pr-8">
                  {set.title}
                </h3>

                <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                  {set.description || "No description provided."}
                </p>

                <p className="text-xs text-muted-foreground">
                  Created: {new Date(set.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex justify-between mt-4 gap-2">
                <button
                  onClick={(e) => handleEdit(set, e)}
                  className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg hover:bg-primary/20"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>

                <button
                  onClick={(e) => handleDelete(set.id, e)}
                  disabled={deletingId === set.id}
                  className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/20"
                >
                  {deletingId === set.id ? (
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
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              Edit Flashcard Set
            </h3>

            <div className="space-y-4">
              <input
                className="w-full px-3 py-2 border rounded-lg"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
              />

              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description"
              />
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-primary text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}