import { prisma } from './prisma';
import { GoogleSheetsService, GoogleSheetsCredentials, TransactionRow } from './google-sheets';
import { MerchantCleanerService } from './merchant-cleaner';
import { StatementStatus, ExportJobStatus } from '../generated/prisma';
import { ProcessedStatementData, Transaction } from './parsers/base-parser';

export interface ExportResult {
  success: boolean;
  exportedCount: number;
  failedCount: number;
  errors: string[];
  monthlySheets: string[];
}

export interface ProcessedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  cleanedMerchant: string;
  assignedCategory: string;
  monthKey: string;
}

export class ExportService {
  private sheetsService: GoogleSheetsService;
  private userId: string;

  constructor(userId: string, credentials: GoogleSheetsCredentials) {
    this.userId = userId;
    this.sheetsService = new GoogleSheetsService(credentials);
  }

  /**
   * Export all transactions from a statement to Google Sheets
   */
  async exportStatement(statementId: string): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exportedCount: 0,
      failedCount: 0,
      errors: [],
      monthlySheets: [],
    };

    try {
      console.log(`Starting export for statement ${statementId}`);

      // Update statement status to EXPORTING
      await prisma.statement.update({
        where: { id: statementId },
        data: { status: StatementStatus.EXPORTING },
      });

      // Create export job
      const exportJob = await prisma.exportJob.create({
        data: {
          statementId,
          userId: this.userId,
          status: ExportJobStatus.PROCESSING,
          startedAt: new Date(),
        },
      });

      // Get transactions that haven't been exported yet
      const transactions = await prisma.transaction.findMany({
        where: {
          statementId,
          exported: false,
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      if (transactions.length === 0) {
        console.log('No transactions to export');
        await this.completeExport(statementId, exportJob.id, result);
        return result;
      }

      // Update job with transaction count
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { totalTransactions: transactions.length },
      });

      // Process and clean transactions
      const processedTransactions = await this.processTransactions(transactions);

      // Group transactions by month
      const transactionsByMonth = this.groupTransactionsByMonth(processedTransactions);

      // Export each month's transactions
      for (const [monthKey, monthTransactions] of Object.entries(transactionsByMonth)) {
        try {
          await this.exportMonthlyTransactions(monthKey, monthTransactions);
          result.exportedCount += monthTransactions.length;
          result.monthlySheets.push(this.getMonthlySheetName(monthKey));
        } catch (error) {
          console.error(`Error exporting month ${monthKey}:`, error);
          result.errors.push(`Failed to export ${monthKey}: ${error}`);
          result.failedCount += monthTransactions.length;
        }
      }

      // Update export job progress
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          processedTransactions: result.exportedCount,
          failedTransactions: result.failedCount,
        },
      });

      // Complete the export
      await this.completeExport(statementId, exportJob.id, result);

      console.log(`Export completed: ${result.exportedCount} exported, ${result.failedCount} failed`);
      return result;
    } catch (error) {
      console.error('Export failed:', error);
      result.errors.push(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      await this.failExport(statementId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Process and clean raw transactions
   */
  private async processTransactions(transactions: any[]): Promise<ProcessedTransaction[]> {
    const processed: ProcessedTransaction[] = [];

    for (const transaction of transactions) {
      if (!transaction.transactionDate) {
        console.warn(`Skipping transaction ${transaction.id} - no date`);
        continue;
      }

      // Clean merchant name and get category suggestion
      const { cleanName, suggestedCategory } = MerchantCleanerService.cleanMerchantName(
        transaction.description
      );

      // Determine category (use suggested or default to 'Other')
      const assignedCategory = suggestedCategory || 'Other';

      // Generate month key
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      processed.push({
        id: transaction.id,
        date,
        description: transaction.description,
        amount: parseFloat(transaction.amount.toString()),
        cleanedMerchant: cleanName,
        assignedCategory,
        monthKey,
      });

      // Update transaction in database with cleaned data
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          cleanedMerchant: cleanName,
          assignedCategory,
        },
      });
    }

    return processed;
  }

  /**
   * Group transactions by month key
   */
  private groupTransactionsByMonth(transactions: ProcessedTransaction[]): {
    [monthKey: string]: ProcessedTransaction[];
  } {
    return transactions.reduce((groups, transaction) => {
      if (!groups[transaction.monthKey]) {
        groups[transaction.monthKey] = [];
      }
      groups[transaction.monthKey].push(transaction);
      return groups;
    }, {} as { [monthKey: string]: ProcessedTransaction[] });
  }

  /**
   * Export transactions for a specific month
   */
  private async exportMonthlyTransactions(
    monthKey: string,
    transactions: ProcessedTransaction[]
  ): Promise<void> {
    console.log(`Exporting ${transactions.length} transactions for ${monthKey}`);

    // Create monthly sheet if it doesn't exist
    const sheetName = this.getMonthlySheetName(monthKey);
    await this.sheetsService.createMonthlySheet(this.userId, monthKey, sheetName);

    // Convert to TransactionRow format
    const transactionRows: TransactionRow[] = transactions.map((transaction) => ({
      date: transaction.date.toLocaleDateString('en-US'), // MM/DD/YYYY format
      merchant: transaction.cleanedMerchant,
      amount: transaction.amount,
      category: transaction.assignedCategory,
    }));

    // Filter out duplicates
    const newTransactions: TransactionRow[] = [];
    for (const transaction of transactionRows) {
      const isDuplicate = await this.sheetsService.checkForDuplicateTransaction(
        this.userId,
        monthKey,
        transaction
      );
      if (!isDuplicate) {
        newTransactions.push(transaction);
      } else {
        console.log(`Skipping duplicate transaction: ${transaction.merchant} - ${transaction.amount}`);
      }
    }

    if (newTransactions.length === 0) {
      console.log('All transactions were duplicates, skipping append');
      return;
    }

    // Append to Google Sheets
    await this.sheetsService.appendTransactionsToSheet(this.userId, monthKey, newTransactions);

    // Mark transactions as exported in database
    const transactionIds = transactions.map((t) => t.id);
    await prisma.transaction.updateMany({
      where: {
        id: { in: transactionIds },
      },
      data: {
        exported: true,
        exportedAt: new Date(),
      },
    });

    // Update monthly sheet reference in transactions
    const monthlySheet = await prisma.monthlySheet.findFirst({
      where: {
        personalFinanceSheet: { userId: this.userId },
        monthKey,
      },
    });

    if (monthlySheet) {
      await prisma.transaction.updateMany({
        where: {
          id: { in: transactionIds },
        },
        data: {
          monthlySheetId: monthlySheet.id,
        },
      });
    }
  }

  /**
   * Generate monthly sheet name from month key
   */
  private getMonthlySheetName(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthName = monthNames[parseInt(month) - 1];
    return `Expense Tracker ${monthName} ${year}`;
  }

  /**
   * Complete a successful export
   */
  private async completeExport(
    statementId: string,
    exportJobId: string,
    result: ExportResult
  ): Promise<void> {
    const success = result.failedCount === 0;
    result.success = success;

    // Update statement
    await prisma.statement.update({
      where: { id: statementId },
      data: {
        status: success ? StatementStatus.COMPLETED : StatementStatus.FAILED,
        exportedAt: success ? new Date() : undefined,
        exportError: success ? null : result.errors.join('; '),
      },
    });

    // Update export job
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: success ? ExportJobStatus.COMPLETED : ExportJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: success ? null : result.errors.join('; '),
      },
    });
  }

  /**
   * Mark export as failed
   */
  private async failExport(statementId: string, errorMessage: string): Promise<void> {
    // Increment retry count
    const statement = await prisma.statement.findUnique({
      where: { id: statementId },
    });

    if (!statement) return;

    const newAttempts = statement.exportAttempts + 1;
    const maxAttempts = 3;

    await prisma.statement.update({
      where: { id: statementId },
      data: {
        exportAttempts: newAttempts,
        exportError: errorMessage,
        lastRetryAt: new Date(),
        status: newAttempts >= maxAttempts ? StatementStatus.FAILED : StatementStatus.EXPORT_RETRYING,
      },
    });

    // Update export job
    const exportJob = await prisma.exportJob.findFirst({
      where: { statementId },
      orderBy: { createdAt: 'desc' },
    });

    if (exportJob) {
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: ExportJobStatus.FAILED,
          attempts: newAttempts,
          errorMessage,
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Retry failed export
   */
  static async retryFailedExport(statementId: string): Promise<ExportResult> {
    const statement = await prisma.statement.findUnique({
      where: { id: statementId },
      include: { user: true },
    });

    if (!statement) {
      throw new Error('Statement not found');
    }

    if (statement.exportAttempts >= 3) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Get user's Google credentials
    const account = await prisma.account.findFirst({
      where: {
        userId: statement.userId,
        provider: 'google',
      },
    });

    if (!account || !account.access_token) {
      throw new Error('Google credentials not found');
    }

    const credentials: GoogleSheetsCredentials = {
      access_token: account.access_token,
      refresh_token: account.refresh_token || undefined,
      expires_at: account.expires_at || undefined,
    };

    const exportService = new ExportService(statement.userId, credentials);
    return await exportService.exportStatement(statementId);
  }

  /**
   * Get export status for a statement
   */
  static async getExportStatus(statementId: string) {
    const statement = await prisma.statement.findUnique({
      where: { id: statementId },
      include: {
        exportJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        transactions: {
          where: { exported: true },
        },
      },
    });

    if (!statement) {
      throw new Error('Statement not found');
    }

    const latestJob = statement.exportJobs[0];

    return {
      status: statement.status,
      exportAttempts: statement.exportAttempts,
      exportedAt: statement.exportedAt,
      exportError: statement.exportError,
      exportedTransactions: statement.transactions.length,
      latestJob: latestJob
        ? {
            status: latestJob.status,
            startedAt: latestJob.startedAt,
            completedAt: latestJob.completedAt,
            totalTransactions: latestJob.totalTransactions,
            processedTransactions: latestJob.processedTransactions,
            failedTransactions: latestJob.failedTransactions,
            errorMessage: latestJob.errorMessage,
          }
        : null,
    };
  }

  /**
   * Export transactions directly from processed statement data (without saving to database)
   */
  async exportTransactionsFromProcessedData(
    statementId: string, 
    processedData: ProcessedStatementData
  ): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exportedCount: 0,
      failedCount: 0,
      errors: [],
      monthlySheets: [],
    };

    try {
      console.log(`Starting export from processed data for statement ${statementId}`);

      // Extract all transactions from all accounts
      const allTransactions: Array<{
        date: Date;
        description: string;
        amount: number;
        cleanedMerchant: string;
        assignedCategory: string;
        monthKey: string;
      }> = [];

      // Process each account's transactions
      for (const account of processedData.accounts) {
        if (!account.allTransactions) continue;

        // Process each transaction category
        for (const [category, transactions] of Object.entries(account.allTransactions)) {
          for (const transaction of transactions) {
            if (!transaction.date || !transaction.description || transaction.amount === null || transaction.amount === undefined) {
              console.warn(`Skipping incomplete transaction:`, transaction);
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
              continue;
            }

            // Clean merchant name and get category suggestion
            const { cleanName, suggestedCategory } = MerchantCleanerService.cleanMerchantName(
              transaction.description
            );

            // Determine category (use suggested or default to 'Other')
            const assignedCategory = suggestedCategory || 'Other';

            // Generate month key
            const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

            allTransactions.push({
              date: transactionDate,
              description: transaction.description,
              amount: Math.abs(transaction.amount), // Use absolute value for amounts
              cleanedMerchant: cleanName,
              assignedCategory,
              monthKey,
            });
          }
        }
      }

      if (allTransactions.length === 0) {
        console.log('No transactions found in processed data');
        result.success = true;
        return result;
      }

      console.log(`Found ${allTransactions.length} transactions to export`);

      // Group transactions by month
      const transactionsByMonth = allTransactions.reduce((groups, transaction) => {
        if (!groups[transaction.monthKey]) {
          groups[transaction.monthKey] = [];
        }
        groups[transaction.monthKey].push(transaction);
        return groups;
      }, {} as { [monthKey: string]: typeof allTransactions });

      // Export each month's transactions
      for (const [monthKey, monthTransactions] of Object.entries(transactionsByMonth)) {
        try {
          await this.exportMonthlyTransactionsFromData(monthKey, monthTransactions);
          result.exportedCount += monthTransactions.length;
          result.monthlySheets.push(this.getMonthlySheetName(monthKey));
        } catch (error) {
          console.error(`Error exporting month ${monthKey}:`, error);
          result.errors.push(`Failed to export ${monthKey}: ${error instanceof Error ? error.message : String(error)}`);
          result.failedCount += monthTransactions.length;
        }
      }

      // Determine overall success
      result.success = result.failedCount === 0;

      console.log(`Export completed: ${result.exportedCount} exported, ${result.failedCount} failed`);
      return result;
    } catch (error) {
      console.error('Export from processed data failed:', error);
      result.errors.push(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Export transactions for a specific month from processed data (without database)
   */
  private async exportMonthlyTransactionsFromData(
    monthKey: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      cleanedMerchant: string;
      assignedCategory: string;
      monthKey: string;
    }>
  ): Promise<void> {
    console.log(`Exporting ${transactions.length} transactions for ${monthKey}`);

    // Create monthly sheet if it doesn't exist
    const sheetName = this.getMonthlySheetName(monthKey);
    await this.sheetsService.createMonthlySheet(this.userId, monthKey, sheetName);

    // Convert to TransactionRow format
    const transactionRows: TransactionRow[] = transactions.map((transaction) => ({
      date: transaction.date.toLocaleDateString('en-US'), // MM/DD/YYYY format
      merchant: transaction.cleanedMerchant,
      amount: transaction.amount,
      category: transaction.assignedCategory,
    }));

    // Filter out duplicates
    const newTransactions: TransactionRow[] = [];
    for (const transaction of transactionRows) {
      const isDuplicate = await this.sheetsService.checkForDuplicateTransaction(
        this.userId,
        monthKey,
        transaction
      );
      if (!isDuplicate) {
        newTransactions.push(transaction);
      } else {
        console.log(`Skipping duplicate transaction: ${transaction.merchant} - ${transaction.amount}`);
      }
    }

    if (newTransactions.length === 0) {
      console.log('All transactions were duplicates, skipping append');
      return;
    }

    // Append to Google Sheets
    await this.sheetsService.appendTransactionsToSheet(this.userId, monthKey, newTransactions);
    console.log(`Successfully exported ${newTransactions.length} new transactions to ${sheetName}`);
  }

  /**
   * Process failed export jobs with retry logic
   */
  static async processFailedExports(): Promise<void> {
    console.log('Processing failed export jobs...');

    try {
      // Find statements that need retry (failed with attempts < 3)
      const failedStatements = await prisma.statement.findMany({
        where: {
          status: StatementStatus.EXPORT_RETRYING,
          exportAttempts: { lt: 3 },
          OR: [
            { lastRetryAt: null },
            { lastRetryAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } } // 5 minutes ago
          ]
        },
        include: {
          user: {
            include: {
              accounts: {
                where: { provider: 'google' }
              }
            }
          }
        },
        take: 10, // Process up to 10 at a time
      });

      console.log(`Found ${failedStatements.length} statements to retry`);

      for (const statement of failedStatements) {
        try {
          const googleAccount = statement.user.accounts.find(acc => acc.provider === 'google');

          if (!googleAccount || !googleAccount.access_token) {
            console.log(`No Google credentials for statement ${statement.id}, marking as failed`);
            await prisma.statement.update({
              where: { id: statement.id },
              data: {
                status: StatementStatus.FAILED,
                exportError: 'No Google credentials available',
              },
            });
            continue;
          }

          // Check if user has Google Sheets permission
          const hasSheetPermission = googleAccount.scope?.includes('https://www.googleapis.com/auth/spreadsheets');

          if (!hasSheetPermission) {
            console.log(`No Google Sheets permission for statement ${statement.id}, marking as failed`);
            await prisma.statement.update({
              where: { id: statement.id },
              data: {
                status: StatementStatus.FAILED,
                exportError: 'Google Sheets permission not granted',
              },
            });
            continue;
          }

          // Update retry attempt
          await prisma.statement.update({
            where: { id: statement.id },
            data: {
              exportAttempts: statement.exportAttempts + 1,
              lastRetryAt: new Date(),
              status: StatementStatus.EXPORTING,
            },
          });

          // We would need the original processed data to retry, but since we don't store it,
          // we'll need to reprocess the file
          console.log(`Retrying export for statement ${statement.id} (attempt ${statement.exportAttempts + 1})`);

          // For now, just mark as failed since we can't reprocess without the original data
          // In a full implementation, you might want to store the processed data temporarily
          // or reprocess the file
          await prisma.statement.update({
            where: { id: statement.id },
            data: {
              status: statement.exportAttempts >= 2 ? StatementStatus.FAILED : StatementStatus.EXPORT_RETRYING,
              exportError: 'Retry not implemented - original processed data not available',
            },
          });

        } catch (error) {
          console.error(`Error retrying statement ${statement.id}:`, error);

          await prisma.statement.update({
            where: { id: statement.id },
            data: {
              exportAttempts: statement.exportAttempts + 1,
              lastRetryAt: new Date(),
              status: statement.exportAttempts >= 2 ? StatementStatus.FAILED : StatementStatus.EXPORT_RETRYING,
              exportError: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error processing failed exports:', error);
    }
  }
} 