import { PrismaClient, Transaction } from '@prisma/client';
import { subMonths, isAfter } from 'date-fns';

export interface SpendingPatterns {
  totalTransactions: number;
  monthsAnalyzed: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  categoryDistribution: Record<string, {
    totalAmount: number;
    transactionCount: number;
    percentage: number;
  }>;
  merchantPatterns: Record<string, number>;
  transactionTiming: {
    weekdayPercentage: number;
    weekendPercentage: number;
    businessHoursPercentage: number;
  };
  amountDistribution: {
    smallTransactions: number; // < $50
    mediumTransactions: number; // $50-$500
    largeTransactions: number; // > $500
  };
}

export interface UserTypeResult {
  detectedType: string;
  confidence: number;
  reasoning: string[];
  spendingPatterns: SpendingPatterns;
  monthsAnalyzed: number;
  totalTransactions: number;
}

interface UserTypeProfile {
  name: string;
  indicators: {
    merchantPatterns: string[];
    categoryDistribution: Record<string, { min: number; max: number }>;
    incomePatterns: string[];
    specialIndicators: ((patterns: SpendingPatterns) => number)[];
  };
}

export class UserTypeDetectionService {
  private prisma: PrismaClient;

  // User type profiles for detection
  private readonly USER_TYPE_PROFILES: Record<string, UserTypeProfile> = {
    COLLEGE_STUDENT: {
      name: 'College Student',
      indicators: {
        merchantPatterns: [
          'CAMPUS', 'DINING', 'BOOKSTORE', 'LIBRARY', 'STUDENT', 'DORM',
          'CAFETERIA', 'SUBWAY', 'PIZZA', 'STARBUCKS', 'AMAZON', 'TEXTBOOK'
        ],
        categoryDistribution: {
          'FOOD': { min: 25, max: 40 },
          'TRANSPORTATION': { min: 5, max: 15 },
          'DEBT': { min: 0, max: 30 }, // Student loans
          'RECREATION': { min: 15, max: 35 }
        },
        incomePatterns: ['PART_TIME', 'IRREGULAR', 'FAMILY_SUPPORT'],
        specialIndicators: [
          (patterns) => {
            // High fast food/coffee percentage
            const fastFoodSpending = (patterns.categoryDistribution['FOOD_AND_DRINK_FAST_FOOD']?.percentage || 0) +
                                   (patterns.categoryDistribution['FOOD_AND_DRINK_COFFEE']?.percentage || 0);
            return fastFoodSpending > 15 ? 30 : 0;
          },
          (patterns) => {
            // Low average transaction amounts
            const avgTransaction = patterns.averageMonthlyExpenses / patterns.totalTransactions;
            return avgTransaction < 75 ? 25 : 0;
          }
        ]
      }
    },
    YOUNG_PROFESSIONAL: {
      name: 'Young Professional',
      indicators: {
        merchantPatterns: [
          'STARBUCKS', 'UBER', 'LYFT', 'GRUBHUB', 'DOORDASH', 'SPOTIFY',
          'NETFLIX', 'GYM', 'FITNESS', 'BAR', 'RESTAURANT', 'RETAIL'
        ],
        categoryDistribution: {
          'HOUSING': { min: 25, max: 40 },
          'FOOD': { min: 15, max: 25 },
          'TRANSPORTATION': { min: 10, max: 20 },
          'RECREATION': { min: 10, max: 25 }
        },
        incomePatterns: ['REGULAR_SALARY', 'STABLE'],
        specialIndicators: [
          (patterns) => {
            // Regular income pattern
            return patterns.averageMonthlyIncome > 3000 ? 25 : 0;
          },
          (patterns) => {
            // High ride-share usage
            const rideshareSpending = patterns.categoryDistribution['TRANSPORTATION_TAXI_RIDESHARE']?.percentage || 0;
            return rideshareSpending > 5 ? 20 : 0;
          }
        ]
      }
    },
    FAMILY: {
      name: 'Family',
      indicators: {
        merchantPatterns: [
          'WALMART', 'TARGET', 'COSTCO', 'GROCERY', 'DAYCARE', 'SCHOOL',
          'PEDIATRIC', 'KIDS', 'CHILDREN', 'FAMILY', 'PHARMACY', 'HOSPITAL'
        ],
        categoryDistribution: {
          'FOOD': { min: 20, max: 35 },
          'HOUSING': { min: 30, max: 50 },
          'MEDICAL': { min: 5, max: 15 },
          'RECREATION': { min: 5, max: 15 }
        },
        incomePatterns: ['DUAL_INCOME', 'STABLE', 'FAMILY_BENEFITS'],
        specialIndicators: [
          (patterns) => {
            // High grocery spending
            const grocerySpending = patterns.categoryDistribution['FOOD_AND_DRINK_GROCERIES']?.percentage || 0;
            return grocerySpending > 15 ? 30 : 0;
          },
          (patterns) => {
            // Medical expenses present
            const medicalSpending = patterns.categoryDistribution['MEDICAL']?.percentage || 0;
            return medicalSpending > 3 ? 25 : 0;
          }
        ]
      }
    },
    RETIREE: {
      name: 'Retiree',
      indicators: {
        merchantPatterns: [
          'PHARMACY', 'MEDICAL', 'DOCTOR', 'HOSPITAL', 'SOCIAL SECURITY',
          'MEDICARE', 'CRUISE', 'TRAVEL', 'SENIOR', 'RETIREMENT'
        ],
        categoryDistribution: {
          'MEDICAL': { min: 10, max: 30 },
          'HOUSING': { min: 20, max: 40 },
          'TRANSPORTATION': { min: 5, max: 15 },
          'RECREATION': { min: 10, max: 25 }
        },
        incomePatterns: ['PENSION', 'SOCIAL_SECURITY', 'FIXED_INCOME'],
        specialIndicators: [
          (patterns) => {
            // High medical spending
            const medicalSpending = patterns.categoryDistribution['MEDICAL']?.percentage || 0;
            return medicalSpending > 8 ? 35 : 0;
          },
          (patterns) => {
            // Lower total transaction count
            return patterns.totalTransactions < 50 ? 20 : 0;
          }
        ]
      }
    },
    FREELANCER: {
      name: 'Freelancer',
      indicators: {
        merchantPatterns: [
          'COFFEE', 'COWORKING', 'OFFICE', 'SUPPLIES', 'SOFTWARE',
          'SUBSCRIPTION', 'INTERNET', 'PHONE', 'COMPUTER', 'EQUIPMENT'
        ],
        categoryDistribution: {
          'FOOD': { min: 15, max: 30 }, // Lots of coffee/meals out
          'PERSONAL': { min: 10, max: 25 }, // Equipment/supplies
          'TRANSPORTATION': { min: 5, max: 20 }
        },
        incomePatterns: ['IRREGULAR', 'PROJECT_BASED', 'VARIABLE'],
        specialIndicators: [
          (patterns) => {
            // High coffee/dining out spending
            const coffeeSpending = patterns.categoryDistribution['FOOD_AND_DRINK_COFFEE']?.percentage || 0;
            return coffeeSpending > 5 ? 25 : 0;
          },
          (patterns) => {
            // Income variability (would need to check transaction patterns)
            return patterns.averageMonthlyIncome > 0 && patterns.averageMonthlyIncome < 5000 ? 15 : 0;
          }
        ]
      }
    }
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyze user's transaction patterns to detect their user type
   */
  async detectUserType(userId: string, minMonths: number = 6): Promise<UserTypeResult> {
    console.log(`🔍 Analyzing user type for ${userId}...`);

    // Get transactions from the last minMonths
    const cutoffDate = subMonths(new Date(), minMonths);
    
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: cutoffDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (transactions.length < 10) {
      return {
        detectedType: 'UNKNOWN',
        confidence: 0,
        reasoning: ['Insufficient transaction data for analysis'],
        spendingPatterns: this.getEmptySpendingPatterns(),
        monthsAnalyzed: 0,
        totalTransactions: transactions.length
      };
    }

    // Analyze spending patterns
    const spendingPatterns = await this.analyzeSpendingPatterns(transactions);
    
    // Calculate confidence scores for each user type
    const typeScores = this.calculateTypeScores(spendingPatterns);
    
    // Get the highest scoring type
    const bestMatch = Object.entries(typeScores)
      .sort(([,a], [,b]) => b.score - a.score)[0];

    const [detectedType, result] = bestMatch;
    
    return {
      detectedType,
      confidence: Math.min(result.score, 95), // Cap at 95%
      reasoning: result.reasoning,
      spendingPatterns,
      monthsAnalyzed: this.calculateMonthsAnalyzed(transactions),
      totalTransactions: transactions.length
    };
  }

  /**
   * Analyze spending patterns from transactions
   */
  async analyzeSpendingPatterns(transactions: Transaction[]): Promise<SpendingPatterns> {
    const totalTransactions = transactions.length;
    const monthsAnalyzed = this.calculateMonthsAnalyzed(transactions);

    // Calculate income vs expenses
    const income = transactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = Math.abs(transactions
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Number(t.amount), 0));

    // Analyze category distribution
    const categoryDistribution: Record<string, any> = {};
    
    // Group by category (using assignedCategory or category)
    for (const transaction of transactions) {
      const category = transaction.assignedCategory || transaction.category || 'UNKNOWN';
      if (!categoryDistribution[category]) {
        categoryDistribution[category] = {
          totalAmount: 0,
          transactionCount: 0,
          percentage: 0
        };
      }
      
      categoryDistribution[category].totalAmount += Math.abs(Number(transaction.amount));
      categoryDistribution[category].transactionCount += 1;
    }

    // Calculate percentages
    const totalExpenseAmount = Object.values(categoryDistribution)
      .reduce((sum: number, cat: any) => sum + cat.totalAmount, 0);

    for (const category of Object.keys(categoryDistribution)) {
      categoryDistribution[category].percentage = 
        (categoryDistribution[category].totalAmount / totalExpenseAmount) * 100;
    }

    // Analyze merchant patterns
    const merchantPatterns: Record<string, number> = {};
    for (const transaction of transactions) {
      const merchant = transaction.merchantName || transaction.description || '';
      const merchantKey = merchant.toUpperCase();
      merchantPatterns[merchantKey] = (merchantPatterns[merchantKey] || 0) + 1;
    }

    // Analyze transaction timing (simplified for now)
    const transactionTiming = {
      weekdayPercentage: 70, // Placeholder - would need actual date analysis
      weekendPercentage: 30,
      businessHoursPercentage: 60
    };

    // Analyze amount distribution
    const amountDistribution = {
      smallTransactions: transactions.filter(t => Math.abs(Number(t.amount)) < 50).length,
      mediumTransactions: transactions.filter(t => {
        const amount = Math.abs(Number(t.amount));
        return amount >= 50 && amount <= 500;
      }).length,
      largeTransactions: transactions.filter(t => Math.abs(Number(t.amount)) > 500).length
    };

    return {
      totalTransactions,
      monthsAnalyzed,
      averageMonthlyIncome: monthsAnalyzed > 0 ? income / monthsAnalyzed : 0,
      averageMonthlyExpenses: monthsAnalyzed > 0 ? expenses / monthsAnalyzed : 0,
      categoryDistribution,
      merchantPatterns,
      transactionTiming,
      amountDistribution
    };
  }

