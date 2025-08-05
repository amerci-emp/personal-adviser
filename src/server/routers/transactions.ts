import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { PatternMatchingService } from "@/lib/pattern-matching-service";
import { ConfidenceEngine } from "@/lib/confidence-engine";
import { TransactionProcessor } from "@/lib/transaction-processor";
import { getAllCategories, getDirectionFromAmount } from "@/lib/category-system";

// Helper function to map Plaid confidence levels to numbers
function mapPlaidConfidenceToNumber(confidenceLevel: string): number {
  switch (confidenceLevel?.toUpperCase()) {
    case 'VERY_HIGH': return 95;
    case 'HIGH': return 85;
    case 'MEDIUM': return 70;
    case 'LOW': return 50;
    default: return 30;
  }
}

export const transactionsRouter = createTRPCRouter({
  // Get transactions that need review
  getPendingReview: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    const pendingTransactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        needsReview: true
      },
      include: {
        transactionPattern: true // Include the linked pattern data
      },
      orderBy: {
        date: 'desc'
      },
      take: 50 // Limit to prevent overwhelming the user
    });

    return pendingTransactions.map(transaction => {
      // Get data from linked pattern (preferred) or fallback to originalText parsing
      let plaidData: any = {};
      
      if (transaction.transactionPattern) {
        // Use data from the linked pattern
        plaidData = {
          plaidCategory: transaction.transactionPattern.plaidCategory,
          plaidConfidence: transaction.transactionPattern.plaidConfidence ? 
            Number(transaction.transactionPattern.plaidConfidence) : null,
          chatgptCategory: transaction.transactionPattern.chatgptCategory,
          chatgptConfidence: transaction.transactionPattern.chatgptConfidence ? 
            Number(transaction.transactionPattern.chatgptConfidence) : null,
        };
      } else {
        // Fallback: parse from originalText if no pattern linked yet
        try {
          if (transaction.originalText) {
            const parsedData = JSON.parse(transaction.originalText);
            plaidData = {
              plaidCategory: parsedData.personal_finance_category?.detailed || null,
              plaidConfidence: parsedData.personal_finance_category?.confidence_level ? 
                mapPlaidConfidenceToNumber(parsedData.personal_finance_category.confidence_level) : null,
            };
          }
        } catch (error) {
          // If parsing fails, skip Plaid data
        }
      }

      return {
        id: transaction.id,
        description: transaction.description,
        merchantName: transaction.merchantName,
        amount: Number(transaction.amount),
        date: transaction.date,
        direction: getDirectionFromAmount(Number(transaction.amount)),
        suggestedCategory: transaction.assignedCategory || plaidData.plaidCategory, // Use assigned or Plaid suggestion
        confidence: transaction.confidence ? Number(transaction.confidence) : plaidData.plaidConfidence,
        // Debug data for development
        originalText: transaction.originalText,
        plaidCategory: plaidData.plaidCategory,
        plaidConfidence: plaidData.plaidConfidence,
        chatgptCategory: plaidData.chatgptCategory,
        chatgptConfidence: plaidData.chatgptConfidence,
      };
    });
  }),

  // Get count of pending review transactions
  getPendingReviewCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.transaction.count({
      where: {
        userId: ctx.session.user.id,
        needsReview: true,
        reviewedAt: null,
      },
    });
    
    return count;
  }),

  // Review and categorize a transaction
  reviewTransaction: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      category: z.string(),
      isCorrection: z.boolean().optional().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const { transactionId, category, isCorrection } = input;

      // Validate category against user's enabled categories
      const userCategory = await ctx.prisma.userCategoryPreference.findFirst({
        where: {
          userId: ctx.session.user.id,
          enabled: true,
          category: {
            name: category
          }
        },
        include: {
          category: true
        }
      });

      if (!userCategory) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid or disabled category: ${category}. Please select from your enabled categories.`,
        });
      }

      // Get the transaction
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      if (transaction.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to review this transaction",
        });
      }

      // Update transaction
      const updatedTransaction = await ctx.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          assignedCategory: category,
          needsReview: false,
          reviewedAt: new Date(),
          confidence: 99 // User review gives highest confidence
        }
      });

      // Find or create pattern for this transaction
      const transactionForPattern = {
        id: transaction.id,
        description: transaction.description,
        merchantName: transaction.merchantName,
        amount: Number(transaction.amount),
        userId: ctx.session.user.id
      };

      // Check if there's an existing pattern
      const existingPattern = await PatternMatchingService.findPattern(
        ctx.session.user.id,
        transactionForPattern
      );

      if (existingPattern) {
        // Update existing pattern with user feedback
        await PatternMatchingService.updateFromUserReview(
          existingPattern.id,
          category,
          !isCorrection // If it's not a correction, the user agreed with the suggestion
        );
      } else {
        // Create new pattern from user review
        await PatternMatchingService.createOrUpdatePattern(
          ctx.session.user.id,
          transactionForPattern,
          {
            userCategory: category,
            finalCategory: category,
            combinedConfidence: 99
          }
        );
      }

      return {
        success: true,
        transaction: {
          id: updatedTransaction.id,
          category: updatedTransaction.assignedCategory,
          needsReview: updatedTransaction.needsReview
        }
      };
    }),

  // Batch review multiple transactions
  batchReview: protectedProcedure
    .input(z.object({
      reviews: z.array(z.object({
        transactionId: z.string(),
        category: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const { reviews } = input;
      const validCategories = getAllCategories();
      const results = [];

      for (const review of reviews) {
        try {
          // Validate category
          if (!validCategories.includes(review.category)) {
            results.push({
              transactionId: review.transactionId,
              success: false,
              error: `Invalid category: ${review.category}`
            });
            continue;
          }

          // Get transaction
          const transaction = await ctx.prisma.transaction.findUnique({
            where: { id: review.transactionId }
          });

          if (!transaction || transaction.userId !== ctx.session.user.id) {
            results.push({
              transactionId: review.transactionId,
              success: false,
              error: "Transaction not found or unauthorized"
            });
            continue;
          }

          // Update transaction
          await ctx.prisma.transaction.update({
            where: { id: review.transactionId },
            data: {
              assignedCategory: review.category,
              needsReview: false,
              reviewedAt: new Date(),
              confidence: 99
            }
          });

          // Update or create pattern
          const transactionForPattern = {
            id: transaction.id,
            description: transaction.description,
            merchantName: transaction.merchantName,
            amount: Number(transaction.amount),
            userId: ctx.session.user.id
          };

          await PatternMatchingService.createOrUpdatePattern(
            ctx.session.user.id,
            transactionForPattern,
            {
              userCategory: review.category,
              finalCategory: review.category,
              combinedConfidence: 99
            }
          );

          results.push({
            transactionId: review.transactionId,
            success: true,
            error: null
          });

        } catch (error) {
          results.push({
            transactionId: review.transactionId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      return {
        results,
        totalProcessed: reviews.length,
        successCount: results.filter(r => r.success).length
      };
    }),

  // Get available categories for the current transaction direction
  getAvailableCategories: protectedProcedure
    .input(z.object({
      amount: z.number()
    }))
    .query(({ input }) => {
      const direction = getDirectionFromAmount(input.amount);
      return {
        direction,
        categories: getAllCategories().filter(cat => {
          // Filter categories based on direction if needed
          // For now, return all categories
          return true;
        })
      };
    }),

  // Get suggested category for a transaction
  getSuggestedCategory: protectedProcedure
    .input(z.object({
      transactionId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.transactionId }
      });

      if (!transaction || transaction.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      const transactionForPattern = {
        id: transaction.id,
        description: transaction.description,
        merchantName: transaction.merchantName,
        amount: Number(transaction.amount),
        userId: ctx.session.user.id
      };

      const pattern = await PatternMatchingService.findPattern(
        ctx.session.user.id,
        transactionForPattern
      );

      if (pattern) {
        const confidence = ConfidenceEngine.applyDecay(pattern);
        return {
          category: pattern.finalCategory,
          confidence: Math.round(confidence),
          source: pattern.userCategory ? 'user' : 
                  pattern.chatgptCategory ? 'ai' : 'plaid'
        };
      }

      return null;
    }),

  // Get user's transaction processing statistics
  getProcessingStats: protectedProcedure
    .input(z.object({
      days: z.number().optional().default(30)
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const stats = await TransactionProcessor.getProcessingStats(
        ctx.session.user.id,
        input.days
      );

      const patternStats = await PatternMatchingService.getPatternStats(
        ctx.session.user.id
      );

      return {
        ...stats,
        patternStats
      };
    }),

  // Process uploaded transactions (for manual uploads)
  processTransactions: protectedProcedure
    .input(z.object({
      transactions: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        date: z.date(),
        merchantName: z.string().optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const transactionsForProcessing = input.transactions.map(t => ({
        id: undefined,
        description: t.description,
        merchantName: t.merchantName,
        amount: t.amount,
        userId: ctx.session.user.id
      }));

      const stats = await TransactionProcessor.processNewTransactions(
        transactionsForProcessing,
        ctx.session.user.id
      );

      return {
        success: true,
        stats
      };
    }),

  // Force process ChatGPT batch (for testing)
  forceProcessBatch: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    // This is mainly for testing - force process any pending AI batch
    const { ChatGPTBatchService } = await import("@/lib/chatgpt-batch-service");
    await ChatGPTBatchService.forceProcessBatch();

    return { success: true };
  })
});