import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { processUploadedFile } from "@/lib/file-processing";

// Use string constants instead of an import for the enum
const StatementStatus = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  REVIEW_NEEDED: "REVIEW_NEEDED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Mock function for Google Sheets integration
// This will be replaced with actual Sheets API implementation
async function saveToGoogleSheets(userId: string, transactions: any[]) {
  console.log(
    `[MOCK] Saving ${transactions.length} transactions to Google Sheets for user ${userId}`,
  );
  // In a real implementation, this would use the Google Sheets API
  // to write the transaction data to the user's spreadsheet
  return true;
}

// Simple transaction parsing
// This will be replaced with more sophisticated parsing in Phase 5
function parseTransactions(text: string): any[] {
  // Example transaction parsing - very simplified
  const lines = text.split("\n");
  const transactions = [];

  for (const line of lines) {
    // Look for lines that might contain dollar amounts
    if (/\$\d+\.\d{2}/.test(line)) {
      transactions.push({
        description: line.trim(),
        amount: line.match(/\$\d+\.\d{2}/)?.[0] || "",
        date: new Date().toISOString(), // Placeholder - would extract actual date
      });
    }
  }

  console.log(`Parsed ${transactions.length} potential transactions`);
  return transactions;
}

export const statementRouter = createTRPCRouter({
  // Get recent statements for the dashboard
  getRecent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    const statements = await ctx.prisma.statement.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        uploadTimestamp: "desc",
      },
      take: 5,
    });

    return statements;
  }),

  // Upload a new statement
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileType: z.string(),
        fileUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      console.log(
        `Statement upload started: ${input.filename} (${input.fileType})`,
      );

      // Create the statement record
      const statement = await ctx.prisma.statement.create({
        data: {
          userId: ctx.session.user.id,
          filename: input.filename,
          status: StatementStatus.UPLOADED,
        },
      });

      console.log(`Statement record created: ${statement.id}`);

      // If this is just metadata without a file, return early
      if (!input.fileUrl) {
        console.log("No file URL provided - skipping OCR processing");
        return statement;
      }

      try {
        // Update status to processing
        await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: { status: StatementStatus.PROCESSING },
        });
        console.log(`Statement status updated to PROCESSING`);

        // Process the statement with OCR
        console.log(`Initiating OCR processing for file: ${input.fileUrl}`);
        const processingResult = await processUploadedFile(
          input.fileUrl,
          input.fileType,
        );

        if (!processingResult.success) {
          console.error(`OCR processing failed: ${processingResult.error}`);
          throw new Error(
            processingResult.error || "Failed to process statement",
          );
        }

        console.log(`OCR processing successful`);

        // Process the extracted text in memory (never stored in DB)
        if (processingResult.text) {
          // Parse transactions from the text
          const transactions = parseTransactions(processingResult.text);

          // Upload transactions to Google Sheets instead of storing in our database
          await saveToGoogleSheets(ctx.session.user.id, transactions);

          console.log(`Transactions saved to Google Sheets`);
        }

        // Update the statement status to completed
        const updatedStatement = await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: {
            status: StatementStatus.COMPLETED,
            processedTimestamp: new Date(),
          },
        });

        // Clean up the uploaded file if desired
        // Uncomment the next line to delete the original file after processing
        // await cleanupTemporaryFiles(input.fileUrl);

        return updatedStatement;
      } catch (error) {
        console.error("Statement processing error:", error);

        // Update the statement with error
        const errorStatement = await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: {
            status: StatementStatus.FAILED,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            processedTimestamp: new Date(),
          },
        });

        console.log(`Statement status updated to FAILED due to error`);
        return errorStatement;
      }
    }),

  // Get a statement by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const statement = await ctx.prisma.statement.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Ensure user can only access their own statements
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Statement not found",
        });
      }

      return statement;
    }),
});
