import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/routers/_app";

export const api = createTRPCReact<AppRouter>();
// Backward-compatible alias in case some imports still use `trpc`
export const trpc = api;
