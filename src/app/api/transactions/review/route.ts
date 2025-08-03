import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const session = await requireAuth();

  try {
    const transactionsToReview = await prisma.transaction.findMany({
      where: {
        statement: {
          userId: session.user.id,
        },
        needsReview: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    return NextResponse.json(transactionsToReview);
  } catch (error) {
    console.error("[TRANSACTION_REVIEW_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuth();
  
  try {
    const body = await req.json();
    const { transactionsToUpdate } = body;

    if (!transactionsToUpdate || !Array.isArray(transactionsToUpdate)) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    // A map to hold the results of each update
    const updateResults = [];

    for (const { id, assignedCategory } of transactionsToUpdate) {
      if (!id || !assignedCategory) {
        updateResults.push({ id, status: 'skipped', reason: 'Missing id or category' });
        continue;
      }

      try {
        // Verify the transaction belongs to the user before updating
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: id,
            statement: {
              userId: session.user.id,
            },
          },
        });

        if (transaction) {
          await prisma.transaction.update({
            where: { id: id },
            data: {
              assignedCategory: assignedCategory,
              needsReview: false,
            },
          });
          updateResults.push({ id, status: 'success' });
        } else {
          updateResults.push({ id, status: 'error', reason: 'Transaction not found or unauthorized' });
        }
      } catch (error) {
        console.error(`[TRANSACTION_UPDATE] Error updating transaction ${id}:`, error);
        updateResults.push({ id, status: 'error', reason: 'Database error' });
      }
    }

    return NextResponse.json({ results: updateResults });
  } catch (error) {
    console.error("[TRANSACTION_REVIEW_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
