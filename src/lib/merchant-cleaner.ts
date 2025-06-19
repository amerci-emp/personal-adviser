export interface MerchantCleaningRule {
  pattern: RegExp;
  cleanName: string;
  category?: string;
}

export class MerchantCleanerService {
  private static readonly CLEANING_RULES: MerchantCleaningRule[] = [
    // Utilities
    { pattern: /DUKE ENERGY.*/, cleanName: 'Duke Energy', category: 'Energy Bills' },
    { pattern: /DOMINION ENERGY.*/, cleanName: 'Dominion Energy', category: 'Energy Bills' },
    { pattern: /VEPCO.*/, cleanName: 'Dominion Energy', category: 'Energy Bills' },
    { pattern: /DURHAM.*UTILS.*/, cleanName: 'Durham Utils', category: 'Water Bills' },
    { pattern: /GOOGLE.*FIBER.*/, cleanName: 'Google Fiber', category: 'Internet/Phone' },
    { pattern: /ATT.*/, cleanName: 'ATT', category: 'Internet/Phone' },
    { pattern: /VERIZON.*/, cleanName: 'Verizon', category: 'Internet/Phone' },
    { pattern: /COMCAST.*/, cleanName: 'Comcast', category: 'Internet/Phone' },

    // Streaming Services
    { pattern: /NETFLIX.*/, cleanName: 'Netflix', category: 'Entertainment' },
    { pattern: /SPOTIFY.*/, cleanName: 'Spotify', category: 'Entertainment' },
    { pattern: /HULU.*/, cleanName: 'Hulu', category: 'Entertainment' },
    { pattern: /DISNEY.*/, cleanName: 'Disney+', category: 'Entertainment' },
    { pattern: /PARAMOUNT.*/, cleanName: 'Paramount+', category: 'Entertainment' },

    // Shopping
    { pattern: /AMZN MKTP US.*/, cleanName: 'Amazon', category: 'Shopping' },
    { pattern: /AMAZON.*/, cleanName: 'Amazon', category: 'Shopping' },
    { pattern: /TARGET.*/, cleanName: 'Target', category: 'Shopping' },
    { pattern: /WALMART.*/, cleanName: 'Walmart', category: 'Shopping' },
    { pattern: /COSTCO.*/, cleanName: 'Costco', category: 'Shopping' },

    // Apple Services
    { pattern: /APPLE\.COM.*/, cleanName: 'Apple', category: 'Shopping' },
    { pattern: /APPLE STORE.*/, cleanName: 'Apple Store', category: 'Shopping' },
    { pattern: /ITUNES.*/, cleanName: 'Apple', category: 'Entertainment' },

    // Food & Restaurants
    { pattern: /STARBUCKS.*/, cleanName: 'Starbucks', category: 'Restaurants' },
    { pattern: /MCDONALD'S.*/, cleanName: "McDonald's", category: 'Restaurants' },
    { pattern: /CHIPOTLE.*/, cleanName: 'Chipotle', category: 'Restaurants' },
    { pattern: /PANERA.*/, cleanName: 'Panera', category: 'Restaurants' },
    { pattern: /SUBWAY.*/, cleanName: 'Subway', category: 'Restaurants' },
    { pattern: /DUNKIN.*/, cleanName: 'Dunkin', category: 'Restaurants' },

    // Groceries
    { pattern: /KROGER.*/, cleanName: 'Kroger', category: 'Groceries' },
    { pattern: /FOOD LION.*/, cleanName: 'Food Lion', category: 'Groceries' },
    { pattern: /HARRIS TEETER.*/, cleanName: 'Harris Teeter', category: 'Groceries' },
    { pattern: /WHOLE FOODS.*/, cleanName: 'Whole Foods', category: 'Groceries' },
    { pattern: /TRADER JOE.*/, cleanName: "Trader Joe's", category: 'Groceries' },

    // Gas Stations
    { pattern: /SHELL.*/, cleanName: 'Shell', category: 'Transportation' },
    { pattern: /EXXON.*/, cleanName: 'Exxon', category: 'Transportation' },
    { pattern: /BP.*/, cleanName: 'BP', category: 'Transportation' },
    { pattern: /CHEVRON.*/, cleanName: 'Chevron', category: 'Transportation' },
    { pattern: /MARATHON.*/, cleanName: 'Marathon', category: 'Transportation' },

    // Financial Services
    { pattern: /CHASE.*/, cleanName: 'Chase', category: 'Credit Card' },
    { pattern: /BANK OF AMERICA.*/, cleanName: 'Bank of America', category: 'Credit Card' },
    { pattern: /AMEX.*/, cleanName: 'Amex', category: 'Credit Card' },
    { pattern: /AMERICAN EXPRESS.*/, cleanName: 'Amex', category: 'Credit Card' },
    { pattern: /DISCOVER.*/, cleanName: 'Discover', category: 'Credit Card' },
    { pattern: /CAPITAL ONE.*/, cleanName: 'Capital One', category: 'Credit Card' },

    // Insurance
    { pattern: /GEICO.*/, cleanName: 'Geico Car Insurance', category: 'Transportation' },
    { pattern: /STATE FARM.*/, cleanName: 'State Farm', category: 'Transportation' },
    { pattern: /PROGRESSIVE.*/, cleanName: 'Progressive', category: 'Transportation' },

    // Fitness
    { pattern: /O2 FITNESS.*/, cleanName: 'O2 Fitness', category: 'Healthcare' },
    { pattern: /PLANET FITNESS.*/, cleanName: 'Planet Fitness', category: 'Healthcare' },
    { pattern: /LA FITNESS.*/, cleanName: 'LA Fitness', category: 'Healthcare' },

    // Education
    { pattern: /STUDENT LOAN.*/, cleanName: 'Student Loans', category: 'College Loan' },
    { pattern: /NAVIENT.*/, cleanName: 'Student Loans', category: 'College Loan' },
    { pattern: /GREAT LAKES.*/, cleanName: 'Student Loans', category: 'College Loan' },

    // Transfers and Payments
    { pattern: /ZELLE TO (.+)/, cleanName: 'Zelle to $1', category: 'Other' },
    { pattern: /ZELLE FROM (.+)/, cleanName: 'Zelle from $1', category: 'Other' },
    { pattern: /VENMO.*/, cleanName: 'Venmo', category: 'Other' },
    { pattern: /PAYPAL.*/, cleanName: 'PayPal', category: 'Other' },
    { pattern: /CASH APP.*/, cleanName: 'Cash App', category: 'Other' },

    // Transportation
    { pattern: /UBER.*/, cleanName: 'Uber', category: 'Transportation' },
    { pattern: /LYFT.*/, cleanName: 'Lyft', category: 'Transportation' },
    { pattern: /MERCEDES BENZ.*/, cleanName: 'Mercedes Benz', category: 'Transportation' },

    // Subscriptions
    { pattern: /GITHUB.*/, cleanName: 'GitHub', category: 'Other' },
    { pattern: /ADOBE.*/, cleanName: 'Adobe', category: 'Other' },
    { pattern: /MICROSOFT.*/, cleanName: 'Microsoft', category: 'Other' },

    // Generic patterns (should be last)
    { pattern: /(.+)\s+#\d+.*/, cleanName: '$1' }, // Remove location numbers
    { pattern: /(.+)\s+\d{4,}.*/, cleanName: '$1' }, // Remove long number suffixes
  ];

  /**
   * Clean a raw merchant description from OCR
   */
  static cleanMerchantName(rawDescription: string): {
    cleanName: string;
    suggestedCategory?: string;
  } {
    if (!rawDescription) {
      return { cleanName: 'Unknown' };
    }

    const upperDescription = rawDescription.toUpperCase().trim();

    // Try each cleaning rule
    for (const rule of this.CLEANING_RULES) {
      const match = upperDescription.match(rule.pattern);
      if (match) {
        let cleanName = rule.cleanName;
        
        // Handle regex capture groups
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            cleanName = cleanName.replace(`$${i}`, this.titleCase(match[i]));
          }
        }

        return {
          cleanName: this.titleCase(cleanName),
          suggestedCategory: rule.category,
        };
      }
    }

    // If no rule matches, clean up the original description
    return {
      cleanName: this.fallbackCleanup(rawDescription),
    };
  }

