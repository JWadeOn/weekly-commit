import React from 'react'
import { User, X, PanelRight, Wrench } from 'lucide-react'
import type { RallyCryDto, CommitItemResponse, UnitType, KloCategory } from '@/types'
import { KLO_CATEGORY_LABELS } from '@/types'
import { SuccessGauge } from '@/components/SuccessGauge'

interface OutcomeRow {
  outcomeId: string
  outcomeTitle: string
  doTitle: string
  ownerId: string
  ownerName: string
  /** Aggregate weight across all DRAFT/LOCKED team commits (server-computed) */
  teamWeight: number
  /** Current user's personal weight — used as fallback while server data loads */
  myWeight: number
  startValue: number | null
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  unitLabel: string | null
  unitType: UnitType | null
  lastUpdated: string | null
}

interface TeamOutcomesSidebarProps {
  rallyCries: RallyCryDto[]
  commitItems: CommitItemResponse[]
  /** Server-aggregated team weights: outcomeId → total chess weight. undefined = still loading */
  teamWeights: Record<string, number> | undefined
  /** How many team commits are included in the aggregate (shown in header) */
  participatingCommits?: number
  hoveredOutcomeId: string | null
  onHoverOutcome: (id: string | null) => void
  ownerNameMap: Record<string, string>
  mobileOpen: boolean
  onMobileClose: () => void
}

function OwnerAvatar({ name }: { name: string }): React.ReactElement {
  const initials = name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
      style={{ backgroundColor: '#1152d4', color: 'white' }}
    >
      {initials || <User className="h-3 w-3" />}
    </div>
  )
}

