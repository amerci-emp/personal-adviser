import { prisma, Prisma } from './prisma';
import { PlaidService } from './plaid-service';
import { PlaidItem, AccountType as AppAccountType } from '@prisma/client';
import { TransactionProcessor } from './transaction-processor';
import { extractPlaidCategoryData, extractMerchantName, logPlaidExtractionDebug } from './plaid-data-extractor';
import {
  RemovedTransaction,
  Transaction as PlaidTransaction,
  AccountType as PlaidAccountType,
  AccountSubtype as PlaidAccountSubtype,
} from 'plaid';
import fs from 'fs';
import path from 'path';

// This is the data we need to create a transaction, minus the statementId which we add later.
type NormalizedTransactionInput = Omit<Prisma.TransactionCreateManyInput, 'statementId'>;


async function normalizePlaidTransaction(
  plaidTx: PlaidTransaction
): Promise<NormalizedTransactionInput> {
  const plaidCategory = plaidTx.personal_finance_category?.primary || null;

  // Define vague categories that should trigger a review
  const vagueCategories = ['GENERAL_MERCHANDISE', 'GENERAL_SERVICES', 'GOVERNMENT_AND_NON_PROFIT', 'TRANSFER_OUT', 'TRANSFER_IN'];

  let needsReview = false;

  if (!plaidCategory || vagueCategories.includes(plaidCategory)) {
    needsReview = true;
    // Placeholder for AI categorization call
    // In a future step, we will replace this with a call to an AI service
    // For now, we'll just flag it for manual review.
    console.log(`[Categorization] Transaction "${plaidTx.name}" needs review. Plaid category: ${plaidCategory}`);
  }

  return {
    description: plaidTx.merchant_name || plaidTx.name,
    amount: plaidTx.amount,
    transactionDate: new Date(plaidTx.date),
    source: 'PLAID',
    plaidTransactionId: plaidTx.transaction_id,
    originalText: JSON.stringify(plaidTx), // Store original data for debugging
    needsReview: needsReview, 
    exported: false,
    cleanedMerchant: plaidTx.merchant_name,
  };
}

export class PlaidSyncService {
  /**
   * Syncs transactions for all active Plaid items in the system.
   * This method is intended to be called by a cron job.
   */
  static async syncAllItems() {
    const activeItems = await prisma.plaidItem.findMany({
      where: { isActive: true, syncStatus: 'ACTIVE' },
    });

    console.log(`[PlaidSyncService] Found ${activeItems.length} active items to sync.`);

    for (const item of activeItems) {
      try {
        await this.syncAccounts(item); // Sync accounts first
        await this.syncItem(item); // Then sync transactions
      } catch (error: any) {
        console.error(`[PlaidSyncService] Failed to sync item ${item.id}. Error: ${error.message}`);
        // TODO: Implement more robust error handling, e.g., updating item syncStatus
      }
    }
  }

