import { google } from 'googleapis';
import { prisma } from './prisma';

export interface GoogleSheetsEmbedHelper {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class GoogleSheetsEmbedService {
  private auth: any;
  private drive: any;

  constructor(credentials: GoogleSheetsEmbedHelper) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.auth.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expires_at ? credentials.expires_at * 1000 : undefined,
    });

    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Ensure a spreadsheet is properly shared for embedding
   */
  async ensureSpreadsheetIsEmbeddable(spreadsheetId: string): Promise<boolean> {
    try {
      console.log(`Checking if spreadsheet ${spreadsheetId} is embeddable...`);

      // Check current permissions
      const permissions = await this.drive.permissions.list({
        fileId: spreadsheetId,
        fields: 'permissions(id,type,role,allowFileDiscovery)',
      });

      // Check if there's already a public permission
      const hasPublicPermission = permissions.data.permissions?.some(
        (permission: any) => permission.type === 'anyone' && permission.role === 'reader'
      );

      if (hasPublicPermission) {
        console.log('Spreadsheet is already publicly readable');
        return true;
      }

      // Add public read permission
      console.log('Making spreadsheet publicly readable for embedding...');
      await this.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: false, // Don't allow discovery in search
        },
      });

      console.log('Successfully made spreadsheet embeddable');
      return true;
    } catch (error) {
      console.error('Error ensuring spreadsheet is embeddable:', error);
      return false;
    }
  }

  /**
   * Get the proper embed URL for a spreadsheet
   */
  getEmbedUrl(spreadsheetId: string, options: {
    viewMode?: 'edit' | 'view' | 'preview';
    sheetId?: number;
  } = {}): string {
    const { viewMode = 'view', sheetId } = options;
    
    let baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    // Add sheet-specific reference if provided
    if (sheetId !== undefined) {
      baseUrl += `#gid=${sheetId}`;
    }
    
    // Add appropriate parameters based on view mode
    switch (viewMode) {
      case 'edit':
        return `${baseUrl}/edit?usp=sharing&embedded=true`;
      case 'view':
        return `${baseUrl}/edit?usp=sharing&embedded=true&rm=minimal`;
      case 'preview':
        return `${baseUrl}/preview?usp=sharing&embedded=true`;
      default:
        return `${baseUrl}/edit?usp=sharing&embedded=true&rm=minimal`;
    }
  }

  /**
   * Get direct URLs for specific monthly sheets
   */
  async getMonthlySheetEmbedUrls(userId: string): Promise<Array<{
    monthKey: string;
    sheetName: string;
    embedUrl: string;
    directUrl: string;
  }>> {
    try {
      const personalFinanceSheet = await prisma.personalFinanceSpreadsheet.findUnique({
        where: { userId },
        include: {
          monthlySheets: {
            orderBy: { createdAt: 'desc' },
            take: 12, // Last 12 months
          },
        },
      });

      if (!personalFinanceSheet) {
        return [];
      }

      return personalFinanceSheet.monthlySheets.map(sheet => ({
        monthKey: sheet.monthKey,
        sheetName: sheet.sheetName,
        embedUrl: this.getEmbedUrl(personalFinanceSheet.spreadsheetId, {
          viewMode: 'view',
          sheetId: sheet.sheetId,
        }),
        directUrl: `https://docs.google.com/spreadsheets/d/${personalFinanceSheet.spreadsheetId}/edit#gid=${sheet.sheetId}`,
      }));
    } catch (error) {
      console.error('Error getting monthly sheet URLs:', error);
      return [];
    }
  }

  /**
   * Check if user has the necessary permissions for Google Sheets
   */
  static async hasGoogleSheetsAccess(userId: string): Promise<{
    hasAccess: boolean;
    hasRefreshToken: boolean;
    reason?: string;
  }> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
      });

      if (!account) {
        return {
          hasAccess: false,
          hasRefreshToken: false,
          reason: 'No Google account connected',
        };
      }

      if (!account.scope?.includes('https://www.googleapis.com/auth/spreadsheets')) {
        return {
          hasAccess: false,
          hasRefreshToken: !!account.refresh_token,
          reason: 'Google Sheets permission not granted',
        };
      }

      if (!account.refresh_token) {
        return {
          hasAccess: false,
          hasRefreshToken: false,
          reason: 'No refresh token available - please re-authenticate',
        };
      }

      return {
        hasAccess: true,
        hasRefreshToken: true,
      };
    } catch (error) {
      console.error('Error checking Google Sheets access:', error);
      return {
        hasAccess: false,
        hasRefreshToken: false,
        reason: 'Error checking permissions',
      };
    }
  }

  /**
   * Initialize embed service for a user
   */
  static async forUser(userId: string): Promise<GoogleSheetsEmbedService | null> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
      });

      if (!account || !account.access_token || !account.refresh_token) {
        return null;
      }

      const credentials: GoogleSheetsEmbedHelper = {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at || undefined,
      };

      return new GoogleSheetsEmbedService(credentials);
    } catch (error) {
      console.error('Error creating embed service for user:', error);
      return null;
    }
  }
} 