export function TeamOutcomesSidebar({
  rallyCries,
  commitItems,
  teamWeights,
  participatingCommits,
  hoveredOutcomeId,
  onHoverOutcome,
  ownerNameMap,
  mobileOpen,
  onMobileClose,
}: TeamOutcomesSidebarProps): React.ReactElement {
  // KLO items — unplanned items tagged as operational work
  const kloItems = commitItems.filter((i) => i.taskType === 'KLO')
  const kloTotalWeight = kloItems.reduce((sum, i) => sum + i.chessWeight, 0)
  const kloByCat = kloItems.reduce<Partial<Record<KloCategory, number>>>((acc, i) => {
    if (i.kloCategory) {
      acc[i.kloCategory] = (acc[i.kloCategory] ?? 0) + i.chessWeight
    }
    return acc
  }, {})

  const outcomeRows: OutcomeRow[] = rallyCries.flatMap((rc) =>
    rc.definingObjectives.flatMap((doObj) =>
      doObj.outcomes.map((outcome) => {
        const myWeight = commitItems
          .filter((item) => item.outcomeId === outcome.id)
          .reduce((sum, item) => sum + item.chessWeight, 0)
        // Use server-aggregated team weight when available; fall back to personal weight
        const teamWeight = teamWeights !== undefined
          ? (teamWeights[outcome.id] ?? 0)
          : myWeight
        return {
          outcomeId: outcome.id,
          outcomeTitle: outcome.title,
          doTitle: doObj.title,
          ownerId: outcome.ownerId,
          ownerName: ownerNameMap[outcome.ownerId] ?? 'Team Member',
          teamWeight,
          myWeight,
          startValue: outcome.startValue ?? null,
          targetValue: outcome.targetValue ?? null,
          currentValue: outcome.currentValue ?? null,
          unit: outcome.unit ?? null,
          unitLabel: outcome.unitLabel ?? null,
          unitType: outcome.unitType ?? null,
          lastUpdated: outcome.lastUpdated ?? null,
        }
      })
    )
  )

  const isTeamDataLoaded = teamWeights !== undefined
  // Gap = zero team weight committed to this outcome (no one has touched it)
  const gapCount = outcomeRows.filter((r) => r.teamWeight === 0).length

  const content = (
    <div className="rounded-xl border border-[#1152d4]/20 overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#1152d4' }}>
            Team Outcomes
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {outcomeRows.length} outcome{outcomeRows.length !== 1 ? 's' : ''}
            {isTeamDataLoaded && participatingCommits !== undefined && (
              <span className="ml-1.5 text-slate-500">· {participatingCommits} commit{participatingCommits !== 1 ? 's' : ''}</span>
            )}
            {gapCount > 0 && (
              <span className="ml-1.5 text-amber-500 font-bold">· {gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden text-slate-500 hover:text-white transition-colors"
          aria-label="Close goals panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Outcome list */}
      <div className="divide-y divide-white/5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {outcomeRows.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-500 text-xs">
            No active outcomes defined.
          </div>
        )}

        {outcomeRows.map((row) => {
          const isHovered = hoveredOutcomeId === row.outcomeId
          const isGap = row.teamWeight === 0

          return (
            <div
              key={row.outcomeId}
              className="px-4 py-3.5 cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: isHovered ? 'rgba(17,82,212,0.18)' : undefined,
              }}
              onMouseEnter={() => onHoverOutcome(row.outcomeId)}
              onMouseLeave={() => onHoverOutcome(null)}
            >
              {/* DO breadcrumb */}
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 truncate">
                {row.doTitle}
              </p>

              {/* Outcome title + hollow chess piece gap indicator */}
              <div className="flex items-start gap-2 mb-2.5">
                <p
                  className="text-xs font-semibold leading-snug flex-1 transition-colors duration-150"
                  style={{ color: isHovered ? '#fff' : '#cbd5e1' }}
                >
                  {row.outcomeTitle}
                </p>
                {isGap && (
                  <span
                    title="Strategic Gap — no weight committed to this outcome"
                    className="text-base leading-none shrink-0 mt-0.5 select-none"
                    style={{ color: '#d4af37', opacity: 0.5 }}
                  >
                    ♙
                  </span>
                )}
              </div>

              {/* SPA + weight */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <OwnerAvatar name={row.ownerName} />
                  <span className="text-[10px] text-slate-400 truncate">{row.ownerName}</span>
                </div>

                {row.teamWeight > 0 ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: '#1152d4', color: 'white' }}
                    title={isTeamDataLoaded ? `Team total: ${row.teamWeight} pts` : `Your weight: ${row.myWeight} pts`}
                  >
                    {isTeamDataLoaded ? 'team ' : ''}wt {row.teamWeight}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 italic shrink-0">
                    {isTeamDataLoaded ? 'team gap' : 'no weight'}
                  </span>
                )}
              </div>

              {/* Success Gauge — shown when measurability data exists */}
              {row.startValue != null && row.targetValue != null && row.currentValue != null && row.unit != null && (
                <SuccessGauge
                  startValue={row.startValue}
                  targetValue={row.targetValue}
                  currentValue={row.currentValue}
                  unit={row.unit}
                  unitLabel={row.unitLabel}
                  unitType={row.unitType}
                  teamChessWeight={row.teamWeight > 0 ? row.teamWeight : undefined}
                  lastUpdated={row.lastUpdated}
                  compact
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── KLO / Whirlwind section ── */}
      <div className="border-t border-white/10">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <Wrench className="h-3 w-3 text-slate-500 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            Whirlwind / KLO
          </p>
          {kloTotalWeight > 0 && (
            <span
              className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' }}
            >
              {kloTotalWeight} wt
            </span>
          )}
        </div>

        {kloTotalWeight === 0 ? (
          <p className="px-4 pb-3 text-[10px] text-slate-600 italic">No KLO work this week.</p>
        ) : (
          <div className="px-4 pb-3 space-y-1.5">
            {(Object.keys(kloByCat) as KloCategory[]).map((cat) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{KLO_CATEGORY_LABELS[cat]}</span>
                <span className="text-[10px] font-bold text-slate-500">{kloByCat[cat]} wt</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (kloTotalWeight / Math.max(1, kloTotalWeight + outcomeRows.reduce((s, r) => s + r.teamWeight, 0))) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[9px] text-slate-600 mt-1">
                Excluded from alignment score · counts toward capacity
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none select-none" style={{ color: '#d4af37', opacity: 0.35 }}>♙</span>
          <span className="text-[9px] text-slate-600 uppercase tracking-wider font-bold">
            Hollow piece = strategic gap · hover to highlight
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: sticky inline panel */}
      <div className="hidden lg:block sticky top-8">
        {content}
      </div>

      {/* Mobile: fixed slide-in drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
          />
          <div className="relative w-72 h-full overflow-y-auto p-4 shadow-2xl" style={{ backgroundColor: '#0f172a' }}>
            {content}
          </div>
        </div>
      )}
    </>
  )
}

// Small trigger button for mobile — exported for use in CommitPage header
export function TeamOutcomesTrigger({
  onClick,
  gapCount,
}: {
  onClick: () => void
  gapCount: number
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors"
      style={{
        borderColor: '#e2e8f0',
        color: gapCount > 0 ? '#d4af37' : '#64748b',
        backgroundColor: 'white',
      }}
      aria-label="View team outcomes"
    >
      <PanelRight className="h-3.5 w-3.5" />
      Goals
      {gapCount > 0 && (
        <span
          className="ml-0.5 text-[9px] font-black px-1 rounded-full"
          style={{ backgroundColor: '#d4af37', color: '#1e293b' }}
        >
          {gapCount}
        </span>
      )}
    </button>
  )
}
