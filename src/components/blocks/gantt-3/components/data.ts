import type {
  GanttEvent,
  GanttResource,
} from "@/components/reui/gantt/gantt-types"

/** What executes a stage. Drives the glyph on the bar and in the tree label. */
type StageKind = "agent" | "tool" | "approval" | "eval"

/** Where a stage has got to. Drives the bar color and the status badge. */
type StageStatus = "succeeded" | "running" | "waiting" | "failed" | "queued"

/** One call a stage made while it ran, shown in the stage sheet trace. */
interface ToolCall {
  name: string
  latency: string
  ok: boolean
}

/** Per-bar payload carried on the gantt event. */
interface StageData {
  stageId: string
  workflowId: string
  kind: StageKind
  status: StageStatus
  /** The agent that ran it, or the tool id it called. */
  runner: string
  /** Attempt number and total, set only on a stage that retried. */
  attempt?: number
  attempts?: number
  /** Shard index and total, set only on a stage that fanned out. */
  shard?: number
  shards?: number
  tokens: number
  costUsd: number
  toolCalls: ToolCall[]
  error?: { title: string; detail: string }
  /**
   * A frozen compliance window. The bar is readOnly, and no other bar in the
   * same row may be dragged across it.
   */
  frozen?: boolean
  note?: string
}

type StageBar = GanttEvent<StageData>

/** One stage of a playbook: a leaf row that owns one or more bars. */
interface StageMeta {
  id: string
  title: string
  kind: StageKind
  runner: string
  /** Upstream stage ids. Edges never cross a workflow boundary. */
  dependsOn: string[]
  /**
   * A human gate. The row takes scheduleMode "single", so it can never grow a
   * second lane and a concurrent drop is refused by the engine itself.
   */
  gate?: boolean
  description: string
}

/** One playbook: a group row whose stages roll up into its summary strip. */
interface WorkflowMeta {
  id: string
  title: string
  /** Playbook id, rendered beside the title in the tree label. */
  playbook: string
  /** Run id, shown in the stage sheet and the copy action. */
  run: string
  /** Everything in this playbook must finish by here, in minutes past midnight. */
  cutoffMin: number
  stages: StageMeta[]
}

/**
 * The board is read at this minute past midnight. Everything behind it has
 * closed out, the bars straddling it are running, everything ahead is still
 * queued. A pinned demo date never contains the wall clock, so this constant
 * is what gives the day a front line, not the now indicator.
 */
const DEMO_NOW_MIN = 11 * 60 + 20

/** Portraits pinned to the identities the gantt category already uses. */
const NORA_VALE_PORTRAIT =
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80"
const LEO_GRANT_PORTRAIT =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80"

/** Approvers, shown in the stage sheet on approval stages only. */
const APPROVERS: Record<string, { name: string; role: string; image: string }> =
  {
    "rf-approval": {
      name: "Nora Vale",
      role: "Finance Approvals",
      image: NORA_VALE_PORTRAIT,
    },
    "ci-review": {
      name: "Leo Grant",
      role: "Safety Review",
      image: LEO_GRANT_PORTRAIT,
    },
  }

/** Bar color per status. Kind is carried by the glyph, so hue stays free for state. */
const STATUS_COLOR: Record<StageStatus, string> = {
  succeeded: "var(--color-emerald-500)",
  running: "var(--color-sky-500)",
  waiting: "var(--color-amber-500)",
  failed: "var(--color-rose-500)",
  queued: "var(--color-zinc-400)",
}

const STATUS_LABEL: Record<StageStatus, string> = {
  succeeded: "Succeeded",
  running: "Running",
  waiting: "Waiting",
  failed: "Failed",
  queued: "Queued",
}

/** Status dot tone, paired with the label so state is never color only. */
const STATUS_DOT: Record<StageStatus, string> = {
  succeeded: "bg-emerald-500",
  running: "bg-sky-500",
  waiting: "bg-amber-500",
  failed: "bg-rose-500",
  queued: "bg-zinc-400",
}

/** Status hue as a text colour, for glyphs rather than filled dots. */
const STATUS_TEXT: Record<StageStatus, string> = {
  succeeded: "text-emerald-600 dark:text-emerald-500",
  running: "text-sky-600 dark:text-sky-500",
  waiting: "text-amber-600 dark:text-amber-500",
  failed: "text-rose-600 dark:text-rose-500",
  queued: "text-zinc-500 dark:text-zinc-400",
}

