import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { AlertTriangle, Bot, CalendarClock, MailPlus, RefreshCw, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { formatCostRange, formatDateTime } from "#/lib/format";
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

export const Route = createFileRoute("/")({
  component: InboxDashboard,
});

type FilterValue = "attention" | "actionable" | "noise" | "all";

function InboxDashboard() {
  const [filter, setFilter] = useState<FilterValue>("attention");
  const { data, isPending } = useQuery(convexQuery(api.inbox.dashboard, {}));
  const seedDemo = useConvexMutation(api.inbox.seedDemo);
  const processAll = useAction(api.inbox.processAllThreads);
  const processThread = useAction(api.inbox.processThread);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await seedDemo({});
      await processAll({});
    },
  });

  const rerunMutation = useMutation({
    mutationFn: async (threadId: Id<"threads">) => {
      await processThread({ threadId });
    },
  });

  const filteredThreads = useMemo(() => {
    const threads = data?.threads ?? [];
    switch (filter) {
      case "attention":
        return threads.filter(
          (thread) =>
            thread.classification === "actionable" &&
            (thread.needsManagerReview || thread.urgency === "high" || thread.urgency === "critical"),
        );
      case "actionable":
        return threads.filter((thread) => thread.classification === "actionable");
      case "noise":
        return threads.filter((thread) => thread.classification !== "actionable");
      default:
        return threads;
    }
  }, [data?.threads, filter]);

  return (
    <div className="page-shell px-4 py-8">
      <section className="panel-surface overflow-hidden rounded-[1.75rem]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.45fr_0.85fr] lg:px-8">
          <div className="space-y-5">
            <Badge className="border-transparent bg-primary/12 text-primary">
              Agentic property inbox demo
            </Badge>
            <div className="space-y-3">
              <h1 className="display-title max-w-4xl text-4xl leading-none font-semibold tracking-tight md:text-6xl">
                See which emails matter, what they mean, and what should happen next.
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
                The workflow filters noise, matches tenants to properties, estimates maintenance cost,
                suggests slots, and escalates anything that could exceed the 100 euro approval line.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                {resetMutation.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Load 20-email demo
              </Button>
              <Link to="/intake" className={buttonVariants({ variant: "outline" })}>
                <MailPlus className="size-4" />
                Add manual email
              </Link>
            </div>
          </div>

          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0">
              <CardTitle>Workflow promise</CardTitle>
              <CardDescription>
                Every thread should answer who sent it, what they want, urgency, and whether the
                agent can respond without the manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-0">
              {[
                {
                  icon: ShieldAlert,
                  title: "Noise stays out of the main queue",
                  copy: "Spam and irrelevant messages remain visible but stripped from the action lane.",
                },
                {
                  icon: AlertTriangle,
                  title: "Cost-aware maintenance escalation",
                  copy: "Any maintenance job with an upper estimate above EUR 100 escalates automatically.",
                },
                {
                  icon: CalendarClock,
                  title: "Slots where the app has capability",
                  copy: "Viewing and contractor availability are suggested from seeded calendars.",
                },
                {
                  icon: Bot,
                  title: "Auto-reply only for low-risk work",
                  copy: "Routine questions and capability-based replies can be sent by the agent.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/70 bg-card px-4 py-3"
                >
                  <div className="mb-2 inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </div>
                  <p className="mb-1 text-sm font-semibold">{item.title}</p>
                  <p className="m-0 text-sm text-muted-foreground">{item.copy}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isPending
          ? Array.from({ length: 4 }, (_, index) => <StatsSkeleton key={index} />)
          : [
              {
                label: "Actionable threads",
                value: data?.overview.actionableCount ?? 0,
                copy: "Inbox items that survived filtering",
              },
              {
                label: "Attention now",
                value: data?.overview.attentionCount ?? 0,
                copy: "High-priority or manager-reviewed work",
              },
              {
                label: "Auto replies sent",
                value: data?.overview.autoReplyCount ?? 0,
                copy: "Low-risk replies issued by the workflow",
              },
              {
                label: "Noise filtered",
                value: (data?.overview.spamCount ?? 0) + (data?.overview.irrelevantCount ?? 0),
                copy: "Spam and irrelevant messages kept out of focus",
              },
            ].map((item) => (
              <Card key={item.label} className="panel-surface rounded-[1.35rem]">
                <CardHeader>
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-3xl">{item.value}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">{item.copy}</CardContent>
              </Card>
            ))}
      </section>

      <section className="mt-6 panel-surface rounded-[1.75rem] px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Inbox queue</h2>
            <p className="m-0 text-sm text-muted-foreground">
              Prioritized by urgency, manager review, and freshness. Maintenance over EUR{" "}
              {data?.overview.costThreshold ?? 100} is escalated.
            </p>
          </div>

          <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterValue)}>
            <TabsList>
              <TabsTrigger value="attention">Attention</TabsTrigger>
              <TabsTrigger value="actionable">Actionable</TabsTrigger>
              <TabsTrigger value="noise">Noise</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isPending ? (
          <div className="grid gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredThreads.length === 0 ? (
          <EmptyState resetMutation={resetMutation.isPending} onLoadDemo={() => resetMutation.mutate()} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thread</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredThreads.map((thread) => (
                <TableRow key={thread._id} className="thread-row">
                  <TableCell className="max-w-[22rem] whitespace-normal py-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={classificationBadgeClass(thread.classification)}>
                          {labelForClassification(thread.classification)}
                        </Badge>
                        <Badge variant="outline">{labelForRole(thread.senderRole)}</Badge>
                        <Badge variant="outline">{labelForIntent(thread.intent)}</Badge>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold">{thread.subject}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {thread.latestSummary || thread.latestEmailSnippet}
                        </p>
                      </div>
                      <p className="m-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {thread.matchedPersonName}
                        {thread.matchedPropertyName ? ` · ${thread.matchedPropertyName}` : ""}
                        {thread.matchedUnitCode ? ` · ${thread.matchedUnitCode}` : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal py-4">
                    <div className="space-y-2 text-sm">
                      <Badge className={replyStatusClass(thread.autoReplyStatus)}>
                        {replyStatusLabel(thread.autoReplyStatus)}
                      </Badge>
                      <p className="m-0 text-muted-foreground">{thread.sourceLabel}</p>
                      <p className="m-0 text-xs text-muted-foreground">{formatDateTime(thread.latestMessageAt)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <Badge className={urgencyBadgeClass(thread.urgency)}>
                        {labelForUrgency(thread.urgency)}
                      </Badge>
                      {thread.needsManagerReview ? (
                        <p className="m-0 text-xs font-medium text-amber-700 dark:text-amber-300">
                          Escalated: {thread.escalationReason.replaceAll("_", " ")}
                        </p>
                      ) : (
                        <p className="m-0 text-xs text-muted-foreground">Handled without escalation</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[18rem] whitespace-normal py-4 text-sm">
                    {thread.topRecommendedAction}
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">
                    {formatCostRange(thread.estimatedCostMin, thread.estimatedCostMax)}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to="/threads/$threadId"
                        params={{ threadId: thread._id }}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={rerunMutation.isPending}
                        onClick={() => rerunMutation.mutate(thread._id)}
                      >
                        <RefreshCw
                          className={`size-4 ${rerunMutation.isPending ? "animate-spin" : ""}`}
                        />
                        Re-run
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function EmptyState({
  onLoadDemo,
  resetMutation,
}: {
  onLoadDemo: () => void;
  resetMutation: boolean;
}) {
  return (
    <Card className="rounded-[1.5rem] border-dashed bg-muted/35">
      <CardHeader>
        <CardTitle>No inbox data loaded yet</CardTitle>
        <CardDescription>
          Seed the 20-email demo to populate tenants, properties, contractors, calendars, and
          workflow decisions.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-between">
        <div className="text-sm text-muted-foreground">
          The seeded scenarios include spam, routine questions, maintenance, tenancy exits, and
          viewing requests.
        </div>
        <Button onClick={onLoadDemo} disabled={resetMutation}>
          {resetMutation ? "Loading…" : "Load demo"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <Card className="panel-surface rounded-[1.35rem]">
      <CardHeader>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-16" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}
