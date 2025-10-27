"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Upload, FileText, PlusCircle, Eye } from "lucide-react";

export default function CreateQuizPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [duration, setDuration] = useState<number>(10);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);

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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("You must be logged in to create a quiz.");
      router.push("/login");
      return;
    }

    const user = session.user;

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

      // ✅ Step 5: Trigger the local API for AI question generation
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

      if (!res.ok) throw new Error(data.error || "Failed to generate questions");

      alert(
        `✅ Quiz created successfully! AI generated ${data.count || numQuestions} questions.`
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

          {/* Document Upload */}
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
                <Loader2 className="w-5 h-5 animate-spin" /> Creating Quiz...
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

        {/* ✅ Show "View Questions" button after creation */}
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
    </div>
  );
}
