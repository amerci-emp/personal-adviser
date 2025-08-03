import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { triggerGenerateAiProfile } from "@/lib/background-jobs";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requireAuth();

  try {
    const body = await req.json();
    const { answers } = body;

    if (!answers) {
      return new NextResponse("Invalid request body, answers are missing.", { status: 400 });
    }

    // Save the raw quiz answers to the user's profile
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        quizAnswers: answers,
      },
    });

    // Trigger the background job to generate the AI profile
    await triggerGenerateAiProfile(session.user.id);
    
    return NextResponse.json({ success: true, message: "Quiz answers submitted and AI profile generation started." });

  } catch (error) {
    console.error("[QUIZ_SUBMIT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