  /**
   * Fallback cleanup for unrecognized merchants
   */
  private static fallbackCleanup(description: string): string {
    return description
      .replace(/[^a-zA-Z0-9\s\-'&]/g, ' ') // Remove special characters except basic ones
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()
      .split(' ')
      .map(word => this.titleCase(word))
      .join(' ')
      .substring(0, 50); // Limit length
  }

  /**
   * Convert string to title case
   */
  private static titleCase(str: string): string {
    if (!str) return '';
    
    const lowerStr = str.toLowerCase();
    
    // Handle common abbreviations and special cases
    const specialCases: { [key: string]: string } = {
      'llc': 'LLC',
      'inc': 'Inc',
      'corp': 'Corp',
      'co': 'Co',
      'usa': 'USA',
      'us': 'US',
      'atm': 'ATM',
      'pos': 'POS',
      'app': 'App',
      'tv': 'TV',
      'dvd': 'DVD',
      'cd': 'CD',
      'pc': 'PC',
      'mac': 'Mac',
      'ios': 'iOS',
      'api': 'API',
      'url': 'URL',
      'id': 'ID',
    };

    return lowerStr
      .split(' ')
      .map(word => {
        if (specialCases[word]) {
          return specialCases[word];
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Get category suggestions for a merchant
   */
  static getCategoryForMerchant(merchantName: string): string | undefined {
    const upperMerchant = merchantName.toUpperCase();
    
    for (const rule of this.CLEANING_RULES) {
      if (rule.category && upperMerchant.match(rule.pattern)) {
        return rule.category;
      }
    }

    return undefined;
  }

  /**
   * Add a custom cleaning rule
   */
  static addCustomRule(pattern: string, cleanName: string, category?: string): void {
    this.CLEANING_RULES.unshift({
      pattern: new RegExp(pattern, 'i'),
      cleanName,
      category,
    });
  }

  /**
   * Get all available categories
   */
  static getAvailableCategories(): string[] {
    const categories = new Set<string>();
    
    this.CLEANING_RULES.forEach(rule => {
      if (rule.category) {
        categories.add(rule.category);
      }
    });

    return Array.from(categories).sort();
  }
} 