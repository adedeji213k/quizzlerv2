import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    await sendWelcomeEmail(email, name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email error:", error);

    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 },
    );
  }
}
