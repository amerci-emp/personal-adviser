import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const bankAccountRouter = createTRPCRouter({
  // Get all bank accounts for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    const accounts = await ctx.prisma.bankAccount.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: {
          orderBy: {
            date: "desc",
          },
          take: 10, // Get recent 10 transactions per account for dashboard
        },
        statements: true,
        plaidAccounts: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return accounts;
  }),

  // Get analysis summary data for debugging
  getAnalysisSummary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    const userId = ctx.session.user.id;

    // Get accounts with transaction counts
    const accounts = await ctx.prisma.bankAccount.findMany({
      where: { userId },
      include: {
        statements: true,
        plaidAccounts: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    // Get total transaction count
    const totalTransactions = await ctx.prisma.transaction.count({
      where: { userId }
    });

    // Get total statement count  
    const totalStatements = await ctx.prisma.statement.count({
      where: { userId }
    });

    // Get recent transactions for date range
    const recentTransaction = await ctx.prisma.transaction.findFirst({
      where: { userId },
      orderBy: { date: 'desc' }
    });

    const oldestTransaction = await ctx.prisma.transaction.findFirst({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    return {
      totalAccounts: accounts.length,
      totalTransactions,
      totalStatements,
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name || 'Unknown Account',
        institutionName: account.financialInstitution || 'Unknown Bank',
        accountType: account.accountType,
        lastFourDigits: account.lastFourDigits,
        transactionCount: account._count.transactions,
        statementCount: account.statements.length
      })),
      dateRange: {
        earliest: oldestTransaction?.date,
        latest: recentTransaction?.date
      }
    };
  }),

  // Get a single bank account by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          statements: {
            orderBy: {
              uploadTimestamp: "desc",
            },
            take: 5,
          },
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      return account;
    }),

  // Create a new bank account
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        financialInstitution: z.string(),
        accountType: z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "OTHER"]),
        lastFourDigits: z.string().min(4).max(4).optional(),
        balance: z.number().optional(),
        notes: z.string().optional(),
        color: z.string().optional(),
        institutionLogo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      // Check if account with same last 4 digits and institution already exists
      if (input.lastFourDigits) {
        const existingAccount = await ctx.prisma.bankAccount.findFirst({
          where: {
            userId: ctx.session.user.id,
            financialInstitution: input.financialInstitution,
            lastFourDigits: input.lastFourDigits,
          },
        });

        if (existingAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this financial institution and last 4 digits already exists",
          });
        }
      }

      try {
        const account = await ctx.prisma.bankAccount.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            financialInstitution: input.financialInstitution,
            accountType: input.accountType,
            lastFourDigits: input.lastFourDigits,
            balance: input.balance ? input.balance.toString() : null,
          },
        });

        return account;
      } catch (error) {
        console.error("Error creating bank account:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create bank account",
        });
      }
    }),

  // Update an existing bank account
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        financialInstitution: z.string().optional(),
        accountType: z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "OTHER"]).optional(),
        lastFourDigits: z.string().min(4).max(4).optional(),
        balance: z.number().optional(),
        notes: z.string().optional(),
        color: z.string().optional(),
        institutionLogo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      // Verify the account exists and belongs to the user
      const existingAccount = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!existingAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Check if update would create a duplicate account (same last 4 digits and institution)
      if (input.lastFourDigits && input.financialInstitution) {
        const duplicateAccount = await ctx.prisma.bankAccount.findFirst({
          where: {
            userId: ctx.session.user.id,
            financialInstitution: input.financialInstitution,
            lastFourDigits: input.lastFourDigits,
            id: { not: input.id }, // Exclude the current account
          },
        });

        if (duplicateAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another account with this financial institution and last 4 digits already exists",
          });
        }
      }

      try {
        const updatedAccount = await ctx.prisma.bankAccount.update({
          where: {
            id: input.id,
          },
          data: {
            name: input.name,
            financialInstitution: input.financialInstitution,
            accountType: input.accountType,
            lastFourDigits: input.lastFourDigits,
            balance: input.balance !== undefined ? input.balance.toString() : undefined,
          },
        });

        return updatedAccount;
      } catch (error) {
        console.error("Error updating bank account:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update bank account",
        });
      }
    }),

  // Delete a bank account
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      // Verify the account exists and belongs to the user
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      try {
        // Delete the account
        await ctx.prisma.bankAccount.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting bank account:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete bank account",
        });
      }
    }),
}); 