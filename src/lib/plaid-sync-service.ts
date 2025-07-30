import { prisma, Prisma } from './prisma';
import { PlaidService } from './plaid-service';
import { PlaidItem, AccountType as AppAccountType } from '@prisma/client';
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


function normalizePlaidTransaction(
  plaidTx: PlaidTransaction
): NormalizedTransactionInput {
  return {
    description: plaidTx.merchant_name || plaidTx.name,
    amount: plaidTx.amount,
    transactionDate: new Date(plaidTx.date),
    source: 'PLAID',
    plaidTransactionId: plaidTx.transaction_id,
    originalText: JSON.stringify(plaidTx), // Store original data for debugging
    needsReview: false, // Plaid data is generally clean
    exported: false,
    assignedCategory: plaidTx.personal_finance_category?.primary || null,
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
      const syncData = await plaidService.syncTransactions(item.accessToken, cursor);
      
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
    }

    // --- Process Added Transactions ---
    if (added.length > 0) {
      const transactionsByMonth = added.reduce((acc, tx) => {
        const monthKey = tx.date.slice(0, 7); // YYYY-MM
        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(tx);
        return acc;
      }, {} as Record<string, PlaidTransaction[]>);

      for (const monthKey in transactionsByMonth) {
        const transactionsForMonth = transactionsByMonth[monthKey];
        const year = parseInt(monthKey.split('-')[0]);
        const month = parseInt(monthKey.split('-')[1]);
        
        const virtualStatementFilename = `Plaid Sync - ${item.institutionName} - ${monthKey}`;

        let statement = await prisma.statement.findFirst({
            where: {
                userId: item.userId,
                filename: virtualStatementFilename,
            }
        });

        if (!statement) {
            statement = await prisma.statement.create({
                data: {
                    userId: item.userId,
                    filename: virtualStatementFilename,
                    status: 'COMPLETED',
                    periodStart: new Date(year, month - 1, 1),
                    periodEnd: new Date(year, month, 0),
                }
            });
            console.log(`[PlaidSyncService] Created virtual statement: ${statement.id} for ${monthKey}`);
        }

        const newTransactions = transactionsForMonth.map(tx => {
            const normalizedTx = normalizePlaidTransaction(tx);
            return {
                ...normalizedTx,
                statementId: statement.id,
            };
        });

        const result = await prisma.transaction.createMany({
            data: newTransactions,
            skipDuplicates: true,
        });

        console.log(`[PlaidSyncService] Saved ${result.count} new transactions for item ${item.id} for month ${monthKey}.`);
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