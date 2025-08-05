import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category data based on the current hardcoded system in lib/category-system.ts
const CATEGORIES_DATA = {
  INFLOW: {
    'ONE_TIME_PAYMENTS': [
      { name: 'TRANSFER_IN', displayName: 'Transfer In' },
      { name: 'DEPOSIT', displayName: 'Deposit' },
      { name: 'REFUND', displayName: 'Refund' },
      { name: 'GOVERNMENT_AND_NON_PROFIT', displayName: 'Government & Non-Profit' }
    ],
    'RECURRING_INCOME': [
      { name: 'INCOME_SALARY', displayName: 'Salary' },
      { name: 'INCOME_FREELANCE', displayName: 'Freelance Income' },
      { name: 'INCOME_INVESTMENT_DIVIDENDS', displayName: 'Investment Dividends' },
      { name: 'INCOME_RENTAL', displayName: 'Rental Income' },
      { name: 'INCOME_SOCIAL_SECURITY', displayName: 'Social Security' },
      { name: 'INCOME_PENSION', displayName: 'Pension' }
    ]
  },
  OUTFLOW: {
    'HOUSING': [
      { name: 'RENT_AND_UTILITIES', displayName: 'Rent & Utilities' },
      { name: 'HOME_IMPROVEMENT', displayName: 'Home Improvement' },
      { name: 'GENERAL_SERVICES_HOME_SERVICES', displayName: 'Home Services' }
    ],
    'TRANSPORTATION': [
      { name: 'TRANSPORTATION_GAS', displayName: 'Gas' },
      { name: 'TRANSPORTATION_PUBLIC_TRANSIT', displayName: 'Public Transit' },
      { name: 'TRANSPORTATION_TAXI_RIDESHARE', displayName: 'Taxi & Rideshare' },
      { name: 'TRANSPORTATION_PARKING', displayName: 'Parking' },
      { name: 'TRANSPORTATION_VEHICLE_MAINTENANCE', displayName: 'Vehicle Maintenance' },
      { name: 'TRANSPORTATION_VEHICLE_INSURANCE', displayName: 'Vehicle Insurance' }
    ],
    'DEBT': [
      { name: 'LOAN_PAYMENTS_MORTGAGE', displayName: 'Mortgage' },
      { name: 'LOAN_PAYMENTS_AUTO', displayName: 'Auto Loan' },
      { name: 'LOAN_PAYMENTS_STUDENT_LOAN', displayName: 'Student Loan' },
      { name: 'LOAN_PAYMENTS_PERSONAL_LOAN', displayName: 'Personal Loan' },
      { name: 'LOAN_PAYMENTS_CREDIT_CARD', displayName: 'Credit Card Payment' }
    ],
    'FOOD': [
      { name: 'FOOD_AND_DRINK_GROCERIES', displayName: 'Groceries' },
      { name: 'FOOD_AND_DRINK_RESTAURANTS', displayName: 'Restaurants' },
      { name: 'FOOD_AND_DRINK_FAST_FOOD', displayName: 'Fast Food' },
      { name: 'FOOD_AND_DRINK_COFFEE', displayName: 'Coffee' },
      { name: 'FOOD_AND_DRINK_ALCOHOL', displayName: 'Alcohol' }
    ],
    'MEDICAL': [
      { name: 'MEDICAL_DOCTOR_VISITS', displayName: 'Doctor Visits' },
      { name: 'MEDICAL_PHARMACY', displayName: 'Pharmacy' },
      { name: 'MEDICAL_DENTAL', displayName: 'Dental' },
      { name: 'MEDICAL_VISION', displayName: 'Vision' },
      { name: 'MEDICAL_INSURANCE', displayName: 'Medical Insurance' }
    ],
    'PERSONAL': [
      { name: 'PERSONAL_CARE_HAIR_BEAUTY', displayName: 'Hair & Beauty' },
      { name: 'PERSONAL_CARE_GYMS_FITNESS', displayName: 'Gyms & Fitness' },
      { name: 'GENERAL_MERCHANDISE_CLOTHING', displayName: 'Clothing' },
      { name: 'GENERAL_MERCHANDISE_PERSONAL_ITEMS', displayName: 'Personal Items' }
    ],
    'RECREATION': [
      { name: 'ENTERTAINMENT_MOVIES_TV', displayName: 'Movies & TV' },
      { name: 'ENTERTAINMENT_MUSIC_STREAMING', displayName: 'Music Streaming' },
      { name: 'ENTERTAINMENT_SPORTS', displayName: 'Sports' },
      { name: 'TRAVEL_FLIGHTS', displayName: 'Flights' },
      { name: 'TRAVEL_LODGING', displayName: 'Lodging' },
      { name: 'TRAVEL_TRANSPORTATION', displayName: 'Travel Transportation' }
    ]
  }
};

