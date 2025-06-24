import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

// Default category structure
export const DEFAULT_CATEGORIES = {
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
export const USER_TYPE_PRESETS = {
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
const MigrationPolicySchema = z.enum(["NEW_SHEETS_ONLY", "MIGRATE_ALL", "ASK_EACH_TIME"]);

export const categoryPreferencesRouter = createTRPCRouter({
  // Get user's category preferences or return defaults
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const preferences = await prisma.categoryPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Return default configuration
      return {
        userType: null,
        categoryConfig: DEFAULT_CATEGORIES,
        migrationPolicy: "NEW_SHEETS_ONLY" as const,
        isDefault: true
      };
    }

    return {
      id: preferences.id,
      userType: preferences.userType,
      categoryConfig: preferences.categoryConfig as any,
      migrationPolicy: preferences.migrationPolicy,
      effectiveDate: preferences.effectiveDate,
      lastMigrationAt: preferences.lastMigrationAt,
      backupCreated: preferences.backupCreated,
      isDefault: false
    };
  }),

  // Apply a user type preset
  applyUserTypePreset: protectedProcedure
    .input(z.object({
      userType: UserTypeSchema,
      migrationPolicy: MigrationPolicySchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { userType, migrationPolicy = "NEW_SHEETS_ONLY" } = input;

      // Get preset configuration
      const presetConfig = USER_TYPE_PRESETS[userType];
      
      // Merge with default colors
      const categoryConfig: any = {};
      Object.entries(presetConfig).forEach(([category, config]) => {
        categoryConfig[category] = {
          ...config,
          color: DEFAULT_CATEGORIES[category as keyof typeof DEFAULT_CATEGORIES]?.color || "#666666"
        };
      });

      // Upsert preferences
      const preferences = await prisma.categoryPreferences.upsert({
        where: { userId },
        create: {
          userId,
          userType,
          categoryConfig,
          migrationPolicy,
          version: 1
        },
        update: {
          userType,
          categoryConfig,
          migrationPolicy,
          effectiveDate: new Date(),
          version: { increment: 1 }
        }
      });

      return preferences;
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
      const configWithColors: any = {};
      Object.entries(categoryConfig).forEach(([category, config]) => {
        configWithColors[category] = {
          ...config,
          color: DEFAULT_CATEGORIES[category as keyof typeof DEFAULT_CATEGORIES]?.color || "#666666"
        };
      });

      const preferences = await prisma.categoryPreferences.upsert({
        where: { userId },
        create: {
          userId,
          userType: "CUSTOM",
          categoryConfig: configWithColors,
          migrationPolicy,
          version: 1
        },
        update: {
          userType: "CUSTOM",
          categoryConfig: configWithColors,
          migrationPolicy,
          effectiveDate: new Date(),
          version: { increment: 1 }
        }
      });

      return preferences;
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
    await prisma.categoryPreferences.deleteMany({
      where: { userId }
    });

    return { success: true };
  }),

  // Update migration policy only
  updateMigrationPolicy: protectedProcedure
    .input(z.object({
      migrationPolicy: MigrationPolicySchema
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const preferences = await prisma.categoryPreferences.update({
        where: { userId },
        data: {
          migrationPolicy: input.migrationPolicy
        }
      });

      return preferences;
    })
}); 