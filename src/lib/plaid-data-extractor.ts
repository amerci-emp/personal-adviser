/**
 * Utility functions for extracting and processing Plaid transaction data
 * Handles personal_finance_category, merchant information, and confidence levels
 */

export interface PlaidCategoryData {
  category: string;
  confidence: number;
  primaryCategory?: string;
  detailedCategory?: string;
}

export interface PlaidTransactionData {
  personal_finance_category?: {
    confidence_level?: string | null;
    detailed?: string | null;
    primary?: string | null;
  } | null;
  merchant_name?: string | null;
  name: string;
  amount: number;
  transaction_id?: string;
  [key: string]: any;
}

/**
 * Maps Plaid confidence levels to percentages
 * Based on Plaid's documentation and industry standards
 */
export function mapPlaidConfidenceLevel(confidenceLevel: string): number {
  switch (confidenceLevel?.toUpperCase()) {
    case 'VERY_HIGH': 
      return 95;
    case 'HIGH': 
      return 85;
    case 'MEDIUM': 
      return 70;
    case 'LOW': 
      return 50;
    default:
      return 30; // Default for unknown or missing confidence
  }
}

/**
 * Extracts Plaid category and confidence data from a transaction
 */
export function extractPlaidCategoryData(transaction: PlaidTransactionData): PlaidCategoryData {
  const pfc = transaction.personal_finance_category;
  
  if (!pfc || !pfc.confidence_level || !pfc.detailed) {
    return {
      category: 'GENERAL_MERCHANDISE_OTHER',
      confidence: 30,
      primaryCategory: 'GENERAL_MERCHANDISE',
      detailedCategory: 'GENERAL_MERCHANDISE_OTHER'
    };
  }

  const confidence = mapPlaidConfidenceLevel(pfc.confidence_level);
  
  return {
    category: pfc.detailed || pfc.primary || 'GENERAL_MERCHANDISE_OTHER',
    confidence,
    primaryCategory: pfc.primary || undefined,
    detailedCategory: pfc.detailed || undefined
  };
}

/**
 * Extracts Plaid categories as an array [primary, detailed]
 */
export function extractPlaidCategoriesArray(transaction: PlaidTransactionData): string[] {
  const pfc = transaction.personal_finance_category;
  
  if (!pfc) {
    return ['GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_OTHER'];
  }

  const categories: string[] = [];
  
  if (pfc.primary) {
    categories.push(pfc.primary);
  }
  
  if (pfc.detailed && pfc.detailed !== pfc.primary) {
    categories.push(pfc.detailed);
  }
  
  // Fallback if no categories found
  if (categories.length === 0) {
    categories.push('GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_OTHER');
  }
  
  return categories;
}

/**
 * Extracts merchant name from various Plaid fields
 */
export function extractMerchantName(transaction: PlaidTransactionData): string {
  // Priority: merchant_name > name (cleaned)
  if (transaction.merchant_name) {
    return transaction.merchant_name;
  }
  
  // Fall back to cleaning the transaction name
  return cleanTransactionName(transaction.name);
}

/**
 * Cleans transaction name to extract merchant info
 */
function cleanTransactionName(name: string): string {
  if (!name) return 'Unknown Merchant';
  
  // Remove common prefixes/suffixes and clean up
  let cleaned = name
    .replace(/^(PURCHASE|POS|DEBIT CARD|CARD PURCHASE|ATM|CHECK)\s*/i, '')
    .replace(/\s*(PURCHASE|POS|DEBIT|CARD)$/i, '')
    .replace(/\s*#\d+.*$/, '') // Remove store numbers and everything after
    .replace(/\s+[A-Z]{2}\s*US$/i, '') // Remove state and country codes
    .replace(/\s+\d{4,}.*$/, '') // Remove long numbers (transaction IDs, etc.)
    .trim();
  
  // If cleaning resulted in empty string, use original
  if (!cleaned || cleaned.length < 2) {
    cleaned = name;
  }
  
  return cleaned;
}

/**
 * Logs Plaid extraction results for debugging
 */
export function logPlaidExtractionDebug(
  transaction: PlaidTransactionData, 
  extractedData: PlaidCategoryData
): void {
  console.log(`🔍 [Plaid Extraction] Transaction: ${transaction.name}`);
  console.log(`   📋 Raw PFC:`, transaction.personal_finance_category);
  console.log(`   🎯 Extracted Category: ${extractedData.category}`);
  console.log(`   📊 Confidence: ${extractedData.confidence}% (${transaction.personal_finance_category?.confidence_level || 'UNKNOWN'})`);
  console.log(`   🏪 Merchant: ${extractMerchantName(transaction)}`);
}

/**
 * Validates if Plaid category data is reliable for auto-assignment
 */
export function isPlaidDataReliable(categoryData: PlaidCategoryData, threshold: number = 85): boolean {
  return categoryData.confidence >= threshold;
}

/**
 * Maps Plaid detailed categories to our internal category system
 * This helps bridge between Plaid's taxonomy and our category system
 */
export function mapPlaidToInternalCategory(plaidCategory: string): string {
  // This is a simplified mapping - you may want to expand this based on your category system
  const categoryMappings: Record<string, string> = {
    'FOOD_AND_DRINK_RESTAURANTS': 'FOOD_AND_DRINK_RESTAURANTS',
    'FOOD_AND_DRINK_GROCERIES': 'FOOD_AND_DRINK_GROCERIES',
    'FOOD_AND_DRINK_COFFEE': 'FOOD_AND_DRINK_COFFEE',
    'TRANSPORTATION_GAS': 'TRANSPORTATION_GAS',
    'TRANSPORTATION_PUBLIC_TRANSIT': 'TRANSPORTATION_PUBLIC_TRANSIT',
    'GENERAL_MERCHANDISE_SUPERSTORES': 'GENERAL_MERCHANDISE_SUPERSTORES',
    'GENERAL_MERCHANDISE_ONLINE': 'GENERAL_MERCHANDISE_ONLINE',
    'ENTERTAINMENT_TV_AND_MOVIES': 'ENTERTAINMENT_TV_AND_MOVIES',
    'TRANSFER_OUT_SAVINGS': 'TRANSFER_OUT_ACCOUNT_TRANSFER',
    'TRANSFER_IN_SAVINGS': 'TRANSFER_IN_ACCOUNT_TRANSFER',
    'TRANSFER_OUT': 'TRANSFER_OUT_ACCOUNT_TRANSFER',
    'TRANSFER_IN': 'TRANSFER_IN_ACCOUNT_TRANSFER',
  };
  
  return categoryMappings[plaidCategory] || plaidCategory;
}