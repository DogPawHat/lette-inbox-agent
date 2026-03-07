import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  managerEscalationThreshold,
  calendarSlotSeed,
  contractorSeed,
  emailSeed,
  jobCatalogSeed,
  peopleSeed,
  propertySeed,
  tenancySeed,
  unitSeed,
} from "./lib/demoData";
import { runWorkflowAnalysis } from "./lib/triage";
import { urgencyRank, type Urgency } from "../shared/domain";

const MANAGER_EMAIL = "manager@lette-demo.local";
type SeedCalendarSlot = {
  slotKey: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  label: string;
  propertyCode?: string;
  unitCode?: string;
  contractorEmail?: string;
};

const tableNames = [
  "actions",
  "threadAnalyses",
  "emails",
  "threads",
  "calendarSlots",
  "contractors",
  "jobCatalog",
  "tenancies",
  "units",
  "properties",
  "people",
] as const;

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query("threads").collect();
    const analyses = await ctx.db.query("threadAnalyses").collect();
    const people = await ctx.db.query("people").collect();
    const properties = await ctx.db.query("properties").collect();
    const units = await ctx.db.query("units").collect();
    const emails = await ctx.db.query("emails").collect();

    const analysisByThread = newestByThread(analyses);
    const peopleById = new Map(people.map((person) => [person._id, person]));
    const propertyById = new Map(properties.map((property) => [property._id, property]));
    const unitById = new Map(units.map((unit) => [unit._id, unit]));
    const emailsByThread = groupBy(emails, (email) => email.threadId);

    const rows = threads
      .map((thread) => {
        const latestAnalysis = analysisByThread.get(thread._id);
        const threadEmails = (emailsByThread.get(thread._id) ?? []).sort((a, b) =>
          a.sentAt.localeCompare(b.sentAt),
        );
        const latestEmail = threadEmails[threadEmails.length - 1];
        const matchedPerson = thread.matchedPersonId ? peopleById.get(thread.matchedPersonId) : undefined;
        const matchedProperty = thread.matchedPropertyId
          ? propertyById.get(thread.matchedPropertyId)
          : undefined;
        const matchedUnit = thread.matchedUnitId ? unitById.get(thread.matchedUnitId) : undefined;

        return {
          _id: thread._id,
          subject: thread.subject,
          scenarioKey: thread.scenarioKey,
          sourceLabel: thread.sourceLabel,
          latestMessageAt: thread.latestMessageAt,
          workflowStatus: thread.workflowStatus,
          status: thread.status,
          classification: thread.classification ?? "actionable",
          senderRole: thread.senderRole ?? "unknown",
          intent: thread.intent ?? "other",
          urgency: (thread.urgency ?? "low") as Urgency,
          needsManagerReview: thread.needsManagerReview,
          escalationReason: thread.escalationReason ?? "none",
          estimatedCostMin: thread.estimatedCostMin ?? null,
          estimatedCostMax: thread.estimatedCostMax ?? null,
          autoReplyStatus: thread.autoReplyStatus ?? "none",
          latestSummary: thread.latestSummary ?? latestAnalysis?.summary ?? "",
          topRecommendedAction:
            thread.topRecommendedAction ?? latestAnalysis?.topRecommendedAction ?? "Await analysis",
          latestEmailSnippet: latestEmail?.body.slice(0, 140) ?? "",
          matchedPersonName: matchedPerson?.name ?? latestEmail?.fromName ?? "Unknown sender",
          matchedPropertyName: matchedProperty?.name ?? null,
          matchedUnitCode: matchedUnit?.code ?? null,
        };
      })
      .sort((left, right) => compareThreads(left, right));

    const actionable = rows.filter((thread) => thread.classification === "actionable");
    const overview = {
      totalThreads: rows.length,
      actionableCount: actionable.length,
      attentionCount: actionable.filter(
        (thread) => thread.needsManagerReview || thread.urgency === "high" || thread.urgency === "critical",
      ).length,
      autoReplyCount: actionable.filter((thread) => thread.autoReplyStatus === "sent").length,
      spamCount: rows.filter((thread) => thread.classification === "spam").length,
      irrelevantCount: rows.filter((thread) => thread.classification === "irrelevant").length,
      costThreshold: managerEscalationThreshold,
    };

    return { overview, threads: rows };
  },
});

