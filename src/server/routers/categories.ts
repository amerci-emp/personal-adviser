import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { UserTypeDetectionService } from "@/lib/user-type-detection-service";
import { CategoryRecommendationEngine } from "@/lib/category-recommendation-engine";

export const categoriesRouter = createTRPCRouter({
  // Get all available categories
  getAllCategories: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.category.findMany({
      where: { isSystemDefault: true },
      orderBy: [
        { direction: 'asc' },
        { mainGroup: 'asc' },
        { displayName: 'asc' }
      ]
    });
  }),

  // Get categories grouped by main group and direction
  getCategoriesGrouped: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.category.findMany({
      where: { isSystemDefault: true },
      orderBy: [
        { direction: 'asc' },
        { mainGroup: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Group by direction and main group
    const grouped: Record<string, Record<string, any[]>> = {};
    
    for (const category of categories) {
      if (!grouped[category.direction]) {
        grouped[category.direction] = {};
      }
      if (!grouped[category.direction][category.mainGroup]) {
        grouped[category.direction][category.mainGroup] = [];
      }
      grouped[category.direction][category.mainGroup].push(category);
    }

    return grouped;
  }),

  // Get user's category preferences
  getUserCategoryPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    return await ctx.prisma.userCategoryPreference.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        category: true
      },
      orderBy: [
        { priority: 'asc' },
        { category: { displayName: 'asc' } }
      ]
    });
  }),

  // Get user's enabled categories only
  getUserEnabledCategories: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    const preferences = await ctx.prisma.userCategoryPreference.findMany({
      where: { 
        userId: ctx.session.user.id,
        enabled: true 
      },
      include: {
        category: true
      },
      orderBy: [
        { priority: 'asc' },
        { category: { displayName: 'asc' } }
      ]
    });

    return preferences.map(pref => ({
      ...pref.category,
      customName: pref.customName,
      monthlyBudget: pref.monthlyBudget ? Number(pref.monthlyBudget) : null,
      priority: pref.priority
    }));
  }),

  // Analyze user type and get category recommendations
  analyzeUserTypeAndRecommendCategories: protectedProcedure
    .input(z.object({
      minMonths: z.number().min(1).max(24).default(6)
    }).optional().default({ minMonths: 6 }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const userId = ctx.session.user.id;

      // Initialize services
      const userTypeService = new UserTypeDetectionService(ctx.prisma);
      const recommendationEngine = new CategoryRecommendationEngine(ctx.prisma);

      try {
        // Detect user type
        console.log('🔍 Starting user type analysis...');
        const userTypeAnalysis = await userTypeService.detectUserType(userId, input.minMonths);

        // Store the analysis
        await userTypeService.storeUserTypeAnalysis(userId, userTypeAnalysis);

        // Get category recommendations
        console.log('💡 Generating category recommendations...');
        const categoryRecommendations = await recommendationEngine.recommendCategories(
          userId, 
          userTypeAnalysis
        );

        // Get budget suggestions for recommended categories
        const recommendedCategoryIds = categoryRecommendations
          .filter(rec => rec.isRecommended)
          .map(rec => rec.categoryId);

        const budgetSuggestions = await recommendationEngine.suggestBudgets(
          userId,
          recommendedCategoryIds,
          userTypeAnalysis.spendingPatterns
        );

        console.log(`🎉 Analysis complete for user ${userId}:`);
        console.log(`  - User Type: ${userTypeAnalysis.detectedType} (${userTypeAnalysis.confidence}% confidence)`);
        console.log(`  - Category Recommendations: ${categoryRecommendations.length} total, ${categoryRecommendations.filter(r => r.isRecommended).length} recommended`);
        console.log(`  - Budget Suggestions: ${budgetSuggestions.length} generated`);

        // Validate that we have both categories and budget suggestions
        const recommendedCategories = categoryRecommendations.filter(r => r.isRecommended);
        if (recommendedCategories.length === 0) {
          console.error(`❌ AI Analysis validation failed: No recommended categories generated`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "AI analysis failed: No category recommendations were generated. This may indicate insufficient transaction data or analysis issues.",
          });
        }

        if (budgetSuggestions.length === 0) {
          console.error(`❌ AI Analysis validation failed: No budget suggestions generated for ${recommendedCategories.length} recommended categories`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "AI analysis failed: No budget suggestions were generated. This may indicate insufficient spending data or category mapping issues.",
          });
        }

        console.log(`✅ AI Analysis validation passed: ${recommendedCategories.length} categories and ${budgetSuggestions.length} budget suggestions generated`);

        // Store the AI-suggested categories in UserCategoryPreference as defaults
        console.log(`💾 Storing ${recommendedCategories.length} AI-suggested categories in database...`);
        
        // First, clear any existing preferences for this user to avoid conflicts
        await ctx.prisma.userCategoryPreference.deleteMany({
          where: { userId }
        });

        // Create UserCategoryPreference entries for all recommended categories
        const categoryPreferences = recommendedCategories.map((rec, index) => {
          // Find matching budget suggestion for this category
          const budgetSuggestion = budgetSuggestions.find(budget => budget.categoryId === rec.categoryId);
          
          return {
            userId,
            categoryId: rec.categoryId,
            enabled: true, // AI recommended these, so enable by default
            customName: rec.displayName, // Use the display name as custom name
            monthlyBudget: budgetSuggestion?.suggestedAmount || null, // Use AI-suggested budget if available
            priority: index // Use array order as priority
          };
        });

        await ctx.prisma.userCategoryPreference.createMany({
          data: categoryPreferences
        });

        console.log(`✅ Stored ${categoryPreferences.length} AI-suggested categories in UserCategoryPreference table`);
        console.log(`💰 Budget amounts set for ${budgetSuggestions.length} categories`);

        // Log the preference change for audit trail
        await ctx.prisma.userPreferenceChange.create({
          data: {
            userId,
            changeType: 'CATEGORY_UPDATE',
            newData: categoryPreferences,
            reason: 'INITIAL_AI_SUGGESTIONS'
          }
        });

        return {
          userTypeAnalysis,
          categoryRecommendations,
          budgetSuggestions
        };
      } catch (error) {
        console.error('❌ Error in user type analysis:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to analyze user type and generate recommendations",
        });
      }
    }),

  // Save user's category preferences
  saveUserCategoryPreferences: protectedProcedure
    .input(z.object({
      categories: z.array(z.object({
        categoryId: z.string(),
        enabled: z.boolean(),
        customName: z.string().optional(),
        monthlyBudget: z.number().optional(),
        priority: z.number().optional().default(0)
      })),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const userId = ctx.session.user.id;

      // Check rate limiting - only allow changes once per year
      const lastChange = await ctx.prisma.userPreferenceChange.findFirst({
        where: {
          userId,
          changeType: 'CATEGORY_UPDATE',
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (lastChange && input.reason !== 'INITIAL_SETUP') {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Category preferences can only be modified once per year. Next change allowed after " + 
                   new Date(lastChange.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        });
      }

      try {
        // Get current preferences for change tracking
        const currentPreferences = await ctx.prisma.userCategoryPreference.findMany({
          where: { userId }
        });

        // Delete all existing preferences
        await ctx.prisma.userCategoryPreference.deleteMany({
          where: { userId }
        });

        // Create new preferences
        const newPreferences = await ctx.prisma.userCategoryPreference.createMany({
          data: input.categories.map(cat => ({
            userId,
            categoryId: cat.categoryId,
            enabled: cat.enabled,
            customName: cat.customName,
            monthlyBudget: cat.monthlyBudget,
            priority: cat.priority || 0
          }))
        });

        // Log the change
        await ctx.prisma.userPreferenceChange.create({
          data: {
            userId,
            changeType: 'CATEGORY_UPDATE',
            previousData: currentPreferences,
            newData: input.categories,
            reason: input.reason || 'User preference update'
          }
        });

        console.log(`✅ Updated category preferences for user ${userId}: ${input.categories.length} categories`);

        // Trigger ChatGPT batch processing now that categories are customized
        console.log(`🤖 Triggering ChatGPT batch processing for user ${userId} after category customization`);
        try {
          const { ChatGPTBatchService } = await import("@/lib/chatgpt-batch-service");
          await ChatGPTBatchService.forceProcessBatch();
          console.log(`✅ ChatGPT batch processing completed for user ${userId}`);
        } catch (batchError) {
          console.error(`⚠️ ChatGPT batch processing failed for user ${userId}:`, batchError);
          // Don't fail the entire operation if batch processing fails
        }

        return {
          success: true,
          updatedCount: input.categories.length,
          enabledCount: input.categories.filter(c => c.enabled).length
        };
      } catch (error) {
        console.error('❌ Error saving category preferences:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save category preferences",
        });
      }
    }),

  // Update individual category preference
  updateCategoryPreference: protectedProcedure
    .input(z.object({
      categoryId: z.string(),
      enabled: z.boolean().optional(),
      customName: z.string().optional(),
      monthlyBudget: z.number().optional(),
      priority: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const userId = ctx.session.user.id;

      // Update or create the preference
      const updatedPreference = await ctx.prisma.userCategoryPreference.upsert({
        where: {
          userId_categoryId: {
            userId,
            categoryId: input.categoryId
          }
        },
        update: {
          ...(input.enabled !== undefined && { enabled: input.enabled }),
          ...(input.customName !== undefined && { customName: input.customName }),
          ...(input.monthlyBudget !== undefined && { monthlyBudget: input.monthlyBudget }),
          ...(input.priority !== undefined && { priority: input.priority }),
          updatedAt: new Date()
        },
        create: {
          userId,
          categoryId: input.categoryId,
          enabled: input.enabled ?? true,
          customName: input.customName,
          monthlyBudget: input.monthlyBudget,
          priority: input.priority ?? 0
        },
        include: {
          category: true
        }
      });

      return updatedPreference;
    }),

  // Get user type analysis
  getUserTypeAnalysis: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    return await ctx.prisma.userTypeAnalysis.findUnique({
      where: { userId: ctx.session.user.id }
    });
  }),

  // Get spending analysis for user's categories
  getSpendingAnalysis: protectedProcedure
    .input(z.object({
      period: z.string().default('LAST_6_MONTHS')
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      return await ctx.prisma.spendingAnalysis.findMany({
        where: {
          userId: ctx.session.user.id,
          period: input.period
        },
        include: {
          category: true
        },
        orderBy: {
          totalAmount: 'desc'
        }
      });
    }),

  // Map Plaid category to user category
  mapPlaidCategory: protectedProcedure
    .input(z.object({
      plaidCategory: z.string()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is not available",
        });
      }

      const recommendationEngine = new CategoryRecommendationEngine(ctx.prisma);
      const mappedCategory = await recommendationEngine.mapPlaidCategory(
        input.plaidCategory,
        ctx.session.user.id
      );

      return { mappedCategory };
    }),

  // Get preference change history (for rate limiting display)
  getPreferenceChangeHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User ID is not available",
      });
    }

    return await ctx.prisma.userPreferenceChange.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  })
});