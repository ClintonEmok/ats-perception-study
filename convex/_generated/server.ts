// Hand-written stub for the Convex server runtime.
// Replaced by `npx convex dev` codegen in a real Convex project.
// The shapes here are a minimal subset of the generated API used by convex/study.ts.

import { query, mutation } from "convex/server";
import type { GenericQueryCtx, GenericMutationCtx, FunctionReference } from "convex/server";

export const queryGeneric = query as unknown as <Args extends Record<string, unknown> = Record<string, never>, Returns = unknown>(
  config: {
    args: Record<string, unknown>;
    returns: unknown;
    handler: (ctx: GenericQueryCtx<Record<string, unknown>>, args: Args) => Promise<Returns> | Returns;
  },
) => unknown;

export const mutationGeneric = mutation as unknown as <Args extends Record<string, unknown> = Record<string, never>, Returns = unknown>(
  config: {
    args: Record<string, unknown>;
    returns: unknown;
    handler: (ctx: GenericMutationCtx<Record<string, unknown>>, args: Args) => Promise<Returns> | Returns;
  },
) => unknown;

export type AnyApi = Record<string, Record<string, FunctionReference<"query" | "mutation", "public" | "internal", unknown, unknown>>>;

export const anyApi: AnyApi = {};
