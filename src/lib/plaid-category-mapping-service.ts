import { PrismaClient } from "@prisma/client";

export interface PlaidCategoryMapping {
  ourCategory: string;
  confidence: number;
  matchType: 'exact' | 'keyword' | 'fallback';
}

export class PlaidCategoryMappingService {
  private static instance: PlaidCategoryMappingService;
  private prisma: PrismaClient;
  private categoryCache: Map<string, any[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): PlaidCategoryMappingService {
    if (!PlaidCategoryMappingService.instance) {
      PlaidCategoryMappingService.instance = new PlaidCategoryMappingService();
    }
    return PlaidCategoryMappingService.instance;
  }

  /**
   * Map a Plaid category to our internal category system
   * @param plaidPrimary - Primary Plaid category (e.g., "FOOD_AND_DRINK")
   * @param plaidDetailed - Detailed Plaid category (e.g., "FOOD_AND_DRINK_COFFEE")
   * @param merchantName - Optional merchant name for keyword matching
   * @param description - Optional transaction description for keyword matching
   * @returns Our mapped category name or 'uncategorized'
   */
  async mapPlaidCategory(
    plaidPrimary: string,
    plaidDetailed?: string,
    merchantName?: string,
    description?: string
  ): Promise<PlaidCategoryMapping> {
    console.log(`🔍 [PlaidMapping] Mapping: Primary="${plaidPrimary}", Detailed="${plaidDetailed}", Merchant="${merchantName}"`);

    // Get all categories with mappings (use cache for performance)
    const categories = await this.getCategoriesWithMappings();

    // 1. Try exact match on detailed category first (highest confidence)
    if (plaidDetailed) {
      const exactMatch = categories.find(cat => 
        cat.plaidCategories.includes(plaidDetailed)
      );
      if (exactMatch) {
        console.log(`✅ [PlaidMapping] Exact detailed match: ${plaidDetailed} → ${exactMatch.name}`);
        return {
          ourCategory: exactMatch.name,
          confidence: 95,
          matchType: 'exact'
        };
      }
    }

    // 2. Try exact match on primary category (high confidence)
    const primaryMatch = categories.find(cat => 
      cat.plaidCategories.includes(plaidPrimary)
    );
    if (primaryMatch) {
      console.log(`✅ [PlaidMapping] Exact primary match: ${plaidPrimary} → ${primaryMatch.name}`);
      return {
        ourCategory: primaryMatch.name,
        confidence: 85,
        matchType: 'exact'
      };
    }

    // 3. Try keyword matching using merchant name and description
    const searchText = `${merchantName || ''} ${description || ''}`.toLowerCase();
    if (searchText.trim()) {
      const keywordMatch = categories.find(cat => {
        return cat.plaidKeywords.some((keyword: string) => 
          searchText.includes(keyword.toLowerCase())
        );
      });
      
      if (keywordMatch) {
        console.log(`🎯 [PlaidMapping] Keyword match: "${searchText}" → ${keywordMatch.name}`);
        return {
          ourCategory: keywordMatch.name,
          confidence: 70,
          matchType: 'keyword'
        };
      }
    }

    // 4. Fallback to uncategorized
    console.log(`❌ [PlaidMapping] No match found for: ${plaidPrimary}/${plaidDetailed} → uncategorized`);
    return {
      ourCategory: 'uncategorized',
      confidence: 0,
      matchType: 'fallback'
    };
  }

  /**
   * Batch map multiple transactions
   */
  async batchMapCategories(transactions: Array<{
    plaidPrimary: string;
    plaidDetailed?: string;
    merchantName?: string;
    description?: string;
  }>): Promise<PlaidCategoryMapping[]> {
    console.log(`🔄 [PlaidMapping] Batch mapping ${transactions.length} transactions`);
    
    const results = [];
    for (const transaction of transactions) {
      const mapping = await this.mapPlaidCategory(
        transaction.plaidPrimary,
        transaction.plaidDetailed,
        transaction.merchantName,
        transaction.description
      );
      results.push(mapping);
    }

    // Log batch results summary
    const exactMatches = results.filter(r => r.matchType === 'exact').length;
    const keywordMatches = results.filter(r => r.matchType === 'keyword').length;
    const fallbacks = results.filter(r => r.matchType === 'fallback').length;
    
    console.log(`📊 [PlaidMapping] Batch results: ${exactMatches} exact, ${keywordMatches} keyword, ${fallbacks} uncategorized`);
    
    return results;
  }

  /**
   * Get all categories with their Plaid mappings (cached for performance)
   */
  private async getCategoriesWithMappings(): Promise<any[]> {
    const cacheKey = 'categories_with_mappings';
    
    if (this.categoryCache.has(cacheKey)) {
      return this.categoryCache.get(cacheKey)!;
    }

    const categories = await this.prisma.category.findMany({
      where: { 
        isSystemDefault: true,
        // Only get categories that have Plaid mappings
        plaidCategories: {
          isEmpty: false
        }
      },
      select: {
        name: true,
        displayName: true,
        plaidCategories: true,
        plaidKeywords: true,
        mainGroup: true
      }
    });

    // Cache for 5 minutes
    this.categoryCache.set(cacheKey, categories);
    setTimeout(() => {
      this.categoryCache.delete(cacheKey);
    }, 5 * 60 * 1000);

    console.log(`📚 [PlaidMapping] Loaded ${categories.length} categories with Plaid mappings`);
    return categories;
  }

  /**
   * Get mapping statistics for monitoring
   */
  async getMappingStats(): Promise<{
    totalCategories: number;
    categoriesWithMappings: number;
    totalPlaidMappings: number;
    totalKeywords: number;
  }> {
    const categories = await this.getCategoriesWithMappings();
    
    const totalPlaidMappings = categories.reduce((sum, cat) => 
      sum + cat.plaidCategories.length, 0
    );
    
    const totalKeywords = categories.reduce((sum, cat) => 
      sum + cat.plaidKeywords.length, 0
    );
    
    return {
      totalCategories: categories.length,
      categoriesWithMappings: categories.length,
      totalPlaidMappings,
      totalKeywords
    };
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const plaidMappingService = PlaidCategoryMappingService.getInstance();