"use node";

import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ActionCtx } from "../_generated/server";
import { components } from "../_generated/api";
import {
  analysisOutputSchema,
  type EmailClassification,
  type Intent,
  type ReplyMode,
  type SenderRole,
  type ThreadAnalysisOutput,
  type Urgency,
  urgencyRank,
} from "../../shared/domain";
import { managerEscalationThreshold } from "./demoData";

type PersonRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type PropertyRecord = {
  _id: string;
  code: string;
  name: string;
  addressLine1: string;
  city: string;
};

type UnitRecord = {
  _id: string;
  propertyId: string;
  code: string;
  label: string;
  listingStatus: string;
};

type TenancyRecord = {
  _id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  status: string;
};

type ContractorRecord = {
  _id: string;
  name: string;
  email: string;
  trade: string;
};

type CalendarSlotRecord = {
  slotKey: string;
  kind: string;
  label: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  contractorId?: string;
  propertyId?: string;
  unitId?: string;
};

type JobRecord = {
  code: string;
  title: string;
  trade: string;
  typicalCostMin: number;
  typicalCostMax: number;
  keywords: string[];
};

export type WorkflowContext = {
  people: PersonRecord[];
  properties: PropertyRecord[];
  units: UnitRecord[];
  tenancies: TenancyRecord[];
  contractors: ContractorRecord[];
  calendarSlots: CalendarSlotRecord[];
  jobCatalog: JobRecord[];
};

export type WorkflowEmail = {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
};

type MatchedContext = {
  matchedPerson?: PersonRecord;
  matchedTenancy?: TenancyRecord;
  matchedProperty?: PropertyRecord;
  matchedUnit?: UnitRecord;
};

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.VITE_CONVEX_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Lette Inbox Agent",
  },
});

function createInboxAgent() {
  return new Agent(components.agent, {
    name: "lette-inbox-triage",
    languageModel: openrouter("moonshotai/kimi-k2.5"),
    instructions: [
      "You are triaging email for a property manager.",
      "Return only structured output matching the provided schema.",
      "Preserve seeded slot ids and deterministic cost bounds when they are already known.",
      "Spam and irrelevant emails should not generate replies.",
      `Maintenance that could exceed ${managerEscalationThreshold} euro must be escalated to the manager.`,
    ].join(" "),
    maxSteps: 1,
  });
}

export async function runWorkflowAnalysis(
  ctx: ActionCtx,
  email: WorkflowEmail,
  context: WorkflowContext,
  options?: { agentThreadId?: string },
): Promise<{ analysis: ThreadAnalysisOutput; source: "rules" | "ai"; agentThreadId?: string }> {
  const baseline = runDeterministicTriage(email, context);

  if (!process.env.OPENROUTER_API_KEY) {
    return { analysis: baseline, source: "rules", agentThreadId: options?.agentThreadId };
  }

  try {
    const agent = createInboxAgent();
    const userId = email.fromEmail.toLowerCase();
    const threadId =
      options?.agentThreadId ??
      (
        await agent.createThread(ctx, {
          title: email.subject,
          summary: `Inbox triage for ${email.fromEmail}`,
          userId,
        })
      ).threadId;
    const aiAnalysis = await refineWithAi(ctx, agent, threadId, userId, email, context, baseline);
    return { analysis: aiAnalysis, source: "ai", agentThreadId: threadId };
  } catch {
    return {
      analysis: {
        ...baseline,
        reviewFlags: [...baseline.reviewFlags, "AI refinement unavailable; used rules fallback."],
      },
      source: "rules",
      agentThreadId: options?.agentThreadId,
    };
  }
}

