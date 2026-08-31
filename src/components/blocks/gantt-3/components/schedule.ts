import {
  STAGE_BY_ID,
  STAGE_EDGES,
  WORKFLOW_BY_ID,
  WORKFLOW_BY_STAGE,
  type StageBar,
} from "./data"

/** The span a whole stage occupies: the envelope of every bar in its row. */
interface StageWindow {
  start: Date
  end: Date
  /** The bars that make up the window, in start order. */
  bars: StageBar[]
}

/** What a refused gesture is refused for. Both fields are shown in one toast. */
interface Refusal {
  title: string
  detail: string
}

/** A legal move and everything it drags with it, or the reason it is not legal. */
interface RipplePlan {
  /** Bar id to the millisecond delta it must move by. */
  shifts: Map<string, number>
  refusal: Refusal | null
}

const MS_PER_MINUTE = 60_000

/** Stage id to the stages that wait on it. The reverse of the declared edges. */
const DOWNSTREAM: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const stageId of Object.keys(STAGE_EDGES)) map[stageId] = []
  for (const [stageId, upstream] of Object.entries(STAGE_EDGES)) {
    for (const parent of upstream) map[parent]?.push(stageId)
  }
  return map
})()

/** Bucket bars by the stage row they belong to. */
function windowsByStage(bars: StageBar[]): Map<string, StageWindow> {
  const map = new Map<string, StageWindow>()
  for (const bar of bars) {
    const stageId = bar.resourceId
    if (!stageId) continue
    const held = map.get(stageId)
    if (!held) {
      map.set(stageId, { start: bar.start, end: bar.end, bars: [bar] })
      continue
    }
    if (bar.start.getTime() < held.start.getTime()) held.start = bar.start
    if (bar.end.getTime() > held.end.getTime()) held.end = bar.end
    held.bars.push(bar)
  }
  for (const window of map.values()) {
    window.bars.sort((a, b) => a.start.getTime() - b.start.getTime())
  }
  return map
}

/**
 * The earliest instant a stage may legally start: the latest finish across every
 * stage it waits on. Null when the stage is a trigger, or when no upstream stage
 * has any bars left on the board.
 */
function earliestStart(
  stageId: string,
  windows: Map<string, StageWindow>
): { at: Date; blocker: string } | null {
  const upstream = STAGE_EDGES[stageId] ?? []
  let latest: { at: Date; blocker: string } | null = null
  for (const parentId of upstream) {
    const window = windows.get(parentId)
    if (!window) continue
    if (!latest || window.end.getTime() > latest.at.getTime()) {
      latest = {
        at: window.end,
        blocker: STAGE_BY_ID.get(parentId)?.title ?? parentId,
      }
    }
  }
  return latest
}

/** Every stage that waits on this one, at any depth, excluding the stage itself. */
function downstreamClosure(stageId: string): string[] {
  const seen = new Set<string>()
  const queue = [...(DOWNSTREAM[stageId] ?? [])]
  while (queue.length > 0) {
    const next = queue.shift()
    if (!next || seen.has(next)) continue
    seen.add(next)
    queue.push(...(DOWNSTREAM[next] ?? []))
  }
  return [...seen]
}

/** The last minute past midnight everything in this stage's playbook may run to. */
function cutoffMinutesFor(stageId: string): number {
  return WORKFLOW_BY_STAGE.get(stageId)?.cutoffMin ?? 24 * 60
}

/** Minutes past midnight for an instant on the board's day. */
function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * The cutoff as a real instant on the day `reference` falls in. Comparing
 * instants rather than minutes past midnight is what keeps a gesture that would
 * push a bar past midnight from reading as an early hour and slipping through.
 */
function cutoffInstantFor(stageId: string, reference: Date): Date {
  const dayStart = new Date(reference)
  dayStart.setHours(0, 0, 0, 0)
  return new Date(
    dayStart.getTime() + cutoffMinutesFor(stageId) * MS_PER_MINUTE
  )
}

/**
 * How much LATER a whole stage now finishes. This, not the moved bar's own
 * finish, is what a finish-to-start graph costs: a row holding three retry
 * attempts or three fan out shards is only "done" when its LAST bar ends, so
 * dragging any earlier bar around inside that envelope costs the graph nothing.
 * Measuring the bar instead would both over-ripple (moving shard 1 shoves a
 * chain that shard 3 still pins) and falsely refuse (moving attempt 1 reads as
 * pushing the whole playbook past its cutoff).
 */
function stageFinishDelta(
  bars: StageBar[],
  stageId: string,
  movedBarId: string | null,
  proposedEnd: Date
): number {
  let before = Number.NEGATIVE_INFINITY
  let after = Number.NEGATIVE_INFINITY
  for (const bar of bars) {
    if (bar.resourceId !== stageId) continue
    const end = bar.end.getTime()
    if (end > before) before = end
    const moved = bar.id === movedBarId ? proposedEnd.getTime() : end
    if (moved > after) after = moved
  }
  // a bar ADDED to the row (a re-run, a scheduled attempt) is not in `bars` yet
  if (movedBarId === null) after = Math.max(after, proposedEnd.getTime())
  // the row was empty, so nothing downstream was ever relying on its finish
  if (before === Number.NEGATIVE_INFINITY) return 0
  return Math.max(0, after - before)
}

/**
 * What a proposed move costs the rest of the playbook. A stage pushed LATER
 * drags everything that waits on it by the same delta, because the order is the
 * whole point of the graph. Pulling a stage earlier never drags anything
 * forward: rescheduling work nobody touched is a surprise, not a feature.
 */
