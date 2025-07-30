import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { z } from 'zod';

export const userRouter = createTRPCRouter({
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
