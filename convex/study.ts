import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const condition = v.union(v.literal("uniform"), v.literal("ats"));

const taskType = v.union(
  v.literal("peak_identification"),
  v.literal("period_comparison"),
  v.literal("pattern_recognition"),
);

const trialStatus = v.union(
  v.literal("started"),
  v.literal("responded"),
  v.literal("completed"),
  v.literal("abandoned"),
  v.literal("timeout"),
);

const sessionStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned"),
);

const preference = v.union(
  v.literal("uniform"),
  v.literal("ats"),
  v.literal("no_preference"),
);

type StartSessionArgs = {
  participantId: string;
  conditionOrder: ("uniform" | "ats")[];
  userAgent?: string;
};

type StartTrialArgs = {
  sessionId: Id<"studySessions">;
  trialIndex: number;
  taskType: "peak_identification" | "period_comparison" | "pattern_recognition";
  condition: "uniform" | "ats";
  datasetId: string;
  isPractice: boolean;
};

type RecordTrialOnsetArgs = {
  trialId: Id<"studyTrials">;
  stimulusOnsetAt: number;
};

type RecordTrialResponseArgs = {
  trialId: Id<"studyTrials">;
  responseValue: string;
  correctValue: string;
  responseTimeMs: number;
  confidence: number;
  respondedAt: number;
};

type TrialIdArgs = { trialId: Id<"studyTrials"> };
type AbandonTrialArgs = { trialId: Id<"studyTrials">; status: "started" | "responded" | "completed" | "abandoned" | "timeout" };
type SessionIdArgs = { sessionId: Id<"studySessions"> };
type SubmitQuestionnaireArgs = { sessionId: Id<"studySessions">; preference: "uniform" | "ats" | "no_preference"; freeText: string };

export const startSession = mutation({
  args: {
    participantId: v.string(),
    conditionOrder: v.array(condition),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("studySessions"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studySessions">> => {
    const args = rawArgs as unknown as StartSessionArgs;
    const doc: {
      participantId: string;
      conditionOrder: ("uniform" | "ats")[];
      startedAt: number;
      status: "active" | "completed" | "abandoned";
      userAgent?: string;
    } = {
      participantId: args.participantId,
      conditionOrder: args.conditionOrder,
      startedAt: Date.now(),
      status: "active",
    };
    if (args.userAgent !== undefined) {
      doc.userAgent = args.userAgent;
    }
    return (await ctx.db.insert("studySessions", doc)) as Id<"studySessions">;
  },
});

export const startTrial = mutation({
  args: {
    sessionId: v.id("studySessions"),
    trialIndex: v.number(),
    taskType,
    condition,
    datasetId: v.string(),
    isPractice: v.boolean(),
  },
  returns: v.id("studyTrials"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studyTrials">> => {
    const args = rawArgs as unknown as StartTrialArgs;
    return (await ctx.db.insert("studyTrials", {
      sessionId: args.sessionId,
      trialIndex: args.trialIndex,
      taskType: args.taskType,
      condition: args.condition,
      datasetId: args.datasetId,
      isPractice: args.isPractice,
      status: "started",
      startedAt: Date.now(),
    })) as Id<"studyTrials">;
  },
});

export const recordTrialOnset = mutation({
  args: {
    trialId: v.id("studyTrials"),
    stimulusOnsetAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, rawArgs): Promise<null> => {
    const args = rawArgs as unknown as RecordTrialOnsetArgs;
    await ctx.db.patch("studyTrials", args.trialId, {
      stimulusOnsetAt: args.stimulusOnsetAt,
    });
    return null;
  },
});

export const recordTrialResponse = mutation({
  args: {
    trialId: v.id("studyTrials"),
    responseValue: v.string(),
    correctValue: v.string(),
    responseTimeMs: v.number(),
    confidence: v.number(),
    respondedAt: v.number(),
  },
  returns: v.id("studyResponses"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studyResponses">> => {
    const args = rawArgs as unknown as RecordTrialResponseArgs;
    const isCorrect = args.responseValue === args.correctValue;
    const responseId = (await ctx.db.insert("studyResponses", {
      trialId: args.trialId,
      responseValue: args.responseValue,
      correctValue: args.correctValue,
      isCorrect,
      responseTimeMs: args.responseTimeMs,
      confidence: args.confidence,
      recordedAt: Date.now(),
    })) as Id<"studyResponses">;
    await ctx.db.patch("studyTrials", args.trialId, {
      status: "responded",
      respondedAt: args.respondedAt,
    });
    return responseId;
  },
});

export const completeTrial = mutation({
  args: {
    trialId: v.id("studyTrials"),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, rawArgs): Promise<null> => {
    const args = rawArgs as unknown as TrialIdArgs;
    await ctx.db.patch("studyTrials", args.trialId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return null;
  },
});

export const abandonTrial = mutation({
  args: {
    trialId: v.id("studyTrials"),
    status: trialStatus,
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, rawArgs): Promise<null> => {
    const args = rawArgs as unknown as AbandonTrialArgs;
    await ctx.db.patch("studyTrials", args.trialId, {
      status: args.status,
    });
    return null;
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.id("studySessions"),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, rawArgs): Promise<null> => {
    const args = rawArgs as unknown as SessionIdArgs;
    await ctx.db.patch("studySessions", args.sessionId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return null;
  },
});

export const submitQuestionnaire = mutation({
  args: {
    sessionId: v.id("studySessions"),
    preference,
    freeText: v.string(),
  },
  returns: v.id("studyQuestionnaires"),
  handler: async (ctx: MutationCtx, rawArgs): Promise<Id<"studyQuestionnaires">> => {
    const args = rawArgs as unknown as SubmitQuestionnaireArgs;
    return (await ctx.db.insert("studyQuestionnaires", {
      sessionId: args.sessionId,
      preference: args.preference,
      freeText: args.freeText,
      submittedAt: Date.now(),
    })) as Id<"studyQuestionnaires">;
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
      conditionOrder: v.array(condition),
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

export const listTrialsForSession = query({
  args: {
    sessionId: v.id("studySessions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("studyTrials"),
      _creationTime: v.number(),
      sessionId: v.id("studySessions"),
      trialIndex: v.number(),
      taskType,
      condition,
      datasetId: v.string(),
      isPractice: v.boolean(),
      status: trialStatus,
      startedAt: v.number(),
      stimulusOnsetAt: v.optional(v.number()),
      respondedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx: QueryCtx, rawArgs) => {
    const args = rawArgs as unknown as SessionIdArgs;
    return await ctx.db
      .query("studyTrials")
      .withIndex("by_session_trialIndex", (q) => q.eq("sessionId", args.sessionId))
      .take(100);
  },
});
