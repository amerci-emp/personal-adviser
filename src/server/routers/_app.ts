import { createTRPCRouter } from "@/server/trpc";
import { statementRouter } from "./statement";
import { bankAccountRouter } from "./bank-account";
import { plaidRouter } from "./plaid";
import { userRouter } from "./user";
import { tasksRouter } from "./tasks";
import { transactionsRouter } from "./transactions";

export const appRouter = createTRPCRouter({
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  plaid: plaidRouter,
  user: userRouter,
  tasks: tasksRouter,
  transactions: transactionsRouter,
});

export type AppRouter = typeof appRouter; 