import type { GanttColumn } from "@/components/reui/gantt/gantt"

import { STAGE_BY_ID, type StageStatus } from "./data"
import {
  RowActionsMenu,
  SlackCell,
  StatusCell,
  TokensCell,
  WaitsForCell,
} from "./run-board-cells"
import type { StageSlack } from "./schedule"

/** What every row of the tree panel reads from. Computed once, never per cell. */
interface RowFacts {
  status: StageStatus
  waitsFor: string | null
  slack: StageSlack | null
  tokens: number
}

/** Column ids in the order the header lays them out. */
const COLUMN_IDS = ["status", "waits", "slack", "tokens"] as const

/**
 * Status and Slack answer the two questions an operator opens the board with.
 * Waits For and Tokens are follow-ups, so they start hidden behind the columns
 * menu and give their width back to the timeline.
 */
const DEFAULT_COLUMNS: string[] = ["status", "slack"]

/** The one place a column is named; the columns menu reads this too. */
const COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  waits: "Waits For",
  slack: "Slack",
  tokens: "Tokens",
}

function buildStageColumns({
  visible,
  facts,
  onOpen,
  onRerun,
  onClear,
}: {
  visible: string[]
  facts: Map<string, RowFacts>
  onOpen: (stageId: string) => void
  onRerun: (stageId: string) => void
  onClear: (stageId: string) => void
}): GanttColumn[] {
  const defs: Record<string, GanttColumn> = {
    status: {
      id: "status",
      title: COLUMN_LABELS.status,
      width: 92,
      render: ({ resource }) => {
        const row = facts.get(resource.id)
        return row ? <StatusCell status={row.status} /> : null
      },
    },
    waits: {
      id: "waits",
      title: COLUMN_LABELS.waits,
      width: 120,
      render: ({ resource, isGroup }) => {
        if (isGroup) return null
        const row = facts.get(resource.id)
        return row ? <WaitsForCell title={row.waitsFor} /> : null
      },
    },
    slack: {
      id: "slack",
      title: COLUMN_LABELS.slack,
      // wide enough that "6h 30m" keeps clear of the timeline divider
      width: 92,
      align: "end",
      render: ({ resource }) => {
        const row = facts.get(resource.id)
        return row ? <SlackCell slack={row.slack} /> : null
      },
    },
    tokens: {
      id: "tokens",
      title: COLUMN_LABELS.tokens,
      width: 84,
      align: "end",
      render: ({ resource }) => {
        const row = facts.get(resource.id)
        return row ? <TokensCell tokens={row.tokens} /> : null
      },
    },
  }

  // COLUMN_IDS drives the order, so toggling a column back on returns it to its
  // own slot rather than to the end of the row
  const columns: GanttColumn[] = []
  for (const id of COLUMN_IDS) {
    if (!visible.includes(id)) continue
    const def = defs[id]
    if (def) columns.push(def)
  }
  columns.push({
    id: "actions",
    width: 32,
    render: ({ resource, isGroup }) => {
      if (isGroup) return null
      const stage = STAGE_BY_ID.get(resource.id)
      if (!stage) return null
      return (
        <RowActionsMenu
          stage={stage}
          onOpen={onOpen}
          onRerun={onRerun}
          onClear={onClear}
        />
      )
    },
  })
  return columns
}

export { buildStageColumns, COLUMN_IDS, COLUMN_LABELS, DEFAULT_COLUMNS }
export type { RowFacts }