const KIND_LABEL: Record<StageKind, string> = {
  agent: "Agent",
  tool: "Tool",
  approval: "Approval",
  eval: "Evaluation",
}

const STAGE_STATUSES: StageStatus[] = [
  "running",
  "waiting",
  "failed",
  "queued",
  "succeeded",
]

/**
 * The four playbooks on shift. Refund Escalation leads because it carries both
 * the gate and the retry storm, and those are the two states an operator has to
 * see without scrolling.
 */
const WORKFLOWS: WorkflowMeta[] = [
  {
    id: "pb-31",
    title: "Refund Escalation",
    playbook: "PB-31",
    run: "RUN-4822",
    // the refund promise expires at 12:00, and the chain lands exactly on it:
    // every stage here has zero room, which is what puts the whole playbook on
    // the critical path
    cutoffMin: 12 * 60,
    stages: [
      {
        id: "rf-intake",
        title: "Intake & Classify",
        kind: "agent",
        runner: "Refund Resolver",
        dependsOn: [],
        description: "Reads the ticket and picks a refund path.",
      },
      {
        id: "rf-policy",
        title: "Policy Check",
        kind: "tool",
        runner: "policies.refunds.check",
        dependsOn: ["rf-intake"],
        description: "Scores the request against the refund policy.",
      },
      {
        id: "rf-approval",
        title: "Finance Approval",
        kind: "approval",
        runner: "Finance Approvals",
        dependsOn: ["rf-policy"],
        gate: true,
        description: "A human signs off before money moves.",
      },
      {
        id: "rf-capture",
        title: "Capture Refund",
        kind: "tool",
        runner: "payments.refunds.create",
        dependsOn: ["rf-approval"],
        description: "Captures the partial refund on the original card.",
      },
      {
        id: "rf-notify",
        title: "Notify Customer",
        kind: "agent",
        runner: "Outreach Composer",
        dependsOn: ["rf-capture"],
        description: "Writes and sends the resolution email.",
      },
    ],
  },
  {
    id: "pb-44",
    title: "Contract Ingest",
    playbook: "PB-44",
    run: "RUN-4826",
    // tight but not critical: 30 minutes of room across the whole chain
    cutoffMin: 14 * 60,
    stages: [
      {
        id: "ci-fetch",
        title: "Fetch Documents",
        kind: "tool",
        runner: "files.archive",
        dependsOn: [],
        description: "Pulls the day's signed contracts from the archive.",
      },
      {
        id: "ci-parse",
        title: "Parse Batch",
        kind: "agent",
        runner: "Contract Summarizer",
        dependsOn: ["ci-fetch"],
        description: "Splits the batch across three workers.",
      },
      {
        id: "ci-summarize",
        title: "Summarize",
        kind: "agent",
        runner: "Contract Summarizer",
        dependsOn: ["ci-parse"],
        description: "Writes one abstract per contract.",
      },
      {
        id: "ci-review",
        title: "Risk Review",
        kind: "approval",
        runner: "Safety Review",
        dependsOn: ["ci-summarize"],
        gate: true,
        description: "Safety reads every flagged clause.",
      },
    ],
  },
  {
    id: "pb-19",
    title: "Data Steward Sweep",
    playbook: "PB-19",
    run: "RUN-4829",
    cutoffMin: 20 * 60,
    stages: [
      {
        id: "ds-snapshot",
        title: "Snapshot",
        kind: "tool",
        runner: "postgres.query",
        dependsOn: [],
        description: "Freezes a read copy before anything is rewritten.",
      },
      {
        id: "ds-dedupe",
        title: "Dedupe & Enrich",
        kind: "agent",
        runner: "Data Steward",
        dependsOn: ["ds-snapshot"],
        description: "Merges duplicate accounts and backfills fields.",
      },
      {
        id: "ds-purge",
        title: "Purge Stale",
        kind: "tool",
        runner: "db.purge",
        dependsOn: ["ds-dedupe"],
        description:
          "Deletes records past retention, inside the audited window.",
      },
      {
        id: "ds-reindex",
        title: "Reindex",
        kind: "tool",
        runner: "embeddings.rebuild",
        dependsOn: ["ds-purge"],
        description: "Rebuilds the vector index over what survived.",
      },
    ],
  },
  {
    id: "pb-52",
    title: "Nightly Evaluation",
    playbook: "PB-52",
    run: "RUN-4812",
    cutoffMin: 8 * 60,
    stages: [
      {
        id: "ev-build",
        title: "Build Suite",
        kind: "eval",
        runner: "Eval Runner",
        dependsOn: [],
        description: "Assembles last night's regression cases.",
      },
      {
        id: "ev-run",
        title: "Run Suite",
        kind: "eval",
        runner: "Eval Runner",
        dependsOn: ["ev-build"],
        description: "Scores every agent against the suite.",
      },
      {
        id: "ev-publish",
        title: "Publish Report",
        kind: "agent",
        runner: "Data Steward",
        dependsOn: ["ev-run"],
        description: "Files the pass rate and the regressions.",
      },
    ],
  },
]

