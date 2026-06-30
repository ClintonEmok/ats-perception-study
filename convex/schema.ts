import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const trialStatus = v.union(
  v.literal("started"),
  v.literal("responded"),
  v.literal("completed"),
  v.literal("abandoned"),
  v.literal("timeout"),
);

const condition = v.union(v.literal("uniform"), v.literal("ats"));

const taskType = v.union(
  v.literal("peak_identification"),
  v.literal("period_comparison"),
  v.literal("pattern_recognition"),
);

export default defineSchema({
  studySessions: defineTable({
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
  }).index("by_participant", ["participantId"]),

  studyTrials: defineTable({
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
  })
    .index("by_session", ["sessionId"])
    .index("by_session_trialIndex", ["sessionId", "trialIndex"]),

  studyResponses: defineTable({
    trialId: v.id("studyTrials"),
    responseValue: v.string(),
    correctValue: v.string(),
    isCorrect: v.boolean(),
    responseTimeMs: v.number(),
    confidence: v.number(),
    recordedAt: v.number(),
  }).index("by_trial", ["trialId"]),

  studyQuestionnaires: defineTable({
    sessionId: v.id("studySessions"),
    preference: v.union(v.literal("uniform"), v.literal("ats"), v.literal("no_preference")),
    freeText: v.string(),
    submittedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
