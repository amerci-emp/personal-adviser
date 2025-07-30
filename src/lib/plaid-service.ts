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

  async syncTransactions(accessToken: string, cursor?: string | null) {
    const decryptedAccessToken = decrypt(accessToken);
    
    const response = await this.client.transactionsSync({
      access_token: decryptedAccessToken,
      cursor: cursor || undefined,
    });
    return response.data;
  }
} 