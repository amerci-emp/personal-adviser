import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { statementRouter } from "./routers/statement";
import { bankAccountRouter } from "./routers/bank-account";
import { sheetsRouter } from "./routers/sheets";

export const appRouter = createTRPCRouter({
  user: userRouter,
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  sheets: sheetsRouter,
});

export type AppRouter = typeof appRouter;
