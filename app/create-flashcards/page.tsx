"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  Upload,
  FileText,
  PlusCircle,
  X,
  ArrowLeft,
} from "lucide-react";

export default function CreateFlashcardsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numFlashcards, setNumFlashcards] = useState<number>(10); // ✅ NEW
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<string | null>(null);

  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please upload a document.");

    setLoading(true);
    setShowUpgradeModal(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("You must be logged in.");
      router.push("/login");
      return;
    }

    const user = session.user;

    let createdSetId: string | null = null;
    let createdDocId: number | null = null;
    let filePath: string | null = null;

    // ✅ Usage check
    try {
      // ✅ Include flashcards_created check
const usageTypes = ["ai_calls", "documents_uploaded", "flashcards_created"];

let shouldDebitCredits = false;
let creditCost = 0;

for (const type of usageTypes) {
  const res = await fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, type }),
  });

  const data = await res.json();

  if (res.status === 403) {
    setUpgradePlan(data.plan);
    setShowUpgradeModal(true);
    setLoading(false);
    return;
  }

  // ✅ Capture credit info for Free users for flashcards
  if (type === "flashcards_created" && data.shouldDebitCredits) {
    shouldDebitCredits = true;
    creditCost = data.creditCost || 0;
  }
}
    } catch (err) {
      alert("Usage check failed.");
      setLoading(false);
      return;
    }

    try {
      // ✅ Step 1: Create flashcard set
      const { data: setData, error: setError } = await supabase
        .from("flashcard_sets")
        .insert({
          owner: user.id,
          title,
          description,
        })
        .select()
        .single();

      if (setError) throw setError;
      createdSetId = setData.id;

      // ✅ Step 2: Upload file
      const ext = file.name.split(".").pop();
      filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ✅ Step 3: Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          owner: user.id,
          storage_path: filePath,
          filename: file.name,
          file_size: file.size,
          mime: file.type,
          flashcard_set_id: createdSetId,
        })
        .select()
        .single();

      if (docError) throw docError;
      createdDocId = docData.id;

      // ✅ Step 4: Generate flashcards
      setAiGenerating(true);

      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcard_set_id: createdSetId,
          document_id: createdDocId,
          user_id: user.id,
          requested_count: numFlashcards, // ✅ KEY ADDITION
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.upgrade) {
        setUpgradePlan(data.plan);
        setShowUpgradeModal(true);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Flashcard generation failed.");
      }

      // ✅ Success
      router.push(`/flashcards/${createdSetId}`);
    } catch (err: any) {
      console.error(err);

      // 🧹 Rollback
      if (createdSetId) {
        await supabase.from("flashcard_sets").delete().eq("id", createdSetId);
      }
      if (createdDocId) {
        await supabase.from("documents").delete().eq("id", createdDocId);
      }
      if (filePath) {
        await supabase.storage.from("documents").remove([filePath]);
      }

      alert("Failed to create flashcards.");
    } finally {
      setLoading(false);
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-muted to-background">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-lg p-8 border">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm mb-4 bg-muted px-3 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create Flashcards
        </h1>

        <p className="text-center text-muted-foreground mb-8">
          Upload a document and generate flashcards instantly with AI.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <input
            type="text"
            required
            placeholder="Flashcard set title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg bg-background"
          />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border rounded-lg bg-background"
          />

          {/* ✅ Number of Flashcards */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Flashcards
            </label>
            <input
              type="number"
              min={1}
              value={numFlashcards}
              onChange={(e) => setNumFlashcards(Number(e.target.value))}
              className="w-full px-4 py-3 border rounded-lg bg-background"
            />
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />

            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto mb-2" />
              {file ? (
                <p>
                  <FileText className="inline w-4 h-4 mr-1" />
                  {file.name}
                </p>
              ) : (
                <p>Click to upload document</p>
              )}
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || aiGenerating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> Checking...
              </>
            ) : aiGenerating ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> Generating{" "}
                {numFlashcards} Flashcards...
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" /> Create Flashcards
              </>
            )}
          </button>
        </form>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-xl w-full max-w-md">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-3 right-3"
            >
              <X />
            </button>

            <h2 className="text-xl font-bold mb-2 text-center">
              Upgrade Required
            </h2>

            <p className="text-center text-muted-foreground mb-4">
              You’ve reached your limit on the {upgradePlan} plan.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard?tab=subscription")}
                className="bg-primary text-white px-4 py-2 rounded-lg"
              >
                Upgrade
              </button>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="border px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}