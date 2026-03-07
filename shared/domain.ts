import { z } from "zod";

export const emailClassificationValues = ["spam", "irrelevant", "actionable"] as const;
export const senderRoleValues = [
  "tenant",
  "landlord",
  "contractor",
  "prospect",
  "unknown",
] as const;
export const intentValues = [
  "maintenance",
  "tenancy_termination",
  "viewing_request",
  "payment",
  "contractor_coordination",
  "general_question",
  "complaint",
  "other",
] as const;
export const urgencyValues = ["low", "medium", "high", "critical"] as const;
export const replyModeValues = ["auto_send", "draft_for_manager", "no_reply"] as const;
export const escalationReasonValues = [
  "cost_threshold",
  "urgency",
  "sensitive_case",
  "low_confidence",
  "manager_policy",
  "none",
] as const;
export const maintenanceJobCategoryValues = [
  "dripping_tap",
  "blocked_sink",
  "toilet_issue",
  "leak_investigation",
  "washing_machine_fault",
  "oven_fault",
  "fridge_fault",
  "dishwasher_fault",
  "broken_socket",
  "light_failure",
  "fuse_issue",
  "lock_issue",
  "door_issue",
  "other",
] as const;
export const actionStatusValues = ["todo", "done"] as const;
export const threadStatusValues = ["new", "in_review", "resolved"] as const;
export const workflowStatusValues = ["pending", "processed", "failed"] as const;

export type EmailClassification = (typeof emailClassificationValues)[number];
export type SenderRole = (typeof senderRoleValues)[number];
export type Intent = (typeof intentValues)[number];
export type Urgency = (typeof urgencyValues)[number];
export type ReplyMode = (typeof replyModeValues)[number];
export type EscalationReason = (typeof escalationReasonValues)[number];
export type MaintenanceJobCategory = (typeof maintenanceJobCategoryValues)[number];
export type ActionStatus = (typeof actionStatusValues)[number];
export type ThreadStatus = (typeof threadStatusValues)[number];
export type WorkflowStatus = (typeof workflowStatusValues)[number];

export const urgencyRank: Record<Urgency, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const analysisOutputSchema = z.object({
  classification: z.enum(emailClassificationValues),
  senderRole: z.enum(senderRoleValues),
  matchConfidence: z.number().min(0).max(1),
  inferredIntent: z.enum(intentValues),
  urgency: z.enum(urgencyValues),
  summary: z.string().min(1),
  urgencyRationale: z.string().min(1),
  replyMode: z.enum(replyModeValues),
  needsManagerReview: z.boolean(),
  escalationReason: z.enum(escalationReasonValues),
  topRecommendedAction: z.string().min(1),
  suggestedReply: z.string().optional(),
  suggestedActions: z.array(z.string()).min(1),
  reviewFlags: z.array(z.string()),
  missingInformation: z.array(z.string()),
  matchedPersonEmail: z.string().email().optional(),
  matchedPropertyCode: z.string().optional(),
  matchedUnitCode: z.string().optional(),
  maintenanceJobCategory: z.enum(maintenanceJobCategoryValues).optional(),
  estimatedCostMin: z.number().int().nonnegative().optional(),
  estimatedCostMax: z.number().int().nonnegative().optional(),
  suggestedSlots: z
    .array(
      z.object({
        slotId: z.string(),
        kind: z.enum(["contractor", "viewing"]),
        label: z.string(),
        startsAt: z.string(),
        endsAt: z.string(),
      }),
    )
    .default([]),
});

export type ThreadAnalysisOutput = z.infer<typeof analysisOutputSchema>;

export const roleLabels: Record<SenderRole, string> = {
  tenant: "Tenant",
  landlord: "Landlord",
  contractor: "Contractor",
  prospect: "Prospect",
  unknown: "Unknown",
};

export const urgencyLabels: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const classificationLabels: Record<EmailClassification, string> = {
  spam: "Spam",
  irrelevant: "Irrelevant",
  actionable: "Actionable",
};

export const intentLabels: Record<Intent, string> = {
  maintenance: "Maintenance",
  tenancy_termination: "Tenancy Exit",
  viewing_request: "Viewing Request",
  payment: "Payment",
  contractor_coordination: "Contractor Coordination",
  general_question: "General Question",
  complaint: "Complaint",
  other: "Other",
};
