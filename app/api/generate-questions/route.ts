import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import PDFParser from "pdf2json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const QUIZ_CREDIT_COST = 5;

export async function POST(req: Request) {
  try {
    const {
      quiz_id,
      document_id,
      requested_question_count,
      user_id,
    } = await req.json();

    if (!quiz_id || !document_id || !requested_question_count || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🚀 Starting question generation:", {
      quiz_id,
      document_id,
      requested_question_count,
      user_id,
    });

    /**
     * ✅ STEP 1: Usage checks
     */
    const usageChecks = ["ai_calls", "documents_uploaded", "quizzes_created"];
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

      // 👇 ONLY quizzes_created can require credits
      if (type === "quizzes_created" && data.shouldDebitCredits === true) {
        shouldDebitCredits = true;
      }
    }

    /**
     * ✅ STEP 2: Fetch document
     */
    const { data: document, error: docError } = await supabaseServer
      .from("documents")
      .select("storage_path, mime, filename")
      .eq("id", document_id)
      .single();

    if (docError || !document) throw new Error("Document not found");

    const { data: fileData, error: downloadError } =
      await supabaseServer.storage
        .from("documents")
        .download(document.storage_path);

    if (downloadError || !fileData)
      throw new Error("Failed to download document");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mime = document.mime.toLowerCase();

    /**
     * ✅ STEP 3: Extract text (UNCHANGED)
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
     * ✅ STEP 4: AI generation (UNCHANGED)
     */
    const prompt = `
Generate ${requested_question_count} high-quality multiple-choice questions based primarily on the text below.

QUESTION RULES:
- Exactly 4 answer choices per question
- Exactly ONE correct answer
- Incorrect options must be plausible misconceptions
- Correct answers must be supported by the document

IMPORTANT: You MAY add brief clarification, reasoning, or conceptual context
to explanations if it improves learning.
Do NOT introduce facts that contradict the document.

EXPLANATION GOAL:
Teach the learner — not just justify grading.

EXPLANATION REQUIREMENTS:
1. Correct answer explanation:
   - Reference the document where applicable
   - Add reasoning or clarification that helps understanding

2. Incorrect answer explanations:
   - Explain the misconception behind the option
   - Explain why it does not fit the concept or scope
   - NEVER say only “not mentioned in the text”

FORMAT (JSON ONLY):

[
  {
    "question": "string",
    "choices": ["A", "B", "C", "D"],
    "correct_answer": "string",
    "explanation": {
      "correct": "Instructional explanation",
      "incorrect": {
        "A": "Why A is wrong",
        "B": "Why B is wrong",
        "C": "Why C is wrong",
        "D": "Why D is wrong"
      }
    }
  }
]

Text:
${extractedText.slice(0, 12000)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are an expert educator and assessment designer. Respond with valid JSON only.",
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

    let questions: any[];

    try {
      questions = JSON.parse(cleanJSON(raw));
    } catch {
      throw new Error("AI response was not valid JSON.");
    }

    /**
     * ✅ STEP 5: Persist questions (UNCHANGED)
     */
    for (const q of questions) {
      const { data: question, error } = await supabaseServer
        .from("questions")
        .insert({
          quiz_id,
          owner: user_id,
          type: "mcq",
          text: q.question,
          metadata: { explanation: q.explanation },
        })
        .select()
        .single();

      if (error) throw error;

      for (let i = 0; i < q.choices.length; i++) {
        await supabaseServer.from("choices").insert({
          question_id: question.id,
          text: q.choices[i],
          is_correct:
            q.choices[i].trim() === q.correct_answer.trim(),
          position: i,
        });
      }
    }

    /**
     * ✅ STEP 6: Deduct credits ONCE (only if required)
     */
    if (shouldDebitCredits) {
      const { data: creditRow, error } = await supabaseServer
        .from("credits_balance")
        .select("balance")
        .eq("id", user_id)
        .single();

      console.log('credits deducted')

      if (error || !creditRow || creditRow.balance < QUIZ_CREDIT_COST) {
        throw new Error("Credit deduction failed after generation.");
      }

      await supabaseServer
        .from("credits_balance")
        .update({
          balance: creditRow.balance - QUIZ_CREDIT_COST,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);
    }

    return NextResponse.json({
      success: true,
      count: questions.length,
      credits_used: shouldDebitCredits ? QUIZ_CREDIT_COST : 0,
    });
  } catch (err: any) {
    console.error("❌ Generation error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}
