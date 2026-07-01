import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const sessionStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned"),
);

type StartSessionArgs = {
  participantId: string;
  participantName?: string;
  userAgent?: string;
  startedAt?: number;
  conditionOrder: ReadonlyArray<"uniform" | "ats">;
};

type RecordAbResponseArgs = {
  sessionId: Id<"studySessions">;
  windowKey: string;
  taskType: "peak" | "comparison" | "pattern";
  choice: "A" | "B";
  rationale: string;
  responseTimeMs: number;
  confidence: number;
  recordedAt: number;
};

type SessionIdArgs = { sessionId: Id<"studySessions"> };
type CompleteSessionArgs = { sessionId: Id<"studySessions">; finishedAt?: number };
type SubmitQuestionnaireArgs = {
  sessionId: Id<"studySessions">;
  freeText: string;
  participantName?: string;
  submittedAt?: number;
};

export const startSession = mutation({
  args: {
    participantId: v.string(),
    participantName: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    conditionOrder: v.array(v.union(v.literal("uniform"), v.literal("ats"))),
  },
  returns: v.id("studySessions"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studySessions">> => {
    const args = rawArgs as unknown as StartSessionArgs;
    const doc: {
      participantId: string;
      participantName?: string;
      startedAt: number;
      status: "active" | "completed" | "abandoned";
      userAgent?: string;
    } = {
      participantId: args.participantId,
      startedAt: args.startedAt ?? Date.now(),
      status: "active",
    };
    if (args.participantName !== undefined) {
      doc.participantName = args.participantName;
    }
    if (args.userAgent !== undefined) {
      doc.userAgent = args.userAgent;
    }
    return (await ctx.db.insert("studySessions", doc)) as Id<"studySessions">;
  },
});

export const recordAbResponse = mutation({
  args: {
    sessionId: v.id("studySessions"),
    windowKey: v.string(),
    taskType: v.union(v.literal("peak"), v.literal("comparison"), v.literal("pattern")),
    choice: v.union(v.literal("A"), v.literal("B")),
    rationale: v.string(),
    responseTimeMs: v.number(),
    confidence: v.number(),
    recordedAt: v.number(),
  },
  returns: v.id("studyResponses"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studyResponses">> => {
    const args = rawArgs as unknown as RecordAbResponseArgs;
    return (await ctx.db.insert("studyResponses", { ...args })) as Id<"studyResponses">;
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.id("studySessions"),
    finishedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, rawArgs): Promise<null> => {
    const args = rawArgs as unknown as CompleteSessionArgs;
    await ctx.db.patch("studySessions", args.sessionId, {
      status: "completed",
      completedAt: args.finishedAt ?? Date.now(),
    });
    return null;
  },
});

export const submitQuestionnaire = mutation({
  args: {
    sessionId: v.id("studySessions"),
    freeText: v.string(),
    participantName: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
  },
  returns: v.id("studyQuestionnaires"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studyQuestionnaires">> => {
    const args = rawArgs as unknown as SubmitQuestionnaireArgs;
    const doc: {
      sessionId: Id<"studySessions">;
      freeText: string;
      participantName?: string;
      submittedAt: number;
    } = {
      sessionId: args.sessionId,
      freeText: args.freeText,
      submittedAt: args.submittedAt ?? Date.now(),
    };
    if (args.participantName !== undefined) {
      doc.participantName = args.participantName;
    }
    return (await ctx.db.insert("studyQuestionnaires", doc)) as Id<"studyQuestionnaires">;
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("studySessions"),
  },
  returns: v.union(
    v.object({
      _id: v.id("studySessions"),
      _creationTime: v.number(),
      participantId: v.string(),
      participantName: v.optional(v.string()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      status: sessionStatus,
      userAgent: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx: QueryCtx, rawArgs) => {
    const args = rawArgs as unknown as SessionIdArgs;
    return await ctx.db.get("studySessions", args.sessionId);
  },
});