export const threadDetail = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const [emails, analyses, actions, people, properties, units, tenancies] = await Promise.all([
      ctx.db.query("emails").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
      ctx.db
        .query("threadAnalyses")
        .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
        .collect(),
      ctx.db.query("actions").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
      ctx.db.query("people").collect(),
      ctx.db.query("properties").collect(),
      ctx.db.query("units").collect(),
      ctx.db.query("tenancies").collect(),
    ]);

    const person = thread.matchedPersonId ? people.find((item) => item._id === thread.matchedPersonId) : undefined;
    const property = thread.matchedPropertyId
      ? properties.find((item) => item._id === thread.matchedPropertyId)
      : undefined;
    const unit = thread.matchedUnitId ? units.find((item) => item._id === thread.matchedUnitId) : undefined;
    const tenancy = thread.matchedTenancyId
      ? tenancies.find((item) => item._id === thread.matchedTenancyId)
      : undefined;
    const sortedAnalyses = analyses.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latestAnalysis = sortedAnalyses[sortedAnalyses.length - 1] ?? null;

    return {
      thread,
      emails: emails.sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
      analysis: latestAnalysis,
      analysisHistory: analyses.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      actions: actions.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      matched: { person, property, unit, tenancy },
    };
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await clearTables(ctx);

    const peopleByEmail = new Map<string, Id<"people">>();
    for (const person of peopleSeed) {
      const id = await ctx.db.insert("people", person);
      peopleByEmail.set(person.email, id);
    }

    const propertyByCode = new Map<string, Id<"properties">>();
    for (const property of propertySeed) {
      const id = await ctx.db.insert("properties", property);
      propertyByCode.set(property.code, id);
    }

    const unitByCode = new Map<string, Id<"units">>();
    for (const unit of unitSeed) {
      const propertyId = propertyByCode.get(unit.propertyCode);
      if (!propertyId) continue;
      const id = await ctx.db.insert("units", {
        propertyId,
        code: unit.code,
        label: unit.label,
        bedrooms: unit.bedrooms,
        listingStatus: unit.listingStatus,
      });
      unitByCode.set(unit.code, id);
    }

    const tenancyByTenantEmail = new Map<string, Id<"tenancies">>();
    for (const tenancy of tenancySeed) {
      const tenantId = peopleByEmail.get(tenancy.tenantEmail);
      const propertyId = propertyByCode.get(tenancy.propertyCode);
      const unitId = unitByCode.get(tenancy.unitCode);
      if (!tenantId || !propertyId || !unitId) continue;
      const id = await ctx.db.insert("tenancies", {
        tenantId,
        propertyId,
        unitId,
        status: tenancy.status,
        startedAt: tenancy.startedAt,
      });
      tenancyByTenantEmail.set(tenancy.tenantEmail, id);
    }

    const contractorByEmail = new Map<string, Id<"contractors">>();
    for (const contractor of contractorSeed) {
      const id = await ctx.db.insert("contractors", contractor);
      contractorByEmail.set(contractor.email, id);
    }

    for (const slot of calendarSlotSeed as readonly SeedCalendarSlot[]) {
      await ctx.db.insert("calendarSlots", {
        slotKey: slot.slotKey,
        kind: slot.kind,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        isAvailable: true,
        label: slot.label,
        contractorId: slot.contractorEmail ? contractorByEmail.get(slot.contractorEmail) : undefined,
        propertyId: slot.propertyCode ? propertyByCode.get(slot.propertyCode) : undefined,
        unitId: slot.unitCode ? unitByCode.get(slot.unitCode) : undefined,
      });
    }

    for (const job of jobCatalogSeed) {
      await ctx.db.insert("jobCatalog", { ...job, keywords: [...job.keywords] });
    }

    for (const email of emailSeed) {
      const threadId = await ctx.db.insert("threads", {
        subject: email.subject,
        latestMessageAt: email.sentAt,
        status: "new",
        workflowStatus: "pending",
        needsManagerReview: false,
        scenarioKey: email.scenarioKey,
        sourceLabel: email.sourceLabel,
      });

      await ctx.db.insert("emails", {
        threadId,
        direction: "inbound",
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        toEmail: MANAGER_EMAIL,
        subject: email.subject,
        body: email.body,
        sentAt: email.sentAt,
        generatedByWorkflow: false,
      });
    }

    return {
      threadCount: emailSeed.length,
      peopleCount: peopleSeed.length,
      tenancyCount: tenancyByTenantEmail.size,
    };
  },
});