export function runDeterministicTriage(
  email: WorkflowEmail,
  context: WorkflowContext,
): ThreadAnalysisOutput {
  const content = `${email.subject}\n${email.body}`.toLowerCase();
  const classification = classifyEmail(content, email.fromEmail);
  const matched = matchSenderAndProperty(email, context);
  const senderRole = resolveSenderRole(classification, matched, email.fromEmail);
  const maintenanceJob = detectMaintenanceJob(content, context.jobCatalog);
  const inferredIntent = detectIntent(content, classification, senderRole, maintenanceJob);
  const suggestedSlots = suggestSlots(context, matched, inferredIntent, maintenanceJob?.trade);
  const urgency = detectUrgency(content, inferredIntent, maintenanceJob?.code);
  const matchConfidence = getMatchConfidence(matched, senderRole);
  const reviewFlags = getReviewFlags(classification, matchConfidence, inferredIntent, matched);
  const missingInformation = getMissingInformation(inferredIntent, matched, maintenanceJob, suggestedSlots);
  const costBand = maintenanceJob
    ? { estimatedCostMin: maintenanceJob.typicalCostMin, estimatedCostMax: maintenanceJob.typicalCostMax }
    : {};
  const escalationReason = getEscalationReason(
    classification,
    inferredIntent,
    urgency,
    matchConfidence,
    costBand.estimatedCostMax,
  );
  const needsManagerReview = escalationReason !== "none";
  const replyMode = getReplyMode(classification, inferredIntent, needsManagerReview, suggestedSlots.length > 0);
  const summary = buildSummary(email, matched, inferredIntent, urgency, classification, maintenanceJob?.title);
  const topRecommendedAction = buildTopAction(
    inferredIntent,
    urgency,
    needsManagerReview,
    suggestedSlots,
    maintenanceJob?.title,
  );
  const suggestedActions = buildSuggestedActions(
    inferredIntent,
    matched,
    needsManagerReview,
    suggestedSlots,
    maintenanceJob?.title,
  );
  const suggestedReply = buildSuggestedReply(
    email,
    matched,
    inferredIntent,
    replyMode,
    suggestedSlots,
    maintenanceJob?.title,
  );
  const urgencyRationale = buildUrgencyRationale(inferredIntent, urgency, maintenanceJob?.typicalCostMax);

  return analysisOutputSchema.parse({
    classification,
    senderRole,
    matchConfidence,
    inferredIntent,
    urgency,
    summary,
    urgencyRationale,
    replyMode,
    needsManagerReview,
    escalationReason,
    topRecommendedAction,
    suggestedReply,
    suggestedActions,
    reviewFlags,
    missingInformation,
    matchedPersonEmail: matched.matchedPerson?.email,
    matchedPropertyCode: matched.matchedProperty?.code,
    matchedUnitCode: matched.matchedUnit?.code,
    maintenanceJobCategory: maintenanceJob?.code ?? undefined,
    estimatedCostMin: costBand.estimatedCostMin,
    estimatedCostMax: costBand.estimatedCostMax,
    suggestedSlots: suggestedSlots.map((slot) => ({
      slotId: slot.slotKey,
      kind: slot.kind === "viewing" ? "viewing" : "contractor",
      label: slot.label,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    })),
  });
}

async function refineWithAi(
  ctx: ActionCtx,
  agent: Agent,
  threadId: string,
  userId: string,
  email: WorkflowEmail,
  context: WorkflowContext,
  baseline: ThreadAnalysisOutput,
): Promise<ThreadAnalysisOutput> {
  const result = await agent.generateObject(
    ctx,
    { threadId, userId },
    {
      schema: analysisOutputSchema,
      prompt: JSON.stringify(
        {
          email,
          knownContext: {
            people: context.people.map((person) => ({
              name: person.name,
              email: person.email,
              role: person.role,
            })),
            properties: context.properties.map((property) => ({
              code: property.code,
              name: property.name,
            })),
            units: context.units.map((unit) => ({
              code: unit.code,
              label: unit.label,
            })),
          },
          baseline,
        },
        null,
        2,
      ),
      temperature: 0.2,
    },
  );

  const merged = {
    ...result.object,
    matchedPersonEmail: baseline.matchedPersonEmail,
    matchedPropertyCode: baseline.matchedPropertyCode,
    matchedUnitCode: baseline.matchedUnitCode,
    maintenanceJobCategory: baseline.maintenanceJobCategory,
    estimatedCostMin: baseline.estimatedCostMin,
    estimatedCostMax: baseline.estimatedCostMax,
    suggestedSlots: baseline.suggestedSlots,
    needsManagerReview:
      baseline.needsManagerReview ||
      result.object.needsManagerReview ||
      (baseline.estimatedCostMax ?? 0) > managerEscalationThreshold,
    escalationReason:
      baseline.escalationReason !== "none" ? baseline.escalationReason : result.object.escalationReason,
    reviewFlags: Array.from(new Set([...baseline.reviewFlags, ...result.object.reviewFlags])),
    missingInformation: Array.from(new Set([...baseline.missingInformation, ...result.object.missingInformation])),
  };

  return analysisOutputSchema.parse(merged);
}

