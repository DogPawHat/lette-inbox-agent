import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  people: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_email", ["email"]),

  properties: defineTable({
    code: v.string(),
    name: v.string(),
    addressLine1: v.string(),
    city: v.string(),
  }).index("by_code", ["code"]),

  units: defineTable({
    propertyId: v.id("properties"),
    code: v.string(),
    label: v.string(),
    bedrooms: v.number(),
    listingStatus: v.string(),
  }).index("by_property", ["propertyId"]),

  tenancies: defineTable({
    tenantId: v.id("people"),
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    status: v.string(),
    startedAt: v.string(),
    endsAt: v.optional(v.string()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_unit", ["unitId"]),

  contractors: defineTable({
    name: v.string(),
    email: v.string(),
    trade: v.string(),
    serviceArea: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_trade", ["trade"]),

  calendarSlots: defineTable({
    slotKey: v.string(),
    kind: v.string(),
    startsAt: v.string(),
    endsAt: v.string(),
    isAvailable: v.boolean(),
    label: v.string(),
    contractorId: v.optional(v.id("contractors")),
    propertyId: v.optional(v.id("properties")),
    unitId: v.optional(v.id("units")),
  })
    .index("by_slot_key", ["slotKey"])
    .index("by_kind", ["kind"]),

  jobCatalog: defineTable({
    code: v.string(),
    title: v.string(),
    trade: v.string(),
    typicalCostMin: v.number(),
    typicalCostMax: v.number(),
    keywords: v.array(v.string()),
  }).index("by_code", ["code"]),

  threads: defineTable({
    subject: v.string(),
    latestMessageAt: v.string(),
    status: v.string(),
    workflowStatus: v.string(),
    classification: v.optional(v.string()),
    senderRole: v.optional(v.string()),
    matchedPersonId: v.optional(v.id("people")),
    matchedTenancyId: v.optional(v.id("tenancies")),
    matchedPropertyId: v.optional(v.id("properties")),
    matchedUnitId: v.optional(v.id("units")),
    intent: v.optional(v.string()),
    urgency: v.optional(v.string()),
    needsManagerReview: v.boolean(),
    escalationReason: v.optional(v.string()),
    estimatedCostMin: v.optional(v.number()),
    estimatedCostMax: v.optional(v.number()),
    autoReplyStatus: v.optional(v.string()),
    latestSummary: v.optional(v.string()),
    topRecommendedAction: v.optional(v.string()),
    analysisVersion: v.optional(v.number()),
    scenarioKey: v.string(),
    sourceLabel: v.string(),
  })
    .index("by_latest_message", ["latestMessageAt"])
    .index("by_workflow_status", ["workflowStatus"]),

  emails: defineTable({
    threadId: v.id("threads"),
    direction: v.string(),
    fromName: v.string(),
    fromEmail: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    sentAt: v.string(),
    generatedByWorkflow: v.boolean(),
  }).index("by_thread", ["threadId"]),

  threadAnalyses: defineTable({
    threadId: v.id("threads"),
    source: v.string(),
    version: v.number(),
    matchConfidence: v.number(),
    summary: v.string(),
    urgencyRationale: v.string(),
    topRecommendedAction: v.string(),
    replyMode: v.string(),
    suggestedReply: v.optional(v.string()),
    suggestedActions: v.array(v.string()),
    reviewFlags: v.array(v.string()),
    missingInformation: v.array(v.string()),
    suggestedSlots: v.array(
      v.object({
        slotId: v.string(),
        kind: v.string(),
        label: v.string(),
        startsAt: v.string(),
        endsAt: v.string(),
      }),
    ),
    classification: v.string(),
    senderRole: v.string(),
    inferredIntent: v.string(),
    urgency: v.string(),
    needsManagerReview: v.boolean(),
    escalationReason: v.string(),
    matchedPersonEmail: v.optional(v.string()),
    matchedPropertyCode: v.optional(v.string()),
    matchedUnitCode: v.optional(v.string()),
    maintenanceJobCategory: v.optional(v.string()),
    estimatedCostMin: v.optional(v.number()),
    estimatedCostMax: v.optional(v.number()),
    createdAt: v.string(),
  }).index("by_thread", ["threadId"]),

  actions: defineTable({
    threadId: v.id("threads"),
    title: v.string(),
    detail: v.string(),
    status: v.string(),
    kind: v.string(),
    createdAt: v.string(),
  }).index("by_thread", ["threadId"]),
});
