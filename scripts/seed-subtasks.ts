import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SubTaskDefinition {
  taskId: string;
  name: string;
  title: string;
  description: string;
  orderIndex: number;
}

const CONNECT_ACCOUNT_SUBTASKS: SubTaskDefinition[] = [
  {
    taskId: 'CONNECT_ACCOUNT',
    name: 'bank_connection',
    title: 'Bank Connection',
    description: 'Connect your bank account securely through Plaid to import your transaction history',
    orderIndex: 1,
  },
  {
    taskId: 'CONNECT_ACCOUNT',
    name: 'ai_analysis',
    title: 'AI Analysis',
    description: 'AI analyzes your spending patterns and determines your user type for personalized recommendations',
    orderIndex: 2,
  },
  {
    taskId: 'CONNECT_ACCOUNT',
    name: 'category_setup',
    title: 'Category Setup',
    description: 'Customize your spending categories and set monthly budgets based on AI recommendations',
    orderIndex: 3,
  },
];

async function seedSubTasks() {
  console.log('🌱 Seeding subtasks...');

  try {
    // Check if CONNECT_ACCOUNT task exists
    const connectAccountTask = await prisma.task.findUnique({
      where: { id: 'CONNECT_ACCOUNT' },
    });

    if (!connectAccountTask) {
      console.log('❌ CONNECT_ACCOUNT task not found. Please run seed-tasks.ts first.');
      return;
    }

    // Create subtasks
    for (const subTaskDef of CONNECT_ACCOUNT_SUBTASKS) {
      const existingSubTask = await prisma.subTask.findUnique({
        where: {
          taskId_name: {
            taskId: subTaskDef.taskId,
            name: subTaskDef.name,
          },
        },
      });

      if (existingSubTask) {
        console.log(`⚠️  SubTask ${subTaskDef.name} already exists, updating...`);
        
        await prisma.subTask.update({
          where: { id: existingSubTask.id },
          data: {
            title: subTaskDef.title,
            description: subTaskDef.description,
            orderIndex: subTaskDef.orderIndex,
          },
        });
      } else {
        console.log(`✅ Creating SubTask: ${subTaskDef.title}`);
        
        await prisma.subTask.create({
          data: subTaskDef,
        });
      }
    }

    console.log('🎉 Subtasks seeded successfully!');
    
    // Display created subtasks
    const allSubTasks = await prisma.subTask.findMany({
      where: { taskId: 'CONNECT_ACCOUNT' },
      orderBy: { orderIndex: 'asc' },
    });

    console.log('\n📋 Created SubTasks:');
    allSubTasks.forEach((subTask, index) => {
      console.log(`${index + 1}. ${subTask.title} (${subTask.name})`);
      console.log(`   ${subTask.description}`);
    });

  } catch (error) {
    console.error('❌ Error seeding subtasks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedSubTasks().catch((error) => {
  console.error('Failed to seed subtasks:', error);
  process.exit(1);
});