// User type presets with their recommended categories
const USER_TYPE_PRESETS = {
  COLLEGE_STUDENT: {
    categories: [
      'INCOME_SALARY', 'TRANSFER_IN', 'REFUND',
      'FOOD_AND_DRINK_FAST_FOOD', 'FOOD_AND_DRINK_COFFEE', 'FOOD_AND_DRINK_RESTAURANTS',
      'TRANSPORTATION_PUBLIC_TRANSIT', 'TRANSPORTATION_GAS',
      'LOAN_PAYMENTS_STUDENT_LOAN',
      'ENTERTAINMENT_MOVIES_TV', 'ENTERTAINMENT_MUSIC_STREAMING',
      'GENERAL_MERCHANDISE_CLOTHING', 'PERSONAL_CARE_HAIR_BEAUTY'
    ]
  },
  YOUNG_PROFESSIONAL: {
    categories: [
      'INCOME_SALARY', 'INCOME_FREELANCE', 'TRANSFER_IN',
      'RENT_AND_UTILITIES', 'HOME_IMPROVEMENT',
      'FOOD_AND_DRINK_GROCERIES', 'FOOD_AND_DRINK_RESTAURANTS', 'FOOD_AND_DRINK_COFFEE',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_TAXI_RIDESHARE', 'TRANSPORTATION_PARKING',
      'LOAN_PAYMENTS_CREDIT_CARD', 'LOAN_PAYMENTS_AUTO', 'LOAN_PAYMENTS_STUDENT_LOAN',
      'PERSONAL_CARE_GYMS_FITNESS', 'GENERAL_MERCHANDISE_CLOTHING',
      'ENTERTAINMENT_MOVIES_TV', 'ENTERTAINMENT_MUSIC_STREAMING', 'TRAVEL_FLIGHTS'
    ]
  },
  FAMILY: {
    categories: [
      'INCOME_SALARY', 'TRANSFER_IN', 'GOVERNMENT_AND_NON_PROFIT',
      'RENT_AND_UTILITIES', 'HOME_IMPROVEMENT', 'GENERAL_SERVICES_HOME_SERVICES',
      'FOOD_AND_DRINK_GROCERIES', 'FOOD_AND_DRINK_RESTAURANTS',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_VEHICLE_MAINTENANCE', 'TRANSPORTATION_VEHICLE_INSURANCE',
      'LOAN_PAYMENTS_MORTGAGE', 'LOAN_PAYMENTS_AUTO', 'LOAN_PAYMENTS_CREDIT_CARD',
      'MEDICAL_DOCTOR_VISITS', 'MEDICAL_PHARMACY', 'MEDICAL_DENTAL', 'MEDICAL_INSURANCE',
      'GENERAL_MERCHANDISE_CLOTHING', 'ENTERTAINMENT_MOVIES_TV'
    ]
  },
  RETIREE: {
    categories: [
      'INCOME_SOCIAL_SECURITY', 'INCOME_PENSION', 'INCOME_INVESTMENT_DIVIDENDS',
      'RENT_AND_UTILITIES', 'GENERAL_SERVICES_HOME_SERVICES',
      'FOOD_AND_DRINK_GROCERIES', 'FOOD_AND_DRINK_RESTAURANTS',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_VEHICLE_MAINTENANCE',
      'MEDICAL_DOCTOR_VISITS', 'MEDICAL_PHARMACY', 'MEDICAL_DENTAL', 'MEDICAL_VISION', 'MEDICAL_INSURANCE',
      'TRAVEL_FLIGHTS', 'TRAVEL_LODGING', 'ENTERTAINMENT_MOVIES_TV'
    ]
  },
  FREELANCER: {
    categories: [
      'INCOME_FREELANCE', 'TRANSFER_IN',
      'RENT_AND_UTILITIES', 'GENERAL_SERVICES_HOME_SERVICES',
      'FOOD_AND_DRINK_GROCERIES', 'FOOD_AND_DRINK_RESTAURANTS', 'FOOD_AND_DRINK_COFFEE',
      'TRANSPORTATION_GAS', 'TRANSPORTATION_TAXI_RIDESHARE',
      'LOAN_PAYMENTS_CREDIT_CARD', 'PERSONAL_CARE_GYMS_FITNESS',
      'ENTERTAINMENT_MUSIC_STREAMING', 'GENERAL_MERCHANDISE_PERSONAL_ITEMS'
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
          isSystemDefault: true
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

  // Log user type presets for reference
  console.log('\n📋 User Type Presets Available:');
  for (const [userType, preset] of Object.entries(USER_TYPE_PRESETS)) {
    console.log(`  ${userType}: ${preset.categories.length} categories`);
  }

  console.log('\n🎉 Category seeding completed!');
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

export { USER_TYPE_PRESETS };