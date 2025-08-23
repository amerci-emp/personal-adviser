import { PlaidService } from './plaid-service';
import { encrypt } from './encryption';
import type { PrismaClient } from '@prisma/client';
import { TransactionProcessor } from './transaction-processor';
import { extractPlaidCategoryData, extractPlaidCategoriesArray, extractMerchantName, logPlaidExtractionDebug } from './plaid-data-extractor';

export class PlaidImportService {
  private plaidService: PlaidService;

  constructor() {
    this.plaidService = new PlaidService();
  }

  async importAccountData(
    prisma: PrismaClient,
    accessToken: string,
    bankAccountId: string,
    userId: string
  ) {
    try {
      console.log('🔄 Starting account data import...');

      // 1. Get accounts from Plaid (using raw token)
      const accountsData = await this.plaidService.getAccountsRaw(accessToken);
      console.log(`📊 Found ${accountsData.accounts.length} accounts`);

      // 2. Update bank account with real data from first account
      if (accountsData.accounts.length > 0) {
        const firstAccount = accountsData.accounts[0];
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            name: firstAccount.name,
            accountType: firstAccount.type,
            lastFourDigits: firstAccount.mask || null,
            balance: firstAccount.balances.current || null,
          },
        });
        console.log(`✅ Updated bank account with real data`);
      }

      // 3. Sync transactions (using raw token)
      console.log(`🔄 About to sync transactions with access token: ${accessToken.substring(0, 10)}...`);
      const transactionsData = await this.plaidService.syncTransactionsRaw(accessToken);
      console.log(`📝 Found ${transactionsData.added.length} transactions`);
      console.log(`📊 Transaction sync details:`, {
        added: transactionsData.added.length,
        modified: transactionsData.modified.length,
        removed: transactionsData.removed.length,
        hasMore: transactionsData.has_more,
        nextCursor: transactionsData.next_cursor ? 'present' : 'null'
      });
      
      // Log transaction data for debugging
      if (transactionsData.added.length > 0) {
        console.log('📋 Sample transaction:', JSON.stringify(transactionsData.added[0], null, 2));
        console.log('📋 All transaction IDs:', transactionsData.added.map(t => ({ 
          id: t.transaction_id, 
          name: t.name, 
          amount: t.amount, 
          date: t.date 
        })));
      } else {
        console.log('⚠️ No transactions found - this might be normal for a new sandbox account');
      }

      // 4. Create a statement record (simplified)
      const statement = await prisma.statement.create({
        data: {
          userId,
          bankAccountId,
          filename: `plaid-import-${Date.now()}.json`,
          s3Key: `plaid-imports/${userId}/${Date.now()}.json`,
          status: 'PROCESSED',
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          periodEnd: new Date(),
        },
      });
      console.log(`📄 Created statement record`);

      // 5. Import transactions and collect for intelligence processing
      let importedCount = 0;
      const createdTransactions: any[] = [];
      
      console.log(`💾 Starting to import ${transactionsData.added.length} transactions to database...`);
      
      for (const transaction of transactionsData.added) {
        try {
          console.log(`💳 Processing transaction: ${transaction.name} (${transaction.transaction_id})`);
          
          // Extract Plaid category and confidence data
          const plaidData = extractPlaidCategoryData(transaction);
          const plaidCategoriesArray = extractPlaidCategoriesArray(transaction);
          const merchantName = extractMerchantName(transaction);
          
          // Log extraction for debugging
          logPlaidExtractionDebug(transaction, plaidData);
          console.log(`📋 Extracted Plaid categories: [${plaidCategoriesArray.join(', ')}]`);
          
          console.log(`💾 Creating transaction in database...`);
          const createdTransaction = await prisma.transaction.create({
            data: {
              statementId: statement.id,
              bankAccountId,
              userId, // Required field
              description: transaction.name,
              amount: Math.abs(transaction.amount), // Plaid uses negative for outflows
              date: new Date(transaction.date),
              category: 'uncategorized', // Will be updated by mapping service
              plaidCategories: plaidCategoriesArray, // Store Plaid categories array
              // Intelligence fields - will be set by TransactionProcessor
              needsReview: true, // Default to review until processed
              source: 'PLAID',
              plaidTransactionId: transaction.transaction_id,
              direction: transaction.amount < 0 ? 'outflow' : 'inflow',
              originalText: JSON.stringify(transaction), // Store raw Plaid data for debugging
              merchantName: merchantName,
            },
          });
          
          // Store the extracted Plaid data on the transaction object for pattern processing
          (createdTransaction as any).plaidCategories = plaidCategoriesArray;
          (createdTransaction as any).plaidConfidence = plaidData.confidence;
          
          console.log(`✅ Successfully created transaction in database: ${createdTransaction.id}`);
          
          createdTransactions.push(createdTransaction);
          importedCount++;
        } catch (error) {
          console.error(`❌ Failed to import transaction: ${transaction.name}`, error);
        }
      }
      
      console.log(`📊 Database import completed: ${importedCount}/${transactionsData.added.length} transactions imported`)

      // 6. If no transactions were imported, just log it
      if (importedCount === 0) {
        console.log('ℹ️ No transactions found from Plaid for this account. This is normal for new accounts or accounts with no recent activity.');
      }

      // 7. Process transactions through intelligence pipeline
      if (createdTransactions.length > 0) {
        console.log(`🧠 Running intelligence pipeline on ${createdTransactions.length} transactions...`);
        
        // Convert to TransactionLike format expected by processor, including Plaid data
        const transactionsForProcessing = createdTransactions.map(t => ({
          id: t.id,
          description: t.description,
          merchantName: t.merchantName,
          amount: t.amount,
          userId: t.userId,
          // Include extracted Plaid data for pattern creation
          plaidCategory: (t as any).plaidCategory,
          plaidConfidence: (t as any).plaidConfidence
        }));

        // Run the intelligence pipeline (defer AI processing until after category customization)
        const processingStats = await TransactionProcessor.processNewTransactions(
          transactionsForProcessing,
          userId,
          false // Defer AI processing for initial imports
        );

        console.log(`🎉 Intelligence processing complete:`, processingStats);
      }

      // 8. Verify what's actually in the database
      const dbTransactionCount = await prisma.transaction.count({
        where: { userId: userId }
      });
      console.log(`🔍 Database verification: ${dbTransactionCount} total transactions for user ${userId}`);
      
      const recentTransactions = await prisma.transaction.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, description: true, amount: true, date: true, createdAt: true }
      });
      console.log(`📝 Recent transactions in database:`, recentTransactions);

      console.log(`✅ Import complete: ${importedCount} transactions imported`);
      
      return {
        success: true,
        accountsCount: accountsData.accounts.length,
        transactionsCount: importedCount,
        statementId: statement.id,
      };

    } catch (error) {
      console.error('❌ Failed to import account data:', error);
      throw error;
    }
  }
}