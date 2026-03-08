import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Mail, AlertTriangle, Clock, CheckCircle, Search, Filter, ArrowUpRight } from 'lucide-react'

export const Route = createFileRoute('/')({ component: InboxAgent })

type Urgency = 'critical' | 'high' | 'medium' | 'low'
type SenderType = 'tenant' | 'landlord' | 'contractor' | 'prospect'
type Status = 'new' | 'in_progress' | 'resolved'

interface Message {
  id: string
  subject: string
  sender: string
  senderType: SenderType
  property: string
  unit?: string
  urgency: Urgency
  status: Status
  preview: string
  receivedAt: string
  threadCount: number
  recommendedAction: string
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    subject: 'Water leak in bathroom - getting worse',
    sender: 'Sarah Mitchell',
    senderType: 'tenant',
    property: '25 Wardour Street',
    unit: 'Flat 4B',
    urgency: 'critical',
    status: 'new',
    preview: 'Hi, I reported a leak last week and it\'s now spreading to the hallway ceiling. Water is dripping constantly and I\'m worried about structural damage...',
    receivedAt: '12 min ago',
    threadCount: 4,
    recommendedAction: 'Escalate to emergency maintenance — create work order for plumber',
  },
  {
    id: '2',
    subject: 'Re: Lease renewal discussion',
    sender: 'James Crawford',
    senderType: 'landlord',
    property: 'Storyhouse, Manchester',
    urgency: 'high',
    status: 'in_progress',
    preview: 'Following our conversation, I\'d like to proceed with the 5% increase as discussed. Can you prepare the renewal documents for units 12-18...',
    receivedAt: '1 hour ago',
    threadCount: 7,
    recommendedAction: 'Draft lease renewal documents for 7 units — send to landlord for review',
  },
  {
    id: '3',
    subject: 'Viewing request - 2 bed apartment',
    sender: 'Olivia Park',
    senderType: 'prospect',
    property: 'Hali Tower, London E1',
    unit: 'Unit 8-302',
    urgency: 'medium',
    status: 'new',
    preview: 'I saw your listing on Rightmove and would love to arrange a viewing. My budget is around £2,500/month and I\'d like to move in by March...',
    receivedAt: '2 hours ago',
    threadCount: 1,
    recommendedAction: 'Schedule viewing — send available time slots via WhatsApp',
  },
  {
    id: '4',
    subject: 'Invoice for boiler replacement - Flat 7A',
    sender: 'Mark Davies - DM Heating',
    senderType: 'contractor',
    property: '25 Wardour Street',
    unit: 'Flat 7A',
    urgency: 'medium',
    status: 'in_progress',
    preview: 'Please find attached invoice #4521 for the boiler replacement completed on 28 Feb. Total: £2,840 inc VAT. Payment terms: 30 days...',
    receivedAt: '3 hours ago',
    threadCount: 3,
    recommendedAction: 'Approve invoice and forward to accounts for payment',
  },
  {
    id: '5',
    subject: 'Parking dispute between tenants',
    sender: 'Alex Turner',
    senderType: 'tenant',
    property: 'Lugus Residences',
    unit: 'Flat 2',
    urgency: 'low',
    status: 'new',
    preview: 'Just wanted to flag that the tenant in Flat 6 has been parking in my allocated space again. This is the third time this month...',
    receivedAt: '5 hours ago',
    threadCount: 1,
    recommendedAction: 'Send parking reminder to Flat 6 tenant — reference lease terms',
  },
  {
    id: '6',
    subject: 'Move-out inspection needed',
    sender: 'Ferri Khan',
    senderType: 'tenant',
    property: 'Ardstone Court',
    unit: 'Apartment 5',
    urgency: 'medium',
    status: 'new',
    preview: 'As discussed, my tenancy ends on 31 March. Could you arrange the move-out inspection? I\'ve already arranged professional cleaning...',
    receivedAt: '6 hours ago',
    threadCount: 2,
    recommendedAction: 'Schedule move-out inspection — prepare deposit return assessment',
  },
]

const urgencyConfig: Record<Urgency, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  low: { label: 'Low', className: 'bg-accent text-muted-foreground' },
}

