import {
  mutationGeneric,
  queryGeneric,
} from "convex/server";
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

export const startSession = mutationGeneric({
  args: {
    participantId: v.string(),
    conditionOrder: v.array(condition),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("studySessions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("studySessions", {
      participantId: args.participantId,
      conditionOrder: args.conditionOrder,
      startedAt: Date.now(),
      status: "active",
      userAgent: args.userAgent,
    });
  },
});

export const startTrial = mutationGeneric({
  args: {
    sessionId: v.id("studySessions"),
    trialIndex: v.number(),
    taskType,
    condition,
    datasetId: v.string(),
    isPractice: v.boolean(),
  },
  returns: v.id("studyTrials"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("studyTrials", {
      sessionId: args.sessionId,
      trialIndex: args.trialIndex,
      taskType: args.taskType,
      condition: args.condition,
      datasetId: args.datasetId,
      isPractice: args.isPractice,
      status: "started",
      startedAt: Date.now(),
    });
  },
});

export const recordTrialOnset = mutationGeneric({
  args: {
    trialId: v.id("studyTrials"),
    stimulusOnsetAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trialId, {
      stimulusOnsetAt: args.stimulusOnsetAt,
    });
    return null;
  },
});

export const recordTrialResponse = mutationGeneric({
  args: {
    trialId: v.id("studyTrials"),
    responseValue: v.string(),
    correctValue: v.string(),
    responseTimeMs: v.number(),
    confidence: v.number(),
    respondedAt: v.number(),
  },
  returns: v.id("studyResponses"),
  handler: async (ctx, args) => {
    const isCorrect = args.responseValue === args.correctValue;
    const responseId = await ctx.db.insert("studyResponses", {
      trialId: args.trialId,
      responseValue: args.responseValue,
      correctValue: args.correctValue,
      isCorrect,
      responseTimeMs: args.responseTimeMs,
      confidence: args.confidence,
      recordedAt: Date.now(),
    });
    await ctx.db.patch(args.trialId, {
      status: "responded" as const,
      respondedAt: args.respondedAt,
    });
    return responseId;
  },
});

export const completeTrial = mutationGeneric({
  args: {
    trialId: v.id("studyTrials"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trialId, {
      status: "completed" as const,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const abandonTrial = mutationGeneric({
  args: {
    trialId: v.id("studyTrials"),
    status: trialStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trialId, {
      status: args.status,
    });
    return null;
  },
});

export const completeSession = mutationGeneric({
  args: {
    sessionId: v.id("studySessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "completed" as const,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const submitQuestionnaire = mutationGeneric({
  args: {
    sessionId: v.id("studySessions"),
    preference: v.union(
      v.literal("uniform"),
      v.literal("ats"),
      v.literal("no_preference"),
    ),
    freeText: v.string(),
  },
  returns: v.id("studyQuestionnaires"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("studyQuestionnaires", {
      sessionId: args.sessionId,
      preference: args.preference,
      freeText: args.freeText,
      submittedAt: Date.now(),
    });
  },
});

export const getSession = queryGeneric({
  args: {
    sessionId: v.id("studySessions"),
  },
  returns: v.union(
    v.object({
      _id: v.id("studySessions"),
      participantId: v.string(),
      conditionOrder: v.array(condition),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("abandoned"),
      ),
      userAgent: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});
