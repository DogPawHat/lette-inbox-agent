import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { ArrowLeft, Bot, CheckCheck, RefreshCw, SendHorizonal } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { formatCostRange, formatDateTime, formatLongDateTime } from "#/lib/format";
import {
  classificationBadgeClass,
  labelForClassification,
  labelForIntent,
  labelForRole,
  labelForUrgency,
  replyStatusClass,
  replyStatusLabel,
  urgencyBadgeClass,
} from "#/lib/presentation";

export const Route = createFileRoute("/threads/$threadId")({
  component: ThreadWorkspace,
});

function ThreadWorkspace() {
  const { threadId } = Route.useParams();
  const typedThreadId = threadId as Id<"threads">;
  const { data, isPending } = useQuery(convexQuery(api.inbox.threadDetail, { threadId: typedThreadId }));
  const processThread = useAction(api.inbox.processThread);
  const approveDraftReply = useConvexMutation(api.inbox.approveDraftReply);
  const updateThreadStatus = useConvexMutation(api.inbox.updateThreadStatus);

  const rerunMutation = useMutation({
    mutationFn: async () => {
      await processThread({ threadId: typedThreadId });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await approveDraftReply({ threadId: typedThreadId });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      await updateThreadStatus({ threadId: typedThreadId, status: "resolved" });
    },
  });

  if (isPending) {
    return <ThreadSkeleton />;
  }

  if (!data) {
    return (
      <div className="page-shell px-4 py-8">
        <Card className="panel-surface rounded-[1.5rem]">
          <CardHeader>
            <CardTitle>Thread not found</CardTitle>
            <CardDescription>The requested inbox item is not available in the current demo dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="size-4" />
              Back to inbox
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { thread, analysis, emails, matched, actions } = data;

  return (
    <div className="page-shell px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Button variant="outline" size="sm" onClick={() => rerunMutation.mutate()} disabled={rerunMutation.isPending}>
          <RefreshCw className={`size-4 ${rerunMutation.isPending ? "animate-spin" : ""}`} />
          Re-run workflow
        </Button>
        {analysis?.replyMode === "draft_for_manager" && analysis?.suggestedReply ? (
          <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
            <SendHorizonal className="size-4" />
            Send manager draft
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resolveMutation.mutate()}
          disabled={resolveMutation.isPending}
        >
          <CheckCheck className="size-4" />
          Mark resolved
        </Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="panel-surface rounded-[1.75rem]">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className={classificationBadgeClass(thread.classification ?? "actionable")}>
                {labelForClassification(thread.classification ?? "actionable")}
              </Badge>
              <Badge className={urgencyBadgeClass(thread.urgency ?? "low")}>
                {labelForUrgency(thread.urgency ?? "low")}
              </Badge>
              <Badge variant="outline">{labelForRole(thread.senderRole ?? "unknown")}</Badge>
              <Badge variant="outline">{labelForIntent(thread.intent ?? "other")}</Badge>
              <Badge className={replyStatusClass(thread.autoReplyStatus)}>{replyStatusLabel(thread.autoReplyStatus)}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">{thread.subject}</CardTitle>
              <CardDescription>
                {thread.sourceLabel} · last message {formatLongDateTime(thread.latestMessageAt)}
              </CardDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Matched sender" value={matched.person?.name ?? "Unresolved"} />
              <Metric
                label="Property context"
                value={matched.unit?.code ?? matched.property?.name ?? "Unresolved"}
              />
              <Metric
                label="Estimated cost"
                value={formatCostRange(thread.estimatedCostMin, thread.estimatedCostMax)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                AI triage
              </p>
              <p className="mb-2 text-base font-medium">{analysis?.summary ?? "No analysis yet."}</p>
              <p className="m-0 text-sm text-muted-foreground">
                {analysis?.urgencyRationale ??
                  "Run the workflow to classify the email, match the property, and generate next steps."}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-[1.35rem]">
                <CardHeader>
                  <CardTitle className="text-base">Recommended actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actions.length ? (
                    actions.map((action) => (
                      <div key={action._id} className="rounded-xl border border-border/70 bg-background p-3">
                        <p className="mb-1 text-sm font-medium">{action.title}</p>
                        <p className="m-0 text-sm text-muted-foreground">{action.detail}</p>
                      </div>
                    ))
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">No structured actions yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[1.35rem]">
                <CardHeader>
                  <CardTitle className="text-base">Suggested reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis?.suggestedReply ? (
                    <div className="rounded-xl border border-border/70 bg-background p-4 text-sm leading-6 whitespace-pre-wrap">
                      {analysis.suggestedReply}
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">No reply proposed for this thread.</p>
                  )}
                  <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
                    Reply mode: {replyStatusLabel(thread.autoReplyStatus)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {analysis?.suggestedSlots.length ? (
              <Card className="rounded-[1.35rem]">
                <CardHeader>
                  <CardTitle className="text-base">Suggested slots</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {analysis.suggestedSlots.map((slot) => (
                    <div key={slot.slotId} className="rounded-xl border border-border/70 bg-background p-3">
                      <p className="mb-1 text-sm font-semibold">{slot.label}</p>
                      <p className="m-0 text-sm text-muted-foreground">{formatDateTime(slot.startsAt)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-[1.35rem]">
              <CardHeader>
                <CardTitle className="text-base">Email timeline</CardTitle>
                <CardDescription>Inbound and outbound messages stored on this thread.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {emails.map((email, index) => (
                  <div key={email._id}>
                    <div
                      className={`rounded-[1.2rem] border p-4 ${
                        email.direction === "outbound"
                          ? "border-primary/20 bg-primary/8"
                          : "border-border/70 bg-background"
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant={email.direction === "outbound" ? "secondary" : "outline"}>
                          {email.direction === "outbound" ? "Outbound" : "Inbound"}
                        </Badge>
                        {email.generatedByWorkflow ? (
                          <Badge className="border-transparent bg-primary text-primary-foreground">
                            <Bot className="mr-1 size-3" />
                            Auto reply
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{formatLongDateTime(email.sentAt)}</span>
                      </div>
                      <p className="mb-2 text-sm font-medium">
                        {email.fromName} → {email.toEmail}
                      </p>
                      <p className="m-0 text-sm leading-6 whitespace-pre-wrap">{email.body}</p>
                    </div>
                    {index < emails.length - 1 ? <Separator className="my-3" /> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel-surface rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>Context resolution</CardTitle>
              <CardDescription>Who this likely is and which record the workflow matched.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ContextRow label="Sender" value={matched.person?.name ?? "No confident person match"} />
              <ContextRow label="Role" value={labelForRole(thread.senderRole ?? "unknown")} />
              <ContextRow label="Property" value={matched.property?.name ?? "No property match"} />
              <ContextRow label="Unit" value={matched.unit?.code ?? "No unit match"} />
              <ContextRow label="Tenancy status" value={matched.tenancy?.status ?? "No tenancy match"} />
            </CardContent>
          </Card>

          <Card className="panel-surface rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>Escalation logic</CardTitle>
              <CardDescription>Why the thread did or did not require manager visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium">Escalation reason</p>
                <p className="m-0 text-muted-foreground">
                  {thread.escalationReason ? thread.escalationReason.replaceAll("_", " ") : "none"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium">Review flags</p>
                {analysis?.reviewFlags.length ? (
                  <ul className="m-0 list-disc space-y-1 pl-5 text-muted-foreground">
                    {analysis.reviewFlags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-muted-foreground">No review flags.</p>
                )}
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium">Missing information</p>
                {analysis?.missingInformation.length ? (
                  <ul className="m-0 list-disc space-y-1 pl-5 text-muted-foreground">
                    {analysis.missingInformation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-muted-foreground">The workflow had enough context for a clear recommendation.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="m-0 text-sm font-medium">{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-3 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="page-shell px-4 py-8">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="panel-surface rounded-[1.75rem]">
          <CardHeader className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-[1.6rem]" />
          <Skeleton className="h-56 w-full rounded-[1.6rem]" />
        </div>
      </div>
    </div>
  );
}
