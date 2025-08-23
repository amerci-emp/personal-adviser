import { prisma } from "@/lib/prisma";
import { Transaction } from "@prisma/client";

export interface TransferDetectionResult {
  isTransfer: boolean;
  confidence: number;
  reason: string;
  matchingTransactionId?: string;
}

export class TransferDetectionService {
  // Main transfer detection method combining all detection strategies
  static async detectTransfer(
    transaction: Transaction | any,
    userId: string
  ): Promise<TransferDetectionResult> {
    // Method 1: Amount + timing matching (highest confidence)
    const amountMatch = await this.findMatchingAmountTransfer(transaction, userId);
    if (amountMatch.isTransfer) {
      return amountMatch;
    }
    
    // Method 2: Description pattern matching
    const descriptionMatch = this.checkTransferDescription(transaction);
    if (descriptionMatch.isTransfer) {
      return descriptionMatch;
    }
    
    // Method 3: Account pattern matching (if we have account info)
    const accountMatch = await this.checkInternalTransfer(transaction, userId);
    if (accountMatch.isTransfer) {
      return accountMatch;
    }
    
    // Method 4: Round number heuristics
    const roundNumberMatch = this.checkRoundNumberTransfer(transaction);
    if (roundNumberMatch.isTransfer && roundNumberMatch.confidence > 60) {
      return roundNumberMatch;
    }
    
    return {
      isTransfer: false,
      confidence: 0,
      reason: 'No transfer patterns detected'
    };
  }
  
  // Method 1: Find matching opposite amounts within time window
  private static async findMatchingAmountTransfer(
    transaction: Transaction | any,
    userId: string
  ): Promise<TransferDetectionResult> {
    const timeWindow = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
    const transactionDate = transaction.transactionDate || transaction.date;
    const startTime = new Date(transactionDate.getTime() - timeWindow);
    const endTime = new Date(transactionDate.getTime() + timeWindow);
    
    // Look for exact opposite amount
    const exactMatch = await prisma.transaction.findFirst({
      where: {
        userId,
        amount: -Number(transaction.amount), // Exact opposite amount
        OR: [
          { transactionDate: { gte: startTime, lte: endTime } },
          { date: { gte: startTime, lte: endTime } }
        ],
        id: { not: transaction.id }
      }
    });
    
    if (exactMatch) {
      return {
        isTransfer: true,
        confidence: 95,
        reason: 'Found exact matching opposite amount within 72 hours',
        matchingTransactionId: exactMatch.id
      };
    }
    
    // Look for very close amounts (within $1 for fees)
    const amount = Math.abs(Number(transaction.amount));
    const closeMatch = await prisma.transaction.findFirst({
      where: {
        userId,
        amount: {
          gte: -(amount + 1),
          lte: -(amount - 1)
        },
        OR: [
          { transactionDate: { gte: startTime, lte: endTime } },
          { date: { gte: startTime, lte: endTime } }
        ],
        id: { not: transaction.id }
      }
    });
    
    if (closeMatch) {
      return {
        isTransfer: true,
        confidence: 85,
        reason: 'Found nearly matching opposite amount (within $1) - likely transfer with fee',
        matchingTransactionId: closeMatch.id
      };
    }
    
    return {
      isTransfer: false,
      confidence: 0,
      reason: 'No matching amounts found'
    };
  }
  
