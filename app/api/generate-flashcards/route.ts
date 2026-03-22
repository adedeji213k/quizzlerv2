import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import PDFParser from "pdf2json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const FLASHCARD_CREDIT_COST = 3;

export async function POST(req: Request) {
  try {
    const {
      flashcard_set_id,
      document_id,
      requested_count,
      user_id,
    } = await req.json();

    if (!flashcard_set_id || !document_id || !requested_count || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🚀 Starting flashcard generation:", {
      flashcard_set_id,
      document_id,
      requested_count,
      user_id,
    });

    /**
     * ✅ STEP 1: Usage checks
     */
    const usageChecks = ["ai_calls", "documents_uploaded"];
    let shouldDebitCredits = false;

    for (const type of usageChecks) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/usage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user_id, type }),
        }
      );

      const data = await res.json();

      if (res.status === 403) {
        return NextResponse.json(data, { status: 403 });
      }

      // Optional: if you later add flashcard billing logic
      if (type === "ai_calls" && data.shouldDebitCredits === true) {
        shouldDebitCredits = true;
      }
    }

    /**
     * ✅ STEP 2: Fetch document
     */
    const { data: document, error: docError } = await supabaseServer
      .from("documents")
      .select("storage_path, mime, filename, flashcard_set_id")
      .eq("id", document_id)
      .single();

    if (docError || !document) throw new Error("Document not found");

    // ✅ Ensure document is linked to flashcard set (important)
    if (!document.flashcard_set_id) {
      await supabaseServer
        .from("documents")
        .update({ flashcard_set_id })
        .eq("id", document_id);
    }

    const { data: fileData, error: downloadError } =
      await supabaseServer.storage
        .from("documents")
        .download(document.storage_path);

    if (downloadError || !fileData)
      throw new Error("Failed to download document");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mime = document.mime.toLowerCase();

    /**
     * ✅ STEP 3: Extract text (same as quizzes)
     */
    let extractedText = "";

    if (mime.includes("pdf") || document.filename.endsWith(".pdf")) {
      extractedText = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (err: any) =>
          reject(new Error(err.parserError))
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
    } else if (
      mime.includes("presentationml") ||
      mime.includes("ms-powerpoint")
    ) {
      const officeParser = await import("officeparser");
      extractedText = (await officeParser.parseOfficeAsync(buffer)).trim();
    } else if (
      mime.includes("wordprocessingml") ||
      mime.includes("msword")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    } else if (mime.includes("text/plain")) {
      extractedText = buffer.toString("utf-8").trim();
    } else {
      throw new Error(`Unsupported file type: ${mime}`);
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error("No meaningful text extracted from document.");
    }

    /**
     * ✅ STEP 4: AI FLASHCARD GENERATION
     */
    const prompt = `
Generate ${requested_count} high-quality study flashcards based on the text below.

FLASHCARD RULES:
- Each flashcard must test ONE clear concept
- Keep FRONT concise (question, term, or prompt)
- BACK must contain:
  - clear answer/definition
  - brief explanation if helpful
- Avoid overly long text
- Focus on key ideas, definitions, cause-effect, and relationships

FORMAT (JSON ONLY):

[
  {
    "front": "string",
    "back": "string",
    "explanation": "optional string"
  }
]

Text:
${extractedText.slice(0, 12000)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You are an expert teacher creating high-quality flashcards. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0].message?.content ?? "";

    const cleanJSON = (t: string) =>
      t
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .replace(/^[^{\[]*/, "")
        .replace(/[^}\]]*$/, "")
        .trim();

    let flashcards: any[];

    try {
      flashcards = JSON.parse(cleanJSON(raw));
    } catch {
      throw new Error("AI response was not valid JSON.");
    }

    /**
     * ✅ STEP 5: Save flashcards
     */
    for (const card of flashcards) {
      const { error } = await supabaseServer.from("flashcards").insert({
        set_id: flashcard_set_id,
        front: card.front,
        back: card.back,
        explanation: card.explanation || null,
      });

      if (error) throw error;
    }

    /**
     * ✅ STEP 6: Deduct credits (optional)
     */
    if (shouldDebitCredits) {
      const { data: creditRow, error } = await supabaseServer
        .from("credits_balance")
        .select("balance")
        .eq("id", user_id)
        .single();

      if (error || !creditRow || creditRow.balance < FLASHCARD_CREDIT_COST) {
        throw new Error("Credit deduction failed after generation.");
      }

      await supabaseServer
        .from("credits_balance")
        .update({
          balance: creditRow.balance - FLASHCARD_CREDIT_COST,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);
    }

    return NextResponse.json({
      success: true,
      count: flashcards.length,
      credits_used: shouldDebitCredits ? FLASHCARD_CREDIT_COST : 0,
    });
  } catch (err: any) {
    console.error("❌ Flashcard generation error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}