import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import PDFParser from "pdf2json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { quiz_id, document_id, requested_question_count, user_id } = await req.json();

    if (!quiz_id || !document_id || !requested_question_count || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Step 1: Check usage limits
    const usageChecks = ["ai_calls", "documents_uploaded", "quizzes_created"];
    for (const type of usageChecks) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user_id, type }),
      });
      if (res.status === 403) {
        const data = await res.json();
        return NextResponse.json(data, { status: 403 });
      }
    }

    // ✅ Step 2: Fetch document from Supabase storage
    const { data: document, error: docError } = await supabaseServer
      .from("documents")
      .select("storage_path, mime, filename")
      .eq("id", document_id)
      .single();
    if (docError || !document) throw new Error("Document not found");

    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from("documents")
      .download(document.storage_path);
    if (downloadError || !fileData) throw new Error("Failed to download document");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mime = document.mime.toLowerCase();

    // ✅ Step 3: Extract text
    let extractedText = "";

    if (mime.includes("pdf") || document.filename.endsWith(".pdf")) {
      // --- PDF PARSING using pdf2json ---
      extractedText = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: any) =>
          reject(new Error(errData.parserError))
        );

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          const text = pdfData.Pages.map((page: any) =>
            page.Texts.map((t: any) =>
              decodeURIComponent(t.R.map((r: any) => r.T).join(""))
            ).join(" ")
          ).join("\n");
          resolve(text.trim());
        });

        pdfParser.parseBuffer(buffer);
      });
    }
    else if (
      mime.includes("presentationml") ||
      mime.includes("ms-powerpoint") ||
      document.filename.endsWith(".pptx") ||
      document.filename.endsWith(".ppt")
    ) {
      const officeParser = await import("officeparser");
      extractedText = (await officeParser.parseOfficeAsync(buffer)).trim();
    }
    else if (
      mime.includes("wordprocessingml") ||
      mime.includes("msword") ||
      document.filename.endsWith(".docx") ||
      document.filename.endsWith(".doc")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    }
    else if (mime.includes("text/plain")) {
      extractedText = buffer.toString("utf-8").trim();
    } else {
      throw new Error(`Unsupported file type: ${mime}`);
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error("No meaningful text extracted from document.");
    }

    // ✅ Step 4: Generate questions via OpenAI
    const prompt = `Generate ${requested_question_count} multiple-choice questions from the text below.
Each question should have 4 options and one correct answer.
Return JSON only in this format:
[
  {"question": "string", "choices": ["A","B","C","D"], "correct_answer": "string"}
]
Text:
${extractedText.slice(0, 12000)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Reply in JSON only — no markdown, no explanations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message?.content ?? "";
    const cleanJSON = (t: string) =>
      t
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .replace(/^[^{\[]*/, "")
        .replace(/[^}\]]*$/, "")
        .trim();

    let questions;
    try {
      questions = JSON.parse(cleanJSON(content));
    } catch {
      throw new Error("AI response was not valid JSON.");
    }

    // ✅ Step 5: Save questions + choices
    for (const q of questions) {
      const { data: question, error: qError } = await supabaseServer
        .from("questions")
        .insert({
          quiz_id,
          owner: user_id,
          type: "mcq",
          text: q.question,
        })
        .select()
        .single();
      if (qError) throw qError;

      for (let i = 0; i < q.choices.length; i++) {
        await supabaseServer.from("choices").insert({
          question_id: question.id,
          text: q.choices[i],
          is_correct: q.choices[i].trim() === q.correct_answer.trim(),
          position: i,
        });
      }
    }

    return NextResponse.json({ success: true, count: questions.length });
  } catch (err: any) {
    console.error("❌ Generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