const senderTypeConfig: Record<SenderType, { label: string; className: string }> = {
  tenant: { label: 'Tenant', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  landlord: { label: 'Landlord', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  contractor: { label: 'Contractor', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  prospect: { label: 'Prospect', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
}

const statusConfig: Record<Status, { label: string; icon: typeof Mail }> = {
  new: { label: 'New', icon: Mail },
  in_progress: { label: 'In Progress', icon: Clock },
  resolved: { label: 'Resolved', icon: CheckCircle },
}

function InboxAgent() {
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'all'>('all')

  const filtered = filterUrgency === 'all'
    ? MOCK_MESSAGES
    : MOCK_MESSAGES.filter(m => m.urgency === filterUrgency)

  const selected = MOCK_MESSAGES.find(m => m.id === selectedId)

  return (
    <main className="page-wrap flex h-[calc(100vh-64px)] flex-col gap-4 px-4 py-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">Inbox</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {MOCK_MESSAGES.filter(m => m.status === 'new').length} new messages requiring attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              className="h-9 rounded-[10px] border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-[10px] border border-border bg-card p-1">
            <Filter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setFilterUrgency(u)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterUrgency === u
                    ? 'bg-[#0f1016] text-[#edede9]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {u === 'all' ? 'All' : u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Message list */}
        <div className="w-full shrink-0 overflow-y-auto rounded-[20px] bg-card ring-1 ring-border/50 sm:w-[380px] lg:w-[420px]">
          {filtered.map((msg) => {
            const urgency = urgencyConfig[msg.urgency]
            const sender = senderTypeConfig[msg.senderType]
            const isSelected = selectedId === msg.id

            return (
              <button
                key={msg.id}
                onClick={() => setSelectedId(msg.id)}
                className={`flex w-full flex-col gap-2 border-b border-border/50 p-4 text-left transition-colors last:border-b-0 ${
                  isSelected ? 'bg-accent/50' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sender.className}`}>
                      {sender.label}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${urgency.className}`}>
                      {urgency.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{msg.receivedAt}</span>
                </div>
                <p className={`text-sm leading-snug font-medium text-foreground ${msg.status !== 'new' ? 'opacity-70' : ''}`}>
                  {msg.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  {msg.sender} &middot; {msg.property}{msg.unit ? `, ${msg.unit}` : ''}
                </p>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                  {msg.preview}
                </p>
                {msg.threadCount > 1 && (
                  <span className="text-[10px] text-muted-foreground">{msg.threadCount} messages in thread</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className="hidden min-h-0 flex-1 overflow-y-auto rounded-[20px] bg-card p-6 ring-1 ring-border/50 sm:block lg:p-8">
          {selected ? (
            <div className="rise-in">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${senderTypeConfig[selected.senderType].className}`}>
                      {senderTypeConfig[selected.senderType].label}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${urgencyConfig[selected.urgency].className}`}>
                      {urgencyConfig[selected.urgency].label} urgency
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {(() => {
                        const StatusIcon = statusConfig[selected.status].icon
                        return <StatusIcon className="h-3 w-3" />
                      })()}
                      {statusConfig[selected.status].label}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl tracking-tight text-foreground lg:text-2xl">
                    {selected.subject}
                  </h2>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{selected.receivedAt}</span>
              </div>

              {/* Sender info */}
              <div className="mb-6 rounded-xl border border-border/50 bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium text-foreground">{selected.sender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Property</p>
                    <p className="font-medium text-foreground">{selected.property}</p>
                  </div>
                  {selected.unit && (
                    <div>
                      <p className="text-xs text-muted-foreground">Unit</p>
                      <p className="font-medium text-foreground">{selected.unit}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Thread</p>
                    <p className="font-medium text-foreground">{selected.threadCount} message{selected.threadCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Message body */}
              <div className="mb-6">
                <p className="section-label mb-3">Message</p>
                <div className="rounded-xl border border-border/50 bg-background p-4 text-sm leading-relaxed text-foreground">
                  {selected.preview}
                </div>
              </div>

              {/* Recommended action */}
              <div className="mb-6">
                <p className="section-label mb-3">Recommended Action</p>
                <div className="flex items-start gap-3 rounded-xl border border-accent bg-accent/30 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{selected.recommendedAction}</p>
                  </div>
                  <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
                    Take action
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  Reply
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  Forward
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  Create work order
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  Mark resolved
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a message to view details
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