function classifyEmail(content: string, fromEmail: string): EmailClassification {
  if (
    includesAny(content, ["exclusive leads", "sign up today", "sales opportunity", "triple your"]) ||
    fromEmail.endsWith(".com") && includesAny(content, ["guarantee", "leads"])
  ) {
    return "spam";
  }

  if (
    includesAny(content, ["newsletter", "lunch offers", "sandwiches this week", "subscribed"]) ||
    includesAny(content, ["14 cedar park"]) ||
    includesAny(content, ["wrong people for that property"])
  ) {
    return "irrelevant";
  }

  return "actionable";
}

function matchSenderAndProperty(email: WorkflowEmail, context: WorkflowContext): MatchedContext {
  const matchedPerson = context.people.find((person) => person.email === email.fromEmail);
  const matchedTenancy = matchedPerson
    ? context.tenancies.find((tenancy) => tenancy.tenantId === matchedPerson._id)
    : undefined;
  const matchedUnitFromTenancy = matchedTenancy
    ? context.units.find((unit) => unit._id === matchedTenancy.unitId)
    : undefined;
  const matchedPropertyFromTenancy = matchedTenancy
    ? context.properties.find((property) => property._id === matchedTenancy.propertyId)
    : undefined;

  const text = `${email.subject} ${email.body}`.toLowerCase();

  const matchedUnit =
    matchedUnitFromTenancy ??
    context.units.find((unit) => {
      return (
        text.includes(unit.code.toLowerCase()) ||
        text.includes(` ${unit.label.toLowerCase()} `) ||
        text.includes(`${unit.label.toLowerCase()}.`)
      );
    });

  const matchedProperty =
    matchedPropertyFromTenancy ??
    (matchedUnit ? context.properties.find((property) => property._id === matchedUnit.propertyId) : undefined) ??
    context.properties.find((property) => {
      return (
        text.includes(property.name.toLowerCase()) || text.includes(property.code.toLowerCase())
      );
    });

  return {
    matchedPerson,
    matchedTenancy,
    matchedUnit,
    matchedProperty,
  };
}

function resolveSenderRole(
  classification: EmailClassification,
  matched: MatchedContext,
  fromEmail: string,
): SenderRole {
  if (classification !== "actionable") {
    return "unknown";
  }

  if (matched.matchedPerson) {
    const role = matched.matchedPerson.role;
    if (
      role === "tenant" ||
      role === "landlord" ||
      role === "contractor" ||
      role === "prospect"
    ) {
      return role;
    }
  }

  if (fromEmail.includes("contractor") || fromEmail.includes("plumbing")) {
    return "contractor";
  }

  return "unknown";
}

