// Hand-written stub for the Convex server runtime.
// Replaced by `npx convex dev --configure` codegen in a real Convex project.
// The shapes here are intentionally permissive so convex/study.ts can compile
// before a real data model is generated. They cast away the strict GenericDataModel
// constraint that the real `_generated/server` would expose.

import { queryGeneric as realQueryGeneric, mutationGeneric as realMutationGeneric } from "convex/server";
import type { FunctionReference } from "convex/server";

type AnyCtx = {
  db: {
    query: (...args: unknown[]) => unknown;
    insert: (...args: unknown[]) => unknown;
    patch: (...args: unknown[]) => unknown;
    replace: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
  };
};

export const queryGeneric = realQueryGeneric as unknown as <Args = unknown, Returns = unknown>(
  config: {
    args: Record<string, unknown>;
    returns: unknown;
    handler: (ctx: AnyCtx, args: Args) => Promise<Returns> | Returns;
  },
) => unknown;

export const mutationGeneric = realMutationGeneric as unknown as <Args = unknown, Returns = unknown>(
  config: {
    args: Record<string, unknown>;
    returns: unknown;
    handler: (ctx: AnyCtx, args: Args) => Promise<Returns> | Returns;
  },
) => unknown;

export type AnyApi = Record<string, Record<string, FunctionReference<"query" | "mutation", "public" | "internal", Record<string, never>, unknown>>>;

export const anyApi: AnyApi = {};
