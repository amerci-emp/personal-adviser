import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

// Type definitions
type CategoryConfig = {
  enabled: boolean;
  color: string;
  subcategories: string[];
};

type UserPresetConfig = Record<string, {
  enabled: boolean;
  subcategories: string[];
}>;

// Default category structure
export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "Debt": {
    enabled: true,
    color: "#FF0000",
    subcategories: ["College Loan", "Credit Card"]
  },
  "Food": {
    enabled: true,
    color: "#00FF00", 
    subcategories: ["Groceries", "Restaurants"]
  },
  "Housing": {
    enabled: true,
    color: "#1c4587",
    subcategories: ["Mortgage", "HOA", "Energy Bills", "Water Bills", "Internet/Phone", "TV Bills", "Others"]
  },
  "Medical": {
    enabled: true,
    color: "#f1c232",
    subcategories: ["Health Insurance", "Dentist"]
  },
  "Personal": {
    enabled: true,
    color: "#9900ff",
    subcategories: ["Gifts", "Life Insurance", "Personal Care"]
  },
  "Recreation": {
    enabled: true,
    color: "#ff9900",
    subcategories: ["Gym Bills", "Entertainment", "Subscriptions", "Vacations"]
  },
  "Transportation": {
    enabled: true,
    color: "#000000",
    subcategories: ["Taxi/Uber", "Car Loan", "Car Insurance", "Gas", "Car Maintenance", "Parking"]
  },
  "Business": {
    enabled: true,
    color: "#666666",
    subcategories: ["Business Expenses"]
  }
} as const;

// User type presets
export const USER_TYPE_PRESETS: Record<string, UserPresetConfig> = {
  STUDENT: {
    "Debt": { enabled: true, subcategories: ["College Loan", "Credit Card"] },
    "Food": { enabled: true, subcategories: ["Groceries", "Restaurants"] },
    "Housing": { enabled: true, subcategories: ["Rent", "Internet/Phone"] },
    "Medical": { enabled: false, subcategories: [] },
    "Personal": { enabled: true, subcategories: ["Personal Care"] },
    "Recreation": { enabled: true, subcategories: ["Entertainment", "Subscriptions"] },
    "Transportation": { enabled: true, subcategories: ["Taxi/Uber", "Gas"] },
    "Business": { enabled: false, subcategories: [] }
  },
  YOUNG_PROFESSIONAL: {
    "Debt": { enabled: true, subcategories: ["Credit Card"] },
    "Food": { enabled: true, subcategories: ["Groceries", "Restaurants"] },
    "Housing": { enabled: true, subcategories: ["Rent", "Energy Bills", "Internet/Phone"] },
    "Medical": { enabled: true, subcategories: ["Health Insurance"] },
    "Personal": { enabled: true, subcategories: ["Personal Care"] },
    "Recreation": { enabled: true, subcategories: ["Gym Bills", "Entertainment", "Subscriptions"] },
    "Transportation": { enabled: true, subcategories: ["Car Loan", "Car Insurance", "Gas", "Parking"] },
    "Business": { enabled: true, subcategories: ["Business Expenses"] }
  },
  HOMEOWNER: DEFAULT_CATEGORIES, // Use full structure
  RENTER: {
    "Debt": { enabled: true, subcategories: ["Credit Card"] },
    "Food": { enabled: true, subcategories: ["Groceries", "Restaurants"] },
    "Housing": { enabled: true, subcategories: ["Rent", "Energy Bills", "Water Bills", "Internet/Phone", "TV Bills"] },
    "Medical": { enabled: true, subcategories: ["Health Insurance", "Dentist"] },
    "Personal": { enabled: true, subcategories: ["Gifts", "Life Insurance", "Personal Care"] },
    "Recreation": { enabled: true, subcategories: ["Gym Bills", "Entertainment", "Subscriptions", "Vacations"] },
    "Transportation": { enabled: true, subcategories: ["Taxi/Uber", "Car Loan", "Car Insurance", "Gas", "Car Maintenance", "Parking"] },
    "Business": { enabled: true, subcategories: ["Business Expenses"] }
  },
  RETIREE: {
    "Debt": { enabled: false, subcategories: [] },
    "Food": { enabled: true, subcategories: ["Groceries", "Restaurants"] },
    "Housing": { enabled: true, subcategories: ["Mortgage", "Energy Bills", "Water Bills", "Internet/Phone", "TV Bills", "Others"] },
    "Medical": { enabled: true, subcategories: ["Health Insurance", "Dentist"] },
    "Personal": { enabled: true, subcategories: ["Gifts", "Life Insurance", "Personal Care"] },
    "Recreation": { enabled: true, subcategories: ["Entertainment", "Subscriptions", "Vacations"] },
    "Transportation": { enabled: true, subcategories: ["Car Insurance", "Gas", "Car Maintenance"] },
    "Business": { enabled: false, subcategories: [] }
  }
} as const;

// Validation schemas
const CategoryConfigSchema = z.record(
  z.object({
    enabled: z.boolean(),
    subcategories: z.array(z.string())
  })
);

