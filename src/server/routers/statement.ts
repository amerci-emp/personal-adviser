import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { processUploadedFile } from "@/lib/file-processing";
import { uploadToStorage } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Use string constants instead of an import for the enum
const StatementStatus = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  REVIEW_NEEDED: "REVIEW_NEEDED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

const STORAGE_BUCKET = "statements";

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
        amount: parseFloat((line.match(/\$\d+\.\d{2}/)?.[0] || "").replace('$', '')),
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
        fileData: z.instanceof(Blob).optional(),
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

      let storageUrl: string | undefined = input.fileUrl;
      let storageBucket: string | undefined = undefined;
      let storageFilePath: string | undefined = undefined;

      // If file data is provided, upload to Supabase Storage
      if (input.fileData) {
        try {
          // Generate a unique filename
          const fileExt = path.extname(input.filename);
          const fileName = `${ctx.session.user.id}/${uuidv4()}${fileExt}`;
          
          console.log(`Uploading file to Supabase Storage: ${fileName}`);
          
          const uploadResult = await uploadToStorage(
            STORAGE_BUCKET,
            fileName,
            input.fileData,
            input.fileType
          );
          
          if (uploadResult.error) {
            throw new Error(`Failed to upload to storage: ${uploadResult.error.message}`);
          }
          
          if (uploadResult.url) {
            storageUrl = uploadResult.url;
            storageBucket = STORAGE_BUCKET;
            storageFilePath = fileName;
            console.log(`File uploaded to Supabase: ${storageUrl}`);
          } else {
            throw new Error("Upload succeeded but no URL was returned");
          }
        } catch (error) {
          console.error("Error uploading to Supabase:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      // Create the statement record
      const statement = await ctx.prisma.statement.create({
        data: {
          userId: ctx.session.user.id,
          filename: input.filename,
          status: StatementStatus.UPLOADED,
          storageUrl,
          storageBucket,
          storageFilePath,
        },
      });

      console.log(`Statement record created: ${statement.id}`);

      // If this is just metadata without a file, return early
      if (!storageUrl) {
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
        console.log(`Initiating OCR processing for file: ${storageUrl}`);
        const processingResult = await processUploadedFile(
          storageUrl,
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

          // Save transactions to database with PostgreSQL decimal type
          const dbTransactions = await Promise.all(
            transactions.map(async (transaction) => {
              return ctx.prisma.transaction.create({
                data: {
                  statementId: statement.id,
                  description: transaction.description,
                  amount: transaction.amount,
                  transactionDate: transaction.date ? new Date(transaction.date) : null,
                  originalText: transaction.description,
                  needsReview: true,
                },
              });
            })
          );

          console.log(`${dbTransactions.length} transactions saved to database`);
        }

        // Update the statement status to completed
        const updatedStatement = await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: {
            status: StatementStatus.COMPLETED,
            processedTimestamp: new Date(),
          },
        });

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
