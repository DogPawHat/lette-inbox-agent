import {
  classificationLabels,
  intentLabels,
  roleLabels,
  urgencyLabels,
  type EmailClassification,
  type Intent,
  type SenderRole,
  type Urgency,
} from "../../shared/domain";

export function labelForRole(role: string) {
  return roleLabels[role as SenderRole] ?? titleCase(role);
}

export function labelForIntent(intent: string) {
  return intentLabels[intent as Intent] ?? titleCase(intent);
}

export function labelForUrgency(urgency: string) {
  return urgencyLabels[urgency as Urgency] ?? titleCase(urgency);
}

export function labelForClassification(classification: string) {
  return classificationLabels[classification as EmailClassification] ?? titleCase(classification);
}

export function urgencyBadgeClass(urgency: string) {
  switch (urgency) {
    case "critical":
      return "border-transparent bg-red-500 text-white";
    case "high":
      return "border-transparent bg-amber-400 text-slate-950";
    case "medium":
      return "border-transparent bg-sky-500 text-white";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

export function classificationBadgeClass(classification: string) {
  switch (classification) {
    case "spam":
      return "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900";
    case "irrelevant":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-transparent bg-emerald-500 text-white";
  }
}

export function replyStatusLabel(status?: string | null) {
  switch (status) {
    case "sent":
      return "Auto-sent";
    case "manager_sent":
      return "Manager sent";
    case "draft_ready":
      return "Draft ready";
    default:
      return "No reply";
  }
}

export function replyStatusClass(status?: string | null) {
  switch (status) {
    case "sent":
      return "border-transparent bg-emerald-500 text-white";
    case "manager_sent":
      return "border-transparent bg-sky-600 text-white";
    case "draft_ready":
      return "border-transparent bg-violet-500 text-white";
    default:
      return "border-border bg-background text-foreground";
  }
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
