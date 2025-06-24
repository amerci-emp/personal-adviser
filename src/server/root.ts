import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { statementRouter } from "./routers/statement";
import { bankAccountRouter } from "./routers/bank-account";
import { sheetsRouter } from "./routers/sheets";
import { categoryPreferencesRouter } from "./routers/category-preferences";

export const appRouter = createTRPCRouter({
  user: userRouter,
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  sheets: sheetsRouter,
  categoryPreferences: categoryPreferencesRouter,
});

export type AppRouter = typeof appRouter;
