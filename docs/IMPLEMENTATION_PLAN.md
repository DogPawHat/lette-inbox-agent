# Lette Inbox Agent Implementation Plan

## Summary
Build a monolithic TypeScript demo app that feels like an AI operations desk for a property manager. The app should turn messy inbound email into clear operational decisions: filter noise, identify the sender, match the message to a tenancy or property, determine intent, assess urgency, and decide whether the system can handle the response or the manager must step in.

The app should immediately answer:
- Is this email real work or noise?
- Who sent it?
- Which tenant, property, or unit is involved?
- What do they need?
- How urgent is it?
- What should happen next?
- Can the agent reply itself, or does the manager need to step in?

The product should feel:
- operational, not promotional
- calm and decisive, not cluttered
- property-management-specific, not generic AI
- confident but visibly risk-aware

## Core Workflow
The seeded inbound-email workflow should:
1. Accept a seeded or manually entered inbound email
2. Classify it as `spam`, `irrelevant`, or `actionable`
3. Identify the sender type: tenant, landlord, contractor, prospect, or unknown
4. Match the sender against seeded people, tenancy, property, and unit records
5. Infer the email intent:
   - maintenance
   - tenancy termination
   - viewing request
   - payment issue
   - contractor coordination
   - general question
   - complaint
   - other
6. Assess urgency and explain why
7. Decide whether to:
   - auto-reply for low-risk, known-capability requests
   - draft a response for manager review
   - escalate directly to the manager
8. Use seeded operational context where relevant:
   - contractor availability for maintenance
   - viewing-slot availability for prospects
   - maintenance cost bands for escalation
9. Persist the structured outcome so the inbox updates in priority order

## Demo Scope
The app should use exactly 20 seeded emails and seeded Convex data for:
- tenants
- landlords
- prospects
- contractors
- properties
- units
- tenancies
- viewing slots
- contractor slots
- maintenance job price bands

The demo scenarios should include:
- obvious spam and irrelevant outreach
- routine tenant questions
- low-cost maintenance
- maintenance that could exceed the approval threshold
- urgent maintenance
- appliance faults
- tenancy termination notices
- prospect viewing requests
- landlord update requests
- contractor coordination
- low-confidence matching cases

## Maintenance Escalation Rule
Maintenance must be cost-aware.

Rule:
- If a maintenance job could exceed `100 EUR`, it escalates to the manager.

Implementation rule:
- Use seeded job-type price bands
- Map the email to a maintenance job category and trade
- Store a min/max estimate for that job category
- Escalate if the upper bound is above `100`

Examples:
- dripping tap can stay below the threshold
- blocked drains, appliance faults, fuse issues, lock problems, and leak investigations can cross the threshold

## Reply Policy
The system should:
- auto-send only low-risk replies within known capabilities
- keep higher-risk, ambiguous, legal, sensitive, or consequential cases as drafts for manager review
- suggest slots for viewings and contractor visits
- never hard-book or confirm slots in v1

Low-risk auto-reply examples:
- payment instructions
- maintenance portal link
- routine low-cost maintenance acknowledgement with slot suggestion
- straightforward viewing-slot offer

Manager-review examples:
- tenancy termination
- complaints
- unclear identity/property matching
- urgent or costly maintenance

## Technical Stack
Use:
- TanStack Start for app shell and routing
- Convex for persistence, backend functions, and realtime reads
- shadcn components on top of Base UI and Tailwind
- `pnpm`
- `ai@6`
- `@openrouter/ai-sdk-provider`
- OpenRouter model `moonshotai/kimi-k2.5`

## Public Interfaces and Types
Define shared types for:
- `EmailClassification`
- `SenderRole`
- `Intent`
- `Urgency`
- `ReplyMode`
- `EscalationReason`
- `MaintenanceJobCategory`
- `ThreadAnalysis`
- `SuggestedAction`
- `SuggestedSlot`

Core backend functions:
- query prioritized inbox threads
- query thread detail
- mutation to seed/reset demo data
- mutation to create manual inbound email
- action to process one thread
- action to process all pending threads
- mutation to approve a manager-reviewed reply
- mutation to update thread status

## UI Shape
Primary screens:
- Inbox dashboard
- Thread workspace
- Manual intake screen

UI requirements:
- heavy use of shadcn/Tailwind components
- removal of the starter marketing layout and CSS
- dense, readable inbox prioritization
- visible urgency, sender role, intent, auto-reply state, and escalation state
- thread detail that shows raw email, matched context, AI analysis, cost estimate, suggested actions, and reply state

## Acceptance Criteria
The app is correct when:
- the inbox immediately communicates priority and next action
- spam and irrelevant messages are filtered from the main action queue
- sender/property matching works against seeded records
- maintenance cost bands can trigger escalation above `100 EUR`
- viewing requests produce seeded slot suggestions
- tenancy terminations remain manager-review items
- low-risk routine emails can auto-send a reply
- manual intake creates a thread and runs through the same workflow

## Defaults and Assumptions
- no real mailbox integration in v1
- no attachment OCR or transcription
- no hard booking of slots
- no auth in v1
- deterministic rules should work even with no model key
- OpenRouter-backed refinement should be possible once `OPENROUTER_API_KEY` is configured
