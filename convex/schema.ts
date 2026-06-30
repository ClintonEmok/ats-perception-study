import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  studySessions: defineTable({
    participantId: v.string(),
    participantName: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned"),
    ),
    userAgent: v.optional(v.string()),
  })
    .index("by_participant", ["participantId"])
    .index("by_name", ["participantName"]),

  studyResponses: defineTable({
    sessionId: v.id("studySessions"),
    windowKey: v.string(),
    taskType: v.union(v.literal("peak"), v.literal("comparison"), v.literal("pattern")),
    choice: v.union(v.literal("A"), v.literal("B")),
    rationale: v.string(),
    responseTimeMs: v.number(),
    confidence: v.number(),
    recordedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_windowKey", ["sessionId", "windowKey"]),

  studyQuestionnaires: defineTable({
    sessionId: v.id("studySessions"),
    preference: v.union(v.literal("uniform"), v.literal("ats"), v.literal("no_preference")),
    freeText: v.string(),
    participantName: v.optional(v.string()),
    submittedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
