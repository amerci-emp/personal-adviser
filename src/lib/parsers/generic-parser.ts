import { BankStatementParser, ProcessedStatementData } from './base-parser';
import { DocumentProcessor } from '../document-processor';

/**
 * Default generic bank statement parser
 * Used for banks that don't have a specific parser implemented
 */
export class GenericBankStatementParser extends BankStatementParser {
  private bankName: string;
  
  constructor(
    ocrResult: any, 
    filePath: string, 
    fileType: string, 
    bankName: string,
    documentProcessor?: DocumentProcessor
  ) {
    super(ocrResult, filePath, fileType, documentProcessor);
    this.bankName = bankName;
  }
  
  public async process(): Promise<ProcessedStatementData> {
    console.log(`Processing generic statement for: ${this.bankName}`);
    
    // For now, return base data with an empty account
    const baseData = this.createBaseData(this.bankName);
    
    // Add a basic account structure
    const account = {
      accountNumberLast4: 'unknown',
      accountType: null,
      allTransactions: {
        deposits: [],
        atmDebit: [],
        withdrawals: [],
        checks: [],
        fees: [],
        other: []
      }
    };
    
    baseData.accounts = [account];

    console.log(`Generic parser completed. Found ${baseData.accounts.length} accounts.`);
    return baseData;
  }
} 