  /**
   * Calculate confidence scores for each user type
   */
  private calculateTypeScores(patterns: SpendingPatterns): Record<string, { score: number; reasoning: string[] }> {
    const results: Record<string, { score: number; reasoning: string[] }> = {};

    for (const [typeKey, profile] of Object.entries(this.USER_TYPE_PROFILES)) {
      let score = 0;
      const reasoning: string[] = [];

      // Check merchant patterns
      const merchantScore = this.calculateMerchantScore(patterns, profile);
      score += merchantScore.score;
      reasoning.push(...merchantScore.reasoning);

      // Check category distribution
      const categoryScore = this.calculateCategoryScore(patterns, profile);
      score += categoryScore.score;
      reasoning.push(...categoryScore.reasoning);

      // Check special indicators
      const specialScore = this.calculateSpecialIndicatorScore(patterns, profile);
      score += specialScore.score;
      reasoning.push(...specialScore.reasoning);

      results[typeKey] = { score: Math.min(score, 100), reasoning };
    }

    return results;
  }

  private calculateMerchantScore(patterns: SpendingPatterns, profile: UserTypeProfile) {
    let score = 0;
    const reasoning: string[] = [];

    const merchantIndicators = profile.indicators.merchantPatterns;
    let matchCount = 0;

    for (const [merchant, count] of Object.entries(patterns.merchantPatterns)) {
      for (const indicator of merchantIndicators) {
        if (merchant.includes(indicator)) {
          matchCount += count;
          break;
        }
      }
    }

    if (matchCount > 0) {
      score = Math.min((matchCount / patterns.totalTransactions) * 100, 30);
      reasoning.push(`Merchant patterns suggest ${profile.name} (${matchCount} matching transactions)`);
    }

    return { score, reasoning };
  }