function planRipple(
  bars: StageBar[],
  stageId: string,
  deltaMs: number
): RipplePlan {
  const shifts = new Map<string, number>()
  if (deltaMs <= 0) return { shifts, refusal: null }

  const affected = new Set(downstreamClosure(stageId))
  for (const bar of bars) {
    if (!bar.resourceId || !affected.has(bar.resourceId)) continue
    // an audited window is fixed in the calendar, so it cannot be pushed and
    // nothing upstream of it may claim the room it would need
    if (bar.readOnly) {
      return {
        shifts: new Map(),
        refusal: {
          title: "Fixed window downstream",
          detail: `"${bar.title}" is an audited window and cannot move, so nothing upstream can push into it.`,
        },
      }
    }
    const end = new Date(bar.end.getTime() + deltaMs)
    const cutoffAt = cutoffInstantFor(bar.resourceId, bar.start)
    if (end.getTime() > cutoffAt.getTime()) {
      return {
        shifts: new Map(),
        refusal: {
          title: "Past the run cutoff",
          detail: `That would push "${bar.title}" past the ${formatClock(cutoffAt)} cutoff.`,
        },
      }
    }
    shifts.set(bar.id, deltaMs)
  }
  return { shifts, refusal: null }
}

/** How a stage reads in the Slack column, and whether it sits on the critical path. */
interface StageSlack {
  /** Minutes of room before this stage starts pushing something. */
  minutes: number
  /** An upstream stage failed and this one has not run, so it cannot proceed. */
  blocked: boolean
  /** The stage is pinned to an audited window and slack does not apply. */
  fixed: boolean
}

/**
 * Backward pass over the graph. A stage's latest legal finish is the earliest
 * start of anything waiting on it, or its playbook cutoff when nothing does.
 * Slack is the gap between that and where the stage actually finishes, so zero
 * slack means the stage decides when the run lands.
 */
function slackByStage(bars: StageBar[]): Map<string, StageSlack> {
  const windows = windowsByStage(bars)
  const slack = new Map<string, StageSlack>()
  const latestFinish = new Map<string, number>()

  // reverse topological order: a stage is only resolvable once everything
  // waiting on it already is
  const order: string[] = []
  const state = new Map<string, "open" | "done">()
  const visit = (stageId: string) => {
    if (state.get(stageId) === "done") return
    if (state.get(stageId) === "open") return
    state.set(stageId, "open")
    for (const child of DOWNSTREAM[stageId] ?? []) visit(child)
    state.set(stageId, "done")
    order.push(stageId)
  }
  for (const stageId of Object.keys(STAGE_EDGES)) visit(stageId)

  for (const stageId of order) {
    const window = windows.get(stageId)
    if (!window) continue
    const children = DOWNSTREAM[stageId] ?? []
    let latest = cutoffMinutesFor(stageId)
    for (const childId of children) {
      const childWindow = windows.get(childId)
      if (!childWindow) continue
      const childFinish = latestFinish.get(childId) ?? cutoffMinutesFor(childId)
      const childSpan =
        (childWindow.end.getTime() - childWindow.start.getTime()) /
        MS_PER_MINUTE
      latest = Math.min(latest, childFinish - childSpan)
    }
    latestFinish.set(stageId, latest)

    const failedUpstream = (STAGE_EDGES[stageId] ?? []).some((parentId) => {
      const parent = windows.get(parentId)
      if (!parent) return false
      return parent.bars.every((bar) => bar.data?.status === "failed")
    })
    const notStarted = window.bars.every(
      (bar) => bar.data?.status === "queued" || bar.data?.status === "waiting"
    )
    slack.set(stageId, {
      minutes: Math.round(latest - minutesOf(window.end)),
      blocked: failedUpstream && notStarted,
      fixed: window.bars.some((bar) => bar.readOnly === true),
    })
  }
  return slack
}

/**
 * The chain that decides when a run finishes: every stage with no room left, plus
 * anything already blocked behind a failure.
 */
function criticalStages(slack: Map<string, StageSlack>): Set<string> {
  const critical = new Set<string>()
  for (const [stageId, value] of slack) {
    if (value.fixed) continue
    if (value.blocked || value.minutes <= 0) critical.add(stageId)
  }
  return critical
}

/** "2h 10m", "45m", "3h". Never a bare zero unit. */
function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

/**
 * Slack can go negative once a stage is overcommitted, and formatDuration floors
 * at zero. Without the sign a stage 45 minutes past its cutoff reads exactly
 * like one landing on the wire, which is the difference between "tight" and
 * "already broken".
 */
function formatSlack(minutes: number): string {
  const whole = Math.round(minutes)
  return whole < 0 ? `-${formatDuration(-whole)}` : formatDuration(whole)
}

/** "18.4k", "96.4k", "600". Cost is a separate readout. */
function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${(tokens / 1000).toFixed(1)}k`
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(3)}`
}

/** 24 hour clock from minutes past midnight, or from an instant. */
function formatClock(value: Date | number): string {
  const minutes = typeof value === "number" ? value : minutesOf(value)
  const hours = Math.floor(minutes / 60) % 24
  const rest = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

/** The playbook cutoff as a clock label, for the sheet and the refusal toasts. */
function cutoffLabelFor(workflowId: string): string {
  const workflow = WORKFLOW_BY_ID.get(workflowId)
  return workflow ? formatClock(workflow.cutoffMin) : ""
}

export {
  criticalStages,
  cutoffInstantFor,
  cutoffLabelFor,
  cutoffMinutesFor,
  downstreamClosure,
  earliestStart,
  formatClock,
  formatCost,
  formatDuration,
  formatSlack,
  formatTokens,
  minutesOf,
  planRipple,
  slackByStage,
  stageFinishDelta,
  windowsByStage,
}
export type { Refusal, RipplePlan, StageSlack, StageWindow }