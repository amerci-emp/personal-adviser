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
  mainCategories: { [category: string]: { startColumn: number; endColumn: number; color: string } };
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
                    rowCount: 100, // Sufficient rows for headers, transactions, and total at row 50
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
        // Debt & Savings (Red)
        'College Loan',
        'Credit Card',
        // Food (Green)
        'Groceries',
        'Restaurants',
        // Housing (Dark Blue)
        'Mortgage',
        'HOA',
        'Energy Bills',
        'Water Bills',
        'Internet/Phone',
        'TV Bills',
        'Others',
        // Health & Insurance (Yellow)
        'Health Insurance',
        'Dentist',
        // Personal & Lifestyle (Purple)
        'Gifts',
        'Life Insurance',
        'Personal Care',
        // Recreation (Orange)
        'Gym Bills',
        'Entertainment',
        'Subscriptions',
        'Vacations',
        // Transportation (Black)
        'Taxi/Uber',
        'Car Loan',
        'Car Insurance',
        'Gas',
        'Car Maintenance',
        'Parking',
        // Business/Work-Related (Dark Gray)
        'Business Expenses',
      ],
      headerColors: {
        // Debt & Savings (Red)
        'College Loan': '#FF0000',
        'Credit Card': '#FF0000',
        
        // Food (Green)
        'Groceries': '#00FF00',
        'Restaurants': '#00FF00',
        
        // Housing (Dark Blue)
        'Mortgage': '#1c4587',
        'HOA': '#1c4587',
        'Energy Bills': '#1c4587',
        'Water Bills': '#1c4587',
        'Internet/Phone': '#1c4587',
        'TV Bills': '#1c4587',
        'Others': '#1c4587',
        
        // Health & Insurance (Yellow)
        'Health Insurance': '#f1c232',
        'Dentist': '#f1c232',
        
        // Personal & Lifestyle (Purple)
        'Gifts': '#9900ff',
        'Life Insurance': '#9900ff',
        'Personal Care': '#9900ff',
        
        // Recreation (Orange)
        'Gym Bills': '#ff9900',
        'Entertainment': '#ff9900',
        'Subscriptions': '#ff9900',
        'Vacations': '#ff9900',
        
        // Transportation (Black)
        'Taxi/Uber': '#000000',
        'Car Loan': '#000000',
        'Car Insurance': '#000000',
        'Gas': '#000000',
        'Car Maintenance': '#000000',
        'Parking': '#000000',
        
        // Business/Work-Related (Dark Gray)
        'Business Expenses': '#666666',
      },
      mainCategories: {
        'Debt': { startColumn: 2, endColumn: 3, color: '#FF0000' },
        'Food': { startColumn: 4, endColumn: 5, color: '#00FF00' },
        'Housing': { startColumn: 6, endColumn: 12, color: '#1c4587' },
        'Medical': { startColumn: 13, endColumn: 14, color: '#f1c232' },
        'Personal': { startColumn: 15, endColumn: 17, color: '#9900ff' },
        'Recreation': { startColumn: 18, endColumn: 21, color: '#ff9900' },
        'Transportation': { startColumn: 22, endColumn: 27, color: '#000000' },
        'Business/Work-Related': { startColumn: 28, endColumn: 28, color: '#666666' },
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

      // Add main category headers (Row 1)
      const mainCategoryRow = ['', 'Items']; // Date and Items columns
      for (const [category, info] of Object.entries(template.mainCategories)) {
        const spanLength = info.endColumn - info.startColumn + 1;
        mainCategoryRow.push(category);
        // Add empty cells for the remaining span
        for (let i = 1; i < spanLength; i++) {
          mainCategoryRow.push('');
        }
      }

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
              values: mainCategoryRow.map((header, index) => ({
                userEnteredValue: { stringValue: header },
                userEnteredFormat: {
                  backgroundColor: index === 0 ? { red: 0.8, green: 0.9, blue: 1 } : // Light blue for Date
                                   index === 1 ? { red: 0.8, green: 0.9, blue: 1 } : // Light blue for Items
                                   this.getMainCategoryColor(index, template.mainCategories),
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }, // White text
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                },
              })),
            },
          ],
          fields: 'userEnteredValue,userEnteredFormat',
        },
      });

      // Add subcategory headers (Row 2)
      requests.push({
        updateCells: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 2,
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
                  verticalAlignment: 'MIDDLE',
                },
              })),
            },
          ],
          fields: 'userEnteredValue,userEnteredFormat',
        },
      });

      // Merge cells for main categories
      for (const [category, info] of Object.entries(template.mainCategories)) {
        if (info.endColumn > info.startColumn) {
          requests.push({
            mergeCells: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: info.startColumn,
                endColumnIndex: info.endColumn + 1,
              },
              mergeType: 'MERGE_ALL',
            },
          });
        }
      }

      // Add Total row at row 3 (always visible after headers)
      const totalRowIndex = 2; // Row 3 (0-indexed)
      const totalFormulas = ['', 'TOTALS']; // Date and Items columns
      for (let col = 2; col < template.headers.length; col++) {
        const columnLetter = this.getColumnLetter(col);
        totalFormulas.push(`=SUM(${columnLetter}4:${columnLetter}100)`); // Sum from row 4 to 100
      }

              requests.push({
        updateCells: {
          range: {
            sheetId,
            startRowIndex: totalRowIndex,
            endRowIndex: totalRowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: template.headers.length,
          },
          rows: [
            {
              values: totalFormulas.map((formula, index) => ({
                userEnteredValue: index < 2 ? { stringValue: formula } : { formulaValue: formula },
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 }, // Blue background for prominence
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }, // White text
                    fontSize: 12,
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  numberFormat: index >= 2 ? {
                    type: 'CURRENCY',
                    pattern: '$#,##0.00',
                  } : undefined,
                },
              })),
            },
          ],
          fields: 'userEnteredValue,userEnteredFormat',
        },
      });

      // Format Date column (transaction data rows from 4 onwards)
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 3, // Start from row 4 (after headers and totals)
            endRowIndex: 100, // Up to row 100
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
              startRowIndex: 3, // Start from row 4 (after headers and totals)
              endRowIndex: 100, // Up to row 100
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

      // Set column widths
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0, // Date column
            endIndex: 1,
          },
          properties: {
            pixelSize: 100, // Date column width
          },
          fields: 'pixelSize',
        },
      });

      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 1, // Items column
            endIndex: 2,
          },
          properties: {
            pixelSize: 250, // Items column width - increased for better visibility
          },
          fields: 'pixelSize',
        },
      });

      // Format Items column with text overflow handling
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 3, // Start from row 4 (transaction data rows)
            endRowIndex: 100, // Up to row 100
            startColumnIndex: 1, // Items column
            endColumnIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                fontSize: 10,
              },
              wrapStrategy: 'CLIP', // Clip text at cell boundary and show ellipsis
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat.textFormat,userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment',
        },
      });

      // Freeze panes: Freeze first 3 rows (headers + totals) and first 2 columns (Date and Items)
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: {
              frozenRowCount: 3, // Headers + Totals always visible
              frozenColumnCount: 2,
            },
          },
          fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount',
        },
      });

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
   * Helper to get main category background color
   */
  private getMainCategoryColor(columnIndex: number, mainCategories: { [key: string]: { startColumn: number; endColumn: number; color: string } }): any {
    for (const [category, info] of Object.entries(mainCategories)) {
      if (columnIndex >= info.startColumn && columnIndex <= info.endColumn) {
        return this.hexToRgb(info.color);
      }
    }
    return { red: 0.8, green: 0.8, blue: 0.8 }; // Default gray
  }

  /**
   * Convert column number to letter (A, B, C, ... Z, AA, AB, etc.)
   */
  private getColumnLetter(columnIndex: number): string {
    let result = '';
    while (columnIndex >= 0) {
      result = String.fromCharCode(65 + (columnIndex % 26)) + result;
      columnIndex = Math.floor(columnIndex / 26) - 1;
    }
    return result;
  }

  /**
   * Convert hex color to RGB object for Google Sheets API
   */
  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          red: parseInt(result[1], 16) / 255,
          green: parseInt(result[2], 16) / 255,
          blue: parseInt(result[3], 16) / 255,
        }
      : { red: 0.8, green: 0.8, blue: 0.8 }; // Default gray
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

      // Find the next available row (start from row 4, after headers and totals)
      // Get existing data to find where to insert
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${monthlySheet.sheetName}!A4:B100`, // Check from row 4 onwards
      });

      const existingRows = response.data.values || [];
      const nextRow = existingRows.length + 4; // +4 because we start from row 4 (0-indexed = 3)

      // Make sure we don't go past row 100
      if (nextRow + transactions.length > 100) {
        throw new Error(`Not enough space in sheet. Trying to add ${transactions.length} transactions starting at row ${nextRow}, but maximum is row 100`);
      }

      // Use UPDATE instead of APPEND to insert at specific location
      const endRow = nextRow + transactions.length - 1;
      const updateRange = `${monthlySheet.sheetName}!A${nextRow}:${this.getColumnLetter(template.headers.length - 1)}${endRow}`;
      
      console.log(`Inserting ${transactions.length} transactions at range: ${updateRange}`);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
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

      console.log(`Successfully inserted ${transactions.length} transactions to ${monthlySheet.sheetName} at rows ${nextRow}-${endRow} (totals always visible in row 3)`);
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

      // Get transaction data from the sheet (exclude headers and totals)
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${monthlySheet.sheetName}!A4:Z100`, // Only check transaction rows from row 4 onwards
      });

      const rows = response.data.values || [];

      // Check for duplicates in transaction rows
      for (let i = 0; i < rows.length; i++) {
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