export const processAllThreads = action({
  args: {},
  handler: async (ctx): Promise<{ processedCount: number }> => {
    const pending = await ctx.runQuery(internal.inbox.pendingThreadIds, {});
    for (const threadId of pending) {
      await ctx.runAction(internal.inbox.processThreadInternal, { threadId });
    }
    return { processedCount: pending.length };
  },
});

export const processThread = action({
  args: { threadId: v.id("threads") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    ok: boolean;
    source?: "rules" | "ai";
  }> => {
    return await ctx.runAction(internal.inbox.processThreadInternal, args);
  },
});

export const createManualEmail = mutation({
  args: {
    fromName: v.string(),
    fromEmail: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const sentAt = new Date().toISOString();
    const threadId = await ctx.db.insert("threads", {
      subject: args.subject,
      latestMessageAt: sentAt,
      status: "new",
      workflowStatus: "pending",
      needsManagerReview: false,
      scenarioKey: `manual-${sentAt}`,
      sourceLabel: "Manual intake",
    });

    await ctx.db.insert("emails", {
      threadId,
      direction: "inbound",
      fromName: args.fromName,
      fromEmail: args.fromEmail,
      toEmail: MANAGER_EMAIL,
      subject: args.subject,
      body: args.body,
      sentAt,
      generatedByWorkflow: false,
    });

    return { threadId };
  },
});

export const updateThreadStatus = mutation({
  args: {
    threadId: v.id("threads"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { status: args.status });
  },
});

export const approveDraftReply = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const analyses = (
      await ctx.db
        .query("threadAnalyses")
        .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
        .collect()
    ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const analysis = analyses[analyses.length - 1];
    const thread = await ctx.db.get(args.threadId);
    const threadEmails = (
      await ctx.db.query("emails").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect()
    ).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const latestEmail = threadEmails[threadEmails.length - 1];

    if (!analysis?.suggestedReply || !thread || !latestEmail) {
      return { sent: false };
    }

    await ctx.db.insert("emails", {
      threadId: args.threadId,
      direction: "outbound",
      fromName: "Property Manager",
      fromEmail: MANAGER_EMAIL,
      toEmail: latestEmail.fromEmail,
      subject: `Re: ${thread.subject}`,
      body: analysis.suggestedReply,
      sentAt: new Date().toISOString(),
      generatedByWorkflow: false,
    });

    await ctx.db.patch(args.threadId, {
      autoReplyStatus: "manager_sent",
      status: "in_review",
    });

    return { sent: true };
  },
});

export const pendingThreadIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query("threads").collect();
    return threads
      .filter((thread) => thread.workflowStatus === "pending")
      .map((thread) => thread._id)
      .sort();
  },
});

export const processThreadInternal = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    ok: boolean;
    source?: "rules" | "ai";
  }> => {
    const workflowData = await ctx.runQuery(internal.inbox.workflowContextForThread, args);
    if (!workflowData) {
      return { ok: false };
    }

    const result = await runWorkflowAnalysis(workflowData.email, workflowData.context);
    await ctx.runMutation(internal.inbox.applyAnalysis, {
      threadId: args.threadId,
      source: result.source,
      analysis: result.analysis,
    });

    return { ok: true, source: result.source };
  },
});

export const workflowContextForThread = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const [emails, people, properties, units, tenancies, contractors, calendarSlots, jobCatalog] =
      await Promise.all([
        ctx.db.query("emails").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
        ctx.db.query("people").collect(),
        ctx.db.query("properties").collect(),
        ctx.db.query("units").collect(),
        ctx.db.query("tenancies").collect(),
        ctx.db.query("contractors").collect(),
        ctx.db.query("calendarSlots").collect(),
        ctx.db.query("jobCatalog").collect(),
      ]);

    const inboundEmails = emails
      .filter((email) => email.direction === "inbound")
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const inbound = inboundEmails[inboundEmails.length - 1];
    if (!inbound) {
      return null;
    }

    return {
      email: {
        fromName: inbound.fromName,
        fromEmail: inbound.fromEmail,
        subject: inbound.subject,
        body: inbound.body,
      },
      context: {
        people: people.map((person) => ({
          _id: String(person._id),
          name: person.name,
          email: person.email,
          role: person.role,
        })),
        properties: properties.map((property) => ({
          _id: String(property._id),
          code: property.code,
          name: property.name,
          addressLine1: property.addressLine1,
          city: property.city,
        })),
        units: units.map((unit) => ({
          _id: String(unit._id),
          propertyId: String(unit.propertyId),
          code: unit.code,
          label: unit.label,
          listingStatus: unit.listingStatus,
        })),
        tenancies: tenancies.map((tenancy) => ({
          _id: String(tenancy._id),
          tenantId: String(tenancy.tenantId),
          propertyId: String(tenancy.propertyId),
          unitId: String(tenancy.unitId),
          status: tenancy.status,
        })),
        contractors: contractors.map((contractor) => ({
          _id: String(contractor._id),
          name: contractor.name,
          email: contractor.email,
          trade: contractor.trade,
        })),
        calendarSlots: calendarSlots.map((slot) => ({
          ...slot,
          contractorId: slot.contractorId ? String(slot.contractorId) : undefined,
          propertyId: slot.propertyId ? String(slot.propertyId) : undefined,
          unitId: slot.unitId ? String(slot.unitId) : undefined,
        })),
        jobCatalog,
      },
    };
  },
});

