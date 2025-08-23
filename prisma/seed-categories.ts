import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category data synchronized with the corrected category-system.ts
const CATEGORIES_DATA = {
  INFLOW: {
    'ONE_TIME_PAYMENTS': [
      { 
        name: 'TRANSFER_IN', 
        displayName: 'Transfer In',
        plaidCategories: ['TRANSFER_IN', 'TRANSFER_IN_ACCOUNT_TRANSFER', 'TRANSFER_IN_DEPOSIT'],
        plaidKeywords: ['transfer', 'deposit', 'incoming']
      },
      { 
        name: 'DEPOSIT', 
        displayName: 'Deposit',
        plaidCategories: ['TRANSFER_IN', 'TRANSFER_IN_DEPOSIT'],
        plaidKeywords: ['deposit', 'cash', 'atm deposit']
      },
      { 
        name: 'REFUND', 
        displayName: 'Refund',
        plaidCategories: ['INCOME', 'INCOME_OTHER_INCOME'],
        plaidKeywords: ['refund', 'credit', 'return', 'reversal']
      },
      { 
        name: 'GOVERNMENT_AND_NON_PROFIT', 
        displayName: 'Government & Non-Profit',
        plaidCategories: ['GOVERNMENT_AND_NON_PROFIT', 'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT'],
        plaidKeywords: ['government', 'irs', 'tax', 'nonprofit', 'charity']
      }
    ],
    'RECURRING_INCOME': [
      { 
        name: 'INCOME_SALARY', 
        displayName: 'Salary',
        plaidCategories: ['INCOME', 'INCOME_WAGES'],
        plaidKeywords: ['salary', 'payroll', 'direct deposit', 'adp', 'paycheck']
      },
      { 
        name: 'INCOME_FREELANCE', 
        displayName: 'Freelance Income',
        plaidCategories: ['INCOME', 'INCOME_WAGES'],
        plaidKeywords: ['freelance', 'contractor', 'consulting', 'gig', 'upwork', 'fiverr']
      },
      { 
        name: 'INCOME_INVESTMENT_DIVIDENDS', 
        displayName: 'Investment Dividends',
        plaidCategories: ['INCOME', 'INCOME_DIVIDENDS'],
        plaidKeywords: ['dividend', 'investment', 'stocks', 'mutual fund', 'etf']
      },
      { 
        name: 'INCOME_RENTAL', 
        displayName: 'Rental Income',
        plaidCategories: ['INCOME', 'INCOME_OTHER_INCOME'],
        plaidKeywords: ['rent', 'rental', 'property', 'tenant']
      },
      { 
        name: 'INCOME_SOCIAL_SECURITY', 
        displayName: 'Social Security',
        plaidCategories: ['INCOME', 'INCOME_OTHER_INCOME'],
        plaidKeywords: ['social security', 'ssa', 'government benefit']
      },
      { 
        name: 'INCOME_PENSION', 
        displayName: 'Pension',
        plaidCategories: ['INCOME', 'INCOME_RETIREMENT_PENSION'],
        plaidKeywords: ['pension', 'retirement', '401k', 'ira distribution']
      }
    ]
  },
  OUTFLOW: {
    'HOUSING': [
      { name: 'HOUSING_MORTGAGE', displayName: 'Mortgage' },
      { name: 'HOUSING_HOA', displayName: 'HOA Fees' },
      { name: 'HOUSING_ENERGY_BILLS', displayName: 'Energy Bills' },
      { name: 'HOUSING_WATER_BILLS', displayName: 'Water Bills' },
      { name: 'HOUSING_INTERNET_PHONE', displayName: 'Internet & Phone' },
      { name: 'HOUSING_TV_BILLS', displayName: 'TV Bills' },
      { name: 'HOUSING_RENT', displayName: 'Rent' },
      { name: 'HOUSING_RENTER_INSURANCE', displayName: 'Renter Insurance' },
      { name: 'HOUSING_HOME_IMPROVEMENT', displayName: 'Home Improvement' },
      { 
        name: 'HOUSING_SEWAGE_WASTE', 
        displayName: 'Sewage & Waste Management',
        plaidCategories: ['RENT_AND_UTILITIES', 'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT'],
        plaidKeywords: ['sewage', 'waste', 'garbage', 'trash', 'disposal', 'sanitation']
      }
    ],
    'TRANSPORTATION': [
      { 
        name: 'TRANSPORTATION_GAS', 
        displayName: 'Gas',
        plaidCategories: ['TRANSPORTATION', 'TRANSPORTATION_GAS'],
        plaidKeywords: ['gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'mobil', 'station']
      },
      { 
        name: 'TRANSPORTATION_PUBLIC_TRANSIT', 
        displayName: 'Public Transit',
        plaidCategories: ['TRANSPORTATION', 'TRANSPORTATION_PUBLIC_TRANSIT'],
        plaidKeywords: ['metro', 'bus', 'subway', 'train', 'transit', 'mta', 'bart', 'wmata']
      },
      { 
        name: 'TRANSPORTATION_TAXI_RIDESHARE', 
        displayName: 'Taxi & Rideshare',
        plaidCategories: ['TRANSPORTATION', 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES'],
        plaidKeywords: ['uber', 'lyft', 'taxi', 'cab', 'rideshare']
      },
      { 
        name: 'TRANSPORTATION_PARKING', 
        displayName: 'Parking',
        plaidCategories: ['TRANSPORTATION', 'TRANSPORTATION_PARKING'],
        plaidKeywords: ['parking', 'garage', 'meter', 'valet']
      },
      { 
        name: 'TRANSPORTATION_CAR_LOAN', 
        displayName: 'Car Loan',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_CAR_PAYMENT'],
        plaidKeywords: ['car loan', 'auto loan', 'vehicle payment']
      },
      { 
        name: 'TRANSPORTATION_CAR_MAINTENANCE', 
        displayName: 'Car Maintenance',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_AUTOMOTIVE'],
        plaidKeywords: ['oil change', 'tire', 'mechanic', 'repair', 'maintenance', 'auto service']
      },
      { 
        name: 'TRANSPORTATION_CAR_INSURANCE', 
        displayName: 'Car Insurance',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_INSURANCE'],
        plaidKeywords: ['auto insurance', 'car insurance', 'geico', 'progressive', 'state farm']
      }
    ],
    'DEBT': [
      { 
        name: 'LOAN_PAYMENTS_MORTGAGE', 
        displayName: 'Mortgage Payment',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_MORTGAGE_PAYMENT'],
        plaidKeywords: ['mortgage', 'home loan', 'wells fargo mortgage', 'quicken loans']
      },
      { 
        name: 'LOAN_PAYMENTS_AUTO', 
        displayName: 'Auto Loan',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_CAR_PAYMENT'],
        plaidKeywords: ['auto loan', 'car payment', 'vehicle loan']
      },
      { 
        name: 'LOAN_PAYMENTS_STUDENT_LOAN', 
        displayName: 'Student Loan',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT'],
        plaidKeywords: ['student loan', 'navient', 'sallie mae', 'great lakes', 'fedloan']
      },
      { 
        name: 'LOAN_PAYMENTS_PERSONAL_LOAN', 
        displayName: 'Personal Loan',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT'],
        plaidKeywords: ['personal loan', 'installment loan', 'lending club']
      },
      { 
        name: 'LOAN_PAYMENTS_CREDIT_CARD', 
        displayName: 'Credit Card Payment',
        plaidCategories: ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'],
        plaidKeywords: ['credit card payment', 'visa payment', 'mastercard payment', 'amex payment']
      },
      { 
        name: 'DEBT_BANK_FEES_ATM', 
        displayName: 'ATM Fees',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_ATM_FEES'],
        plaidKeywords: ['atm fee', 'out of network', 'withdrawal fee', 'atm charge']
      },
      { 
        name: 'DEBT_BANK_FEES_FOREIGN_TRANSACTION', 
        displayName: 'Foreign Transaction Fees',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_FOREIGN_TRANSACTION_FEES'],
        plaidKeywords: ['foreign transaction', 'international fee', 'currency conversion', 'overseas fee']
      },
      { 
        name: 'DEBT_BANK_FEES_INSUFFICIENT_FUNDS', 
        displayName: 'Insufficient Funds Fees',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_INSUFFICIENT_FUNDS'],
        plaidKeywords: ['insufficient funds', 'nsf fee', 'bounced check', 'returned payment']
      },
      { 
        name: 'DEBT_BANK_FEES_INTEREST_CHARGE', 
        displayName: 'Interest Charges',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_INTEREST_CHARGE'],
        plaidKeywords: ['interest charge', 'finance charge', 'credit card interest', 'cash advance fee']
      },
      { 
        name: 'DEBT_BANK_FEES_OVERDRAFT', 
        displayName: 'Overdraft Fees',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_OVERDRAFT_FEES'],
        plaidKeywords: ['overdraft', 'overdraft fee', 'negative balance', 'overdraft protection']
      },
      { 
        name: 'DEBT_BANK_FEES_OTHER', 
        displayName: 'Other Bank Fees',
        plaidCategories: ['BANK_FEES', 'BANK_FEES_OTHER_BANK_FEES'],
        plaidKeywords: ['bank fee', 'service charge', 'account fee', 'maintenance fee', 'monthly fee']
      }
    ],
    'FOOD': [
      { 
        name: 'FOOD_GROCERIES', 
        displayName: 'Groceries',
        plaidCategories: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES'],
        plaidKeywords: ['grocery', 'supermarket', 'walmart', 'target', 'kroger', 'safeway', 'whole foods', 'costco']
      },
      { 
        name: 'FOOD_RESTAURANTS', 
        displayName: 'Restaurants',
        plaidCategories: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT'],
        plaidKeywords: ['restaurant', 'dining', 'bistro', 'grill', 'cafe', 'diner']
      },
      { 
        name: 'FOOD_FAST_FOOD', 
        displayName: 'Fast Food',
        plaidCategories: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_FAST_FOOD'],
        plaidKeywords: ['mcdonalds', 'burger king', 'taco bell', 'subway', 'kfc', 'wendys', 'chipotle', 'fast food']
      },
      { 
        name: 'FOOD_COFFEE', 
        displayName: 'Coffee',
        plaidCategories: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_COFFEE'],
        plaidKeywords: ['coffee', 'starbucks', 'dunkin', 'cafe', 'espresso', 'latte']
      },
      { 
        name: 'FOOD_ALCOHOL', 
        displayName: 'Alcohol',
        plaidCategories: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR'],
        plaidKeywords: ['bar', 'liquor', 'wine', 'beer', 'brewery', 'distillery', 'club']
      }
    ],
    'MEDICAL': [
      { 
        name: 'MEDICAL_DOCTOR_VISITS', 
        displayName: 'Doctor Visits',
        plaidCategories: ['MEDICAL', 'MEDICAL_PRIMARY_CARE'],
        plaidKeywords: ['doctor', 'physician', 'clinic', 'medical', 'urgent care', 'hospital']
      },
      { 
        name: 'MEDICAL_PHARMACY', 
        displayName: 'Pharmacy',
        plaidCategories: ['MEDICAL', 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS'],
        plaidKeywords: ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'prescription', 'drugs']
      },
      { 
        name: 'MEDICAL_DENTAL', 
        displayName: 'Dental',
        plaidCategories: ['MEDICAL', 'MEDICAL_DENTAL_CARE'],
        plaidKeywords: ['dental', 'dentist', 'orthodontist', 'teeth', 'oral']
      },
      { 
        name: 'MEDICAL_VISION', 
        displayName: 'Vision',
        plaidCategories: ['MEDICAL', 'MEDICAL_EYE_CARE'],
        plaidKeywords: ['vision', 'eye', 'optometrist', 'glasses', 'contacts', 'lenscrafters']
      },
      { 
        name: 'MEDICAL_INSURANCE', 
        displayName: 'Medical Insurance',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_INSURANCE'],
        plaidKeywords: ['health insurance', 'medical insurance', 'blue cross', 'aetna', 'cigna', 'kaiser']
      }
    ],
    'PERSONAL': [
      { 
        name: 'PERSONAL_HAIR_BEAUTY', 
        displayName: 'Hair & Beauty',
        plaidCategories: ['PERSONAL_CARE', 'PERSONAL_CARE_HAIR_AND_BEAUTY'],
        plaidKeywords: ['salon', 'hair', 'beauty', 'barber', 'spa', 'nails', 'massage', 'cosmetics']
      },
      { 
        name: 'PERSONAL_GYMS_FITNESS', 
        displayName: 'Gyms & Fitness',
        plaidCategories: ['PERSONAL_CARE', 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS'],
        plaidKeywords: ['gym', 'fitness', 'planet fitness', 'la fitness', 'ymca', 'crossfit', 'yoga']
      },
      { 
        name: 'PERSONAL_GIFTS', 
        displayName: 'Gifts',
        plaidCategories: ['GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES'],
        plaidKeywords: ['gift', 'present', 'flowers', 'hallmark', 'greeting card']
      },
      { 
        name: 'PERSONAL_LIFE_INSURANCE', 
        displayName: 'Life Insurance',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_INSURANCE'],
        plaidKeywords: ['life insurance', 'term life', 'whole life', 'prudential', 'metlife']
      },
      { 
        name: 'PERSONAL_CLOTHING', 
        displayName: 'Clothing',
        plaidCategories: ['GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES'],
        plaidKeywords: ['clothing', 'clothes', 'fashion', 'apparel', 'shoes', 'nike', 'adidas', 'h&m', 'zara']
      },
      { 
        name: 'PERSONAL_ITEMS', 
        displayName: 'Personal Items',
        plaidCategories: ['GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE'],
        plaidKeywords: ['personal', 'toiletries', 'hygiene', 'shampoo', 'toothpaste', 'deodorant']
      }
    ],
    'RECREATION': [
      { 
        name: 'RECREATION_MOVIES_TV_SUBSCRIPTIONS', 
        displayName: 'Movies & TV Subscriptions',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_TV_AND_MOVIES'],
        plaidKeywords: ['netflix', 'hulu', 'disney plus', 'hbo', 'amazon prime', 'streaming', 'movie', 'tv']
      },
      { 
        name: 'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS', 
        displayName: 'Music Streaming',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_MUSIC_AND_AUDIO'],
        plaidKeywords: ['spotify', 'apple music', 'pandora', 'music', 'streaming', 'tidal', 'youtube music']
      },
      { 
        name: 'RECREATION_SPORTS_SUBSCRIPTIONS', 
        displayName: 'Sports Subscriptions',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS'],
        plaidKeywords: ['espn', 'sports', 'nfl', 'nba', 'mlb', 'subscription', 'athletic']
      },
      { 
        name: 'RECREATION_VACATIONS', 
        displayName: 'Vacations',
        plaidCategories: ['TRAVEL', 'TRAVEL_LODGING', 'TRAVEL_FLIGHTS'],
        plaidKeywords: ['hotel', 'airbnb', 'flight', 'vacation', 'travel', 'airline', 'booking', 'expedia']
      },
      { 
        name: 'RECREATION_CASINOS_GAMBLING', 
        displayName: 'Casinos & Gambling',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_CASINOS_AND_GAMBLING'],
        plaidKeywords: ['casino', 'gambling', 'poker', 'slots', 'lottery', 'sports betting', 'draftkings', 'fanduel']
      },
      { 
        name: 'RECREATION_VIDEO_GAMES', 
        displayName: 'Video Games',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_VIDEO_GAMES'],
        plaidKeywords: ['video games', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'twitch']
      },
      { 
        name: 'RECREATION_OTHER', 
        displayName: 'Other Recreation',
        plaidCategories: ['ENTERTAINMENT', 'ENTERTAINMENT_OTHER_ENTERTAINMENT'],
        plaidKeywords: ['entertainment', 'nightlife', 'clubs', 'bars', 'concerts', 'events']
      }
    ],
    'HOME_IMPROVEMENT': [
      { 
        name: 'HOME_FURNITURE', 
        displayName: 'Furniture',
        plaidCategories: ['HOME_IMPROVEMENT', 'HOME_IMPROVEMENT_FURNITURE'],
        plaidKeywords: ['furniture', 'sofa', 'bed', 'table', 'chair', 'ikea', 'wayfair', 'ashley']
      },
      { 
        name: 'HOME_HARDWARE', 
        displayName: 'Hardware & Building Materials',
        plaidCategories: ['HOME_IMPROVEMENT', 'HOME_IMPROVEMENT_HARDWARE'],
        plaidKeywords: ['hardware', 'home depot', 'lowes', 'paint', 'tools', 'lumber', 'building materials']
      },
      { 
        name: 'HOME_REPAIR_MAINTENANCE', 
        displayName: 'Repair & Maintenance',
        plaidCategories: ['HOME_IMPROVEMENT', 'HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE'],
        plaidKeywords: ['repair', 'maintenance', 'plumbing', 'electrical', 'hvac', 'contractor', 'handyman']
      },
      { 
        name: 'HOME_SECURITY', 
        displayName: 'Home Security',
        plaidCategories: ['HOME_IMPROVEMENT', 'HOME_IMPROVEMENT_SECURITY'],
        plaidKeywords: ['security', 'alarm', 'surveillance', 'cameras', 'adt', 'ring', 'nest']
      }
    ],
    'OTHERS': [
      { 
        name: 'OTHERS_ACCOUNTING_FINANCIAL', 
        displayName: 'Accounting & Financial Planning',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING'],
        plaidKeywords: ['accounting', 'tax preparation', 'financial planning', 'cpa', 'bookkeeping', 'h&r block']
      },
      { 
        name: 'CHILDCARE', 
        displayName: 'Childcare',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_CHILDCARE'],
        plaidKeywords: ['childcare', 'daycare', 'babysitter', 'nanny', 'preschool', 'after school']
      },
      { 
        name: 'CONSULTING_LEGAL', 
        displayName: 'Consulting & Legal',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_CONSULTING_AND_LEGAL'],
        plaidKeywords: ['legal', 'lawyer', 'attorney', 'consulting', 'law firm', 'legal advice']
      },
      { 
        name: 'EDUCATION', 
        displayName: 'Education',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_EDUCATION'],
        plaidKeywords: ['education', 'tuition', 'school', 'university', 'college', 'training', 'course']
      },
      { 
        name: 'POSTAGE_SHIPPING', 
        displayName: 'Postage & Shipping',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_POSTAGE_AND_SHIPPING'],
        plaidKeywords: ['postage', 'shipping', 'mail', 'ups', 'fedex', 'usps', 'dhl', 'package']
      },
      { 
        name: 'STORAGE', 
        displayName: 'Storage',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_STORAGE'],
        plaidKeywords: ['storage', 'self storage', 'storage unit', 'public storage', 'extra space']
      },
      {
        name: 'OTHERS',
        displayName: 'Others',
        plaidCategories: ['GENERAL_SERVICES', 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES'],
        plaidKeywords: ['other', 'miscellaneous', 'misc', 'other services']
      }
    ]
  }
};

// User type presets with their recommended categories (using corrected category names)
const USER_TYPE_PRESETS = {
  COLLEGE_STUDENT: {
    categories: [
      'INCOME_SALARY', 'TRANSFER_IN', 'REFUND',
      'FOOD_GROCERIES', 'FOOD_RESTAURANTS', 'FOOD_FAST_FOOD', 'FOOD_COFFEE', 'FOOD_ALCOHOL',
      'TRANSPORTATION_PUBLIC_TRANSIT', 'TRANSPORTATION_TAXI_RIDESHARE',
      'LOAN_PAYMENTS_STUDENT_LOAN', 'DEBT_BANK_FEES_ATM', 'DEBT_BANK_FEES_OVERDRAFT',
      'RECREATION_MOVIES_TV_SUBSCRIPTIONS', 'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS', 'RECREATION_SPORTS_SUBSCRIPTIONS', 'RECREATION_VACATIONS', 'RECREATION_VIDEO_GAMES',
      'PERSONAL_CLOTHING', 'PERSONAL_HAIR_BEAUTY', 'PERSONAL_ITEMS',
      'EDUCATION', 'POSTAGE_SHIPPING'
    ]
  },
  YOUNG_PROFESSIONAL: {
    categories: [
      'INCOME_SALARY', 'INCOME_FREELANCE', 'TRANSFER_IN',
      'HOUSING_RENT', 'HOUSING_ENERGY_BILLS', 'HOUSING_INTERNET_PHONE',
      'HOME_FURNITURE', 'HOME_HARDWARE',
      'FOOD_GROCERIES', 'FOOD_RESTAURANTS', 'FOOD_COFFEE',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_TAXI_RIDESHARE', 'TRANSPORTATION_PARKING', 'TRANSPORTATION_CAR_INSURANCE',
      'LOAN_PAYMENTS_CREDIT_CARD', 'LOAN_PAYMENTS_AUTO', 'LOAN_PAYMENTS_STUDENT_LOAN', 'DEBT_BANK_FEES_ATM',
      'PERSONAL_GYMS_FITNESS', 'PERSONAL_CLOTHING', 'PERSONAL_HAIR_BEAUTY',
      'RECREATION_MOVIES_TV_SUBSCRIPTIONS', 'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS', 'RECREATION_VACATIONS',
      'CONSULTING_LEGAL', 'POSTAGE_SHIPPING'
    ]
  },
  FAMILY: {
    categories: [
      'INCOME_SALARY', 'TRANSFER_IN', 'GOVERNMENT_AND_NON_PROFIT',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'HOUSING_ENERGY_BILLS', 'HOUSING_WATER_BILLS', 'HOUSING_INTERNET_PHONE', 'HOUSING_SEWAGE_WASTE',
      'HOME_FURNITURE', 'HOME_HARDWARE', 'HOME_REPAIR_MAINTENANCE', 'HOME_SECURITY',
      'FOOD_GROCERIES', 'FOOD_RESTAURANTS', 'FOOD_FAST_FOOD',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_CAR_MAINTENANCE', 'TRANSPORTATION_CAR_INSURANCE', 'TRANSPORTATION_PARKING',
      'LOAN_PAYMENTS_MORTGAGE', 'LOAN_PAYMENTS_AUTO', 'LOAN_PAYMENTS_CREDIT_CARD',
      'MEDICAL_DOCTOR_VISITS', 'MEDICAL_PHARMACY', 'MEDICAL_DENTAL', 'MEDICAL_INSURANCE',
      'PERSONAL_CLOTHING', 'PERSONAL_GIFTS',
      'RECREATION_MOVIES_TV_SUBSCRIPTIONS', 'RECREATION_VACATIONS',
      'CHILDCARE', 'EDUCATION', 'POSTAGE_SHIPPING'
    ]
  },
  RETIREE: {
    categories: [
      'INCOME_SOCIAL_SECURITY', 'INCOME_PENSION', 'INCOME_INVESTMENT_DIVIDENDS',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'HOUSING_ENERGY_BILLS', 'HOUSING_WATER_BILLS',
      'HOME_REPAIR_MAINTENANCE', 'HOME_SECURITY',
      'FOOD_GROCERIES', 'FOOD_RESTAURANTS',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_CAR_MAINTENANCE', 'TRANSPORTATION_CAR_INSURANCE',
      'MEDICAL_DOCTOR_VISITS', 'MEDICAL_PHARMACY', 'MEDICAL_DENTAL', 'MEDICAL_VISION', 'MEDICAL_INSURANCE',
      'PERSONAL_HAIR_BEAUTY', 'PERSONAL_GIFTS',
      'RECREATION_VACATIONS', 'RECREATION_MOVIES_TV_SUBSCRIPTIONS',
      'OTHERS_ACCOUNTING_FINANCIAL', 'POSTAGE_SHIPPING'
    ]
  },
  FREELANCER: {
    categories: [
      'INCOME_FREELANCE', 'TRANSFER_IN',
      'HOUSING_RENT', 'HOUSING_INTERNET_PHONE',
      'HOME_FURNITURE', 'HOME_HARDWARE',
      'FOOD_GROCERIES', 'FOOD_RESTAURANTS', 'FOOD_COFFEE',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_TAXI_RIDESHARE', 'TRANSPORTATION_PARKING',
      'LOAN_PAYMENTS_CREDIT_CARD', 'DEBT_BANK_FEES_ATM',
      'PERSONAL_GYMS_FITNESS', 'PERSONAL_CLOTHING',
      'RECREATION_MUSIC_STREAMING_SUBSCRIPTIONS', 'RECREATION_VIDEO_GAMES',
      'OTHERS_ACCOUNTING_FINANCIAL', 'CONSULTING_LEGAL', 'POSTAGE_SHIPPING', 'STORAGE'
    ]
  }
};

async function seedCategories() {
  console.log('🌱 Seeding categories...');

  // Create all categories
  const categoriesToCreate = [];

  for (const [direction, mainGroups] of Object.entries(CATEGORIES_DATA)) {
    for (const [mainGroup, categories] of Object.entries(mainGroups)) {
      for (const category of categories) {
        categoriesToCreate.push({
          name: category.name,
          displayName: category.displayName,
          mainGroup,
          direction,
          isSystemDefault: true,
          plaidCategories: category.plaidCategories || [],
          plaidKeywords: category.plaidKeywords || [],
          plaidPrimary: category.plaidCategories?.[0] || null, // Use first as primary
          plaidDetailed: category.plaidCategories?.slice(1) || [] // Rest as detailed
        });
      }
    }
  }

  // Insert categories using upsert to avoid conflicts
  for (const categoryData of categoriesToCreate) {
    await prisma.category.upsert({
      where: { name: categoryData.name },
      update: categoryData,
      create: categoryData
    });
  }

  console.log(`✅ Created ${categoriesToCreate.length} categories`);

  // Store user type presets in database
  console.log('\n💾 Seeding user type presets...');
  
  let totalPresets = 0;
  for (const [userType, preset] of Object.entries(USER_TYPE_PRESETS)) {
    console.log(`  Processing ${userType}: ${preset.categories.length} categories`);
    
    // First, clear any existing presets for this user type
    await prisma.userTypePreset.deleteMany({
      where: { userType }
    });
    
    // Create presets for each category
    for (let i = 0; i < preset.categories.length; i++) {
      const categoryName = preset.categories[i];
      
      // Find the category by name
      const category = await prisma.category.findUnique({
        where: { name: categoryName }
      });
      
      if (category) {
        await prisma.userTypePreset.create({
          data: {
            userType,
            categoryId: category.id,
            isDefault: true,
            priority: i // Use array index as priority for ordering
          }
        });
        totalPresets++;
      } else {
        console.warn(`    ⚠️  Category not found: ${categoryName}`);
      }
    }
  }
  
  console.log(`✅ Created ${totalPresets} user type preset entries`);
  console.log('\n🎉 Category and preset seeding completed!');
}

async function main() {
  try {
    await seedCategories();
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

// USER_TYPE_PRESETS no longer exported - use database queries instead