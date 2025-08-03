import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { statementRouter } from "./routers/statement";
import { bankAccountRouter } from "./routers/bank-account";
// import { sheetsRouter } from "./routers/sheets"; // Removed Google Sheets functionality
import { categoryPreferencesRouter } from "./routers/category-preferences";
import { tasksRouter } from "./routers/tasks";
import { plaidRouter } from "./routers/plaid";

export const appRouter = createTRPCRouter({
  user: userRouter,
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  // sheets: sheetsRouter, // Removed Google Sheets functionality
  categoryPreferences: categoryPreferencesRouter,
  tasks: tasksRouter,
  plaid: plaidRouter,
});

export type AppRouter = typeof appRouter;
