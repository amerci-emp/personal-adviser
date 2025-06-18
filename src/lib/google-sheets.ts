import { google } from 'googleapis';
import { prisma } from './prisma';

export interface GoogleSheetsCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface MonthlySheetTemplate {
  sheetName: string;
  headers: string[];
  headerColors: { [key: string]: string };
}

export interface TransactionRow {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  [key: string]: string | number;
}

export class GoogleSheetsService {
  private sheets: any;
  private auth: any;

  constructor(credentials: GoogleSheetsCredentials) {
    // Validate credentials
    if (!credentials.access_token) {
      throw new Error('Google access token is required');
    }
    
    if (!credentials.refresh_token) {
      throw new Error('Google refresh token is required. Please re-authenticate with Google to grant offline access.');
    }

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

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Create or get the main "Personal Finance" spreadsheet for a user
   */
  async getOrCreatePersonalFinanceSpreadsheet(userId: string): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }> {
    try {
      // Check if user already has a Personal Finance spreadsheet
      const existingSpreadsheet = await prisma.personalFinanceSpreadsheet.findUnique({
        where: { userId },
      });

      if (existingSpreadsheet) {
        return {
          spreadsheetId: existingSpreadsheet.spreadsheetId,
          spreadsheetUrl: existingSpreadsheet.spreadsheetUrl || '',
        };
      }

      // Create new spreadsheet
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Personal Finance',
          },
          sheets: [
            {
              properties: {
                title: 'Overview',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10,
                },
              },
            },
          ],
        },
      });

      const spreadsheetId = response.data.spreadsheetId!;
      const spreadsheetUrl = response.data.spreadsheetUrl!;

      // Save to database
      await prisma.personalFinanceSpreadsheet.create({
        data: {
          userId,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetName: 'Personal Finance',
        },
      });

      console.log(`Created Personal Finance spreadsheet for user ${userId}: ${spreadsheetId}`);
      return { spreadsheetId, spreadsheetUrl };
    } catch (error) {
      console.error('Error creating/getting Personal Finance spreadsheet:', error);
      throw new Error(`Failed to create Personal Finance spreadsheet: ${error}`);
    }
  }

  /**
   * Create a new monthly sheet within the Personal Finance spreadsheet
   */
  async createMonthlySheet(
    userId: string,
    monthKey: string,
    sheetName: string
  ): Promise<{ sheetId: number; sheetName: string }> {
    try {
      const { spreadsheetId } = await this.getOrCreatePersonalFinanceSpreadsheet(userId);

      // Check if monthly sheet already exists
      const existingSheet = await prisma.monthlySheet.findFirst({
        where: {
          personalFinanceSheet: { userId },
          monthKey,
        },
      });

      if (existingSheet) {
        return {
          sheetId: existingSheet.sheetId,
          sheetName: existingSheet.sheetName,
        };
      }

      // Create the template for monthly expense tracking
      const template = this.getMonthlySheetTemplate(sheetName);

      // Add new sheet to spreadsheet
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: template.headers.length,
                  },
                },
              },
            },
          ],
        },
      });

      const newSheetId = response.data.replies[0].addSheet.properties.sheetId;

      // Set up the headers and formatting
      await this.setupMonthlySheetTemplate(spreadsheetId, newSheetId, template);

      // Parse month and year from monthKey (e.g., "2024-10")
      const [year, month] = monthKey.split('-').map(Number);

      // Save to database
      const personalFinanceSheet = await prisma.personalFinanceSpreadsheet.findUnique({
        where: { userId },
      });

      if (!personalFinanceSheet) {
        throw new Error('Personal Finance spreadsheet not found');
      }

      await prisma.monthlySheet.create({
        data: {
          personalFinanceSheetId: personalFinanceSheet.id,
          sheetId: newSheetId,
          sheetName,
          monthKey,
          year,
          month,
        },
      });

      console.log(`Created monthly sheet: ${sheetName} (ID: ${newSheetId})`);
      return { sheetId: newSheetId, sheetName };
    } catch (error) {
      console.error('Error creating monthly sheet:', error);
      throw new Error(`Failed to create monthly sheet: ${error}`);
    }
  }

  /**
   * Get the template structure for monthly expense tracking sheets
   */
  private getMonthlySheetTemplate(sheetName: string): MonthlySheetTemplate {
    return {
      sheetName,
      headers: [
        'Date',
        'Items',
        'College Loan',
        'Credit Card',
        'Groceries',
        'Restaurants',
        'Mortgage',
        'HOA',
        'Energy Bills',
        'Water Bills',
        'Internet/Phone',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Healthcare',
        'Other',
      ],
      headerColors: {
        'College Loan': '#FF0000', // Red for Debt
        'Credit Card': '#FF0000',
        'Groceries': '#00FF00', // Green for Food
        'Restaurants': '#00FF00',
        'Mortgage': '#0000FF', // Blue for Housing
        'HOA': '#0000FF',
        'Energy Bills': '#0000FF',
        'Water Bills': '#0000FF',
        'Internet/Phone': '#0000FF',
      },
    };
  }

  /**
   * Set up the template formatting for a monthly sheet
   */
  private async setupMonthlySheetTemplate(
    spreadsheetId: string,
    sheetId: number,
    template: MonthlySheetTemplate
  ): Promise<void> {
    try {
      const requests = [];

      // Add headers
      requests.push({
        updateCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: template.headers.length,
          },
          rows: [
            {
              values: template.headers.map((header) => ({
                userEnteredValue: { stringValue: header },
                userEnteredFormat: {
                  backgroundColor: this.getHeaderColor(header, template.headerColors),
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }, // White text
                  },
                  horizontalAlignment: 'CENTER',
                },
              })),
            },
          ],
          fields: 'userEnteredValue,userEnteredFormat',
        },
      });

      // Format Date column
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: {
                type: 'DATE',
                pattern: 'mm/dd/yyyy',
              },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      });

      // Format currency columns (all except Date and Items)
      for (let col = 2; col < template.headers.length; col++) {
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: col,
              endColumnIndex: col + 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '$#,##0.00',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        });
      }

      // Apply all formatting
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    } catch (error) {
      console.error('Error setting up monthly sheet template:', error);
      throw error;
    }
  }

  /**
   * Get header background color based on category
   */
  private getHeaderColor(header: string, colors: { [key: string]: string }) {
    const colorHex = colors[header];
    if (!colorHex) {
      return { red: 0.8, green: 0.8, blue: 0.8 }; // Default gray
    }

    // Convert hex to RGB
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    return { red: r, green: g, blue: b };
  }

  /**
   * Append transactions to a monthly sheet
   */
  async appendTransactionsToSheet(
    userId: string,
    monthKey: string,
    transactions: TransactionRow[]
  ): Promise<void> {
    try {
      if (transactions.length === 0) {
        console.log('No transactions to append');
        return;
      }

      const { spreadsheetId } = await this.getOrCreatePersonalFinanceSpreadsheet(userId);

      // Get or create monthly sheet
      const monthlySheet = await prisma.monthlySheet.findFirst({
        where: {
          personalFinanceSheet: { userId },
          monthKey,
        },
      });

      if (!monthlySheet) {
        throw new Error(`Monthly sheet not found for ${monthKey}`);
      }

      const template = this.getMonthlySheetTemplate(monthlySheet.sheetName);

      // Convert transactions to sheet rows
      const rows = transactions.map((transaction) => 
        this.transactionToSheetRow(transaction, template.headers)
      );

      // Append rows to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${monthlySheet.sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });

      // Update transaction count in database
      await prisma.monthlySheet.update({
        where: { id: monthlySheet.id },
        data: {
          transactionCount: monthlySheet.transactionCount + transactions.length,
          lastUpdated: new Date(),
        },
      });

      console.log(`Appended ${transactions.length} transactions to ${monthlySheet.sheetName}`);
    } catch (error) {
      console.error('Error appending transactions to sheet:', error);
      throw new Error(`Failed to append transactions: ${error}`);
    }
  }

  /**
   * Convert a transaction to a sheet row format
   */
  private transactionToSheetRow(transaction: TransactionRow, headers: string[]): (string | number)[] {
    const row = new Array(headers.length).fill('');

    // Set date and merchant
    row[0] = transaction.date;
    row[1] = transaction.merchant;

    // Find the category column and set the amount
    const categoryIndex = headers.indexOf(transaction.category);
    if (categoryIndex !== -1) {
      row[categoryIndex] = transaction.amount;
    } else {
      // If category not found, put in "Other" column
      const otherIndex = headers.indexOf('Other');
      if (otherIndex !== -1) {
        row[otherIndex] = transaction.amount;
      }
    }

    return row;
  }

  /**
   * Check if a transaction already exists in the sheet (duplicate detection)
   */
  async checkForDuplicateTransaction(
    userId: string,
    monthKey: string,
    transaction: TransactionRow
  ): Promise<boolean> {
    try {
      const { spreadsheetId } = await this.getOrCreatePersonalFinanceSpreadsheet(userId);
      
      const monthlySheet = await prisma.monthlySheet.findFirst({
        where: {
          personalFinanceSheet: { userId },
          monthKey,
        },
      });

      if (!monthlySheet) {
        return false; // Sheet doesn't exist, so no duplicates
      }

      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${monthlySheet.sheetName}!A:Z`,
      });

      const rows = response.data.values || [];
      
      // Skip header row and check for duplicates
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] === transaction.date && row[1] === transaction.merchant && 
            parseFloat(row.find((cell: any) => cell && !isNaN(parseFloat(cell))) || '0') === transaction.amount) {
          return true; // Duplicate found
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking for duplicate transaction:', error);
      return false; // Assume no duplicate on error
    }
  }
} 