const UserTypeSchema = z.enum(["STUDENT", "YOUNG_PROFESSIONAL", "HOMEOWNER", "RENTER", "RETIREE", "CUSTOM"]);
const PresetUserTypeSchema = z.enum(["STUDENT", "YOUNG_PROFESSIONAL", "HOMEOWNER", "RENTER", "RETIREE"]);
const MigrationPolicySchema = z.enum(["NEW_SHEETS_ONLY", "MIGRATE_ALL", "ASK_EACH_TIME"]);

export const categoryPreferencesRouter = createTRPCRouter({
  // Get user's category preferences or return defaults
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await prisma.userCategoryPreference.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ priority: 'asc' }, { category: { displayName: 'asc' } }]
    });

    if (rows.length === 0) {
      return {
        userType: null,
        categoryConfig: DEFAULT_CATEGORIES,
        migrationPolicy: "NEW_SHEETS_ONLY" as const,
        isDefault: true
      };
    }

    const categoryConfig: Record<string, CategoryConfig> = {};
    for (const row of rows) {
      const mainGroup = row.category.mainGroup;
      // Use enabled flag; subcategories are not persisted, return empty array
      categoryConfig[mainGroup] = categoryConfig[mainGroup] || {
        enabled: true,
        color: DEFAULT_CATEGORIES[mainGroup as keyof typeof DEFAULT_CATEGORIES]?.color || '#666666',
        subcategories: []
      };
    }

    return {
      userType: null,
      categoryConfig,
      migrationPolicy: "NEW_SHEETS_ONLY" as const,
      isDefault: false
    };
  }),

  // Apply a user type preset
  applyUserTypePreset: protectedProcedure
    .input(z.object({
      userType: PresetUserTypeSchema,
      migrationPolicy: MigrationPolicySchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { userType, migrationPolicy = "NEW_SHEETS_ONLY" } = input;

      // Get preset configuration with proper typing
      const presetConfig: UserPresetConfig = USER_TYPE_PRESETS[userType];
      
      if (!presetConfig) {
        throw new Error(`Invalid user type: ${userType}`);
      }
      
      // Merge with default colors
      const categoryConfig: Record<string, CategoryConfig> = {};
      Object.entries(presetConfig).forEach(([category, config]) => {
        categoryConfig[category] = {
          enabled: config.enabled,
          subcategories: [...config.subcategories],
          color: DEFAULT_CATEGORIES[category]?.color || "#666666"
        };
      });

      // Replace user preferences with the preset selection (enabled where preset says enabled)
      await prisma.userCategoryPreference.deleteMany({ where: { userId } });
      // Find categories by name from preset
      const allCategories = await prisma.category.findMany({ where: { isSystemDefault: true } });
      const enabledCategoryNames = Object.entries(presetConfig)
        .filter(([, cfg]) => cfg.enabled)
        .map(([name]) => name);
      const toCreate = allCategories
        .filter(c => enabledCategoryNames.includes(c.mainGroup) || enabledCategoryNames.includes(c.name))
        .map((c, idx) => ({
          userId,
          categoryId: c.id,
          enabled: true,
          priority: idx
        }));
      if (toCreate.length > 0) {
        await prisma.userCategoryPreference.createMany({ data: toCreate });
      }

      return { success: true };
    }),

  // Update custom category configuration
  updateCategories: protectedProcedure
    .input(z.object({
      categoryConfig: CategoryConfigSchema,
      migrationPolicy: MigrationPolicySchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { categoryConfig, migrationPolicy = "NEW_SHEETS_ONLY" } = input;

      // Add colors to category config
      const configWithColors: Record<string, CategoryConfig> = {};
      Object.entries(categoryConfig).forEach(([category, config]) => {
        configWithColors[category] = {
          enabled: config.enabled,
          subcategories: [...config.subcategories],
          color: DEFAULT_CATEGORIES[category]?.color || "#666666"
        };
      });

      // Replace preferences with provided config (enable groups present)
      await prisma.userCategoryPreference.deleteMany({ where: { userId } });
      const allCategories = await prisma.category.findMany({ where: { isSystemDefault: true } });
      const enabledGroups = Object.entries(configWithColors)
        .filter(([, cfg]) => cfg.enabled)
        .map(([group]) => group);
      const toCreate = allCategories
        .filter(c => enabledGroups.includes(c.mainGroup))
        .map((c, idx) => ({ userId, categoryId: c.id, enabled: true, priority: idx }));
      if (toCreate.length > 0) {
        await prisma.userCategoryPreference.createMany({ data: toCreate });
      }
      return { success: true };
    }),

  // Get available user type presets
  getPresets: protectedProcedure.query(async () => {
    return {
      userTypes: Object.keys(USER_TYPE_PRESETS),
      presets: USER_TYPE_PRESETS
    };
  }),

  // Reset to default categories
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Delete existing preferences to use defaults
    await prisma.userCategoryPreference.deleteMany({ where: { userId } });

    return { success: true };
  }),

  // Update migration policy only
  updateMigrationPolicy: protectedProcedure
    .input(z.object({
      migrationPolicy: MigrationPolicySchema
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // No dedicated storage for migration policy; acknowledge request
      return { success: true } as any;
    })
}); 