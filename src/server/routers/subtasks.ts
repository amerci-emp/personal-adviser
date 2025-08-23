import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const subtasksRouter = createTRPCRouter({
  // Get all subtasks for a specific task
  getSubTasksForTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const subTasks = await ctx.prisma.subTask.findMany({
        where: { taskId: input.taskId },
        include: {
          userSubTasks: {
            where: { userId: ctx.session.user.id },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      // Transform to include user progress
      return subTasks.map(subTask => ({
        ...subTask,
        userProgress: subTask.userSubTasks[0] || null,
      }));
    }),

  // Get current subtask status for a user and task
  getCurrentSubTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all subtasks for this task
      const subTasks = await ctx.prisma.subTask.findMany({
        where: { taskId: input.taskId },
        include: {
          userSubTasks: {
            where: { userId: ctx.session.user.id },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      // Find the first incomplete subtask
      const currentSubTask = subTasks.find(subTask => {
        const userProgress = subTask.userSubTasks[0];
        return !userProgress || userProgress.status !== 'COMPLETED';
      });

      // Calculate overall progress
      const completedCount = subTasks.filter(subTask => {
        const userProgress = subTask.userSubTasks[0];
        return userProgress && userProgress.status === 'COMPLETED';
      }).length;

      const totalCount = subTasks.length;
      const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        currentSubTask: currentSubTask ? {
          ...currentSubTask,
          userProgress: currentSubTask.userSubTasks[0] || null,
        } : null,
        allSubTasks: subTasks.map(subTask => ({
          ...subTask,
          userProgress: subTask.userSubTasks[0] || null,
        })),
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage: progressPercentage,
        },
      };
    }),

  // Start a subtask (set to IN_PROGRESS)
  startSubTask: protectedProcedure
    .input(z.object({
      subTaskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const subTask = await ctx.prisma.subTask.findUnique({
        where: { id: input.subTaskId },
      });

      if (!subTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SubTask not found",
        });
      }

      // Create or update user subtask progress
      const userSubTask = await ctx.prisma.userSubTask.upsert({
        where: {
          userId_subTaskId: {
            userId: ctx.session.user.id,
            subTaskId: input.subTaskId,
          },
        },
        update: {
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        },
        create: {
          userId: ctx.session.user.id,
          subTaskId: input.subTaskId,
          status: 'IN_PROGRESS',
        },
      });

      return userSubTask;
    }),

  // Complete a subtask
  completeSubTask: protectedProcedure
    .input(z.object({
      subTaskId: z.string(),
      data: z.any().optional(), // Store any completion data
    }))
    .mutation(async ({ ctx, input }) => {
      const subTask = await ctx.prisma.subTask.findUnique({
        where: { id: input.subTaskId },
      });

      if (!subTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SubTask not found",
        });
      }

      // Update user subtask progress
      const userSubTask = await ctx.prisma.userSubTask.upsert({
        where: {
          userId_subTaskId: {
            userId: ctx.session.user.id,
            subTaskId: input.subTaskId,
          },
        },
        update: {
          status: 'COMPLETED',
          completedAt: new Date(),
          data: input.data || undefined,
          updatedAt: new Date(),
        },
        create: {
          userId: ctx.session.user.id,
          subTaskId: input.subTaskId,
          status: 'COMPLETED',
          completedAt: new Date(),
          data: input.data || undefined,
        },
      });

      // Check if all subtasks for this task are completed
      const allSubTasks = await ctx.prisma.subTask.findMany({
        where: { taskId: subTask.taskId },
        include: {
          userSubTasks: {
            where: { userId: ctx.session.user.id },
          },
        },
      });

      const allCompleted = allSubTasks.every(st => {
        const userProgress = st.userSubTasks[0];
        return userProgress && userProgress.status === 'COMPLETED';
      });

      // If all subtasks are completed, mark the main task as completed
      if (allCompleted) {
        await ctx.prisma.userTask.updateMany({
          where: {
            userId: ctx.session.user.id,
            taskId: subTask.taskId,
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      return {
        userSubTask,
        allTasksCompleted: allCompleted,
      };
    }),

  // Update subtask data (for storing progress information)
  updateSubTaskData: protectedProcedure
    .input(z.object({
      subTaskId: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userSubTask = await ctx.prisma.userSubTask.upsert({
        where: {
          userId_subTaskId: {
            userId: ctx.session.user.id,
            subTaskId: input.subTaskId,
          },
        },
        update: {
          data: input.data,
          updatedAt: new Date(),
        },
        create: {
          userId: ctx.session.user.id,
          subTaskId: input.subTaskId,
          data: input.data,
          status: 'PENDING',
        },
      });

      return userSubTask;
    }),

  // Reset all subtasks for a task (useful for development/testing)
  resetTaskProgress: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userSubTask.deleteMany({
        where: {
          userId: ctx.session.user.id,
          subTask: {
            taskId: input.taskId,
          },
        },
      });

      return { success: true };
    }),

  // Reset a subtask to incomplete (for debugging/retry purposes)
  resetSubTask: protectedProcedure
    .input(z.object({
      subTaskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const subTask = await ctx.prisma.subTask.findUnique({
        where: { id: input.subTaskId },
      });

      if (!subTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SubTask not found",
        });
      }

      // Reset the user subtask to pending status
      const userSubTask = await ctx.prisma.userSubTask.upsert({
        where: {
          userId_subTaskId: {
            userId: ctx.session.user.id,
            subTaskId: input.subTaskId,
          },
        },
        update: {
          status: 'PENDING',
          completedAt: null,
          data: Prisma.DbNull,
          updatedAt: new Date(),
        },
        create: {
          userId: ctx.session.user.id,
          subTaskId: input.subTaskId,
          status: 'PENDING',
          completedAt: null,
          data: Prisma.DbNull,
        },
      });

      console.log(`🔄 Reset subtask ${subTask.name} to PENDING for user ${ctx.session.user.id}`);

      return userSubTask;
    }),
});