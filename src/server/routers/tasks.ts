import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// Helper function to automatically complete tasks
async function autoCompleteTask(ctx: any, userId: string, taskId: string, points: number) {
  try {
    // Check if user already has this task assigned
    const existingUserTask = await ctx.prisma.userTask.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
    });

    if (!existingUserTask) {
      // Create and complete the task in one go
      await ctx.prisma.userTask.create({
        data: {
          userId,
          taskId,
          status: 'COMPLETED',
        },
      });
    } else if (existingUserTask.status !== 'COMPLETED') {
      // Update existing task to completed
      await ctx.prisma.userTask.update({
        where: {
          userId_taskId: {
            userId,
            taskId,
          },
        },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    // Award points
    await ctx.prisma.userPoints.upsert({
      where: { userId },
      update: {
        totalPoints: {
          increment: points,
        },
      },
      create: {
        userId,
        totalPoints: points,
      },
    });

    console.log(`✅ Auto-completed task ${taskId} for user ${userId} (+${points} points)`);
  } catch (error) {
    console.error(`Failed to auto-complete task ${taskId}:`, error);
  }
}

export const tasksRouter = createTRPCRouter({
  getHighestPriorityTask: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    // Get the user's current state to determine task eligibility
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        bankAccounts: {
          include: {
            plaidAccounts: true,
          },
        },
        userTasks: {
          include: {
            task: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Check user's current progress
    const hasLinkedAccount = user.bankAccounts.some(bankAccount => 
      bankAccount.plaidAccounts.length > 0
    );
    const hasEnabledAi = user.isAiEnabled || false;
    
    // For now, we'll assume they have categorized transactions if they have linked an account
    // In a real implementation, you'd check for actual transaction categorization
    const hasCategorizedTransactions = hasLinkedAccount;

    // Find pending tasks for this user, ordered by priority
    const pendingUserTasks = user.userTasks
      .filter(userTask => userTask.status === 'PENDING')
      .sort((a, b) => a.task.priority - b.task.priority);

    // Find the highest priority task that the user is eligible for
    for (const userTask of pendingUserTasks) {
      const task = userTask.task;
      
      // Check eligibility based on task type
      if (task.id === 'CONNECT_ACCOUNT' && !hasLinkedAccount) {
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          points: task.points,
          priority: task.priority,
        };
      }
      
      if (task.id === 'REVIEW_TRANSACTIONS' && hasLinkedAccount && !hasCategorizedTransactions) {
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          points: task.points,
          priority: task.priority,
        };
      }
      
      if (task.id === 'ENABLE_AI_COMPANION' && hasLinkedAccount && hasCategorizedTransactions && !hasEnabledAi) {
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          points: task.points,
          priority: task.priority,
        };
      }
    }

    // No eligible tasks found
    return null;
  }),

  getAllTasks: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    // Get the user's current state with complete data
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        bankAccounts: {
          include: {
            plaidAccounts: true,
            statements: true,
            transactions: true,
          },
        },
        userTasks: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get ALL tasks from the master Task table
    const allTasks = await ctx.prisma.task.findMany({
      orderBy: {
        priority: 'asc',
      },
    });

    // Check actual completion criteria
    const hasLinkedAccount = user.bankAccounts.some(bankAccount => 
      bankAccount.plaidAccounts.length > 0
    );
    const hasStatementsAndTransactions = user.bankAccounts.some(bankAccount => 
      bankAccount.statements.length > 0 && bankAccount.transactions.length > 0
    );
    
    // Connect Account is only complete when full data pipeline works
    const hasCompleteConnection = hasLinkedAccount && hasStatementsAndTransactions;
    
    const hasEnabledAi = user.isAiEnabled || false;
    
    // Review Transactions is complete when all transactions are categorized
    const totalTransactions = user.bankAccounts.reduce((sum, account) => 
      sum + account.transactions.length, 0
    );
    const categorizedTransactions = user.bankAccounts.reduce((sum, account) => 
      sum + account.transactions.filter(t => t.category && t.category !== 'uncategorized').length, 0
    );
    const hasCategorizedTransactions = totalTransactions > 0 && categorizedTransactions === totalTransactions;

    // Map all tasks and determine their status for this user
    const tasksWithStatus = await Promise.all(allTasks.map(async task => {
      // Check if user has this task assigned and completed
      const userTask = user.userTasks.find(ut => ut.taskId === task.id);
      let status: "completed" | "available" | "locked" = "locked";

      // Auto-complete tasks based on actual user state
      if (task.id === 'CONNECT_ACCOUNT' && hasCompleteConnection && userTask?.status !== 'COMPLETED') {
        // Auto-complete the connect account task only when full pipeline works
        await autoCompleteTask(ctx, user.id, 'CONNECT_ACCOUNT', task.points);
        status = "completed";
      } else if (task.id === 'REVIEW_TRANSACTIONS' && hasCompleteConnection && hasCategorizedTransactions && userTask?.status !== 'COMPLETED') {
        // Auto-complete the review transactions task
        await autoCompleteTask(ctx, user.id, 'REVIEW_TRANSACTIONS', task.points);
        status = "completed";
      } else if (task.id === 'ENABLE_AI_COMPANION' && hasEnabledAi && userTask?.status !== 'COMPLETED') {
        // Auto-complete the AI companion task
        await autoCompleteTask(ctx, user.id, 'ENABLE_AI_COMPANION', task.points);
        status = "completed";
      } else if (userTask?.status === 'COMPLETED') {
        status = "completed";
      } else {
        // Check if task is available based on prerequisites
        if (task.id === 'CONNECT_ACCOUNT') {
          status = hasCompleteConnection ? "completed" : "available";
        } else if (task.id === 'REVIEW_TRANSACTIONS') {
          status = hasCompleteConnection ? (hasCategorizedTransactions ? "completed" : "available") : "locked";
        } else if (task.id === 'ENABLE_AI_COMPANION') {
          status = hasCompleteConnection && hasCategorizedTransactions ? (hasEnabledAi ? "completed" : "available") : "locked";
        }
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        points: task.points,
        priority: task.priority,
        status,
      };
    }));

    return tasksWithStatus;
  }),

  // Note: Tasks are now auto-completed based on actual user state
  // Manual completion has been removed in favor of real accomplishments
});