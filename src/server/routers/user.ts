import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { z } from 'zod';

export const userRouter = createTRPCRouter({
  // Get user profile information
  profile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new Error('User ID is not available');
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isAiEnabled: true,
        connectionType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  setConnectionType: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(['PLAID', 'MANUAL']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { connectionType: input.connectionType },
      });
    }),
});