function detectIntent(
  content: string,
  classification: EmailClassification,
  senderRole: SenderRole,
  maintenanceJob?: JobRecord,
): Intent {
  if (classification !== "actionable") {
    return "other";
  }

  if (includesAny(content, ["notice to terminate", "formal notice", "move out"])) {
    return "tenancy_termination";
  }

  if (includesAny(content, ["view", "viewing", "listing"])) {
    return "viewing_request";
  }

  if (maintenanceJob || includesAny(content, ["repair", "broken", "leak", "maintenance", "not draining"])) {
    return "maintenance";
  }

  if (includesAny(content, ["rent", "payment", "iban"])) {
    return "payment";
  }

  if (
    senderRole === "contractor" ||
    includesAny(content, ["access details", "can do tuesday", "reschedule", "arrival"])
  ) {
    return "contractor_coordination";
  }

  if (includesAny(content, ["still cutting out", "complaint"])) {
    return "complaint";
  }

  if (includesAny(content, ["portal link", "process", "lease", "paperwork"])) {
    return "general_question";
  }

  return "other";
}

function detectMaintenanceJob(content: string, jobs: JobRecord[]): JobRecord | undefined {
  return jobs.find((job) => includesAny(content, job.keywords));
}

function detectUrgency(
  content: string,
  intent: Intent,
  maintenanceCode?: string,
): Urgency {
  if (intent === "tenancy_termination" || intent === "viewing_request") {
    return "high";
  }

  if (intent === "maintenance") {
    if (
      includesAny(content, ["urgent", "water coming through", "getting worse", "fail completely"]) ||
      maintenanceCode === "leak_investigation"
    ) {
      return "critical";
    }

    if (
      includesAny(content, ["tripped power", "worried", "not heating", "bad smell"]) ||
      maintenanceCode === "washing_machine_fault" ||
      maintenanceCode === "oven_fault" ||
      maintenanceCode === "lock_issue"
    ) {
      return "high";
    }

    return "medium";
  }

  if (intent === "complaint") {
    return "high";
  }

  if (intent === "contractor_coordination") {
    return "medium";
  }

  return "low";
}

function suggestSlots(
  context: WorkflowContext,
  matched: MatchedContext,
  intent: Intent,
  trade?: string,
): CalendarSlotRecord[] {
  if (intent === "viewing_request" && matched.matchedUnit?._id) {
    return context.calendarSlots
      .filter(
        (slot) => slot.kind === "viewing" && slot.unitId === matched.matchedUnit?._id && slot.isAvailable,
      )
      .slice(0, 2);
  }

  if (intent === "maintenance" && matched.matchedUnit?._id) {
    return context.calendarSlots
      .filter((slot) => {
        if (!slot.isAvailable || slot.kind !== "contractor" || slot.unitId !== matched.matchedUnit?._id) {
          return false;
        }
        if (!trade) {
          return true;
        }
        const contractor = context.contractors.find((item) => item._id === slot.contractorId);
        return contractor?.trade === trade;
      })
      .slice(0, 2);
  }

  return [];
}

function getMatchConfidence(matched: MatchedContext, senderRole: SenderRole): number {
  if (matched.matchedTenancy && matched.matchedProperty && matched.matchedUnit) {
    return 0.97;
  }

  if (matched.matchedPerson && senderRole !== "unknown") {
    return matched.matchedProperty ? 0.87 : 0.72;
  }

  if (matched.matchedProperty || matched.matchedUnit) {
    return 0.52;
  }

  return 0.28;
}

function getReviewFlags(
  classification: EmailClassification,
  matchConfidence: number,
  intent: Intent,
  matched: MatchedContext,
): string[] {
  const flags: string[] = [];

  if (classification !== "actionable") {
    return flags;
  }

  if (matchConfidence < 0.6) {
    flags.push("Low confidence sender or property match.");
  }

  if (intent === "tenancy_termination") {
    flags.push("Tenancy termination should be checked by the manager.");
  }

  if (intent === "complaint") {
    flags.push("Complaint tone suggests human follow-up.");
  }

  if (intent === "maintenance" && !matched.matchedProperty) {
    flags.push("Maintenance issue is missing a confident property match.");
  }

  return flags;
}