  /**
   * Syncs transactions for a single Plaid item.
   */
  static async syncItem(item: PlaidItem) {
    const plaidService = new PlaidService();

    let cursor = item.cursor;
    let added: PlaidTransaction[] = [];
    let modified: PlaidTransaction[] = [];
    let removed: RemovedTransaction[] = [];
    let hasMore = true;

    console.log(`[PlaidSyncService] Starting sync for item ${item.id} (${item.institutionName})`);

    // Paginate through sync results until hasMore is false
    while (hasMore) {
      let syncData = await plaidService.syncTransactions(item.accessToken, cursor);
      
      // --- Log Raw Transaction Data to File ---
      try {
        const logPath = path.join(process.cwd(), 'plaid-transactions-log.json');
        const logData = `--- Page for item ${item.id} at ${new Date().toISOString()} ---\n${JSON.stringify(syncData, null, 2)}\n\n`;
        fs.appendFileSync(logPath, logData);
        console.log(`[PlaidSyncService] Appended transaction data to ${logPath}`);
      } catch (e) {
        console.error("[PlaidSyncService] Failed to write transaction log file:", e);
      }
      // ------------------------------------
      
      added = added.concat(syncData.added);
      modified = modified.concat(syncData.modified);
      removed = removed.concat(syncData.removed);
      hasMore = syncData.has_more;
      cursor = syncData.next_cursor;

      console.log(`[PlaidSyncService] Fetched page for item ${item.id}. Added: ${syncData.added.length}, Modified: ${syncData.modified.length}, Removed: ${syncData.removed.length}. Has more: ${hasMore}`);
      
      // Note: Fallback data is now handled directly in PlaidService.syncTransactionsRaw()
      // This provides more reliable fallback when Plaid sandbox is empty
    }

    // --- Process Added Transactions ---
    const createdTransactions: any[] = [];
    
    if (added.length > 0) {
      for (const tx of added) {
        const monthKey = tx.date.slice(0, 7); // YYYY-MM
        const year = parseInt(monthKey.split('-')[0]);
        const month = parseInt(monthKey.split('-')[1]);

        const virtualStatementFilename = `Plaid Sync - ${item.institutionName} - ${monthKey}`;

        let statement = await prisma.statement.findFirst({
          where: {
            userId: item.userId,
            filename: virtualStatementFilename,
          },
        });

        if (!statement) {
          statement = await prisma.statement.create({
            data: {
              userId: item.userId,
              filename: virtualStatementFilename,
              status: 'COMPLETED',
              periodStart: new Date(year, month - 1, 1),
              periodEnd: new Date(year, month, 0),
            },
          });
          console.log(`[PlaidSyncService] Created virtual statement: ${statement.id} for ${monthKey}`);
        }

        const normalizedTx = await normalizePlaidTransaction(tx);
        
        // Extract Plaid category and confidence data
        const plaidData = extractPlaidCategoryData(tx);
        const merchantName = extractMerchantName(tx);
        
        // Log extraction for debugging
        logPlaidExtractionDebug(tx, plaidData);
        
        // Create transaction with intelligence fields
        const createdTransaction = await prisma.transaction.create({
          data: {
            ...normalizedTx,
            statementId: statement.id,
            // Intelligence fields
            needsReview: true, // Default to review until processed
            source: 'PLAID',
            plaidTransactionId: tx.transaction_id,
            direction: tx.amount < 0 ? 'OUTFLOW' : 'INFLOW',
            originalText: JSON.stringify(tx), // Store raw Plaid data
            merchantName: merchantName,
          },
        });
        
        // Store the extracted Plaid data on the transaction object for pattern processing
        (createdTransaction as any).plaidCategory = plaidData.category;
        (createdTransaction as any).plaidConfidence = plaidData.confidence;
        
        createdTransactions.push(createdTransaction);
      }
      console.log(`[PlaidSyncService] Saved ${added.length} new transactions for item ${item.id}.`);
      
      // Run intelligence pipeline on new transactions
      if (createdTransactions.length > 0) {
        console.log(`🧠 [PlaidSyncService] Running intelligence pipeline on ${createdTransactions.length} new transactions...`);
        
        // Convert to TransactionLike format expected by processor
        const transactionsForProcessing = createdTransactions.map(t => ({
          id: t.id,
          description: t.description,
          merchantName: t.merchantName,
          amount: t.amount,
          userId: t.userId
        }));

        // Run the intelligence pipeline (defer AI processing until after category customization)
        const processingStats = await TransactionProcessor.processNewTransactions(
          transactionsForProcessing,
          item.userId,
          false // Defer AI processing until user customizes categories
        );

        console.log(`🎉 [PlaidSyncService] Intelligence processing complete:`, processingStats);
      }
    }
    
    // TODO: Process Modified and Removed Transactions
    if (modified.length > 0) {
      console.log(`[PlaidSyncService] ${modified.length} modified transactions to process for item ${item.id}. Logic not yet implemented.`);
    }
    if (removed.length > 0) {
      console.log(`[PlaidSyncService] ${removed.length} removed transactions to process for item ${item.id}. Logic not yet implemented.`);
    }

    // --- Update Cursor ---
    await prisma.plaidItem.update({
      where: { id: item.id },
      data: {
        cursor: cursor,
        lastSync: new Date(),
      },
    });

    console.log(`[PlaidSyncService] Successfully completed sync for item ${item.id}. New cursor set.`);
  }

  static async syncAccounts(item: PlaidItem) {
    const plaidService = new PlaidService();
    const accountsResponse = await plaidService.getAccounts(item.accessToken);
    
    // --- Log Raw Account Data to File ---
    try {
      const logPath = path.join(process.cwd(), 'plaid-accounts-log.json');
      fs.writeFileSync(logPath, JSON.stringify(accountsResponse, null, 2));
      console.log(`[PlaidSyncService] Wrote account data to ${logPath}`);
    } catch (e) {
        console.error("[PlaidSyncService] Failed to write account log file:", e);
    }
    // ------------------------------------

    const { accounts: plaidAccounts } = accountsResponse;
    console.log(`[PlaidSyncService] Found ${plaidAccounts.length} accounts to sync for item ${item.id}.`);
    for (const plaidAccount of plaidAccounts) {
      const accountType = this.mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype as PlaidAccountSubtype);
      const bankAccount = await prisma.bankAccount.upsert({
        where: {
          userId_financialInstitution_lastFourDigits: {
            userId: item.userId,
            financialInstitution: item.institutionName,
            lastFourDigits: plaidAccount.mask || '',
          },
        },
        update: { balance: plaidAccount.balances.current },
        create: {
          userId: item.userId,
          name: plaidAccount.name,
          financialInstitution: item.institutionName,
          accountType: accountType,
          lastFourDigits: plaidAccount.mask,
          balance: plaidAccount.balances.current,
        },
      });
      await prisma.plaidAccount.upsert({
        where: {
          plaidItemId_accountId: {
            plaidItemId: item.id,
            accountId: plaidAccount.account_id,
          },
        },
        update: { bankAccountId: bankAccount.id },
        create: {
          plaidItemId: item.id,
          accountId: plaidAccount.account_id,
          bankAccountId: bankAccount.id,
          name: plaidAccount.name,
          officialName: plaidAccount.official_name,
          mask: plaidAccount.mask,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype,
        },
      });
    }
    console.log(`[PlaidSyncService] Finished syncing accounts for item ${item.id}.`);
  }

  private static mapPlaidAccountType(
    type: PlaidAccountType,
    subtype: PlaidAccountSubtype | null
  ): AppAccountType {
    if (type === PlaidAccountType.Credit) return 'CREDIT';
    if (type === PlaidAccountType.Investment || type === PlaidAccountType.Brokerage) return 'INVESTMENT';
    if (type === PlaidAccountType.Depository) {
      if (subtype === 'checking') return 'CHECKING';
      if (subtype === 'savings') return 'SAVINGS';
    }
    return 'OTHER';
  }
} 