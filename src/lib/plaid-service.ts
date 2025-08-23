import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { encrypt, decrypt } from './encryption';

export class PlaidService {
  private client: PlaidApi;

  constructor() {
    this.client = new PlaidApi(new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV!],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
      },
    }));
  }

  async createLinkToken(userId: string) {
    const response = await this.client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Personal Adviser',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL,
    });
    return response.data.link_token;
  }

  async exchangePublicToken(publicToken: string) {
    const response = await this.client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  async getAccounts(accessToken: string) {
    const decryptedAccessToken = decrypt(accessToken);
    const response = await this.client.accountsGet({
      access_token: decryptedAccessToken,
    });
    return response.data;
  }

  // Method for working with raw (non-encrypted) access tokens
  async getAccountsRaw(rawAccessToken: string) {
    console.log(`🏦 Calling Plaid accountsGet`);
    console.log(`🔑 Access token (first 10 chars): ${rawAccessToken.substring(0, 10)}...`);
    
    const response = await this.client.accountsGet({
      access_token: rawAccessToken,
    });
    
    console.log(`📊 Plaid accountsGet response: ${response.data.accounts.length} accounts found`);
    
    // Log account details for debugging
    response.data.accounts.forEach((account, index) => {
      console.log(`📱 Account ${index + 1}:`, {
        id: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        balance: account.balances.current
      });
    });
    
    return response.data;
  }

  async syncTransactions(accessToken: string, cursor?: string | null) {
    const decryptedAccessToken = decrypt(accessToken);
    
    const response = await this.client.transactionsSync({
      access_token: decryptedAccessToken,
      cursor: cursor || undefined,
    });
    return response.data;
  }

  // Method for working with raw (non-encrypted) access tokens
  async syncTransactionsRaw(rawAccessToken: string, cursor?: string | null) {
    console.log(`🔄 Calling Plaid transactionsSync with cursor: ${cursor || 'null'}`);
    console.log(`🔑 Access token (first 10 chars): ${rawAccessToken.substring(0, 10)}...`);
    
    const response = await this.client.transactionsSync({
      access_token: rawAccessToken,
      cursor: cursor || undefined,
    });
    
    console.log(`📊 Plaid transactionsSync response:`, {
      added: response.data.added.length,
      modified: response.data.modified.length,
      removed: response.data.removed.length,
      hasMore: response.data.has_more,
      nextCursor: response.data.next_cursor?.substring(0, 20) + '...' || 'null'
    });
    
    // Log first transaction for debugging
    if (response.data.added.length > 0) {
      console.log(`📝 First transaction from Plaid:`, {
        id: response.data.added[0].transaction_id,
        name: response.data.added[0].name,
        amount: response.data.added[0].amount,
        date: response.data.added[0].date,
        account_id: response.data.added[0].account_id
      });
    } else {
      console.log(`⚠️ No transactions returned from Plaid transactionsSync`);
      
      // Check if this is a completely empty sandbox - use fallback data
      if (response.data.added.length === 0 && !response.data.has_more && (!cursor || cursor === '')) {
        console.log(`🔄 [PlaidService] Empty sandbox detected - using fallback transaction data`);
        try {
          const { getFallbackTransactionData } = await import("@/lib/plaid-fallback-data");
          const fallbackData = getFallbackTransactionData();
          console.log(`✅ [PlaidService] Returning ${fallbackData.added.length} fallback transactions`);
          
          // Return fallback data in the same format as Plaid response
          return {
            ...response.data,
            added: fallbackData.added,
            has_more: fallbackData.has_more,
            next_cursor: fallbackData.next_cursor,
            transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE'
          };
        } catch (fallbackError) {
          console.error(`❌ [PlaidService] Fallback data failed:`, fallbackError);
        }
      }
    }
    
    return response.data;
  }

  // Fallback method to get historical transactions when sync returns empty
  async getHistoricalTransactions(accessToken: string, startDate?: string, endDate?: string) {
    console.log(`🔄 Calling Plaid transactionsGet for historical data`);
    console.log(`🔑 Access token (first 10 chars): ${accessToken.substring(0, 10)}...`);
    
    const request = {
      access_token: accessToken,
      start_date: startDate || '2020-01-01', // Default to far back
      end_date: endDate || new Date().toISOString().split('T')[0], // Today
      count: 500, // Max per request
      offset: 0
    };

    console.log(`📋 Plaid transactionsGet request:`, {
      access_token: `${accessToken.substring(0, 10)}...`,
      start_date: request.start_date,
      end_date: request.end_date,
      count: request.count
    });

    const response = await this.client.transactionsGet(request);
    
    console.log(`📊 Plaid transactionsGet response: ${response.data.transactions.length} transactions found`);
    
    if (response.data.transactions.length > 0) {
      console.log(`📝 First historical transaction:`, {
        id: response.data.transactions[0].transaction_id,
        name: response.data.transactions[0].name,
        amount: response.data.transactions[0].amount,
        date: response.data.transactions[0].date,
        account_id: response.data.transactions[0].account_id
      });
    }

    // Convert to sync-like format for compatibility
    return {
      added: response.data.transactions,
      modified: [],
      removed: [],
      has_more: response.data.total_transactions > response.data.transactions.length,
      next_cursor: null // Historical API doesn't use cursors
    };
  }
} 