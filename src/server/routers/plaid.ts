import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { PlaidService } from '@/lib/plaid-service';
import { PlaidImportService } from '@/lib/plaid-import-service';
import { encrypt } from '@/lib/encryption';

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

      try {
        // First, create a BankAccount record
        const bankAccount = await ctx.prisma.bankAccount.create({
          data: {
            userId: ctx.session.user.id!,
            name: input.institutionName,
            financialInstitution: input.institutionName,
            accountType: 'checking', // Default type, will be updated during import
            lastFourDigits: null, // Will be populated during import
            balance: null, // Will be populated during import
          },
        });

        // Then, create a PlaidAccount record linked to the BankAccount
        const plaidAccount = await ctx.prisma.plaidAccount.create({
          data: {
            bankAccountId: bankAccount.id,
            plaidId: itemId, // Store the Plaid item ID
          },
        });

        console.log(`✅ Created bank account and plaid connection for user ${ctx.session.user.id}`);

        // Now import actual account data and transactions
        const importService = new PlaidImportService();
        const importResult = await importService.importAccountData(
          ctx.prisma,
          accessToken, // Use the access token directly (import service handles encryption)
          bankAccount.id,
          ctx.session.user.id!
        );

        console.log(`🎉 Data import completed:`, importResult);
        
        return {
          success: true,
          bankAccountId: bankAccount.id,
          plaidAccountId: plaidAccount.id,
          importResult,
        };
      } catch (error) {
        console.error('Failed to create plaid connection or import data:', error);
        throw error;
      }
    }),
  
  // We will add more procedures here later, like getItems, etc.
}); 