export const applyAnalysis = internalMutation({
  args: {
    threadId: v.id("threads"),
    source: v.string(),
    analysis: v.object({
      classification: v.string(),
      senderRole: v.string(),
      matchConfidence: v.number(),
      inferredIntent: v.string(),
      urgency: v.string(),
      summary: v.string(),
      urgencyRationale: v.string(),
      replyMode: v.string(),
      needsManagerReview: v.boolean(),
      escalationReason: v.string(),
      topRecommendedAction: v.string(),
      suggestedReply: v.optional(v.string()),
      suggestedActions: v.array(v.string()),
      reviewFlags: v.array(v.string()),
      missingInformation: v.array(v.string()),
      matchedPersonEmail: v.optional(v.string()),
      matchedPropertyCode: v.optional(v.string()),
      matchedUnitCode: v.optional(v.string()),
      maintenanceJobCategory: v.optional(v.string()),
      estimatedCostMin: v.optional(v.number()),
      estimatedCostMax: v.optional(v.number()),
      suggestedSlots: v.array(
        v.object({
          slotId: v.string(),
          kind: v.string(),
          label: v.string(),
          startsAt: v.string(),
          endsAt: v.string(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const [people, properties, units, tenancies, analyses, existingActions, thread, emails] = await Promise.all([
      ctx.db.query("people").collect(),
      ctx.db.query("properties").collect(),
      ctx.db.query("units").collect(),
      ctx.db.query("tenancies").collect(),
      ctx.db.query("threadAnalyses").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
      ctx.db.query("actions").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
      ctx.db.get(args.threadId),
      ctx.db.query("emails").withIndex("by_thread", (query) => query.eq("threadId", args.threadId)).collect(),
    ]);

    if (!thread) {
      return;
    }

    const matchedPerson = args.analysis.matchedPersonEmail
      ? people.find((person) => person.email === args.analysis.matchedPersonEmail)
      : undefined;
    const matchedProperty = args.analysis.matchedPropertyCode
      ? properties.find((property) => property.code === args.analysis.matchedPropertyCode)
      : undefined;
    const matchedUnit = args.analysis.matchedUnitCode
      ? units.find((unit) => unit.code === args.analysis.matchedUnitCode)
      : undefined;
    const matchedTenancy =
      matchedPerson && matchedUnit
        ? tenancies.find((tenancy) => tenancy.tenantId === matchedPerson._id && tenancy.unitId === matchedUnit._id)
        : undefined;

    for (const actionDoc of existingActions) {
      await ctx.db.delete(actionDoc._id);
    }

    for (const [index, item] of args.analysis.suggestedActions.entries()) {
      await ctx.db.insert("actions", {
        threadId: args.threadId,
        title: item,
        detail: index === 0 ? args.analysis.topRecommendedAction : item,
        status: "todo",
        kind: index === 0 ? "primary" : "follow_up",
        createdAt: new Date().toISOString(),
      });
    }

    const version = analyses.length + 1;
    await ctx.db.insert("threadAnalyses", {
      threadId: args.threadId,
      source: args.source,
      version,
      matchConfidence: args.analysis.matchConfidence,
      summary: args.analysis.summary,
      urgencyRationale: args.analysis.urgencyRationale,
      topRecommendedAction: args.analysis.topRecommendedAction,
      replyMode: args.analysis.replyMode,
      suggestedReply: args.analysis.suggestedReply,
      suggestedActions: args.analysis.suggestedActions,
      reviewFlags: args.analysis.reviewFlags,
      missingInformation: args.analysis.missingInformation,
      suggestedSlots: args.analysis.suggestedSlots,
      classification: args.analysis.classification,
      senderRole: args.analysis.senderRole,
      inferredIntent: args.analysis.inferredIntent,
      urgency: args.analysis.urgency,
      needsManagerReview: args.analysis.needsManagerReview,
      escalationReason: args.analysis.escalationReason,
      matchedPersonEmail: args.analysis.matchedPersonEmail,
      matchedPropertyCode: args.analysis.matchedPropertyCode,
      matchedUnitCode: args.analysis.matchedUnitCode,
      maintenanceJobCategory: args.analysis.maintenanceJobCategory,
      estimatedCostMin: args.analysis.estimatedCostMin,
      estimatedCostMax: args.analysis.estimatedCostMax,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.patch(args.threadId, {
      workflowStatus: "processed",
      classification: args.analysis.classification,
      senderRole: args.analysis.senderRole,
      matchedPersonId: matchedPerson?._id,
      matchedTenancyId: matchedTenancy?._id,
      matchedPropertyId: matchedProperty?._id,
      matchedUnitId: matchedUnit?._id,
      intent: args.analysis.inferredIntent,
      urgency: args.analysis.urgency,
      needsManagerReview: args.analysis.needsManagerReview,
      escalationReason: args.analysis.escalationReason,
      estimatedCostMin: args.analysis.estimatedCostMin,
      estimatedCostMax: args.analysis.estimatedCostMax,
      autoReplyStatus: args.analysis.replyMode === "auto_send" ? "sent" : "draft_ready",
      latestSummary: args.analysis.summary,
      topRecommendedAction: args.analysis.topRecommendedAction,
      analysisVersion: version,
      latestMessageAt: thread.latestMessageAt,
    });

    const inboundEmails = emails
      .filter((email) => email.direction === "inbound")
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const latestInbound = inboundEmails[inboundEmails.length - 1];
    const workflowReply = emails.find((email) => email.generatedByWorkflow);

    if (args.analysis.replyMode === "auto_send" && args.analysis.suggestedReply && latestInbound) {
      if (workflowReply) {
        await ctx.db.patch(workflowReply._id, {
          body: args.analysis.suggestedReply,
          sentAt: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("emails", {
          threadId: args.threadId,
          direction: "outbound",
          fromName: "Lette Agent",
          fromEmail: MANAGER_EMAIL,
          toEmail: latestInbound.fromEmail,
          subject: `Re: ${thread.subject}`,
          body: args.analysis.suggestedReply,
          sentAt: new Date().toISOString(),
          generatedByWorkflow: true,
        });
      }
    }

    if (workflowReply && args.analysis.replyMode !== "auto_send") {
      await ctx.db.delete(workflowReply._id);
      await ctx.db.patch(args.threadId, {
        autoReplyStatus: "draft_ready",
      });
    }
  },
});

async function clearTables(ctx: MutationCtx) {
  for (const tableName of tableNames) {
    const docs = await ctx.db.query(tableName).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
  }
}

function newestByThread<T extends { threadId: Id<"threads">; createdAt: string }>(items: T[]) {
  const byThread = new Map<Id<"threads">, T>();
  for (const item of items) {
    const existing = byThread.get(item.threadId);
    if (!existing || existing.createdAt < item.createdAt) {
      byThread.set(item.threadId, item);
    }
  }
  return byThread;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function compareThreads(
  left: {
    classification: string;
    urgency: Urgency;
    latestMessageAt: string;
    needsManagerReview: boolean;
  },
  right: {
    classification: string;
    urgency: Urgency;
    latestMessageAt: string;
    needsManagerReview: boolean;
  },
) {
  const actionableScore = (thread: typeof left) => (thread.classification === "actionable" ? 1 : 0);
  if (actionableScore(left) !== actionableScore(right)) {
    return actionableScore(right) - actionableScore(left);
  }

  const reviewScore = Number(right.needsManagerReview) - Number(left.needsManagerReview);
  if (reviewScore !== 0) {
    return reviewScore;
  }

  const urgencyScore = urgencyRank[right.urgency] - urgencyRank[left.urgency];
  if (urgencyScore !== 0) {
    return urgencyScore;
  }

  return right.latestMessageAt.localeCompare(left.latestMessageAt);
}
