import { createTRPCRouter } from "@/server/trpc";
import { statementRouter } from "./statement";
import { bankAccountRouter } from "./bank-account";
import { plaidRouter } from "./plaid";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  statement: statementRouter,
  bankAccount: bankAccountRouter,
  plaid: plaidRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter; 