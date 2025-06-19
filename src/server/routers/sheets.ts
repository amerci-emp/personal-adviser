import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { GoogleSheetsEmbedService } from "@/lib/google-sheets-embed-helper";

export const sheetsRouter = createTRPCRouter({
  // Get user's Personal Finance spreadsheet info
  getPersonalFinanceSpreadsheet: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    try {
      // Get the user's Personal Finance spreadsheet
      const personalFinanceSpreadsheet = await ctx.prisma.personalFinanceSpreadsheet.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          monthlySheets: {
            orderBy: { createdAt: 'desc' },
            take: 12, // Last 12 months
          },
        },
      });

      // Check Google Sheets access
      const accessInfo = await GoogleSheetsEmbedService.hasGoogleSheetsAccess(ctx.session.user.id);

      return {
        spreadsheet: personalFinanceSpreadsheet,
        access: accessInfo,
      };
    } catch (error) {
      console.error("Error fetching Personal Finance spreadsheet:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch spreadsheet information",
      });
    }
  }),

  // Ensure spreadsheet is properly configured for embedding
  ensureEmbeddable: protectedProcedure
    .input(z.object({ spreadsheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      try {
        // Check if user has Google Sheets access
        const accessInfo = await GoogleSheetsEmbedService.hasGoogleSheetsAccess(ctx.session.user.id);
        
        if (!accessInfo.hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: accessInfo.reason || "Google Sheets access required",
          });
        }

        // Create embed service for user
        const embedService = await GoogleSheetsEmbedService.forUser(ctx.session.user.id);
        
        if (!embedService) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize Google Sheets service",
          });
        }

        // Ensure the spreadsheet is embeddable
        const isEmbeddable = await embedService.ensureSpreadsheetIsEmbeddable(input.spreadsheetId);

        return {
          success: isEmbeddable,
          message: isEmbeddable 
            ? "Spreadsheet is ready for embedding" 
            : "Failed to configure spreadsheet for embedding",
        };
      } catch (error) {
        console.error("Error ensuring spreadsheet is embeddable:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to configure spreadsheet for embedding",
        });
      }
    }),

  // Get monthly sheet URLs for direct navigation
  getMonthlySheetUrls: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    try {
      // Check if user has Google Sheets access
      const accessInfo = await GoogleSheetsEmbedService.hasGoogleSheetsAccess(ctx.session.user.id);
      
      if (!accessInfo.hasAccess) {
        return {
          urls: [],
          access: accessInfo,
        };
      }

      // Create embed service for user
      const embedService = await GoogleSheetsEmbedService.forUser(ctx.session.user.id);
      
      if (!embedService) {
        return {
          urls: [],
          access: accessInfo,
        };
      }

      // Get monthly sheet URLs
      const urls = await embedService.getMonthlySheetEmbedUrls(ctx.session.user.id);

      return {
        urls,
        access: accessInfo,
      };
    } catch (error) {
      console.error("Error getting monthly sheet URLs:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get monthly sheet URLs",
      });
    }
  }),

  // Check Google Sheets access status
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    try {
      const accessInfo = await GoogleSheetsEmbedService.hasGoogleSheetsAccess(ctx.session.user.id);
      return accessInfo;
    } catch (error) {
      console.error("Error checking Google Sheets access:", error);
      return {
        hasAccess: false,
        hasRefreshToken: false,
        reason: "Error checking permissions",
      };
    }
  }),

  // Get embed URL for a specific view
  getEmbedUrl: protectedProcedure
    .input(z.object({
      spreadsheetId: z.string(),
      viewMode: z.enum(['edit', 'view', 'preview']).optional().default('view'),
      sheetId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      try {
        // Check if user has Google Sheets access
        const accessInfo = await GoogleSheetsEmbedService.hasGoogleSheetsAccess(ctx.session.user.id);
        
        if (!accessInfo.hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: accessInfo.reason || "Google Sheets access required",
          });
        }

        // Create embed service for user
        const embedService = await GoogleSheetsEmbedService.forUser(ctx.session.user.id);
        
        if (!embedService) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize Google Sheets service",
          });
        }

        // Generate embed URL
        const embedUrl = embedService.getEmbedUrl(input.spreadsheetId, {
          viewMode: input.viewMode,
          sheetId: input.sheetId,
        });

        return {
          embedUrl,
          directUrl: `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/edit${input.sheetId ? `#gid=${input.sheetId}` : ''}`,
        };
      } catch (error) {
        console.error("Error generating embed URL:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate embed URL",
        });
      }
    }),
}); 