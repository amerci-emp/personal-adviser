import { prisma } from "@/lib/prisma";
import { PatternMatchingService, TransactionLike } from "./pattern-matching-service";
import { ConfidenceEngine } from "./confidence-engine";
import { TransferDetectionService } from "./transfer-detection-service";
import { ChatGPTBatchService, TransactionForAI } from "./chatgpt-batch-service";
import { getDirectionFromAmount } from "./category-system";

export interface ProcessedTransaction extends TransactionLike {
  needsReview: boolean;
  assignedCategory?: string;
  confidence?: number;
  isTransfer?: boolean;
  transferReason?: string;
}

export interface ProcessingStats {
  totalProcessed: number;
  autoAssigned: number;
  needsReview: number;
  transfers: number;
  sentToAI: number;
  processingTime: number;
}

export class TransactionProcessor {
  // Main entry point for processing new transactions
  static async processNewTransactions(
    transactions: TransactionLike[],
    userId: string
  ): Promise<ProcessingStats> {
    console.log(`🔄 Processing ${transactions.length} transactions for user ${userId}`);
    const startTime = Date.now();
    
    const stats: ProcessingStats = {
      totalProcessed: 0,
      autoAssigned: 0,
      needsReview: 0,
      transfers: 0,
      sentToAI: 0,
      processingTime: 0
    };
    
    // 1. Filter out transactions we already have high-confidence patterns for
    const { knownTransactions, unknownTransactions } = await this.filterKnownTransactions(transactions, userId);
    
    console.log(`📊 Split: ${knownTransactions.length} known, ${unknownTransactions.length} unknown`);
    
    // 2. Process known transactions (auto-assign categories)
    for (const transaction of knownTransactions) {
      await this.processKnownTransaction(transaction, userId);
      stats.autoAssigned++;
    }
    
    // 3. Detect and handle transfers in unknown transactions
    const { transfers, nonTransfers } = await this.processTransfers(unknownTransactions, userId);
    stats.transfers = transfers.length;
    
    // 4. Batch unknown non-transfer transactions for AI processing
    if (nonTransfers.length > 0) {
      const aiTransactions: TransactionForAI[] = nonTransfers.map(t => ({
        id: t.id || `temp_${Date.now()}_${Math.random()}`,
        description: t.description,
        merchantName: t.merchantName,
        amount: t.amount,
        date: new Date(),
        userId: t.userId
      }));
      
      await ChatGPTBatchService.addTransactions(aiTransactions, userId);
      stats.sentToAI = aiTransactions.length;
    }
    
    // 5. Create initial patterns for unknown transactions using Plaid data
    for (const transaction of nonTransfers) {
      // Check if transaction has Plaid data attached
      const plaidCategory = (transaction as any).plaidCategory;
      const plaidConfidence = (transaction as any).plaidConfidence;
      
      if (plaidCategory && plaidConfidence && transaction.id) {
        console.log(`🎯 Creating initial pattern for ${transaction.description} with Plaid data (${plaidCategory}, ${plaidConfidence}%)`);
        
        // Create initial pattern with Plaid data and link transaction
        await PatternMatchingService.createOrUpdatePatternAndLink(
          userId,
          transaction as TransactionLike & { id: string },
          {
            plaidCategory,
            plaidConfidence,
            finalCategory: plaidCategory, // Use Plaid category as initial suggestion
            combinedConfidence: plaidConfidence
          }
        );
        
        // If Plaid confidence is high enough, auto-assign
        const threshold = await this.getConfidenceThreshold(userId);
        if (plaidConfidence >= threshold) {
          console.log(`✅ Auto-assigning transaction ${transaction.id} based on Plaid confidence (${plaidConfidence}% >= ${threshold}%)`);
          
          if (transaction.id) {
            try {
              await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                  assignedCategory: plaidCategory,
                  needsReview: false,
                  confidence: plaidConfidence,
                  direction: getDirectionFromAmount(transaction.amount)
                }
              });
              stats.autoAssigned++;
              continue; // Skip marking for review
            } catch (error) {
              console.warn(`⚠️ Could not auto-assign transaction ${transaction.id}:`, error);
            }
          }
        }
      }
      
      // Mark for review if not auto-assigned
      await this.markForReview(transaction, userId, 'No existing pattern found or low confidence');
      stats.needsReview++;
    }
    
    // 6. Update processing stats
    stats.totalProcessed = transactions.length;
    stats.processingTime = Date.now() - startTime;
    
    console.log(`✅ Processing complete: ${JSON.stringify(stats)}`);
    
    // 7. Update user's review task status
    await this.updateReviewTask(userId);
    
    return stats;
  }
  
  // Filter transactions into known (high confidence) and unknown
  private static async filterKnownTransactions(
    transactions: TransactionLike[],
    userId: string
  ): Promise<{
    knownTransactions: Array<TransactionLike & { pattern: any }>;
    unknownTransactions: TransactionLike[];
  }> {
    const knownTransactions: Array<TransactionLike & { pattern: any }> = [];
    const unknownTransactions: TransactionLike[] = [];
    
    for (const transaction of transactions) {
      const pattern = await PatternMatchingService.findPattern(userId, transaction);
      
      if (pattern) {
        const confidence = ConfidenceEngine.applyDecay(pattern);
        
        // Auto-assign if confidence is high enough
        const threshold = await this.getConfidenceThreshold(userId);
        if (confidence >= threshold) {
          knownTransactions.push({ ...transaction, pattern });
          continue;
        }
      }
      
      unknownTransactions.push(transaction);
    }
    
    return { knownTransactions, unknownTransactions };
  }
  
  // Process a transaction with an existing high-confidence pattern
  private static async processKnownTransaction(
    transaction: TransactionLike & { pattern: any },
    userId: string
  ): Promise<void> {
    const { pattern } = transaction;
    const confidence = ConfidenceEngine.applyDecay(pattern);
    
    console.log(`✅ Auto-assigning transaction ${transaction.id} to category ${pattern.finalCategory} (confidence: ${confidence.toFixed(1)}%)`);
    
    // Update pattern with new occurrence and link transaction
    if (transaction.id) {
      await PatternMatchingService.createOrUpdatePatternAndLink(
        userId,
        transaction as TransactionLike & { id: string },
        {
          plaidCategory: pattern.plaidCategory,
          plaidConfidence: pattern.plaidConfidence?.toNumber(),
          chatgptCategory: pattern.chatgptCategory,
          chatgptConfidence: pattern.chatgptConfidence?.toNumber(),
          userCategory: pattern.userCategory,
          finalCategory: pattern.finalCategory,
          combinedConfidence: confidence
        }
      );
    }
    
    // Update transaction in database if it exists
    if (transaction.id) {
      try {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            assignedCategory: pattern.finalCategory,
            needsReview: false,
            confidence: confidence,
            direction: getDirectionFromAmount(transaction.amount)
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not update transaction ${transaction.id} in database:`, error);
      }
    }
  }
  
  // Process transfers and separate them from regular transactions
  private static async processTransfers(
    transactions: TransactionLike[],
    userId: string
  ): Promise<{
    transfers: TransactionLike[];
    nonTransfers: TransactionLike[];
  }> {
    const transfers: TransactionLike[] = [];
    const nonTransfers: TransactionLike[] = [];
    
    console.log(`🔄 Checking ${transactions.length} transactions for transfers...`);
    
    for (const transaction of transactions) {
      // Convert to format expected by transfer detection
      const transactionForDetection = {
        ...transaction,
        transactionDate: transaction.id ? undefined : new Date(), // Use current date for new transactions
        date: new Date()
      };
      
      const transferResult = await TransferDetectionService.detectTransfer(transactionForDetection, userId);
      
      if (transferResult.isTransfer && transferResult.confidence > 70) {
        console.log(`💸 Detected transfer: ${transaction.description} (${transferResult.reason})`);
        
        // Auto-categorize as transfer
        await this.processTransferTransaction(transaction, userId, transferResult.reason);
        transfers.push(transaction);
      } else {
        nonTransfers.push(transaction);
      }
    }
    
    console.log(`📊 Transfer detection: ${transfers.length} transfers, ${nonTransfers.length} regular transactions`);
    return { transfers, nonTransfers };
  }
  
  // Process a detected transfer transaction
  private static async processTransferTransaction(
    transaction: TransactionLike,
    userId: string,
    reason: string
  ): Promise<void> {
    const transferCategory = transaction.amount >= 0 ? 'TRANSFER_IN' : 'TRANSFER_IN'; // Both use TRANSFER_IN for now
    
    console.log(`💸 Auto-categorizing transfer: ${transaction.description} → ${transferCategory}`);
    
    // Create or update transfer pattern and link transaction
    if (transaction.id) {
      await PatternMatchingService.createOrUpdatePatternAndLink(
        userId,
        transaction as TransactionLike & { id: string },
        {
          finalCategory: transferCategory,
          combinedConfidence: 90, // High confidence for detected transfers
          chatgptReasoning: `Auto-detected transfer: ${reason}`
        }
      );
    }
    
    // Update transaction in database if it exists
    if (transaction.id) {
      try {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            assignedCategory: transferCategory,
            needsReview: false,
            confidence: 90,
            direction: getDirectionFromAmount(transaction.amount)
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not update transfer transaction ${transaction.id}:`, error);
      }
    }
  }
  
  // Mark transaction for manual review
  private static async markForReview(
    transaction: TransactionLike,
    userId: string,
    reason: string
  ): Promise<void> {
    console.log(`📝 Marking for review: ${transaction.description} (${reason})`);
    
    // Create initial pattern with Plaid data if available
    if (transaction.plaidCategory && transaction.plaidConfidence && transaction.id) {
      console.log(`🎯 Creating initial pattern with Plaid data: ${transaction.plaidCategory} (${transaction.plaidConfidence}%)`);
      
      try {
        await PatternMatchingService.createOrUpdatePatternAndLink(
          userId,
          transaction as TransactionLike & { id: string },
          {
            plaidCategory: transaction.plaidCategory,
            plaidConfidence: transaction.plaidConfidence,
            finalCategory: 'uncategorized', // Will be updated when user reviews
            combinedConfidence: transaction.plaidConfidence // Use Plaid confidence as initial
          }
        );
      } catch (error) {
        console.warn(`⚠️ Could not create initial pattern for ${transaction.description}:`, error);
      }
    }
    
    if (transaction.id) {
      try {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            needsReview: true,
            assignedCategory: null,
            confidence: null,
            direction: getDirectionFromAmount(transaction.amount)
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not mark transaction ${transaction.id} for review:`, error);
      }
    }
  }
  
  // Get user's confidence threshold based on their pattern maturity
  private static async getConfidenceThreshold(userId: string): Promise<number> {
    const stats = await PatternMatchingService.getPatternStats(userId);
    return ConfidenceEngine.getRecommendedThreshold(stats);
  }
  
  // Update user's review task status
  private static async updateReviewTask(userId: string): Promise<void> {
    try {
      const pendingReviewCount = await prisma.transaction.count({
        where: {
          userId,
          needsReview: true
        }
      });
      
      console.log(`📊 User ${userId} has ${pendingReviewCount} transactions pending review`);
      
      // Check if user has the REVIEW_TRANSACTIONS task
      const reviewTask = await prisma.userTask.findFirst({
        where: {
          userId,
          taskId: 'REVIEW_TRANSACTIONS'
        }
      });
      
      if (reviewTask) {
        if (pendingReviewCount === 0 && reviewTask.status !== 'COMPLETED') {
          // No pending reviews - mark task as completed
          await prisma.userTask.update({
            where: { id: reviewTask.id },
            data: { status: 'COMPLETED' }
          });
          console.log(`✅ REVIEW_TRANSACTIONS task completed for user ${userId}`);
        } else if (pendingReviewCount > 0 && reviewTask.status === 'COMPLETED') {
          // New transactions need review - reopen task
          await prisma.userTask.update({
            where: { id: reviewTask.id },
            data: { status: 'PENDING' }
          });
          console.log(`🔄 REVIEW_TRANSACTIONS task reopened for user ${userId}`);
        }
      } else if (pendingReviewCount > 0) {
        // Create review task if it doesn't exist and there are pending reviews
        await prisma.userTask.create({
          data: {
            userId,
            taskId: 'REVIEW_TRANSACTIONS',
            status: 'PENDING'
          }
        });
        console.log(`📝 Created REVIEW_TRANSACTIONS task for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating review task for user ${userId}:`, error);
    }
  }
  
  // Batch process transactions from Plaid webhook
  static async processPlaidTransactions(
    plaidTransactions: any[],
    userId: string,
    itemId: string
  ): Promise<ProcessingStats> {
    console.log(`📥 Processing ${plaidTransactions.length} Plaid transactions for user ${userId}`);
    
    // Convert Plaid transactions to our format
    const transactions: TransactionLike[] = plaidTransactions.map(pt => ({
      id: undefined, // Will be set when saved to DB
      description: pt.name || pt.original_description || 'Unknown transaction',
      merchantName: pt.merchant_name,
      amount: pt.amount * -1, // Plaid uses opposite signs
      userId
    }));
    
    // Process transactions through our pipeline
    const stats = await this.processNewTransactions(transactions, userId);
    
    // Save Plaid transactions to database
    await this.savePlaidTransactions(plaidTransactions, userId, itemId);
    
    return stats;
  }
  
  // Save Plaid transactions to database
  private static async savePlaidTransactions(
    plaidTransactions: any[],
    userId: string,
    itemId: string
  ): Promise<void> {
    console.log(`💾 Saving ${plaidTransactions.length} Plaid transactions to database`);
    
    for (const pt of plaidTransactions) {
      try {
        // Find the user's bank account for this item
        const bankAccount = await prisma.bankAccount.findFirst({
          where: {
            userId,
            plaidAccounts: {
              some: {
                plaidId: pt.account_id
              }
            }
          }
        });
        
        if (!bankAccount) {
          console.warn(`⚠️ No bank account found for Plaid account ${pt.account_id}`);
          continue;
        }
        
        // Check if transaction already exists
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            plaidTransactionId: pt.transaction_id
          }
        });
        
        if (existingTransaction) {
          console.log(`ℹ️ Transaction ${pt.transaction_id} already exists, skipping`);
          continue;
        }
        
        // Create new transaction
        await prisma.transaction.create({
          data: {
            userId,
            bankAccountId: bankAccount.id,
            description: pt.name || pt.original_description || 'Unknown transaction',
            amount: pt.amount * -1, // Plaid uses opposite signs
            date: new Date(pt.date),
            transactionDate: new Date(pt.date),
            category: 'uncategorized', // Will be updated by processing pipeline
            plaidTransactionId: pt.transaction_id,
            merchantName: pt.merchant_name,
            originalText: JSON.stringify(pt),
            source: 'PLAID',
            direction: getDirectionFromAmount(pt.amount * -1),
            needsReview: true // Will be updated by processing pipeline
          }
        });
        
        console.log(`✅ Saved Plaid transaction ${pt.transaction_id}`);
        
      } catch (error) {
        console.error(`❌ Error saving Plaid transaction ${pt.transaction_id}:`, error);
      }
    }
  }
  
  // Get processing statistics for user
  static async getProcessingStats(userId: string, days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: cutoffDate }
      }
    });
    
    const stats = {
      totalTransactions: recentTransactions.length,
      autoAssigned: recentTransactions.filter(t => !t.needsReview && t.assignedCategory).length,
      needsReview: recentTransactions.filter(t => t.needsReview).length,
      averageConfidence: 0,
      processingEfficiency: 0
    };
    
    // Calculate average confidence
    const confidenceValues = recentTransactions
      .filter(t => t.confidence)
      .map(t => Number(t.confidence));
    
    if (confidenceValues.length > 0) {
      stats.averageConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;
    }
    
    // Calculate processing efficiency (% auto-assigned)
    if (stats.totalTransactions > 0) {
      stats.processingEfficiency = (stats.autoAssigned / stats.totalTransactions) * 100;
    }
    
    return stats;
  }
}