const ALL_STAGES: StageMeta[] = WORKFLOWS.flatMap((workflow) => workflow.stages)
const STAGE_BY_ID = new Map(ALL_STAGES.map((stage) => [stage.id, stage]))
const WORKFLOW_BY_ID = new Map(
  WORKFLOWS.map((workflow) => [workflow.id, workflow])
)
const WORKFLOW_BY_STAGE = new Map(
  WORKFLOWS.flatMap((workflow) =>
    workflow.stages.map((stage) => [stage.id, workflow] as const)
  )
)

/** Adjacency in the direction the graph is read: stage id to its upstream ids. */
const STAGE_EDGES: Record<string, string[]> = Object.fromEntries(
  ALL_STAGES.map((stage) => [stage.id, stage.dependsOn])
)

/** The tree the gantt renders. Gate rows pin themselves to a single track. */
const WORKFLOW_TREE: GanttResource[] = WORKFLOWS.map((workflow) => ({
  id: workflow.id,
  title: workflow.title,
  children: workflow.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    ...(stage.gate ? { scheduleMode: "single" as const } : {}),
  })),
}))

/** The finished overnight playbook opens collapsed so the board leads with live work. */
const COLLAPSED_ON_OPEN: string[] = ["pb-52"]

interface BarSeed {
  stageId: string
  status: StageStatus
  /** Start and end as [hour, minute] in local time on the anchor day. */
  from: [number, number]
  to: [number, number]
  tokens: number
  costUsd: number
  toolCalls: ToolCall[]
  attempt?: number
  attempts?: number
  shard?: number
  shards?: number
  frozen?: boolean
  note?: string
  error?: { title: string; detail: string }
}

/**
 * One operations day. Three shapes are deliberate and each one is a state the
 * board exists to show: Finance Approval holds two non overlapping bars in a
 * gate row, Capture Refund holds three attempts that overlap because the retry
 * fires before the previous call times out, and Parse Batch holds three shards
 * running at once. Everything else is one bar per stage.
 */
