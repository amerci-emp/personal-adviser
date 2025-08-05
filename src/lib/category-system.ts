// Complete category mapping for intelligent transaction categorization
// Based on implementation flow V8 - Three-tier direction-based system

export const CATEGORY_SYSTEM = {
  INFLOW: {
    'ONE_TIME_PAYMENTS': [
      'TRANSFER_IN',
      'DEPOSIT', 
      'REFUND',
      'GOVERNMENT_AND_NON_PROFIT'
    ],
    'RECURRING_INCOME': [
      'INCOME_SALARY',
      'INCOME_FREELANCE', 
      'INCOME_INVESTMENT_DIVIDENDS',
      'INCOME_RENTAL',
      'INCOME_SOCIAL_SECURITY',
      'INCOME_PENSION'
    ]
  },
  OUTFLOW: {
    'HOUSING': [
      "HOUSING_MORTGAGE",
      "HOUSING_HOA",
      "HOUSING_ENERGY_BILLS",
      "HOUSING_WATER_BILLS",
      "HOUSING_INTERNET_PHONE",
      "HOUSING_TV_BILLS",
      "HOUSING_RENT",
      "HOUSING_RENTER_INSURANCE",
      "HOUSING_HOME_IMPROVEMENT"
    ],
    'TRANSPORTATION': [
      'TRANSPORTATION_GAS',
      'TRANSPORTATION_PUBLIC_TRANSIT',
      'TRANSPORTATION_TAXI_RIDESHARE',
      'TRANSPORTATION_PARKING',
      'TRANSPORTATION_CAR_LOAN',
      'TRANSPORTATION_CAR_MAINTENANCE',
      'TRANSPORTATION_CAR_INSURANCE'
    ],
    'DEBT': [
      'LOAN_PAYMENTS_MORTGAGE',
      'LOAN_PAYMENTS_AUTO', 
      'LOAN_PAYMENTS_STUDENT_LOAN',
      'LOAN_PAYMENTS_PERSONAL_LOAN',
      'LOAN_PAYMENTS_CREDIT_CARD'
    ],
    'FOOD': [
      'FOOD_GROCERIES',
      'FOOD_RESTAURANTS'
    ],
    'MEDICAL': [
      'MEDICAL_DOCTOR_VISITS',
      'MEDICAL_PHARMACY',
      'MEDICAL_DENTAL', 
      'MEDICAL_VISION',
      'MEDICAL_INSURANCE'
    ],
    'PERSONAL': [
      'PERSONAL_HAIR_BEAUTY',
      'PERSONAL_GYMS_FITNESS',
      'PERSONAL_GIFTS',
      'PERSONAL_LIFE_INSURANCE',
      'PERSONAL_CLOTHING',
      'PERSONAL_ITEMS'
    ],
    'RECREATION': [
      'RECREATION_MOVIES_TV_SUBSCRIPTIONS',
      'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS',
      'RECREATION_SPORTS_SUBSCRIPTIONS',
      'RECREATION_VACATIONS'
    ]
  }
} as const;

// Utility functions for category system
export type Direction = keyof typeof CATEGORY_SYSTEM;
export type MainCategory = keyof typeof CATEGORY_SYSTEM['INFLOW'] | keyof typeof CATEGORY_SYSTEM['OUTFLOW'];
export type SubCategory = 
  | typeof CATEGORY_SYSTEM['INFLOW'][keyof typeof CATEGORY_SYSTEM['INFLOW']][number]
  | typeof CATEGORY_SYSTEM['OUTFLOW'][keyof typeof CATEGORY_SYSTEM['OUTFLOW']][number];

// Get all available categories for a direction
export function getCategoriesForDirection(direction: Direction): string[] {
  return Object.values(CATEGORY_SYSTEM[direction]).flat();
}

// Get all categories (flattened)
export function getAllCategories(): string[] {
  return [
    ...getCategoriesForDirection('INFLOW'),
    ...getCategoriesForDirection('OUTFLOW')
  ];
}

