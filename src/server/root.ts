import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { statementRouter } from "./routers/statement";
import { bankAccountRouter } from "./routers/bank-account";
// import { sheetsRouter } from "./routers/sheets"; // Removed Google Sheets functionality
import { categoryPreferencesRouter } from "./routers/category-preferences";
import { categoriesRouter } from "./routers/categories";
import { tasksRouter } from "./routers/tasks";
import { plaidRouter } from "./routers/plaid";
import { transactionsRouter } from "./routers/transactions";

export const appRouter = createTRPCRouter({
  user: userRouter,
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  // sheets: sheetsRouter, // Removed Google Sheets functionality
  categoryPreferences: categoryPreferencesRouter,
  categories: categoriesRouter,
  tasks: tasksRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
});

export type AppRouter = typeof appRouter;
