import React from 'react'
import type { UnitType } from '@/types'

interface SuccessGaugeProps {
  startValue: number
  targetValue: number
  currentValue: number
  unit: string
  /** Human-readable label shown as a suffix (e.g. "Questions", "Bugs"). Falls back to unit. */
  unitLabel?: string | null
  /** Controls how the delta is displayed in the current-value row. */
  unitType?: UnitType | null
  /** Optional team chess-weight overlay shown as an energy icon above the progress point */
  teamChessWeight?: number
  /** ISO timestamp — triggers amber "stale" styling if > 7 days old */
  lastUpdated?: string | null
  /** Compact variant for the sidebar: narrower track, fewer labels */
  compact?: boolean
}

function computeGauge(start: number, target: number, current: number) {
  const range = Math.abs(target - start)
  if (range === 0) return { pct: 0, color: '#94a3b8', isStuck: true }

  // Works for both ascending (target > start) and descending (target < start)
  const isMovingTowardTarget = target > start ? current >= start : current <= start
  const isRegressing = current !== start && !isMovingTowardTarget
  const notStarted = current === start

  const pct = Math.min(100, Math.max(0, (Math.abs(current - start) / range) * 100))
  const color = notStarted ? '#94a3b8' : isRegressing ? '#ef4444' : '#22c55e'

  return { pct, color, isStuck: false }
}

function isDataStale(lastUpdated: string | null | undefined): boolean {
  if (!lastUpdated) return false
  return Date.now() - new Date(lastUpdated).getTime() > 7 * 24 * 60 * 60 * 1000
}

/** Formats the delta line for NUMERIC unit types: e.g. "+12 Bugs" or "-8 Questions". */
function formatDelta(delta: number, suffix: string): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} ${suffix}`
}

export function SuccessGauge({
  startValue,
  targetValue,
  currentValue,
  unit,
  unitLabel,
  unitType,
  teamChessWeight,
  lastUpdated,
  compact = false,
}: SuccessGaugeProps): React.ReactElement {
  const { pct, color, isStuck } = computeGauge(startValue, targetValue, currentValue)
  const stale = isDataStale(lastUpdated)
  const energyLeft = Math.max(4, Math.min(96, pct))

  // Suffix shown after numeric values in labels
  const suffix = unitLabel ?? unit

  // For NUMERIC type, show the absolute delta instead of the raw current value
  const isNumeric = unitType === 'NUMERIC'
  const delta = Math.round((currentValue - startValue) * 100) / 100
  const currentDisplay = isNumeric
    ? formatDelta(delta, suffix)
    : `${currentValue}${suffix}`

  const isOptimization = targetValue < startValue

  if (isStuck) {
    return (
      <p className="text-[10px] text-slate-400 italic">Target equals baseline — update target value.</p>
    )
  }

  if (compact) {
    return (
      <div className="space-y-1 mt-2">
        <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-visible">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
          {teamChessWeight != null && teamChessWeight > 0 && (
            <span
              className="absolute top-1/2 -translate-y-[60%] -translate-x-1/2 text-[8px] leading-none pointer-events-none select-none"
              style={{ left: `${energyLeft}%`, color: '#d4af37' }}
              title={`Team weight: ${teamChessWeight} pts`}
            >
              ⚡
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[9px]">
          <span className={stale ? 'text-amber-500 font-bold' : 'text-slate-400'}>
            {currentDisplay}{stale ? ' ⚠' : ''}
          </span>
          <span className="font-bold" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Baseline → Target labels */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{startValue}{suffix}</span>
        <span className="font-bold" style={{ color }}>
          {Math.round(pct)}% {isOptimization ? 'optimized' : 'achieved'}
        </span>
        <span>{targetValue}{suffix}</span>
      </div>

      {/* Track */}
      <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-visible">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Energy icon — team chess weight hovering above progress point */}
        {teamChessWeight != null && teamChessWeight > 0 && (
          <span
            className="absolute -top-1 -translate-x-1/2 text-[11px] leading-none pointer-events-none select-none drop-shadow"
            style={{ left: `${energyLeft}%`, color: '#d4af37' }}
            title={`Team chess weight: ${teamChessWeight} pts this week`}
          >
            ⚡
          </span>
        )}
      </div>

      {/* Current value / delta + stale indicator */}
      <div className="flex items-center justify-between text-[10px]">
        <span className={`font-medium ${stale ? 'text-amber-500' : 'text-slate-400'}`}>
          {isNumeric ? 'Change' : 'Current'}: {currentDisplay}
          {stale && <span className="ml-1 font-bold">⚠ stale</span>}
        </span>
        {teamChessWeight != null && teamChessWeight > 0 && (
          <span className="text-[9px] text-slate-400">⚡ {teamChessWeight} wt</span>
        )}
      </div>
    </div>
  )
}