  private calculateCategoryScore(patterns: SpendingPatterns, profile: UserTypeProfile) {
    let score = 0;
    const reasoning: string[] = [];

    for (const [categoryGroup, range] of Object.entries(profile.indicators.categoryDistribution)) {
      // Find categories that match this group
      const categoryPercentage = Object.keys(patterns.categoryDistribution)
        .filter(cat => cat.startsWith(categoryGroup))
        .reduce((sum, cat) => sum + patterns.categoryDistribution[cat].percentage, 0);

      if (categoryPercentage >= range.min && categoryPercentage <= range.max) {
        score += 15;
        reasoning.push(`${categoryGroup} spending (${categoryPercentage.toFixed(1)}%) matches ${profile.name} pattern`);
      } else if (categoryPercentage > 0) {
        // Partial match
        const distance = Math.min(
          Math.abs(categoryPercentage - range.min),
          Math.abs(categoryPercentage - range.max)
        );
        score += Math.max(0, 10 - distance);
      }
    }

    return { score, reasoning };
  }

  private calculateSpecialIndicatorScore(patterns: SpendingPatterns, profile: UserTypeProfile) {
    let score = 0;
    const reasoning: string[] = [];

    for (const indicator of profile.indicators.specialIndicators) {
      const indicatorScore = indicator(patterns);
      score += indicatorScore;
      if (indicatorScore > 10) {
        reasoning.push(`Special pattern detected for ${profile.name}`);
      }
    }

    return { score, reasoning };
  }

