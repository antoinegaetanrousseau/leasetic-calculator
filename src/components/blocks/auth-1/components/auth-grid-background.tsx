import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export interface AnimatedGridPatternProps extends ComponentPropsWithoutRef<"svg"> {
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: number
  numSquares?: number
  maxOpacity?: number
  duration?: number
  repeatDelay?: number
  // CSS selector for an element (the form) whose cell range stays cell-free.
  excludeSelector?: string
}

type Square = {
  id: number
  pos: [number, number]
  iteration: number
}

// Inclusive cell-index range to keep clear of cells (measured from the form).
type CellBox = {
  colMin: number
  colMax: number
  rowMin: number
  rowMax: number
}

// Deterministic 0..1 hash so cell placement stays stable across renders without
// Math.random, so SSR and client agree and the no-randomness gate stays green.
function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  excludeSelector,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId()
  const containerRef = useRef<SVGSVGElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [squares, setSquares] = useState<Array<Square>>([])
  const [exclude, setExclude] = useState<CellBox | null>(null)

  const getPos = useCallback(
    (seed: number): [number, number] => {
      const cols = Math.max(1, Math.floor(dimensions.width / width))
      const rows = Math.max(1, Math.floor(dimensions.height / height))
      const col = Math.floor(pseudoRandom(seed) * cols)
      let row = Math.floor(pseudoRandom(seed + 0.5) * rows)

      // Keep cells out of the form's box by remapping the row to a band above or
      // below it. Cells stay full squares (we move them, never clip them) and the
      // form area shows none; columns are untouched.
      if (
        exclude &&
        col >= exclude.colMin &&
        col <= exclude.colMax &&
        row >= exclude.rowMin &&
        row <= exclude.rowMax
      ) {
        const bandRows = exclude.rowMax - exclude.rowMin + 1
        const allowedRows = Math.max(1, rows - bandRows)
        row = Math.floor(pseudoRandom(seed + 0.5) * allowedRows)
        if (row >= exclude.rowMin) {
          row += bandRows
        }
      }

      return [col, row]
    },
    [dimensions.height, dimensions.width, height, width, exclude]
  )

  const generateSquares = useCallback(
    (count: number) => {
      return Array.from({ length: count }, (_, index) => ({
        id: index,
        pos: getPos(index + 1),
        iteration: 0,
      }))
    },
    [getPos]
  )

  const updateSquarePosition = useCallback(
    (squareId: number) => {
      setSquares((currentSquares) => {
        const current = currentSquares[squareId]
        if (!current || current.id !== squareId) {
          return currentSquares
        }

        const nextSquares = currentSquares.slice()
        const nextIteration = current.iteration + 1
        nextSquares[squareId] = {
          ...current,
          pos: getPos((squareId + 1) * 97 + nextIteration * 13),
          iteration: nextIteration,
        }

        return nextSquares
      })
    },
    [getPos]
  )

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares))
    }
  }, [dimensions.width, dimensions.height, generateSquares, numSquares])

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    // Map the form element to its inclusive cell range, padded by one cell, so
    // cell placement can skip it. Recomputed on resize to track breakpoints.
    const measureExclude = () => {
      if (!excludeSelector) {
        return
      }
      const target = document.querySelector(excludeSelector)
      if (!target) {
        setExclude(null)
        return
      }
      const svgRect = element.getBoundingClientRect()
      const formRect = target.getBoundingClientRect()
      const left = formRect.left - svgRect.left
      const top = formRect.top - svgRect.top
      const next: CellBox = {
        colMin: Math.floor((left - width) / width),
        colMax: Math.floor((left + formRect.width + width) / width),
        rowMin: Math.floor((top - height) / height),
        rowMax: Math.floor((top + formRect.height + height) / height),
      }
      setExclude((prev) =>
        prev &&
        prev.colMin === next.colMin &&
        prev.colMax === next.colMax &&
        prev.rowMin === next.rowMin &&
        prev.rowMax === next.rowMax
          ? prev
          : next
      )
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions((currentDimensions) => {
          const nextWidth = entry.contentRect.width
          const nextHeight = entry.contentRect.height

          if (
            currentDimensions.width === nextWidth &&
            currentDimensions.height === nextHeight
          ) {
            return currentDimensions
          }

          return { width: nextWidth, height: nextHeight }
        })
      }
      measureExclude()
    })

    resizeObserver.observe(element)
    measureExclude()

    return () => {
      resizeObserver.disconnect()
    }
  }, [excludeSelector, width, height])

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/12 stroke-gray-400/7 dark:fill-gray-500/9 dark:stroke-gray-500/6",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${id})`} />

      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [squareX, squareY], id, iteration }, index) => (
          <motion.rect
            key={`${id}-${iteration}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
              repeatDelay,
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            width={width - 1}
            height={height - 1}
            x={squareX * width + 1}
            y={squareY * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  )
}

export function AuthGridBackground({ cellSize = 40 }: { cellSize?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <AnimatedGridPattern
        width={cellSize}
        height={cellSize}
        numSquares={44}
        maxOpacity={0.08}
        duration={5}
        repeatDelay={0.6}
        excludeSelector="[data-auth-surface]"
        className="inset-x-[-10%] inset-y-[-8%] h-[116%] w-[120%] [mask-image:radial-gradient(72%_64%_at_50%_48%,black,rgba(0,0,0,0.72),transparent)]"
      />
    </div>
  )
}