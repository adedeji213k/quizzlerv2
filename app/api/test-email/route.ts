import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    await sendWelcomeEmail(email, name);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to send email.",
      },
      { status: 500 },
    );
  }
}