const BAR_SEEDS: BarSeed[] = [
  // Refund Escalation: clean until the approval, then the pathology
  {
    stageId: "rf-intake",
    status: "succeeded",
    from: [8, 0],
    to: [8, 40],
    tokens: 4200,
    costUsd: 0.021,
    toolCalls: [
      { name: "orders.lookup", latency: "320ms", ok: true },
      { name: "kb.search", latency: "410ms", ok: true },
    ],
  },
  {
    stageId: "rf-policy",
    status: "succeeded",
    from: [8, 40],
    to: [9, 0],
    tokens: 1800,
    costUsd: 0.009,
    toolCalls: [{ name: "policies.refunds.check", latency: "280ms", ok: true }],
  },
  {
    stageId: "rf-approval",
    status: "failed",
    from: [9, 0],
    to: [9, 45],
    tokens: 0,
    costUsd: 0,
    toolCalls: [],
    note: "First request expired unanswered.",
    error: {
      title: "Approval expired",
      detail:
        "Finance did not respond inside the 45 minute window, so the request was re-routed to the Ops Desk.",
    },
  },
  {
    stageId: "rf-approval",
    status: "succeeded",
    from: [9, 45],
    to: [10, 30],
    tokens: 0,
    costUsd: 0,
    toolCalls: [],
    note: "Re-routed to the Ops Desk and signed off.",
  },
  {
    stageId: "rf-capture",
    status: "failed",
    from: [10, 30],
    to: [11, 0],
    tokens: 900,
    costUsd: 0.004,
    attempt: 1,
    attempts: 3,
    toolCalls: [
      { name: "payments.refunds.create", latency: "30.0s", ok: false },
    ],
    error: {
      title: "Card declined",
      detail: "The issuer returned 402 card_declined on the original method.",
    },
  },
  {
    stageId: "rf-capture",
    status: "failed",
    from: [10, 40],
    to: [11, 10],
    tokens: 900,
    costUsd: 0.004,
    attempt: 2,
    attempts: 3,
    note: "Fired before attempt 1 timed out.",
    toolCalls: [
      { name: "payments.refunds.create", latency: "30.0s", ok: false },
    ],
    error: {
      title: "Card declined",
      detail: "Same issuer response. The backoff is shorter than the timeout.",
    },
  },
  {
    stageId: "rf-capture",
    status: "failed",
    from: [10, 50],
    to: [11, 20],
    tokens: 900,
    costUsd: 0.004,
    attempt: 3,
    attempts: 3,
    note: "Three attempts in flight at once.",
    toolCalls: [
      { name: "payments.refunds.create", latency: "30.0s", ok: false },
      { name: "stripe.charges.list", latency: "640ms", ok: true },
    ],
    error: {
      title: "Retry budget spent",
      detail: "Attempt 3 of 3 failed. The stage needs a new payment method.",
    },
  },
  {
    stageId: "rf-notify",
    status: "queued",
    from: [11, 20],
    to: [12, 0],
    tokens: 2600,
    costUsd: 0.013,
    toolCalls: [{ name: "sendgrid.mail.draft", latency: "510ms", ok: true }],
  },

  // Contract Ingest: the fan out
  {
    stageId: "ci-fetch",
    status: "succeeded",
    from: [9, 0],
    to: [9, 30],
    tokens: 600,
    costUsd: 0.003,
    toolCalls: [{ name: "files.archive", latency: "1.4s", ok: true }],
  },
  {
    stageId: "ci-parse",
    status: "succeeded",
    from: [9, 30],
    to: [10, 30],
    tokens: 21400,
    costUsd: 0.107,
    shard: 1,
    shards: 3,
    toolCalls: [{ name: "postgres.query", latency: "880ms", ok: true }],
  },
  {
    stageId: "ci-parse",
    status: "succeeded",
    from: [9, 30],
    to: [10, 50],
    tokens: 24800,
    costUsd: 0.124,
    shard: 2,
    shards: 3,
    toolCalls: [{ name: "postgres.query", latency: "910ms", ok: true }],
  },
  {
    stageId: "ci-parse",
    status: "running",
    from: [9, 30],
    to: [11, 35],
    tokens: 26100,
    costUsd: 0.131,
    shard: 3,
    shards: 3,
    note: "The long tail shard holds the whole batch open.",
    toolCalls: [{ name: "postgres.query", latency: "1.2s", ok: true }],
  },
  {
    stageId: "ci-summarize",
    status: "queued",
    from: [11, 35],
    to: [12, 30],
    tokens: 18400,
    costUsd: 0.092,
    toolCalls: [{ name: "kb.search", latency: "430ms", ok: true }],
  },
  {
    stageId: "ci-review",
    status: "queued",
    from: [12, 30],
    to: [13, 30],
    tokens: 0,
    costUsd: 0,
    toolCalls: [],
  },

  // Data Steward Sweep: the frozen compliance window
  {
    stageId: "ds-snapshot",
    status: "succeeded",
    from: [7, 30],
    to: [8, 15],
    tokens: 300,
    costUsd: 0.002,
    toolCalls: [{ name: "postgres.query", latency: "2.1s", ok: true }],
  },
  {
    stageId: "ds-dedupe",
    status: "succeeded",
    from: [8, 15],
    to: [11, 0],
    tokens: 48600,
    costUsd: 0.243,
    toolCalls: [
      { name: "crm.contacts.read", latency: "620ms", ok: true },
      { name: "crm.contacts.update", latency: "740ms", ok: true },
    ],
  },
  {
    stageId: "ds-purge",
    // parked on an external gate rather than merely next in line: the deletion
    // may not run until its audited window opens
    status: "waiting",
    from: [14, 0],
    to: [15, 30],
    tokens: 0,
    costUsd: 0,
    frozen: true,
    note: "Audited deletion window. The slot is fixed.",
    toolCalls: [{ name: "db.purge", latency: "4.8s", ok: true }],
  },
  {
    stageId: "ds-reindex",
    status: "queued",
    from: [15, 30],
    to: [17, 0],
    tokens: 12200,
    costUsd: 0.061,
    toolCalls: [{ name: "embeddings.rebuild", latency: "6.1s", ok: true }],
  },

  // Nightly Evaluation: finished overnight, collapsed on open
  {
    stageId: "ev-build",
    status: "succeeded",
    from: [1, 0],
    to: [1, 30],
    tokens: 1100,
    costUsd: 0.006,
    toolCalls: [{ name: "kb.search", latency: "380ms", ok: true }],
  },
  {
    stageId: "ev-run",
    status: "succeeded",
    from: [1, 30],
    to: [4, 20],
    tokens: 96400,
    costUsd: 0.482,
    toolCalls: [{ name: "pinecone.search", latency: "1.9s", ok: true }],
  },
  {
    stageId: "ev-publish",
    status: "succeeded",
    from: [4, 20],
    to: [4, 45],
    tokens: 3400,
    costUsd: 0.017,
    toolCalls: [{ name: "files.archive", latency: "700ms", ok: true }],
  },
]