  // Method 2: Description pattern matching
  private static checkTransferDescription(
    transaction: Transaction | any
  ): TransferDetectionResult {
    const description = transaction.description.toLowerCase();
    const merchantName = (transaction.merchantName || '').toLowerCase();
    const fullText = `${description} ${merchantName}`.toLowerCase();
    
    // High confidence transfer keywords
    const highConfidenceKeywords = [
      'transfer to',
      'transfer from',
      'online transfer',
      'external transfer',
      'internal transfer',
      'wire transfer',
      'ach transfer',
      'quickpay',
      'zelle',
      'venmo',
      'paypal transfer',
      'cashapp',
      'apple pay cash'
    ];
    
    for (const keyword of highConfidenceKeywords) {
      if (fullText.includes(keyword)) {
        return {
          isTransfer: true,
          confidence: 90,
          reason: `High confidence transfer keyword detected: "${keyword}"`
        };
      }
    }
    
    // Medium confidence transfer patterns
    const mediumConfidencePatterns = [
      /transfer.*\d{4}/i, // Transfer with account numbers
      /\bto\s+.*(?:checking|savings|account)/i,
      /\bfrom\s+.*(?:checking|savings|account)/i,
      /online\s+banking\s+transfer/i,
      /mobile\s+transfer/i,
      /person\s+to\s+person/i,
      /p2p\s+transfer/i
    ];
    
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(fullText)) {
        return {
          isTransfer: true,
          confidence: 75,
          reason: `Medium confidence transfer pattern detected: ${pattern.source}`
        };
      }
    }
    
    // Lower confidence keywords that might indicate transfers
    const lowConfidenceKeywords = [
      'withdrawal',
      'deposit',
      'ach',
      'wire',
      'external',
      'online banking'
    ];
    
    const keywordMatches = lowConfidenceKeywords.filter(keyword => 
      fullText.includes(keyword)
    );
    
    if (keywordMatches.length >= 2) {
      return {
        isTransfer: true,
        confidence: 60,
        reason: `Multiple transfer indicators: ${keywordMatches.join(', ')}`
      };
    }
    
    return {
      isTransfer: false,
      confidence: 0,
      reason: 'No transfer keywords found'
    };
  }
  
  // Method 3: Check for internal account transfers
  private static async checkInternalTransfer(
    transaction: Transaction | any,
    userId: string
  ): Promise<TransferDetectionResult> {
    // Get all user's bank accounts
    const userAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      select: { 
        name: true, 
        lastFourDigits: true,
        financialInstitution: true 
      }
    });
    
    if (userAccounts.length < 2) {
      return {
        isTransfer: false,
        confidence: 0,
        reason: 'User has only one bank account'
      };
    }
    
    const description = transaction.description.toLowerCase();
    const merchantName = (transaction.merchantName || '').toLowerCase();
    const fullText = `${description} ${merchantName}`;
    
    // Check if description mentions any of the user's other accounts
    for (const account of userAccounts) {
      const accountIndicators = [
        account.name?.toLowerCase(),
        account.lastFourDigits || undefined,
        account.financialInstitution ? `${account.financialInstitution.toLowerCase()} ${account.lastFourDigits || ''}`.trim() : undefined,
        account.lastFourDigits ? `****${account.lastFourDigits}` : undefined
      ].filter((v): v is string => Boolean(v));
      
      for (const indicator of accountIndicators) {
        if (fullText.includes(indicator)) {
          return {
            isTransfer: true,
            confidence: 85,
            reason: `Transaction mentions user's other account: ${indicator}`
          };
        }
      }
    }
    
    return {
      isTransfer: false,
      confidence: 0,
      reason: 'No user account references found'
    };
  }
  
  // Method 4: Round number heuristics
  private static checkRoundNumberTransfer(
    transaction: Transaction | any
  ): TransferDetectionResult {
    const amount = Math.abs(Number(transaction.amount));
    const description = transaction.description.toLowerCase();
    
    // Round numbers are more likely to be transfers
    const isRoundNumber = (
      amount % 100 === 0 || // $100, $200, etc.
      amount % 50 === 0 ||  // $50, $150, etc.
      amount % 25 === 0     // $25, $75, etc.
    ) && amount >= 25;
    
    if (!isRoundNumber) {
      return {
        isTransfer: false,
        confidence: 0,
        reason: 'Not a round number'
      };
    }
    
    // Additional indicators that increase transfer likelihood for round numbers
    const transferIndicators = [
      'online',
      'mobile',
      'digital',
      'electronic',
      'automated',
      'scheduled'
    ];
    
    const indicatorCount = transferIndicators.filter(indicator => 
      description.includes(indicator)
    ).length;
    
    const baseConfidence = 40; // Round numbers alone are weak indicators
    const bonusConfidence = indicatorCount * 10; // +10% per additional indicator
    
    const finalConfidence = Math.min(70, baseConfidence + bonusConfidence);
    
    return {
      isTransfer: finalConfidence > 50,
      confidence: finalConfidence,
      reason: `Round number (${amount}) with ${indicatorCount} transfer indicators`
    };
  }
  
  // Batch process multiple transactions for transfer detection
  static async batchDetectTransfers(
    transactions: (Transaction | any)[],
    userId: string
  ): Promise<Map<string, TransferDetectionResult>> {
    const results = new Map<string, TransferDetectionResult>();
    
    // Sort transactions by date for better matching
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = a.transactionDate || a.date;
      const dateB = b.transactionDate || b.date;
      return dateA.getTime() - dateB.getTime();
    });
    
    for (const transaction of sortedTransactions) {
      const result = await this.detectTransfer(transaction, userId);
      results.set(transaction.id, result);
    }
    
    return results;
  }
  
  // Get transfer statistics for analytics
  static async getTransferStats(userId: string, days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { transactionDate: { gte: cutoffDate } },
          { date: { gte: cutoffDate } }
        ]
      }
    });
    
    let transferCount = 0;
    let totalAmount = 0;
    
    for (const transaction of recentTransactions) {
      const result = await this.detectTransfer(transaction, userId);
      if (result.isTransfer && result.confidence > 70) {
        transferCount++;
        totalAmount += Math.abs(Number(transaction.amount));
      }
    }
    
    return {
      totalTransactions: recentTransactions.length,
      transferCount,
      transferPercentage: recentTransactions.length > 0 ? 
        (transferCount / recentTransactions.length) * 100 : 0,
      totalTransferAmount: totalAmount,
      averageTransferAmount: transferCount > 0 ? totalAmount / transferCount : 0
    };
  }
}