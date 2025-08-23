export type Direction = 'INFLOW' | 'OUTFLOW';

// Minimal, client-safe category system to support UI components.
// For full data, the app relies on database categories seeded via Prisma.

export const CATEGORY_SYSTEM: Record<Direction, Record<string, string[]>> = {
  INFLOW: {
    ONE_TIME_PAYMENTS: [
      'TRANSFER_IN',
      'DEPOSIT',
      'REFUND',
    ],
    RECURRING_INCOME: [
      'INCOME_SALARY',
      'INCOME_FREELANCE',
      'INCOME_INVESTMENT_DIVIDENDS',
    ],
  },
  OUTFLOW: {
    HOUSING: [
      'HOUSING_RENT',
      'HOUSING_MORTGAGE',
      'HOUSING_ENERGY_BILLS',
      'HOUSING_INTERNET_PHONE',
    ],
    FOOD: [
      'FOOD_GROCERIES',
      'FOOD_RESTAURANTS',
      'FOOD_COFFEE',
    ],
    TRANSPORTATION: [
      'TRANSPORTATION_GAS',
      'TRANSPORTATION_TAXI_RIDESHARE',
      'TRANSPORTATION_PARKING',
      'TRANSPORTATION_CAR_INSURANCE',
    ],
    DEBT: [
      'LOAN_PAYMENTS_CREDIT_CARD',
      'LOAN_PAYMENTS_AUTO',
      'DEBT_BANK_FEES_ATM',
    ],
    RECREATION: [
      'RECREATION_MOVIES_TV_SUBSCRIPTIONS',
      'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS',
      'RECREATION_VACATIONS',
    ],
    PERSONAL: [
      'PERSONAL_CLOTHING',
      'PERSONAL_HAIR_BEAUTY',
      'PERSONAL_ITEMS',
    ],
  },
};

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  TRANSFER_IN: 'Transfer In',
  DEPOSIT: 'Deposit',
  REFUND: 'Refund',
  INCOME_SALARY: 'Salary',
  INCOME_FREELANCE: 'Freelance Income',
  INCOME_INVESTMENT_DIVIDENDS: 'Investment Dividends',

  HOUSING_RENT: 'Rent',
  HOUSING_MORTGAGE: 'Mortgage',
  HOUSING_ENERGY_BILLS: 'Energy Bills',
  HOUSING_INTERNET_PHONE: 'Internet & Phone',

  FOOD_GROCERIES: 'Groceries',
  FOOD_RESTAURANTS: 'Restaurants',
  FOOD_COFFEE: 'Coffee',

  TRANSPORTATION_GAS: 'Gas',
  TRANSPORTATION_TAXI_RIDESHARE: 'Taxi & Rideshare',
  TRANSPORTATION_PARKING: 'Parking',
  TRANSPORTATION_CAR_INSURANCE: 'Car Insurance',

  LOAN_PAYMENTS_CREDIT_CARD: 'Credit Card Payment',
  LOAN_PAYMENTS_AUTO: 'Auto Loan',
  DEBT_BANK_FEES_ATM: 'ATM Fees',

  RECREATION_MOVIES_TV_SUBSCRIPTIONS: 'Movies & TV Subscriptions',
  RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS: 'Music Streaming',
  RECREATION_VACATIONS: 'Vacations',

  PERSONAL_CLOTHING: 'Clothing',
  PERSONAL_HAIR_BEAUTY: 'Hair & Beauty',
  PERSONAL_ITEMS: 'Personal Items',
};

export function getAllCategories(): string[] {
  const result: string[] = [];
  for (const dir of Object.keys(CATEGORY_SYSTEM) as Direction[]) {
    const groups = CATEGORY_SYSTEM[dir];
    for (const sublist of Object.values(groups)) {
      result.push(...sublist);
    }
  }
  return Array.from(new Set(result));
}

export function getDirectionFromAmount(amount: number): Direction {
  return amount >= 0 ? 'INFLOW' : 'OUTFLOW';
}