/**
 * One rule instead of 22 hand set values: a finished stage is full, a parked one
 * is empty, and a running one fills to exactly how much of it has elapsed
 * against the demo clock.
 */
function progressFor(
  status: StageStatus,
  startMin: number,
  endMin: number
): number {
  if (status === "succeeded" || status === "failed") return 100
  if (status !== "running") return 0
  const span = endMin - startMin
  if (span <= 0) return 0
  const elapsed = Math.min(Math.max(DEMO_NOW_MIN - startMin, 0), span)
  return Math.round((elapsed / span) * 100)
}

/** Deterministic bars on the anchor day. Color is derived in the view, not here. */
function buildStageBars(anchor: Date): StageBar[] {
  const at = (hour: number, minute: number) => {
    const date = new Date(anchor)
    date.setHours(hour, minute, 0, 0)
    return date
  }
  return BAR_SEEDS.map((seed, index) => {
    const stage = STAGE_BY_ID.get(seed.stageId)
    const workflow = WORKFLOW_BY_STAGE.get(seed.stageId)
    const startMin = seed.from[0] * 60 + seed.from[1]
    const endMin = seed.to[0] * 60 + seed.to[1]
    return {
      // The seed index, never the attempt or shard number: a stage row may hold
      // several bars that are neither (the gate holds two approval requests),
      // and two bars sharing an id collapse onto one window the first time the
      // board merges an update back by id.
      id: `stage-${seed.stageId}-${index + 1}`,
      title: stage?.title ?? seed.stageId,
      start: at(seed.from[0], seed.from[1]),
      end: at(seed.to[0], seed.to[1]),
      allDay: false,
      resourceId: seed.stageId,
      readOnly: seed.frozen ?? false,
      progress: progressFor(seed.status, startMin, endMin),
      // a later bar in the same row paints over an earlier one only if it says so
      priority: index,
      data: {
        stageId: seed.stageId,
        workflowId: workflow?.id ?? "",
        kind: stage?.kind ?? "tool",
        status: seed.status,
        runner: stage?.runner ?? "",
        attempt: seed.attempt,
        attempts: seed.attempts,
        shard: seed.shard,
        shards: seed.shards,
        tokens: seed.tokens,
        costUsd: seed.costUsd,
        toolCalls: seed.toolCalls,
        error: seed.error,
        frozen: seed.frozen,
        note: seed.note,
      },
    }
  })
}

export {
  ALL_STAGES,
  APPROVERS,
  buildStageBars,
  COLLAPSED_ON_OPEN,
  DEMO_NOW_MIN,
  KIND_LABEL,
  STAGE_BY_ID,
  STAGE_EDGES,
  STAGE_STATUSES,
  STATUS_COLOR,
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_TEXT,
  WORKFLOW_BY_ID,
  WORKFLOW_BY_STAGE,
  WORKFLOW_TREE,
  WORKFLOWS,
}
export type {
  StageBar,
  StageData,
  StageKind,
  StageMeta,
  StageStatus,
  ToolCall,
  WorkflowMeta,
}