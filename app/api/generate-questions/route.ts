import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";

// 🧠 Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// 🧩 Helper: Extract text from supported files
async function extractTextFromFile(fileArrayBuffer: ArrayBuffer, mimeType: string) {
  const buffer = Buffer.from(fileArrayBuffer);

  if (mimeType.includes("pdf")) {
    // Fallback: convert PDF to base64 and send to OpenAI for text extraction
    // OpenAI can parse simple PDFs from text content
    return buffer.toString("base64");
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    mimeType.includes("msword")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (mimeType.includes("text")) {
    return buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

// 🧠 Main API handler
export async function POST(req: Request) {
  try {
    const { quiz_id, document_id, requested_question_count, user_id } = await req.json();

    if (!quiz_id || !document_id || !requested_question_count || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching document:", document_id);

    // ✅ Fetch document from Supabase
    const { data: document, error: docError } = await supabaseServer
      .from("documents")
      .select("storage_path, mime, filename")
      .eq("id", document_id)
      .single();

    if (docError || !document) throw new Error("Document not found");

    // ✅ Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) throw new Error("Failed to download document from storage");

    const fileArrayBuffer = await fileData.arrayBuffer();

    // ✅ Extract text from file (PDFs now handled as base64)
    const extractedText = await extractTextFromFile(fileArrayBuffer, document.mime);

    if (!extractedText.trim()) {
      throw new Error("No readable text extracted from file");
    }

    console.log("📝 Extracted text length:", extractedText.length);

    // ✅ Generate quiz questions using OpenAI
    const prompt = `Generate ${requested_question_count} multiple-choice questions from the following text.

Each question should have 4 choices (A, B, C, D) and one correct answer.

Return your response as a JSON array with this exact structure:
[
  {
    "question": "question text here",
    "choices": ["option A", "option B", "option C", "option D"],
    "correct": "option B"
  }
]

Text:
${extractedText.slice(0, 12000)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. You must respond with valid JSON only, no markdown or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message?.content ?? "";

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      throw new Error("AI response was not valid JSON");
    }

    const questions: any[] = Array.isArray(parsedResponse)
      ? parsedResponse
      : parsedResponse.questions || [];

    if (questions.length === 0) throw new Error("No questions were generated");

    // ✅ Insert generated questions into DB
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
          is_correct: q.choices[i] === q.correct,
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
