import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { processUploadedFile } from "@/lib/file-processing";
import { extractAccountInfo, extractStatementPeriod } from "@/lib/account-extractor";

// Use string constants for the enum
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
      include: {
        account: true,
      },
    });

    return statements;
  }),

  // Upload a new statement
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileType: z.string(),
        fileUrl: z.string().url(),
        accountId: z.string().optional(), // Optional: If user already selected an account
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create a record in the database to track the statement
        const statement = await ctx.prisma.statement.create({
          data: {
            filename: input.filename,
            userId: ctx.session.user.id,
            status: StatementStatus.UPLOADED,
            storageUrl: input.fileUrl,
            accountId: input.accountId, // If user pre-selected an account
          },
        });

        // Start processing the file in the background
        void (async () => {
          try {
            // Update status to processing
            await ctx.prisma.statement.update({
              where: { id: statement.id },
              data: { status: StatementStatus.PROCESSING },
            });

            // Process the file with Vision AI
            const processingResult = await processUploadedFile(
              input.fileUrl,
              input.fileType
            );

            if (!processingResult.success || !processingResult.text) {
              throw new Error(
                processingResult.error || "Failed to process statement text"
              );
            }

            // Extract account information from text
            const accountInfo = extractAccountInfo(processingResult.text);
            
            // Extract statement period
            const periodInfo = extractStatementPeriod(processingResult.text);

            // If no account ID was specified, try to find or create a matching bank account
            let accountId = input.accountId;
            
            if (!accountId && accountInfo.lastFourDigits && accountInfo.financialInstitution) {
              // Try to find a matching account
              const existingAccount = await ctx.prisma.bankAccount.findFirst({
                where: {
                  userId: ctx.session.user.id,
                  financialInstitution: accountInfo.financialInstitution,
                  lastFourDigits: accountInfo.lastFourDigits,
                },
              });

              if (existingAccount) {
                // Use the existing account
                accountId = existingAccount.id;
                
                // Update the account balance if extracted
                if (accountInfo.balance !== undefined) {
                  await ctx.prisma.bankAccount.update({
                    where: { id: existingAccount.id },
                    data: { balance: accountInfo.balance.toString() },
                  });
                }
              } else {
                // Create a new bank account
                const newAccount = await ctx.prisma.bankAccount.create({
                  data: {
                    userId: ctx.session.user.id,
                    name: accountInfo.accountName || `${accountInfo.financialInstitution} Account`,
                    financialInstitution: accountInfo.financialInstitution,
                    accountType: accountInfo.accountType || "OTHER",
                    lastFourDigits: accountInfo.lastFourDigits,
                    balance: accountInfo.balance !== undefined ? accountInfo.balance.toString() : null,
                  },
                });
                
                accountId = newAccount.id;
              }
            }

            // Update the statement with extracted information
            await ctx.prisma.statement.update({
              where: { id: statement.id },
              data: {
                accountId,
                status: StatementStatus.COMPLETED,
                processedTimestamp: new Date(),
                periodStart: periodInfo.start,
                periodEnd: periodInfo.end,
              },
            });

            console.log(`Statement ${statement.id} processed successfully`);
          } catch (error) {
            console.error("Error processing statement:", error);
            
            // Update statement with error
            await ctx.prisma.statement.update({
              where: { id: statement.id },
              data: {
                status: StatementStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                processedTimestamp: new Date(),
              },
            });
          }
        })();

        // Immediately return the statement ID for the client
        return {
          success: true,
          statementId: statement.id,
        };
      } catch (error) {
        console.error("Error uploading statement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload statement",
        });
      }
    }),

  // Process an existing statement
  process: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const statement = await ctx.prisma.statement.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Statement not found",
        });
      }

      if (!statement.storageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Statement has no storage URL",
        });
      }

      // Update status to processing
      await ctx.prisma.statement.update({
        where: { id: statement.id },
        data: { status: StatementStatus.PROCESSING },
      });

      try {
        // Process the file with Vision AI
        const fileType = statement.filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
        const processingResult = await processUploadedFile(
          statement.storageUrl,
          fileType
        );

        if (!processingResult.success || !processingResult.text) {
          throw new Error(
            processingResult.error || "Failed to process statement text"
          );
        }

        // Extract account information from text
        const accountInfo = extractAccountInfo(processingResult.text);
        
        // Extract statement period
        const periodInfo = extractStatementPeriod(processingResult.text);

        // If no account ID was specified, try to find or create a matching bank account
        let accountId = statement.accountId;
        
        if (!accountId && accountInfo.lastFourDigits && accountInfo.financialInstitution) {
          // Try to find a matching account
          const existingAccount = await ctx.prisma.bankAccount.findFirst({
            where: {
              userId: ctx.session.user.id,
              financialInstitution: accountInfo.financialInstitution,
              lastFourDigits: accountInfo.lastFourDigits,
            },
          });

          if (existingAccount) {
            // Use the existing account
            accountId = existingAccount.id;
            
            // Update the account balance if extracted
            if (accountInfo.balance !== undefined) {
              await ctx.prisma.bankAccount.update({
                where: { id: existingAccount.id },
                data: { balance: accountInfo.balance.toString() },
              });
            }
          } else {
            // Create a new bank account
            const newAccount = await ctx.prisma.bankAccount.create({
              data: {
                userId: ctx.session.user.id,
                name: accountInfo.accountName || `${accountInfo.financialInstitution} Account`,
                financialInstitution: accountInfo.financialInstitution,
                accountType: accountInfo.accountType || "OTHER",
                lastFourDigits: accountInfo.lastFourDigits,
                balance: accountInfo.balance !== undefined ? accountInfo.balance.toString() : null,
              },
            });
            
            accountId = newAccount.id;
          }
        }

        // Update the statement with extracted information
        const updatedStatement = await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: {
            accountId,
            status: StatementStatus.COMPLETED,
            processedTimestamp: new Date(),
            periodStart: periodInfo.start,
            periodEnd: periodInfo.end,
          },
        });

        return updatedStatement;
      } catch (error) {
        console.error("Error processing statement:", error);
        
        // Update statement with error
        const failedStatement = await ctx.prisma.statement.update({
          where: { id: statement.id },
          data: {
            status: StatementStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            processedTimestamp: new Date(),
          },
        });
        
        return failedStatement;
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
        include: {
          account: true,
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
    
  // Link a statement to a bank account
  linkToAccount: protectedProcedure
    .input(z.object({ 
      statementId: z.string(),
      accountId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }
      
      // Verify statement belongs to user
      const statement = await ctx.prisma.statement.findFirst({
        where: {
          id: input.statementId,
          userId: ctx.session.user.id,
        },
      });
      
      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Statement not found",
        });
      }
      
      // Verify account belongs to user
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.accountId,
          userId: ctx.session.user.id,
        },
      });
      
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank account not found",
        });
      }
      
      // Link statement to account
      const updatedStatement = await ctx.prisma.statement.update({
        where: { id: input.statementId },
        data: { accountId: input.accountId },
      });
      
      return updatedStatement;
    }),
});
