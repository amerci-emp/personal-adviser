import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { PlaidService } from '@/lib/plaid-service';
import { encrypt } from '@/lib/encryption';
import { PlaidSyncService } from '@/lib/plaid-sync-service';

export const plaidRouter = createTRPCRouter({
  createLinkToken: protectedProcedure.query(async ({ ctx }) => {
    const plaidService = new PlaidService();
    // The link token is sensitive and should not be logged in production
    const token = await plaidService.createLinkToken(ctx.session.user.id);
    return token;
  }),

  exchangePublicToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string(),
        institutionName: z.string(),
        institutionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plaidService = new PlaidService();
      const { accessToken, itemId } = await plaidService.exchangePublicToken(
        input.publicToken
      );

      // Encrypt the access token before storing it
      const encryptedAccessToken = encrypt(accessToken);

      const plaidItem = await ctx.prisma.plaidItem.create({
        data: {
          userId: ctx.session.user.id,
          itemId,
          accessToken: encryptedAccessToken,
          institutionId: input.institutionId,
          institutionName: input.institutionName,
        },
      });

      // --- Trigger Initial Sync ---
      // We do this asynchronously (don't await it) so the user doesn't have to wait.
      // The data will appear on their dashboard automatically.
      PlaidSyncService.syncAccounts(plaidItem)
        .then(() => {
          return PlaidSyncService.syncItem(plaidItem);
        })
        .catch((error) => {
          console.error(
            `[InitialSync] Failed to complete initial sync for item ${plaidItem.id}. Error:`,
            error
          );
          // Optionally, update the item to reflect the sync failure
          ctx.prisma.plaidItem.update({
            where: { id: plaidItem.id },
            data: { syncStatus: 'ITEM_ERROR' },
          }).catch(e => console.error(`[InitialSync] Failed to mark item ${plaidItem.id} as error:`, e));
        });
      // --------------------------
      
      return plaidItem;
    }),
  
  // We will add more procedures here later, like getItems, etc.
}); 