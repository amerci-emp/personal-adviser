import { prisma } from './prisma';
import { ProcessedStatementData, Transaction as ParsedTransaction } from './parsers/base-parser';
import { MerchantCleanerService } from './merchant-cleaner';

export interface SaveTransactionsResult {
  success: boolean;
  savedCount: number;
  skippedCount: number;
  errors: string[];
  transactionIds: string[];
}

export class TransactionService {
  /**
   * Save all transactions from ProcessedStatementData to the database
   */
  static async saveTransactionsFromProcessedData(
    statementId: string,
    processedData: ProcessedStatementData
  ): Promise<SaveTransactionsResult> {
    const result: SaveTransactionsResult = {
      success: false,
      savedCount: 0,
      skippedCount: 0,
      errors: [],
      transactionIds: [],
    };

    try {
      console.log(`Saving transactions from processed data for statement ${statementId}`);

      // Extract all transactions from all accounts
      const allTransactions: Array<{
        date: Date;
        description: string;
        amount: number;
        originalText?: string;
        cleanedMerchant: string;
        assignedCategory: string;
      }> = [];

      // Process each account's transactions
      for (const account of processedData.accounts) {
        if (!account.allTransactions) continue;

        // Process each transaction category (deposits, withdrawals, atmDebit, etc.)
        for (const [category, transactions] of Object.entries(account.allTransactions)) {
          for (const transaction of transactions) {
            if (!transaction.date || !transaction.description || transaction.amount === null || transaction.amount === undefined) {
              console.warn(`Skipping incomplete transaction:`, transaction);
              result.skippedCount++;
              continue;
            }

            // Parse date
            let transactionDate: Date;
            try {
              transactionDate = new Date(transaction.date);
              if (isNaN(transactionDate.getTime())) {
                throw new Error('Invalid date');
              }
            } catch (error) {
              console.warn(`Skipping transaction with invalid date: ${transaction.date}`);
              result.skippedCount++;
              continue;
            }

            // Clean merchant name and get category suggestion
            const { cleanName, suggestedCategory } = MerchantCleanerService.cleanMerchantName(
              transaction.description
            );

            // Determine category (use suggested or default to 'Other')
            const assignedCategory = suggestedCategory || 'Other';

            allTransactions.push({
              date: transactionDate,
              description: transaction.description,
              amount: parseFloat(transaction.amount.toString()),
              originalText: transaction.rawRowText || transaction.description,
              cleanedMerchant: cleanName,
              assignedCategory,
            });
          }
        }
      }

      if (allTransactions.length === 0) {
        console.log('No valid transactions found in processed data');
        result.success = true;
        return result;
      }

      console.log(`Found ${allTransactions.length} transactions to save`);

      // Save transactions to database using createMany for better performance
      const transactionData = allTransactions.map((transaction) => ({
        statementId,
        transactionDate: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        originalText: transaction.originalText,
        cleanedMerchant: transaction.cleanedMerchant,
        assignedCategory: transaction.assignedCategory,
        needsReview: false, // Start with false, will be set to true if needed
        exported: false, // Not exported yet
      }));

      // Use createMany for batch insert
      const createResult = await prisma.transaction.createMany({
        data: transactionData,
        skipDuplicates: true, // Skip if somehow duplicates exist
      });

      result.savedCount = createResult.count;

      // Get the IDs of created transactions for return
      const savedTransactions = await prisma.transaction.findMany({
        where: {
          statementId,
          createdAt: {
            gte: new Date(Date.now() - 10000), // Within last 10 seconds
          },
        },
        select: { id: true },
      });

      result.transactionIds = savedTransactions.map(t => t.id);
      result.success = true;

      console.log(`Successfully saved ${result.savedCount} transactions to database`);
      return result;
    } catch (error) {
      console.error('Error saving transactions:', error);
      result.errors.push(`Failed to save transactions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get transactions for a statement that need to be exported
   */
  static async getTransactionsForExport(statementId: string) {
    return await prisma.transaction.findMany({
      where: {
        statementId,
        exported: false,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });
  }

  /**
   * Mark transactions as exported
   */
  static async markTransactionsAsExported(
    transactionIds: string[],
    monthlySheetId?: string
  ) {
    return await prisma.transaction.updateMany({
      where: {
        id: { in: transactionIds },
      },
      data: {
        exported: true,
        exportedAt: new Date(),
        monthlySheetId: monthlySheetId || undefined,
      },
    });
  }
} 