function getMissingInformation(
  intent: Intent,
  matched: MatchedContext,
  maintenanceJob: JobRecord | undefined,
  suggestedSlots: CalendarSlotRecord[],
): string[] {
  const missing: string[] = [];

  if (!matched.matchedProperty && intent !== "other") {
    missing.push("Exact property confirmation may still be needed.");
  }

  if (intent === "maintenance" && !maintenanceJob) {
    missing.push("Job type is not specific enough for a confident estimate.");
  }

  if (intent === "maintenance" && suggestedSlots.length === 0) {
    missing.push("No seeded contractor availability matched this issue.");
  }

  if (intent === "viewing_request" && suggestedSlots.length === 0) {
    missing.push("No seeded viewing slot matched the requested property.");
  }

  return missing;
}

function getEscalationReason(
  classification: EmailClassification,
  intent: Intent,
  urgency: Urgency,
  matchConfidence: number,
  estimatedCostMax?: number,
): ThreadAnalysisOutput["escalationReason"] {
  if (classification !== "actionable") {
    return "none";
  }

  if (intent === "tenancy_termination" || intent === "complaint") {
    return "sensitive_case";
  }

  if (matchConfidence < 0.6) {
    return "low_confidence";
  }

  if ((estimatedCostMax ?? 0) > managerEscalationThreshold) {
    return "cost_threshold";
  }

  if (urgencyRank[urgency] >= urgencyRank.critical) {
    return "urgency";
  }

  return "none";
}

function getReplyMode(
  classification: EmailClassification,
  intent: Intent,
  needsManagerReview: boolean,
  hasSuggestedSlots: boolean,
): ReplyMode {
  if (classification !== "actionable") {
    return "no_reply";
  }

  if (needsManagerReview) {
    return "draft_for_manager";
  }

  if (
    intent === "general_question" ||
    intent === "payment" ||
    intent === "viewing_request" ||
    (intent === "maintenance" && hasSuggestedSlots)
  ) {
    return "auto_send";
  }

  return "draft_for_manager";
}

function buildSummary(
  email: WorkflowEmail,
  matched: MatchedContext,
  intent: Intent,
  urgency: Urgency,
  classification: EmailClassification,
  maintenanceTitle?: string,
): string {
  if (classification === "spam") {
    return "Cold outreach unrelated to portfolio operations.";
  }

  if (classification === "irrelevant") {
    return "Irrelevant message that does not require property-management action.";
  }

  const propertyLabel = matched.matchedUnit?.code ?? matched.matchedProperty?.name ?? "an unknown property";

  if (intent === "maintenance" && maintenanceTitle) {
    return `${email.fromName} reported ${maintenanceTitle.toLowerCase()} for ${propertyLabel}; current urgency is ${urgency}.`;
  }

  if (intent === "tenancy_termination") {
    return `${email.fromName} sent formal notice to end the tenancy for ${propertyLabel}.`;
  }

  if (intent === "viewing_request") {
    return `${email.fromName} wants to book a viewing for ${propertyLabel}.`;
  }

  return `${email.fromName} sent a ${intent.replaceAll("_", " ")} request related to ${propertyLabel}.`;
}

function buildTopAction(
  intent: Intent,
  urgency: Urgency,
  needsManagerReview: boolean,
  suggestedSlots: CalendarSlotRecord[],
  maintenanceTitle?: string,
): string {
  if (intent === "maintenance" && needsManagerReview) {
    return `Escalate ${maintenanceTitle?.toLowerCase() ?? "maintenance issue"} to the manager before confirming work.`;
  }

  if (intent === "maintenance" && suggestedSlots[0]) {
    return `Offer ${suggestedSlots[0].label} to the tenant and confirm access.`;
  }

  if (intent === "viewing_request" && suggestedSlots[0]) {
    return `Offer ${suggestedSlots[0].label} to the prospect.`;
  }

  if (intent === "tenancy_termination") {
    return "Review notice, confirm exit steps, and prepare inspection/deposit workflow.";
  }

  if (urgency === "critical") {
    return "Escalate immediately and contact the resident with the next steps.";
  }

  return "Respond with the recommended next step and update the thread.";
}

