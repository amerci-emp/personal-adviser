import { createTRPCRouter } from "@/server/trpc";
import { statementRouter } from "./statement";
import { bankAccountRouter } from "./bank-account";
import { plaidRouter } from "./plaid";
import { userRouter } from "./user";
import { tasksRouter } from "./tasks";
import { transactionsRouter } from "./transactions";
import { categoryPreferencesRouter } from "./category-preferences";
import { subtasksRouter } from "./subtasks";
import { categoriesRouter } from "./categories";

export const appRouter = createTRPCRouter({
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  plaid: plaidRouter,
  user: userRouter,
  tasks: tasksRouter,
  transactions: transactionsRouter,
  categoryPreferences: categoryPreferencesRouter,
  categories: categoriesRouter,
  subtasks: subtasksRouter,
});

export type AppRouter = typeof appRouter; 