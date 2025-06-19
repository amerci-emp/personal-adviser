import { protos } from "@google-cloud/documentai";
import { DocumentProcessor } from "../document-processor";

// Core type aliases from Google Cloud SDK
type IDocument = protos.google.cloud.documentai.v1.IDocument;
type IDocumentPage = protos.google.cloud.documentai.v1.Document.IPage;
type IDocumentEntity = protos.google.cloud.documentai.v1.Document.IEntity;
type IDocumentTable = protos.google.cloud.documentai.v1.Document.Page.ITable;
type IDocumentTableCell = protos.google.cloud.documentai.v1.Document.Page.Table.ITableCell;

// Define transaction type for backward compatibility
export interface Transaction {
  date?: string | null;
  description?: string | null;
  amount?: number | null;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'OTHER';
  rawRowText?: string;
}

// Define account type for backward compatibility
export interface Account {
  accountNumberLast4: string;
  accountType?: string | null;
  pageReference?: number | null;  // Page number containing the account details
  // Organized transaction categories
  allTransactions?: {
    deposits: Transaction[];
    atmDebit: Transaction[];
    withdrawals: Transaction[];
    checks: Transaction[];
    fees: Transaction[];
    other: Transaction[];
    [key: string]: Transaction[];
  };
  metadata?: {
    beginningBalance?: number;
    endingBalance?: number;
    [key: string]: any;
  };
}

// Define ProcessedStatementData interface for backward compatibility
export interface ProcessedStatementData {
  bankName?: string | null;
  accounts: Account[];
  statementPeriodStartDate?: string | null;
  statementPeriodEndDate?: string | null;
  rawText: string; 
  entities: IDocumentEntity[];
  // For combined statements:
  totalBalance?: number; // For statements with a total balance
}

/**
 * Abstract base class for bank statement parsers
 */
export abstract class BankStatementParser {
  protected ocrResult: any;
  protected filePath: string;
  protected fileType: string;
  protected documentProcessor: DocumentProcessor | null = null;
  
  constructor(
    ocrResult: any, 
    filePath: string, 
    fileType: string,
    documentProcessor?: DocumentProcessor
  ) {
    this.ocrResult = ocrResult;
    this.filePath = filePath;
    this.fileType = fileType;
    this.documentProcessor = documentProcessor || null;
  }
  
  /**
   * Process the statement and return structured data
   */
  public abstract process(): Promise<ProcessedStatementData>;
  
  /**
   * Create base statement data structure
   */
  protected createBaseData(bankName: string): ProcessedStatementData {
    // Create a minimal empty structure - bank-specific parsers will populate all fields
    return {
      bankName: bankName,
      accounts: [],
      statementPeriodStartDate: null,
      statementPeriodEndDate: null,
      rawText: this.ocrResult.fullPageText,
      entities: []
    };
  }
} 