// Get main category for a subcategory
export function getMainCategoryForSub(subCategory: string): { direction: Direction, mainCategory: string } | null {
  for (const [direction, mainCategories] of Object.entries(CATEGORY_SYSTEM)) {
    for (const [mainCategory, subCategories] of Object.entries(mainCategories)) {
      if (subCategories.includes(subCategory as any)) {
        return { 
          direction: direction as Direction, 
          mainCategory 
        };
      }
    }
  }
  return null;
}

// Determine direction from transaction amount
export function getDirectionFromAmount(amount: number): Direction {
  return amount >= 0 ? 'INFLOW' : 'OUTFLOW';
}

// Get friendly category names for display
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  // Inflow categories
  'TRANSFER_IN': 'Transfer In',
  'DEPOSIT': 'Deposit',
  'REFUND': 'Refund',
  'GOVERNMENT_AND_NON_PROFIT': 'Government & Non-Profit',
  'INCOME_SALARY': 'Salary',
  'INCOME_FREELANCE': 'Freelance Income',
  'INCOME_INVESTMENT_DIVIDENDS': 'Investment Dividends',
  'INCOME_RENTAL': 'Rental Income',
  'INCOME_SOCIAL_SECURITY': 'Social Security',
  'INCOME_PENSION': 'Pension',
  
  // Outflow categories
  'RENT_AND_UTILITIES': 'Rent & Utilities',
  'HOME_IMPROVEMENT': 'Home Improvement',
  'GENERAL_SERVICES_HOME_SERVICES': 'Home Services',
  'TRANSPORTATION_GAS': 'Gas',
  'TRANSPORTATION_PUBLIC_TRANSIT': 'Public Transit',
  'TRANSPORTATION_TAXI_RIDESHARE': 'Taxi & Rideshare',
  'TRANSPORTATION_PARKING': 'Parking',
  'TRANSPORTATION_VEHICLE_MAINTENANCE': 'Vehicle Maintenance',
  'TRANSPORTATION_VEHICLE_INSURANCE': 'Vehicle Insurance',
  'LOAN_PAYMENTS_MORTGAGE': 'Mortgage',
  'LOAN_PAYMENTS_AUTO': 'Auto Loan',
  'LOAN_PAYMENTS_STUDENT_LOAN': 'Student Loan',
  'LOAN_PAYMENTS_PERSONAL_LOAN': 'Personal Loan',
  'LOAN_PAYMENTS_CREDIT_CARD': 'Credit Card Payment',
  'FOOD_AND_DRINK_GROCERIES': 'Groceries',
  'FOOD_AND_DRINK_RESTAURANTS': 'Restaurants',
  'FOOD_AND_DRINK_FAST_FOOD': 'Fast Food',
  'FOOD_AND_DRINK_COFFEE': 'Coffee',
  'FOOD_AND_DRINK_ALCOHOL': 'Alcohol',
  'MEDICAL_DOCTOR_VISITS': 'Doctor Visits',
  'MEDICAL_PHARMACY': 'Pharmacy',
  'MEDICAL_DENTAL': 'Dental',
  'MEDICAL_VISION': 'Vision',
  'MEDICAL_INSURANCE': 'Medical Insurance',
  'PERSONAL_CARE_HAIR_BEAUTY': 'Hair & Beauty',
  'PERSONAL_CARE_GYMS_FITNESS': 'Gyms & Fitness',
  'GENERAL_MERCHANDISE_CLOTHING': 'Clothing',
  'GENERAL_MERCHANDISE_PERSONAL_ITEMS': 'Personal Items',
  'ENTERTAINMENT_MOVIES_TV': 'Movies & TV',
  'ENTERTAINMENT_MUSIC_STREAMING': 'Music Streaming',
  'ENTERTAINMENT_SPORTS': 'Sports',
  'TRAVEL_FLIGHTS': 'Flights',
  'TRAVEL_LODGING': 'Lodging',
  'TRAVEL_TRANSPORTATION': 'Travel Transportation'
};

// Get display name for category
export function getCategoryDisplayName(category: string): string {
  return CATEGORY_DISPLAY_NAMES[category] || category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}