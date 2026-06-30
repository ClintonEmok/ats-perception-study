// Hand-written stub that mirrors the shape of the real Convex
// `_generated/server.ts` produced by `npx convex dev`. It re-exports the
// generic Convex runtime functions as `query` / `mutation` and exposes the
// proper context types. Once a real Convex project is provisioned, this file
// is overwritten by codegen and the casts are no longer needed.
//
// The hand-written `query` / `mutation` builders intentionally accept the
// handler ctx as `any` and the args/returns as `Record<string, unknown>` so
// the full validator-based type narrowing is delegated to the validator at
// the call site. This mirrors the looseness of `queryGeneric` /
// `mutationGeneric` while still presenting the conventional `query` /
// `mutation` / `QueryCtx` / `MutationCtx` names that the AI guidelines
// recommend.

import {
  actionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

// Builder ctx is typed as `any` because the hand-written stub cannot infer the
// narrow `GenericMutationCtx<DataModel>` / `GenericQueryCtx<DataModel>` types
// that real codegen produces. The exported `QueryCtx` / `MutationCtx` types
// below are still the proper Convex context types so user code can type its
// handler parameters with the strict types — the `any` is only the contract
// between the builder and the user-supplied handler.
type AnyBuilder = (config: {
  args: Record<string, unknown>;
  returns: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: any, args: Record<string, unknown>) => unknown;
}) => unknown;

export const query = queryGeneric as unknown as AnyBuilder;
export const mutation = mutationGeneric as unknown as AnyBuilder;
export const internalQuery = internalQueryGeneric as unknown as AnyBuilder;
export const internalMutation = internalMutationGeneric as unknown as AnyBuilder;
export const action = actionGeneric as unknown as AnyBuilder;
export const internalAction = internalActionGeneric as unknown as AnyBuilder;

export type QueryCtx<D extends GenericDataModel = GenericDataModel> = GenericQueryCtx<D>;
export type MutationCtx<D extends GenericDataModel = GenericDataModel> = GenericMutationCtx<D>;
export type ActionCtx<D extends GenericDataModel = GenericDataModel> = GenericActionCtx<D>;
