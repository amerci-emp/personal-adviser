import { PrismaClient } from '@prisma/client';
import { SpendingPatterns, UserTypeResult } from './user-type-detection-service';

export interface CategoryRecommendation {
  categoryId: string;
  categoryName: string;
  displayName: string;
  mainGroup: string;
  direction: string;
  isRecommended: boolean;
  confidence: number;
  reasoning: string;
  suggestedBudget?: number;
  historicalSpending?: number;
}

export interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  reasoning: string;
  historicalAverage: number;
  confidence: number;
}

export interface CategorySuggestion {
  categoryName: string;
  displayName: string;
  mainGroup: string;
  reasoning: string;
  confidence: number;
  transactionCount: number;
}

export class CategoryRecommendationEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Recommend categories based on detected user type and spending patterns
   */
  async recommendCategories(
    userId: string, 
    userTypeAnalysis: UserTypeResult
  ): Promise<CategoryRecommendation[]> {
    console.log(`💡 Generating category recommendations for ${userTypeAnalysis.detectedType}...`);
    console.log(`📊 User analysis details:`, {
      detectedType: userTypeAnalysis.detectedType,
      confidence: userTypeAnalysis.confidence,
      monthsAnalyzed: userTypeAnalysis.monthsAnalyzed,
      totalTransactions: userTypeAnalysis.totalTransactions,
      spendingPatternsKeys: Object.keys(userTypeAnalysis.spendingPatterns)
    });

    // Get all available categories
    const allCategories = await this.prisma.category.findMany({
      where: { isSystemDefault: true },
      orderBy: [
        { direction: 'asc' },
        { mainGroup: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Get user type preset recommendations from database
    const userTypePresets = await this.prisma.userTypePreset.findMany({
      where: { 
        userType: userTypeAnalysis.detectedType,
        isDefault: true 
      },
      include: {
        category: true
      },
      orderBy: {
        priority: 'asc'
      }
    });
    
    const presetCategories = userTypePresets.map(preset => preset.category.name);
    console.log(`🎯 Preset categories for ${userTypeAnalysis.detectedType}:`, presetCategories);

    // Analyze user's historical spending to find additional relevant categories
    const historicalCategories = this.analyzeHistoricalCategoryUsage(userTypeAnalysis.spendingPatterns);
    console.log(`📈 Historical category usage:`, Object.keys(historicalCategories));

    const recommendations: CategoryRecommendation[] = [];

    for (const category of allCategories) {
      const isPresetRecommended = presetCategories.includes(category.name);
      const historicalUsage = historicalCategories[category.name];
      
      let isRecommended = false;
      let confidence = 0;
      let reasoning = '';
      let suggestedBudget: number | undefined;

      if (isPresetRecommended) {
        isRecommended = true;
        confidence += 60;
        reasoning = `Recommended for ${userTypeAnalysis.detectedType}`;
      }

      if (historicalUsage) {
        isRecommended = true;
        confidence += Math.min(historicalUsage.confidence, 40);
        reasoning += reasoning ? ` and historical usage (${historicalUsage.transactionCount} transactions)` 
                               : `Historical usage (${historicalUsage.transactionCount} transactions)`;
        suggestedBudget = historicalUsage.averageMonthly;
      }

      // Boost confidence if category aligns with spending patterns
      const patternBoost = this.calculatePatternAlignment(category, userTypeAnalysis.spendingPatterns);
      confidence += patternBoost;

      if (patternBoost > 10) {
        reasoning += reasoning ? ` and spending pattern alignment` : `Spending pattern alignment`;
      }

      recommendations.push({
        categoryId: category.id,
        categoryName: category.name,
        displayName: category.displayName,
        mainGroup: category.mainGroup,
        direction: category.direction,
        isRecommended,
        confidence: Math.min(confidence, 95),
        reasoning,
        suggestedBudget,
        historicalSpending: historicalUsage?.averageMonthly
      });
    }

    // Sort by confidence and recommendation status
    const sortedRecommendations = recommendations.sort((a, b) => {
      if (a.isRecommended !== b.isRecommended) {
        return a.isRecommended ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });

    const recommendedCount = sortedRecommendations.filter(r => r.isRecommended).length;
    console.log(`✅ Generated ${sortedRecommendations.length} category recommendations (${recommendedCount} recommended)`);
    console.log(`🔍 Top 5 recommended categories:`, 
      sortedRecommendations
        .filter(r => r.isRecommended)
        .slice(0, 5)
        .map(r => ({ name: r.displayName, confidence: r.confidence, reasoning: r.reasoning }))
    );

    return sortedRecommendations;
  }

  /**
   * Generate budget suggestions based on historical spending
   */
  async suggestBudgets(
    userId: string, 
    selectedCategoryIds: string[], 
    spendingPatterns: SpendingPatterns
  ): Promise<BudgetSuggestion[]> {
    console.log(`💰 Generating budget suggestions for ${selectedCategoryIds.length} categories...`);
    console.log(`💰 Selected category IDs:`, selectedCategoryIds);
    console.log(`💰 SpendingPatterns summary:`, {
      monthsAnalyzed: spendingPatterns.monthsAnalyzed,
      totalTransactions: spendingPatterns.totalTransactions,
      categoryDistributionCount: Object.keys(spendingPatterns.categoryDistribution).length,
      categoryDistributionKeys: Object.keys(spendingPatterns.categoryDistribution)
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: selectedCategoryIds } }
    });
    console.log(`💰 Found ${categories.length} categories for budget suggestions`);
    console.log(`💰 Category details:`, categories.map(c => ({ 
      id: c.id, 
      name: c.name, 
      displayName: c.displayName, 
      mainGroup: c.mainGroup 
    })));

    const budgetSuggestions: BudgetSuggestion[] = [];

    for (const category of categories) {
      const suggestion = this.calculateBudgetSuggestion(category, spendingPatterns);
      if (suggestion) {
        console.log(`💰 Budget suggestion for ${category.displayName}: $${suggestion.suggestedAmount}`);
        budgetSuggestions.push(suggestion);
      } else {
        console.log(`💰 No budget suggestion generated for ${category.displayName}`);
      }
    }

    const sortedSuggestions = budgetSuggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
    console.log(`✅ Generated ${sortedSuggestions.length} budget suggestions`);
    
    return sortedSuggestions;
  }

  /**
   * Map Plaid categories to user's enabled categories
   */
  async mapPlaidCategory(
    plaidCategory: string, 
    userId: string
  ): Promise<string | null> {
    // Get user's enabled categories
    const userCategories = await this.prisma.userCategoryPreference.findMany({
      where: { 
        userId, 
        enabled: true 
      },
      include: { category: true }
    });

    // Simple mapping rules (can be enhanced with ML later)
    const mappingRules: Record<string, string[]> = {
      'FOOD_AND_DRINK_GROCERIES': ['GROCERY', 'SUPERMARKET', 'FOOD_GROCERY'],
      'FOOD_AND_DRINK_RESTAURANTS': ['RESTAURANT', 'DINING', 'FAST_FOOD'],
      'TRANSPORTATION_GAS': ['GAS', 'FUEL', 'GASOLINE'],
      'TRANSPORTATION_TAXI_RIDESHARE': ['UBER', 'LYFT', 'TAXI', 'RIDESHARE'],
      'LOAN_PAYMENTS_CREDIT_CARD': ['CREDIT_CARD', 'CREDIT CARD PAYMENT'],
      'MEDICAL_PHARMACY': ['PHARMACY', 'CVS', 'WALGREENS'],
      'ENTERTAINMENT_MUSIC_STREAMING': ['SPOTIFY', 'APPLE MUSIC', 'STREAMING']
    };

    // Try direct mapping first
    for (const userPref of userCategories) {
      if (userPref.category.name === plaidCategory) {
        return userPref.category.name;
      }
    }

    // Try pattern matching
    const plaidUpper = plaidCategory.toUpperCase();
    for (const userPref of userCategories) {
      const rules = mappingRules[userPref.category.name] || [];
      for (const rule of rules) {
        if (plaidUpper.includes(rule)) {
          return userPref.category.name;
        }
      }
    }

    // Try fuzzy matching by main group
    const plaidMainGroup = this.extractMainGroupFromPlaidCategory(plaidCategory);
    if (plaidMainGroup) {
      const matchingCategory = userCategories.find(pref => 
        pref.category.mainGroup === plaidMainGroup
      );
      if (matchingCategory) {
        return matchingCategory.category.name;
      }
    }

    return null; // No mapping found
  }

  /**
   * Suggest new categories based on unmapped transactions
   */
  async suggestNewCategories(
    unmappedTransactions: any[], 
    userId: string
  ): Promise<CategorySuggestion[]> {
    if (unmappedTransactions.length === 0) return [];

    // Analyze patterns in unmapped transactions
    const merchantPatterns: Record<string, number> = {};
    const descriptionPatterns: Record<string, number> = {};

    for (const transaction of unmappedTransactions) {
      const merchant = (transaction.merchantName || transaction.description || '').toUpperCase();
      merchantPatterns[merchant] = (merchantPatterns[merchant] || 0) + 1;
      
      // Extract keywords from descriptions
      const words = merchant.split(/\s+/).filter(word => word.length > 3);
      for (const word of words) {
        descriptionPatterns[word] = (descriptionPatterns[word] || 0) + 1;
      }
    }

    // Get user's current categories to avoid duplicates
    const userCategories = await this.prisma.userCategoryPreference.findMany({
      where: { userId, enabled: true },
      include: { category: true }
    });

    const enabledCategoryNames = new Set(userCategories.map(pref => pref.category.name));

    // Get all available categories
    const allCategories = await this.prisma.category.findMany({
      where: { isSystemDefault: true }
    });

    const suggestions: CategorySuggestion[] = [];

    // Suggest categories based on merchant/description patterns
    for (const category of allCategories) {
      if (enabledCategoryNames.has(category.name)) continue;

      let confidence = 0;
      let transactionCount = 0;
      const reasons: string[] = [];

      // Check if category keywords appear in transaction data
      const categoryKeywords = this.getCategoryKeywords(category.name);
      
      for (const keyword of categoryKeywords) {
        const merchantMatches = Object.entries(merchantPatterns)
          .filter(([merchant]) => merchant.includes(keyword.toUpperCase()))
          .reduce((sum, [, count]) => sum + count, 0);
        
        const descriptionMatches = descriptionPatterns[keyword.toUpperCase()] || 0;
        
        const totalMatches = merchantMatches + descriptionMatches;
        if (totalMatches > 0) {
          confidence += Math.min(totalMatches * 10, 30);
          transactionCount += totalMatches;
          reasons.push(`${totalMatches} transactions match "${keyword}"`);
        }
      }

      if (confidence > 20 && transactionCount >= 2) {
        suggestions.push({
          categoryName: category.name,
          displayName: category.displayName,
          mainGroup: category.mainGroup,
          reasoning: reasons.join(', '),
          confidence: Math.min(confidence, 80),
          transactionCount
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Analyze historical category usage from spending patterns
   */
  private analyzeHistoricalCategoryUsage(spendingPatterns: SpendingPatterns): Record<string, {
    averageMonthly: number;
    transactionCount: number;
    confidence: number;
  }> {
    const results: Record<string, any> = {};

    for (const [category, data] of Object.entries(spendingPatterns.categoryDistribution)) {
      if (data.transactionCount >= 2) {
        results[category] = {
          averageMonthly: data.totalAmount / spendingPatterns.monthsAnalyzed,
          transactionCount: data.transactionCount,
          confidence: Math.min(data.transactionCount * 5, 40)
        };
      }
    }

    return results;
  }

  /**
   * Calculate how well a category aligns with spending patterns
   */
  private calculatePatternAlignment(category: any, spendingPatterns: SpendingPatterns): number {
    // Check if category appears in historical spending
    const categoryData = spendingPatterns.categoryDistribution[category.name];
    if (categoryData && categoryData.transactionCount > 0) {
      return Math.min(categoryData.percentage * 2, 25);
    }

    // Check main group alignment
    const mainGroupSpending = Object.entries(spendingPatterns.categoryDistribution)
      .filter(([cat]) => cat.startsWith(category.mainGroup))
      .reduce((sum, [, data]) => sum + data.percentage, 0);

    if (mainGroupSpending > 5) {
      return Math.min(mainGroupSpending, 15);
    }

    return 0;
  }

  /**
   * Calculate budget suggestion for a specific category
   */
  private calculateBudgetSuggestion(
    category: any, 
    spendingPatterns: SpendingPatterns
  ): BudgetSuggestion | null {
    console.log(`💰 [calculateBudgetSuggestion] Processing category: ${category.name} (${category.displayName})`);
    console.log(`💰 [calculateBudgetSuggestion] Available categoryDistribution keys:`, Object.keys(spendingPatterns.categoryDistribution));
    
    const categoryData = spendingPatterns.categoryDistribution[category.name];
    console.log(`💰 [calculateBudgetSuggestion] Direct lookup result for "${category.name}":`, categoryData);
    
    // Try alternative lookups if direct match fails
    let actualCategoryData = categoryData;
    let lookupMethod = 'direct';
    
    if (!categoryData || categoryData.transactionCount === 0) {
      console.log(`💰 [calculateBudgetSuggestion] Direct lookup failed, trying alternative matches...`);
      
      // Try mapping from display name or related Plaid categories
      const alternativeKeys = Object.keys(spendingPatterns.categoryDistribution).filter(key => {
        const keyLower = key.toLowerCase();
        const categoryLower = category.name.toLowerCase();
        const displayNameLower = (category.displayName || '').toLowerCase();
        
        return keyLower.includes(categoryLower) || 
               keyLower.includes(displayNameLower) ||
               categoryLower.includes(keyLower) ||
               displayNameLower.includes(keyLower);
      });
      
      console.log(`💰 [calculateBudgetSuggestion] Alternative key candidates:`, alternativeKeys);
      
      if (alternativeKeys.length > 0) {
        actualCategoryData = spendingPatterns.categoryDistribution[alternativeKeys[0]];
        lookupMethod = `alternative (${alternativeKeys[0]})`;
        console.log(`💰 [calculateBudgetSuggestion] Using alternative key "${alternativeKeys[0]}":`, actualCategoryData);
      }
    }
    
    if (!actualCategoryData || actualCategoryData.transactionCount === 0) {
      console.log(`💰 [calculateBudgetSuggestion] No transaction data found, trying group average...`);
      // Use category group average if specific category has no data
      const groupAverage = this.calculateGroupAverage(category.mainGroup, spendingPatterns);
      console.log(`💰 [calculateBudgetSuggestion] Group average for "${category.mainGroup}": ${groupAverage}`);
      
      if (groupAverage > 0) {
        const suggestion = {
          categoryId: category.id,
          categoryName: category.name,
          suggestedAmount: Math.round(groupAverage * 0.3), // Conservative estimate
          reasoning: `Based on similar category spending patterns`,
          historicalAverage: 0,
          confidence: 30
        };
        console.log(`💰 [calculateBudgetSuggestion] Generated group-based suggestion:`, suggestion);
        return suggestion;
      }
      console.log(`💰 [calculateBudgetSuggestion] No group average available, returning null`);
      return null;
    }

    console.log(`💰 [calculateBudgetSuggestion] Found transaction data via ${lookupMethod}:`, {
      totalAmount: actualCategoryData.totalAmount,
      transactionCount: actualCategoryData.transactionCount,
      monthsAnalyzed: spendingPatterns.monthsAnalyzed
    });

    const monthlyAverage = actualCategoryData.totalAmount / spendingPatterns.monthsAnalyzed;
    console.log(`💰 [calculateBudgetSuggestion] Monthly average: $${monthlyAverage.toFixed(2)}`);
    
    // Add 10% buffer for budget planning
    const suggestedAmount = Math.round(monthlyAverage * 1.1);
    console.log(`💰 [calculateBudgetSuggestion] Suggested amount (with 10% buffer): $${suggestedAmount}`);
    
    const confidence = Math.min(
      (actualCategoryData.transactionCount * 10) + 
      Math.min(spendingPatterns.monthsAnalyzed * 5, 20),
      90
    );
    console.log(`💰 [calculateBudgetSuggestion] Confidence calculation: ${confidence}%`);

    const suggestion = {
      categoryId: category.id,
      categoryName: category.name,
      suggestedAmount,
      reasoning: `Based on ${actualCategoryData.transactionCount} transactions over ${spendingPatterns.monthsAnalyzed} months (via ${lookupMethod})`,
      historicalAverage: Math.round(monthlyAverage),
      confidence
    };
    
    console.log(`💰 [calculateBudgetSuggestion] Final suggestion for ${category.name}:`, suggestion);
    return suggestion;
  }

  private calculateGroupAverage(mainGroup: string, spendingPatterns: SpendingPatterns): number {
    const groupCategories = Object.entries(spendingPatterns.categoryDistribution)
      .filter(([cat]) => cat.startsWith(mainGroup));

    if (groupCategories.length === 0) return 0;

    const totalAmount = groupCategories.reduce((sum, [, data]) => sum + data.totalAmount, 0);
    return totalAmount / spendingPatterns.monthsAnalyzed;
  }

  private extractMainGroupFromPlaidCategory(plaidCategory: string): string | null {
    const plaidUpper = plaidCategory.toUpperCase();
    
    if (plaidUpper.includes('FOOD') || plaidUpper.includes('RESTAURANT') || plaidUpper.includes('GROCERY')) {
      return 'FOOD';
    }
    if (plaidUpper.includes('TRANSPORT') || plaidUpper.includes('GAS') || plaidUpper.includes('VEHICLE')) {
      return 'TRANSPORTATION';
    }
    if (plaidUpper.includes('MEDICAL') || plaidUpper.includes('HEALTH') || plaidUpper.includes('PHARMACY')) {
      return 'MEDICAL';
    }
    if (plaidUpper.includes('RENT') || plaidUpper.includes('HOUSING') || plaidUpper.includes('UTILITIES')) {
      return 'HOUSING';
    }
    if (plaidUpper.includes('LOAN') || plaidUpper.includes('CREDIT') || plaidUpper.includes('PAYMENT')) {
      return 'DEBT';
    }
    if (plaidUpper.includes('ENTERTAINMENT') || plaidUpper.includes('RECREATION') || plaidUpper.includes('TRAVEL')) {
      return 'RECREATION';
    }
    if (plaidUpper.includes('PERSONAL') || plaidUpper.includes('CARE') || plaidUpper.includes('CLOTHING')) {
      return 'PERSONAL';
    }

    return null;
  }

  private getCategoryKeywords(categoryName: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'FOOD_AND_DRINK_GROCERIES': ['GROCERY', 'SUPERMARKET', 'WALMART', 'TARGET', 'COSTCO'],
      'FOOD_AND_DRINK_RESTAURANTS': ['RESTAURANT', 'DINING', 'FOOD', 'PIZZA', 'BURGER'],
      'FOOD_AND_DRINK_COFFEE': ['STARBUCKS', 'COFFEE', 'CAFE', 'DUNKIN'],
      'TRANSPORTATION_GAS': ['GAS', 'FUEL', 'SHELL', 'EXXON', 'BP'],
      'TRANSPORTATION_TAXI_RIDESHARE': ['UBER', 'LYFT', 'TAXI', 'RIDESHARE'],
      'MEDICAL_PHARMACY': ['PHARMACY', 'CVS', 'WALGREENS', 'RITE AID'],
      'ENTERTAINMENT_MUSIC_STREAMING': ['SPOTIFY', 'APPLE MUSIC', 'PANDORA'],
      'PERSONAL_CARE_GYMS_FITNESS': ['GYM', 'FITNESS', 'PLANET FITNESS'],
      'RENT_AND_UTILITIES': ['RENT', 'ELECTRIC', 'WATER', 'INTERNET']
    };

    return keywordMap[categoryName] || [];
  }

  /**
   * Store spending analysis results in database
   */
  async storeSpendingAnalysis(
    userId: string, 
    categoryId: string, 
    analysis: {
      period: string;
      averageMonthly: number;
      totalAmount: number;
      transactionCount: number;
      suggestedBudget: number;
    }
  ): Promise<void> {
    await this.prisma.spendingAnalysis.upsert({
      where: { 
        userId_categoryId_period: {
          userId,
          categoryId,
          period: analysis.period
        }
      },
      update: {
        averageMonthly: analysis.averageMonthly,
        totalAmount: analysis.totalAmount,
        transactionCount: analysis.transactionCount,
        suggestedBudget: analysis.suggestedBudget,
        analysisDate: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        categoryId,
        period: analysis.period,
        averageMonthly: analysis.averageMonthly,
        totalAmount: analysis.totalAmount,
        transactionCount: analysis.transactionCount,
        suggestedBudget: analysis.suggestedBudget,
        analysisDate: new Date()
      }
    });
  }
}