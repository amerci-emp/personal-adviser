import { prisma } from "@/lib/prisma";
import { TransactionPattern, Transaction } from "@prisma/client";
import { getDirectionFromAmount } from "./category-system";

export interface TransactionLike {
  id?: string;
  description: string;
  amount: number;
  merchantName?: string;
  userId: string;
  // Plaid extracted data for pattern creation
  plaidCategory?: string;
  plaidConfidence?: number;
}

export class PatternMatchingService {
  // Normalize merchant names for consistent matching
  static normalizeMerchant(description: string): string {
    return description
      .toUpperCase()
      .replace(/\s+#\d+/g, '') // Remove store numbers (#123)
      .replace(/\s+\d{4,}/g, '') // Remove transaction IDs (1234567)
      .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '') // Remove dates
      .replace(/[^A-Z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Determine amount range bucket for pattern matching
  static getAmountRange(amount: number): { min: number, max: number } {
    const absAmount = Math.abs(amount);
    
    if (absAmount < 10) return { min: 0, max: 10 };
    if (absAmount < 50) return { min: 10, max: 50 };
    if (absAmount < 100) return { min: 50, max: 100 };
    if (absAmount < 500) return { min: 100, max: 500 };
    if (absAmount < 1000) return { min: 500, max: 1000 };
    return { min: 1000, max: 99999 };
  }

  // Find existing pattern for transaction
  static async findPattern(
    userId: string, 
    transaction: TransactionLike
  ): Promise<TransactionPattern | null> {
    const normalizedMerchant = this.normalizeMerchant(
      transaction.merchantName || transaction.description
    );
    const direction = getDirectionFromAmount(transaction.amount);
    const amountRange = this.getAmountRange(transaction.amount);
    
    // Try exact merchant match first
    let pattern = await prisma.transactionPattern.findFirst({
      where: {
        userId,
        merchantPattern: normalizedMerchant,
        direction,
        amountRangeMin: { lte: Math.abs(transaction.amount) },
        amountRangeMax: { gte: Math.abs(transaction.amount) }
      },
      orderBy: {
        lastSeenAt: 'desc' // Prefer recently seen patterns
      }
    });

    // If no exact match, try partial merchant match
    if (!pattern && normalizedMerchant.length > 5) {
      const partialPattern = normalizedMerchant.substring(0, Math.min(10, normalizedMerchant.length));
      
      pattern = await prisma.transactionPattern.findFirst({
        where: {
          userId,
          merchantPattern: { startsWith: partialPattern },
          direction,
          amountRangeMin: { lte: Math.abs(transaction.amount) },
          amountRangeMax: { gte: Math.abs(transaction.amount) }
        },
        orderBy: [
          { totalOccurrences: 'desc' }, // Prefer frequently seen patterns
          { lastSeenAt: 'desc' }
        ]
      });
    }

    return pattern;
  }

  // Create or update pattern from transaction
  static async createOrUpdatePattern(
    userId: string,
    transaction: TransactionLike,
    categoryData: {
      plaidCategory?: string;
      plaidConfidence?: number;
      chatgptCategory?: string;
      chatgptConfidence?: number;
      chatgptReasoning?: string;
      userCategory?: string;
      finalCategory: string;
      combinedConfidence: number;
    }
  ): Promise<TransactionPattern> {
    const normalizedMerchant = this.normalizeMerchant(
      transaction.merchantName || transaction.description
    );
    const direction = getDirectionFromAmount(transaction.amount);
    const amountRange = this.getAmountRange(transaction.amount);

    // Check if pattern already exists
    const existingPattern = await this.findPattern(userId, transaction);

    if (existingPattern) {
      // Update existing pattern
      return await prisma.transactionPattern.update({
        where: { id: existingPattern.id },
        data: {
          ...categoryData,
          lastSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          totalOccurrences: { increment: 1 },
          // Update amount range if this transaction extends it
          amountRangeMin: Math.min(existingPattern.amountRangeMin?.toNumber() ?? amountRange.min, amountRange.min),
          amountRangeMax: Math.max(existingPattern.amountRangeMax?.toNumber() ?? amountRange.max, amountRange.max)
        }
      });
    } else {
      // Create new pattern
      return await prisma.transactionPattern.create({
        data: {
          userId,
          merchantPattern: normalizedMerchant,
          descriptionPattern: this.normalizeMerchant(transaction.description),
          direction,
          amountRangeMin: amountRange.min,
          amountRangeMax: amountRange.max,
          ...categoryData,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          totalOccurrences: 1
        }
      });
    }
  }

  // Link transaction to pattern (new relationship)
  static async linkTransactionToPattern(
    transactionId: string,
    patternId: string
  ): Promise<void> {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { transactionPatternId: patternId }
    });
  }

  // Create pattern and link transaction in one operation
  static async createOrUpdatePatternAndLink(
    userId: string,
    transaction: TransactionLike & { id: string }, // Ensure transaction has ID
    categoryData: {
      plaidCategory?: string;
      plaidConfidence?: number;
      chatgptCategory?: string;
      chatgptConfidence?: number;
      chatgptReasoning?: string;
      userCategory?: string;
      finalCategory: string;
      combinedConfidence: number;
    }
  ): Promise<TransactionPattern> {
    // Create or update the pattern
    const pattern = await this.createOrUpdatePattern(userId, transaction, categoryData);
    
    // Link the transaction to the pattern
    if (transaction.id) {
      await this.linkTransactionToPattern(transaction.id, pattern.id);
    }
    
    return pattern;
  }

  // Update pattern based on user feedback
  static async updateFromUserReview(
    patternId: string,
    userCategory: string,
    wasCorrect: boolean
  ): Promise<TransactionPattern> {
    const pattern = await prisma.transactionPattern.findUnique({
      where: { id: patternId }
    });

    if (!pattern) {
      throw new Error('Pattern not found');
    }

    const correctionIncrement = wasCorrect ? 0 : 1;
    const newCorrectionCount = pattern.userCorrectionCount + correctionIncrement;
    
    // Calculate new correlation rate
    const totalReviews = pattern.totalOccurrences;
    const newCorrelationRate = ((totalReviews - newCorrectionCount) / totalReviews) * 100;

    return await prisma.transactionPattern.update({
      where: { id: patternId },
      data: {
        userCategory,
        finalCategory: userCategory, // User override takes precedence
        userCorrectionCount: newCorrectionCount,
        userCorrelationRate: Math.max(0, newCorrelationRate),
        lastUpdatedAt: new Date()
      }
    });
  }

  // Get patterns that need refresh (old or low confidence)
  static async getPatternsNeedingRefresh(
    userId: string,
    daysOld: number = 90,
    minConfidence: number = 75
  ): Promise<TransactionPattern[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.transactionPattern.findMany({
      where: {
        userId,
        OR: [
          { lastSeenAt: { lt: cutoffDate } },
          { combinedConfidence: { lt: minConfidence } },
          { userCategory: null, chatgptCategory: null }
        ]
      },
      orderBy: [
        { totalOccurrences: 'desc' },
        { lastSeenAt: 'asc' }
      ],
      take: 50 // Limit to prevent overwhelming AI calls
    });
  }

  // Clean up unused patterns (garbage collection)
  static async cleanupUnusedPatterns(userId: string, daysUnused: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

    const result = await prisma.transactionPattern.deleteMany({
      where: {
        userId,
        lastSeenAt: { lt: cutoffDate },
        totalOccurrences: { lt: 3 }, // Only delete patterns with few occurrences
        userCategory: null // Don't delete user-reviewed patterns
      }
    });

    return result.count;
  }

  // Get pattern statistics for user
  static async getPatternStats(userId: string) {
    const stats = await prisma.transactionPattern.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { combinedConfidence: true, totalOccurrences: true },
      _max: { totalOccurrences: true }
    });

    const highConfidenceCount = await prisma.transactionPattern.count({
      where: {
        userId,
        combinedConfidence: { gte: 85 }
      }
    });

    const userReviewedCount = await prisma.transactionPattern.count({
      where: {
        userId,
        userCategory: { not: null }
      }
    });

    return {
      totalPatterns: stats._count.id,
      averageConfidence: stats._avg.combinedConfidence?.toNumber() ?? 0,
      averageOccurrences: stats._avg.totalOccurrences ?? 0,
      maxOccurrences: stats._max.totalOccurrences ?? 0,
      highConfidencePatterns: highConfidenceCount,
      userReviewedPatterns: userReviewedCount,
      automationRate: stats._count.id > 0 ? (highConfidenceCount / stats._count.id) * 100 : 0
    };
  }
}