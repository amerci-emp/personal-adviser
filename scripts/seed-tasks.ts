const { PrismaClient } = require('@prisma/client');

const seedPrisma = new PrismaClient();

const initialTasks = [
  {
    id: 'CONNECT_ACCOUNT' as const,
    title: 'Connect Your First Account',
    description: 'Link a bank account via Plaid to start tracking your finances.',
    points: 500,
    priority: 1,
  },
  {
    id: 'REVIEW_TRANSACTIONS' as const,
    title: 'Review Your Transactions',
    description: 'Categorize your latest transactions to get a clear picture of your spending.',
    points: 250,
    priority: 2,
  },
  {
    id: 'ENABLE_AI_COMPANION' as const,
    title: 'Enable Your AI Companion',
    description: 'Unlock personalized insights and recommendations by enabling the AI Companion.',
    points: 150,
    priority: 3,
  },
];

async function seedTasks() {
  console.log('Seeding initial tasks...');
  
  for (const task of initialTasks) {
    await seedPrisma.task.upsert({
      where: { id: task.id },
      update: {
        title: task.title,
        description: task.description,
        points: task.points,
        priority: task.priority,
      },
      create: {
        id: task.id,
        title: task.title,
        description: task.description,
        points: task.points,
        priority: task.priority,
      },
    });
    console.log(`✓ Task "${task.title}" seeded`);
  }
  
  console.log('Task seeding completed!');
}

async function assignInitialTasksToUsers() {
  console.log('Assigning initial tasks to all users...');
  
  const users = await seedPrisma.user.findMany();
  
  for (const user of users) {
    // Check if user already has tasks assigned
    const existingUserTasks = await seedPrisma.userTask.count({
      where: { userId: user.id },
    });
    
    if (existingUserTasks === 0) {
      // Assign the first task (CONNECT_ACCOUNT) to new users
      await seedPrisma.userTask.create({
        data: {
          userId: user.id,
          taskId: 'CONNECT_ACCOUNT',
          status: 'PENDING',
        },
      });
      console.log(`✓ Assigned initial task to user: ${user.email || user.id}`);
    }
  }
  
  console.log('User task assignment completed!');
}

async function main() {
  try {
    await seedTasks();
    await assignInitialTasksToUsers();
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await seedPrisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase: main };