  private calculateMonthsAnalyzed(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;
    
    const sortedDates = transactions
      .map(t => new Date(t.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, Math.round(diffDays / 30));
  }

  private getEmptySpendingPatterns(): SpendingPatterns {
    return {
      totalTransactions: 0,
      monthsAnalyzed: 0,
      averageMonthlyIncome: 0,
      averageMonthlyExpenses: 0,
      categoryDistribution: {},
      merchantPatterns: {},
      transactionTiming: {
        weekdayPercentage: 0,
        weekendPercentage: 0,
        businessHoursPercentage: 0
      },
      amountDistribution: {
        smallTransactions: 0,
        mediumTransactions: 0,
        largeTransactions: 0
      }
    };
  }

  /**
   * Store user type analysis results in database
   */
  async storeUserTypeAnalysis(userId: string, analysis: UserTypeResult): Promise<void> {
    await this.prisma.userTypeAnalysis.upsert({
      where: { userId },
      update: {
        detectedType: analysis.detectedType,
        confidence: analysis.confidence,
        monthsAnalyzed: analysis.monthsAnalyzed,
        totalTransactions: analysis.totalTransactions,
        spendingPatterns: analysis.spendingPatterns as any,
        analysisDate: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        detectedType: analysis.detectedType,
        confidence: analysis.confidence,
        monthsAnalyzed: analysis.monthsAnalyzed,
        totalTransactions: analysis.totalTransactions,
        spendingPatterns: analysis.spendingPatterns as any,
        analysisDate: new Date()
      }
    });
  }
}