function buildSuggestedActions(
  intent: Intent,
  matched: MatchedContext,
  needsManagerReview: boolean,
  suggestedSlots: CalendarSlotRecord[],
  maintenanceTitle?: string,
): string[] {
  if (intent === "maintenance") {
    const actions = [
      `Confirm ${matched.matchedUnit?.code ?? "the unit"} issue details and access window.`,
      suggestedSlots[0]
        ? `Use ${suggestedSlots[0].label} as the first proposed contractor slot.`
        : "Check contractor availability for the relevant trade.",
    ];

    if (needsManagerReview) {
      actions.unshift(
        `Send ${maintenanceTitle?.toLowerCase() ?? "the maintenance issue"} to the manager because it may exceed the €${managerEscalationThreshold} approval threshold.`,
      );
    }

    return actions;
  }

  if (intent === "viewing_request") {
    return suggestedSlots.length
      ? [
          "Reply with the first two seeded viewing slots.",
          "Flag the enquiry as high priority until a slot is accepted.",
        ]
      : ["Check viewing availability and reply manually."];
  }

  if (intent === "tenancy_termination") {
    return [
      "Review the tenancy notice and confirm the contractual notice period.",
      "Prepare inspection and deposit guidance for the tenant.",
    ];
  }

  if (intent === "payment") {
    return ["Reply with the payment instructions and log the tenant question as resolved."];
  }

  return ["Send the suggested reply and keep the thread visible until it is acknowledged."];
}

function buildSuggestedReply(
  email: WorkflowEmail,
  matched: MatchedContext,
  intent: Intent,
  replyMode: ReplyMode,
  suggestedSlots: CalendarSlotRecord[],
  maintenanceTitle?: string,
): string | undefined {
  if (replyMode === "no_reply") {
    return undefined;
  }

  const firstName = email.fromName.split(" ")[0];

  if (intent === "payment") {
    return `Hi ${firstName}, thanks for checking. Please send the payment for ${matched.matchedUnit?.code ?? "your unit"} to the usual client account IBAN ending 4021, and let us know once it has been sent.`;
  }

  if (intent === "general_question" && email.subject.toLowerCase().includes("portal")) {
    return `Hi ${firstName}, here is the maintenance portal link again: https://portal.lette.demo/login. If you still cannot access it, reply here and we will reset it for you.`;
  }

  if (intent === "maintenance" && replyMode === "auto_send" && suggestedSlots[0]) {
    return `Hi ${firstName}, thanks for flagging the ${maintenanceTitle?.toLowerCase() ?? "issue"}. We can arrange ${suggestedSlots[0].label}. Please confirm if that suits and we will line it up.`;
  }

  if (intent === "viewing_request" && suggestedSlots.length >= 2) {
    return `Hi ${firstName}, thanks for your interest. We can offer ${suggestedSlots[0].label} or ${suggestedSlots[1].label}. Let us know which suits you best and we will confirm.`;
  }

  if (intent === "tenancy_termination") {
    return `Hi ${firstName}, thanks for sending notice. We will review the tenancy details and come back with the move-out, inspection, and deposit process shortly.`;
  }

  return `Hi ${firstName}, thanks for your email. We have reviewed it and will follow up with the next steps shortly.`;
}

function buildUrgencyRationale(
  intent: Intent,
  urgency: Urgency,
  estimatedCostMax?: number,
): string {
  if (intent === "maintenance" && (estimatedCostMax ?? 0) > managerEscalationThreshold) {
    return `Maintenance is ${urgency} priority and may exceed the €${managerEscalationThreshold} manager approval threshold.`;
  }

  if (intent === "tenancy_termination") {
    return "Notice to terminate affects occupancy planning and should stay visible to the manager.";
  }

  if (intent === "viewing_request") {
    return "Prospect interest is time-sensitive and should receive quick slot suggestions.";
  }

  return `Current urgency is ${urgency} based on the request type and language used in the email.`;
}

function includesAny(content: string, needles: readonly string[]) {
  return needles.some((needle) => content.includes(needle));
}
