import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";

export const Route = createFileRoute("/intake")({
  component: IntakeScreen,
});

function IntakeScreen() {
  const navigate = useNavigate();
  const createManualEmail = useConvexMutation(api.inbox.createManualEmail);
  const processThread = useAction(api.inbox.processThread);

  const [form, setForm] = useState({
    fromName: "",
    fromEmail: "",
    subject: "",
    body: "",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const result = await createManualEmail(form);
      await processThread({ threadId: result.threadId });
      await navigate({
        to: "/threads/$threadId",
        params: { threadId: result.threadId },
      });
    },
  });

  return (
    <div className="page-shell px-4 py-8">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="panel-surface rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="text-3xl">Manual intake</CardTitle>
            <CardDescription>
              Paste a single inbound email and run it through the same seeded workflow used by the
              demo inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">Sender name</Label>
              <Input
                id="fromName"
                value={form.fromName}
                onChange={(event) => setForm((current) => ({ ...current, fromName: event.target.value }))}
                placeholder="Aisling Murphy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Sender email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={form.fromEmail}
                onChange={(event) => setForm((current) => ({ ...current, fromEmail: event.target.value }))}
                placeholder="aisling@maplecourt.ie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Kitchen tap dripping in 2B"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message body</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                className="min-h-52"
                placeholder="Describe the issue, property, timing, or request details here."
              />
            </div>
            <Button
              className="w-full"
              disabled={
                submitMutation.isPending ||
                !form.fromName.trim() ||
                !form.fromEmail.trim() ||
                !form.subject.trim() ||
                !form.body.trim()
              }
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Creating and processing…" : "Create thread and run workflow"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel-surface rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>What the workflow will do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="m-0">1. Filter spam or irrelevant content out of the main queue.</p>
              <p className="m-0">2. Match the sender to seeded tenant, landlord, contractor, or prospect records.</p>
              <p className="m-0">3. Resolve property and tenancy context where possible.</p>
              <p className="m-0">4. Estimate maintenance cost bands and escalate anything that could exceed EUR 100.</p>
              <p className="m-0">5. Suggest slots or a reply when the system has enough capability.</p>
            </CardContent>
          </Card>

          <Card className="panel-surface rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>Good test prompts</CardTitle>
              <CardDescription>
                These are the kinds of emails that show the workflow clearly in the demo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium text-foreground">Low-risk routine request</p>
                <p className="m-0">Payment instructions, portal links, or simple viewing enquiries.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium text-foreground">Cost-threshold maintenance</p>
                <p className="m-0">Blocked drains, appliance faults, fuse issues, or lock problems.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="mb-1 font-medium text-foreground">Manager-review scenario</p>
                <p className="m-0">Tenancy termination, complaints, or anything with low-confidence matching.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
