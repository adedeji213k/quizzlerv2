"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Upload, FileText, PlusCircle, Eye, X, ArrowLeft } from "lucide-react";

export default function CreateQuizPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [duration, setDuration] = useState<number>(10);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);
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

    if (!file) return alert("Please select a document file to upload.");

    setLoading(true);
    setShowUpgradeModal(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("You must be logged in to create a quiz.");
      router.push("/login");
      return;
    }

    const user = session.user;

    // ✅ Step 0: Check usage limits before doing anything
    try {
      const usageTypes = ["ai_calls", "documents_uploaded", "quizzes_created"];

      for (const type of usageTypes) {
        const res = await fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, type }),
        });

        const data = await res.json();

        console.log("🧾 Usage check →", {
          type,
          plan: data.plan,
          used: data.used ?? "unknown",
          limit: data.limit ?? "unknown",
          remaining: data.remaining ?? "unknown",
          status: res.status,
        });

        if (res.status === 403) {
          console.warn(
            `🚫 BLOCKED: User (${user.id}) on ${data.plan} plan exceeded limit for ${type}.`
          );
          setUpgradePlan(data.plan);
          setShowUpgradeModal(true);
          setLoading(false);
          return; // 🚫 Stop if any limit exceeded
        } else {
          console.log(
            `✅ ALLOWED: ${type} usage OK for ${data.plan} plan. Used: ${data.used}/${data.limit}`
          );
        }
      }
    } catch (err) {
      console.error("❌ Usage check failed:", err);
      alert("Could not verify usage limits. Please try again.");
      setLoading(false);
      return;
    }

    try {
      // ✅ Step 1: Create quiz record
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          owner: user.id,
          title,
          description,
          is_published: false,
        })
        .select()
        .single();

      if (quizError) throw quizError;
      const quizId = quizData.id;
      setQuizId(quizId);

      // ✅ Step 2: Upload file to Supabase Storage
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
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
        })
        .select()
        .single();
      if (docError) throw docError;

      const documentId = docData.id;

      // ✅ Step 4: Log generation job
      const { error: jobError } = await supabase.from("generation_jobs").insert({
        owner: user.id,
        document_id: documentId,
        quiz_id: quizId,
        requested_question_count: numQuestions,
        requested_types: ["mcq"],
        status: "queued",
      });
      if (jobError) throw jobError;

      // ✅ Step 5: Trigger AI question generation
      setAiGenerating(true);

      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          document_id: documentId,
          requested_question_count: numQuestions,
          user_id: user.id,
        }),
      });

      const data = await res.json();

      // 🚫 If AI usage limit reached → show upgrade modal
      if (res.status === 403 && data.upgrade) {
        setUpgradePlan(data.plan);
        setShowUpgradeModal(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to generate questions");

      alert(
        `✅ Quiz created successfully! AI generated ${
          data.count || numQuestions
        } questions.`
      );
    } catch (err: any) {
      console.error("❌ Error creating quiz:", err);
      alert("Error: " + err.message);
    } finally {
      setAiGenerating(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background px-6">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-[var(--shadow-elegant)] p-8 border border-border">
        {/* ✅ Back to Dashboard Button */}
<button
  onClick={() => router.push("/dashboard")}
  className="flex items-center gap-2 text-sm px-3 py-2 mb-4 rounded-lg bg-muted hover:bg-accent/10 transition"
>
  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
</button>

        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create a New Quiz
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Provide quiz details and upload your document. Our AI will generate the
          questions automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Quiz Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Biology"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the quiz..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Questions
            </label>
            <input
              type="number"
              min={1}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Document
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-8 h-8 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-foreground">
                    <FileText className="inline w-4 h-4 mr-1" />
                    {file.name}
                  </p>
                ) : (
                  <p className="text-sm">Click to upload a document</p>
                )}
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || aiGenerating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg shadow hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Checking Usage...
              </>
            ) : aiGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> AI Generating
                Questions...
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" /> Create Quiz
              </>
            )}
          </button>
        </form>

        {/* ✅ Show "View Questions" button */}
        {quizId && !loading && !aiGenerating && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(`/quiz/${quizId}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-primary to-accent text-white rounded-lg shadow hover:opacity-90 transition"
            >
              <Eye className="w-4 h-4" /> View Questions
            </button>
          </div>
        )}
      </div>

      {/* ⚠️ Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-8 w-full max-w-md shadow-lg border border-border relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-3 text-center">
              Upgrade Your Plan
            </h2>
            <p className="text-muted-foreground text-center mb-5">
              You’ve reached your limit on the{" "}
              <span className="font-semibold">{upgradePlan}</span> plan.
              <br /> Upgrade to unlock more AI quiz generation and uploads.
            </p>

            <div className="flex justify-center gap-4">
              <button
  onClick={() => {
    setShowUpgradeModal(false);
    router.push("/dashboard?tab=subscription");
  }}
  className="bg-gradient-to-r from-primary to-accent text-white px-5 py-2 rounded-lg hover:opacity-90 transition"
>
  Upgrade Plan
</button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-5 py-2 rounded-lg border border-border hover:bg-muted transition"
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
