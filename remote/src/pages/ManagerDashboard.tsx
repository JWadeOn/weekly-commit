import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  AlertTriangle,
  Target,
  Crown,
  Star,
  Users,
  Zap,
  CheckCircle2,
  BarChart3,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTeamDashboard, useTeamAlignment, useRcdoHierarchy, usePivotRadar } from '@/hooks/useManager'
import { useTeamOutcomeWeights } from '@/hooks/useCurrentCommit'
import { useUpdateOutcomeCurrentValue } from '@/hooks/useRcdoAdmin'
import { SuccessGauge } from '@/components/SuccessGauge'
import type { TeamMemberResponse, DefiningObjectiveBreakdownDto } from '@/types'
import { CHESS_ICON } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

// ── AlignmentTrend ────────────────────────────────────────────────────────────

function AlignmentTrend({ trend }: { trend?: number[] }): React.ReactElement {
  const t = trend ?? []
  if (t.length < 2) return <span className="text-xs text-slate-400">—</span>
  const last = t[t.length - 1] ?? 0
  const prev = t[t.length - 2] ?? 0
  const diff = last - prev
  if (diff > 0)
    return (
      <span className="text-xs text-green-600 flex items-center gap-0.5">
        <TrendingUp className="h-3 w-3" />+{diff}
      </span>
    )
  if (diff < 0)
    return (
      <span className="text-xs text-red-500 flex items-center gap-0.5">
        <TrendingDown className="h-3 w-3" />{diff}
      </span>
    )
  return (
    <span className="text-xs text-slate-400 flex items-center gap-0.5">
      <Minus className="h-3 w-3" />0
    </span>
  )
}

// ── TeamMemberCard ────────────────────────────────────────────────────────────

function TeamMemberCard({ member }: { member: TeamMemberResponse }): React.ReactElement {
  const navigate = useNavigate()
  const alignmentScore = member.currentCommit?.alignmentScore ?? null
  const lowAlignment = alignmentScore !== null && alignmentScore < 70
  const isLocked = member.currentCommit?.status === 'LOCKED'
  const isViewable =
    member.currentCommit?.status === 'LOCKED' ||
    member.currentCommit?.status === 'RECONCILING' ||
    member.currentCommit?.status === 'RECONCILED'

  return (
    <div
      className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
    >
      {/* Status bar at top */}
      {isLocked && !member.currentCommit?.viewedAt && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: '#d4af37' }}
        />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-900 text-sm">{member.fullName}</p>
            <p className="text-xs text-slate-400">{member.email}</p>
          </div>
          <AlignmentTrend trend={member.alignmentTrend} />
        </div>

        {member.currentCommit ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <StatusBadge status={member.currentCommit.status} />
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span>{member.currentCommit.itemCount} items</span>
                <span>·</span>
                <span>wt {member.currentCommit.totalWeight}</span>
                {alignmentScore !== null && (
                  <>
                    <span>·</span>
                    <span
                      className={alignmentScore < 70 ? 'text-red-500 font-bold' : ''}
                    >
                      {alignmentScore}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {lowAlignment && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  Alignment {alignmentScore}% — below 70% threshold
                </span>
              </div>
            )}

            {member.currentCommit.hasObjectiveDecay && (
              <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 text-xs text-orange-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  Objective Decay — carried forward {member.currentCommit.maxCarryForwardCount}×
                </span>
              </div>
            )}

            {!member.currentCommit.hasObjectiveDecay && member.currentCommit.hasCarriedForwardItems && (
              <Badge variant="warning" className="text-xs">
                Has carried forward items
              </Badge>
            )}

            {isViewable && (
              <button
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold border rounded-lg py-2 transition-all hover:text-white"
                style={{ borderColor: '#1152d4', color: '#1152d4' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1152d4'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = ''
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#1152d4'
                }}
                onClick={() =>
                  navigate(`/commits/${member.currentCommit!.id}?userId=${member.userId}`)
                }
              >
                <Eye className="h-3.5 w-3.5" />
                {member.currentCommit.viewedAt ? 'Review Again' : 'View Commit'}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">No commit this week</p>
        )}
      </div>
    </div>
  )
}

// ── ManagerDashboard ──────────────────────────────────────────────────────────

export function ManagerDashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { data: team, isLoading, error } = useTeamDashboard()
  const { data: alignment } = useTeamAlignment()
  const { data: rcdo } = useRcdoHierarchy()
  const { data: pivotRadar } = usePivotRadar(2)
  const { data: teamWeightsData } = useTeamOutcomeWeights()
  const updateCurrentValue = useUpdateOutcomeCurrentValue()

  type SortKey = 'name' | 'status' | 'itemCount' | 'alignment' | 'lastUpdated'
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [pulseEdits, setPulseEdits] = useState<Record<string, string>>({})

  const teamMembers: TeamMemberResponse[] = team?.teamMembers ?? []

  const northStarData = useMemo(() => {
    if (!rcdo) return []
    const doIndex = new Map(
      (alignment?.definingObjectiveBreakdown ?? []).map((d) => [d.definingObjectiveId, d]),
    )
    return rcdo.rallyCries
      .filter((rc) => rc.active)
      .map((rc) => ({
        rallyCryId: rc.id,
        rallyCryTitle: rc.title,
        definingObjectives: rc.definingObjectives
          .filter((d) => d.active)
          .map((d): DefiningObjectiveBreakdownDto => {
            const live = doIndex.get(d.id)
            return {
              definingObjectiveId: d.id,
              rallyCryId: rc.id,
              title: d.title,
              supportingItemCount: live?.supportingItemCount ?? 0,
              supportingWeight: live?.supportingWeight ?? 0,
              weightPercentage: live?.weightPercentage ?? 0,
              allocationSharePercentage: live?.allocationSharePercentage ?? 0,
              lowVelocity: live?.lowVelocity ?? false,
              hasPowerPiece: live?.hasPowerPiece ?? false,
            }
          }),
      }))
  }, [rcdo, alignment])

  // Active outcomes with measurability data for Friday Pulse
  const allActiveOutcomes = useMemo(() => {
    if (!rcdo) return []
    return rcdo.rallyCries
      .filter((rc) => rc.active)
      .flatMap((rc) =>
        rc.definingObjectives
          .filter((d) => d.active)
          .flatMap((d) =>
            d.outcomes
              .filter((o) => o.active && o.targetValue != null)
              .map((o) => ({ ...o, doTitle: d.title }))
          )
      )
  }, [rcdo])

  // MFE: broadcast integrity score to host app and any other federated modules
  useEffect(() => {
    if (alignment?.teamIntegrityScore == null) return
    const integrityLabel =
      alignment.teamIntegrityScore >= 80 ? 'MAX POWER' :
      alignment.teamIntegrityScore >= 50 ? 'GRINDING' : 'DRIFTING'
    window.dispatchEvent(
      new CustomEvent('weeklycommit:integrity-score-update', {
        detail: {
          teamIntegrityScore: alignment.teamIntegrityScore,
          lockedOnMondayWeight: alignment.lockedOnMondayWeight,
          doneWeight: alignment.doneWeight,
          powerRating: integrityLabel,
          timestamp: new Date().toISOString(),
        },
        bubbles: true,
      }),
    )
  }, [alignment?.teamIntegrityScore])

  const sortedMembers = useMemo(() => {
    const list = [...teamMembers]
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName))
      case 'status':
        return list.sort((a, b) => {
          const order: Record<string, number> = { DRAFT: 0, LOCKED: 1, RECONCILING: 2, RECONCILED: 3 }
          return (
            (order[a.currentCommit?.status ?? ''] ?? -1) -
            (order[b.currentCommit?.status ?? ''] ?? -1)
          )
        })
      case 'itemCount':
        return list.sort(
          (a, b) => (b.currentCommit?.itemCount ?? 0) - (a.currentCommit?.itemCount ?? 0),
        )
      case 'alignment':
        return list.sort(
          (a, b) =>
            (a.currentCommit?.alignmentScore ?? -1) - (b.currentCommit?.alignmentScore ?? -1),
        )
      case 'lastUpdated':
        return list.sort((a, b) => (b.lastUpdated ?? '').localeCompare(a.lastUpdated ?? ''))
      default:
        return list
    }
  }, [teamMembers, sortBy])

  if (isLoading)
    return <div className="p-8 text-center text-slate-400 font-medium">Loading team...</div>
  if (error) return <div className="p-8 text-center text-red-500">Failed to load team</div>
  if (!team) return <div className="p-8 text-center text-slate-400">No team data</div>

  const teamAlignmentScore = team.teamAlignmentScore ?? 0
  const underSupportedRallyCries =
    (alignment?.underSupportedRallyCries?.length ?? 0) > 0
      ? alignment!.underSupportedRallyCries!.map((r) => ({
          id: r.rallyCryId,
          title: r.title,
          supportPercentage: r.supportPercentage,
        }))
      : (team.underSupportedRallyCries ?? [])

  const membersWithLowAlignment = teamMembers.filter(
    (m) => m.currentCommit?.alignmentScore !== null && (m.currentCommit?.alignmentScore ?? 100) < 70,
  ).length

  // Validation queue: LOCKED commits not yet viewed
  const validationQueue = teamMembers.filter(
    (m) => m.currentCommit?.status === 'LOCKED' && !m.currentCommit?.viewedAt,
  )

  // Active rally cry from rcdo
  const activeRallyCry = rcdo?.rallyCries.find((rc) => rc.active)

  // Unit reconciliation stats
  const totalMembers = teamMembers.length
  const reconciledMembers = teamMembers.filter(
    (m) => m.currentCommit?.status === 'RECONCILED' || m.currentCommit?.status === 'RECONCILING',
  ).length
  const reconciliationPct = totalMembers > 0 ? Math.round((reconciledMembers / totalMembers) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── RC Hero + Alignment Gauge (2-col) ── */}
      {activeRallyCry && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: dark navy RC hero */}
          <section className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#1e293b] text-white p-8 shadow-2xl shadow-[#1e293b]/20 flex flex-col justify-center">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 size-64 bg-[#1152d4]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1152d4]/20 border border-[#1152d4]/30 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
                  <Crown className="h-3.5 w-3.5" />
                  Rallying Cry
                </div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{activeRallyCry.title}</h2>
                {activeRallyCry.description && (
                  <p className="text-slate-400 text-base leading-relaxed">{activeRallyCry.description}</p>
                )}
              </div>
              <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                <div className="text-5xl font-black text-[#1152d4]">{teamAlignmentScore}%</div>
                <div className="w-40 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1152d4] rounded-full"
                    style={{ width: `${teamAlignmentScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Velocity</span>
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{
                    color: teamAlignmentScore >= 80 ? '#22c55e' : teamAlignmentScore >= 50 ? '#d4af37' : '#94a3b8',
                    backgroundColor: teamAlignmentScore >= 80 ? 'rgba(34,197,94,0.15)' : teamAlignmentScore >= 50 ? 'rgba(212,175,55,0.15)' : 'rgba(148,163,184,0.15)',
                  }}
                >
                  {teamAlignmentScore >= 80 ? 'MAX POWER' : teamAlignmentScore >= 50 ? 'GRINDING' : 'DRIFTING'}
                </span>
              </div>
            </div>
          </section>

          {/* Right: Alignment Gauge */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Alignment Gauge</h3>
              <BarChart3 className="h-4 w-4 text-[#1152d4]" />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center gap-6">
              {/* Circle gauge */}
              <div className="relative size-32">
                <svg className="size-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" strokeWidth="8" className="stroke-slate-100" />
                  <circle
                    cx="50" cy="50" fill="none" r="45" strokeWidth="8"
                    strokeDasharray="282.7"
                    strokeDashoffset={`${282.7 * (1 - (alignment?.strategicPercentage ?? 70) / 100)}`}
                    strokeLinecap="round"
                    style={{ stroke: '#1152d4', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-[#1e293b] leading-none">{alignment?.strategicPercentage ?? 70}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Strategic</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold">Strategic (King/Queen/Rook)</span>
                  </div>
                  <span className="text-xs font-bold">{alignment?.strategicPercentage ?? 70}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1152d4] rounded-full" style={{ width: `${alignment?.strategicPercentage ?? 70}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Tactical (Bishop/Knight/Pawn)</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{100 - (alignment?.strategicPercentage ?? 70)}%</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Main Content ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Under-supported alert */}
          {underSupportedRallyCries.length > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
            >
              <p className="text-sm font-bold text-amber-800 mb-2">Under-Supported Rally Cries</p>
              <ul className="space-y-1">
                {underSupportedRallyCries.map((rc) => (
                  <li key={rc.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 truncate mr-2">{rc.title}</span>
                    <Badge variant="warning" className="shrink-0">
                      {rc.supportPercentage}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DO Cards (compact 4-column grid) */}
          {northStarData.map((rc) => (
            <div key={rc.rallyCryId}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black flex items-center gap-2 text-[#1e293b]">
                  Defining Objectives
                  <span className="text-sm font-normal text-slate-500">(Q{Math.ceil((new Date().getMonth() + 1) / 3)} Focus)</span>
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigate('/manager/strategy')}>
                  <Target className="h-3.5 w-3.5 mr-1" />
                  Open Strategy
                </Button>
              </div>
              {rc.definingObjectives.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">
                  No defining objectives configured.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {rc.definingObjectives.map((obj) => {
                    const allocPct = obj.allocationSharePercentage
                    const isAtRisk = allocPct > 0 && allocPct < 50
                    const statusColor = allocPct === 0 ? '#94a3b8' : isAtRisk ? '#f97316' : '#1152d4'
                    const statusLabel = allocPct === 0 ? 'Not Started' : isAtRisk ? 'At Risk' : 'On Track'
                    const statusBg = allocPct === 0
                      ? 'bg-slate-50 text-slate-500'
                      : isAtRisk
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-blue-50 text-[#1152d4]'
                    const powerRating =
                      allocPct >= 50 && obj.hasPowerPiece ? 'MAX POWER' :
                      allocPct >= 50 ? 'GRINDING' :
                      allocPct > 0 && allocPct < 10 ? 'DRIFTING' : null
                    const powerColor =
                      allocPct >= 50 && obj.hasPowerPiece ? '#1152d4' :
                      allocPct >= 50 ? '#d4af37' :
                      '#94a3b8'
                    return (
                      <div
                        key={obj.definingObjectiveId}
                        className="bg-white border border-slate-200 rounded-2xl flex flex-col hover:shadow-md hover:border-[#1152d4]/30 transition-all"
                        style={{ borderTop: `3px solid ${statusColor}` }}
                      >
                        <div className="p-5 flex flex-col gap-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="size-8 bg-[#1152d4]/10 text-[#1152d4] rounded-lg flex items-center justify-center">
                              <Target className="h-4 w-4" />
                            </div>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBg}`}>
                              <span className="size-1.5 rounded-full inline-block" style={{ backgroundColor: statusColor }} />
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm leading-snug text-[#1e293b] mb-2">{obj.title}</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black" style={{ color: statusColor }}>{obj.supportingItemCount}</span>
                              <span className="text-[11px] text-slate-400 font-medium">item{obj.supportingItemCount !== 1 ? 's' : ''} linked</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 pb-4 space-y-2">
                          {obj.lowVelocity && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Low Velocity
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="relative group cursor-help">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-dotted border-slate-300">Effort Share</span>
                              <span className="absolute hidden group-hover:block bottom-full left-0 mb-1.5 w-52 text-[10px] text-white bg-slate-800 rounded-lg px-2.5 py-2 z-20 shadow-xl leading-relaxed normal-case tracking-normal font-normal pointer-events-none">
                                % of the team&apos;s total aligned energy focused on this objective this week. Does not indicate project completion.
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {powerRating && (
                                <span
                                  className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
                                  style={{ color: powerColor, backgroundColor: `${powerColor}22` }}
                                >
                                  {powerRating}
                                </span>
                              )}
                              <span className="text-[10px] font-bold" style={{ color: statusColor }}>{allocPct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${allocPct}%`, backgroundColor: statusColor }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* ── Friday Pulse — Outcome Measurement Update ── */}
          {allActiveOutcomes.length > 0 && (() => {
            const isFriday = new Date().getDay() === 5
            return (
              <div
                className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
              >
                <div
                  className="p-4 border-b flex items-center justify-between"
                  style={{ borderColor: '#f1f5f9', backgroundColor: isFriday ? '#fffbeb' : '#fafbff' }}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4" style={{ color: isFriday ? '#d97706' : '#1152d4' }} />
                    <div>
                      <span className="font-bold uppercase tracking-wider text-sm" style={{ color: '#1e293b' }}>
                        {isFriday && <span className="text-amber-600 mr-1">📅 Friday —</span>}
                        Outcome Pulse
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Update current values to keep gauges accurate</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold border px-2 py-0.5 rounded-full"
                    style={{ borderColor: 'rgba(30,58,95,0.2)', color: '#1152d4' }}
                  >
                    {allActiveOutcomes.length} OUTCOMES
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allActiveOutcomes.map((outcome) => {
                    const isStale =
                      outcome.lastUpdated != null &&
                      Date.now() - new Date(outcome.lastUpdated).getTime() > 7 * 24 * 60 * 60 * 1000
                    const teamWeight = teamWeightsData?.weights[outcome.id] ?? 0
                    const editVal = pulseEdits[outcome.id]
                    const displayVal = editVal ?? (outcome.currentValue != null ? String(outcome.currentValue) : String(outcome.startValue ?? 0))
                    const isDirty = editVal != null && editVal !== String(outcome.currentValue)

                    return (
                      <div
                        key={outcome.id}
                        className="rounded-xl border p-4 space-y-3 transition-colors"
                        style={{
                          borderColor: isStale ? '#fcd34d' : '#e2e8f0',
                          backgroundColor: isStale ? 'rgba(255,251,235,0.6)' : 'white',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">
                              {outcome.doTitle}
                            </p>
                            <p className="text-sm font-bold text-slate-800 leading-snug mt-0.5">{outcome.title}</p>
                          </div>
                          {isStale && (
                            <span className="text-[9px] font-black uppercase shrink-0 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              STALE
                            </span>
                          )}
                        </div>

                        {outcome.startValue != null && outcome.targetValue != null && (
                          <SuccessGauge
                            startValue={outcome.startValue}
                            targetValue={outcome.targetValue}
                            currentValue={outcome.currentValue ?? outcome.startValue}
                            unit={outcome.unit ?? ''}
                            teamChessWeight={teamWeight > 0 ? teamWeight : undefined}
                            lastUpdated={outcome.lastUpdated}
                          />
                        )}

                        {/* Inline current-value edit */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            value={displayVal}
                            onChange={(e) =>
                              setPulseEdits((prev) => ({ ...prev, [outcome.id]: e.target.value }))
                            }
                            className={`flex-1 h-8 text-xs border rounded-lg px-2.5 focus:outline-none focus:ring-2 transition-colors ${
                              isStale
                                ? 'border-amber-300 focus:ring-amber-400/40 bg-amber-50'
                                : 'border-slate-200 focus:ring-[#1152d4]/30'
                            }`}
                            placeholder="Current value"
                          />
                          {outcome.unit && (
                            <span className="text-xs text-slate-400 shrink-0 font-medium">{outcome.unit}</span>
                          )}
                          <button
                            disabled={!isDirty || updateCurrentValue.isPending}
                            onClick={() => {
                              if (isDirty && editVal != null) {
                                void updateCurrentValue
                                  .mutateAsync({ id: outcome.id, body: { currentValue: Number(editVal) } })
                                  .then(() => {
                                    setPulseEdits((prev) => {
                                      const next = { ...prev }
                                      delete next[outcome.id]
                                      return next
                                    })
                                  })
                              }
                            }}
                            className="h-8 px-3 text-xs font-bold rounded-lg transition-all text-white disabled:opacity-40"
                            style={{ backgroundColor: '#1152d4' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* ── Drift Radar + Pivot Log ── */}
          <div className="rounded-2xl bg-[#1e293b] p-5 space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-white/10 text-slate-300 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-white">Early Warning System</p>
                <p className="text-[11px] text-slate-400 font-medium">Scanning for drift, unplanned pivots, and pawn overload</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/10 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Drift Radar */}
            <section className="bg-white border border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Drift Radar (High Pawn Volume)</h3>
                {pivotRadar && pivotRadar.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    {pivotRadar.length} ITEMS
                  </div>
                )}
              </div>
              {!pivotRadar || pivotRadar.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No drift detected this week.</p>
              ) : (
                <div className="space-y-4">
                  {pivotRadar.slice(0, 5).map((p) => (
                    <div key={p.itemId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {p.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-bold text-[#1e293b] truncate">{p.fullName}</span>
                          <span className="text-xs font-bold text-rose-500 shrink-0 ml-2">{CHESS_ICON[p.chessPiece]} {p.chessPiece}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '75%' }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{p.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Pivot Log */}
            <section className="bg-white border border-white/10 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Pivot Log (Unplanned Tasks)</h3>
                <span className="text-[10px] font-bold text-[#1152d4] bg-[#1152d4]/10 px-2 py-0.5 rounded">This Week</span>
              </div>
              {!pivotRadar || pivotRadar.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No unplanned pivots this week.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <th className="pb-3 px-2">Task Name</th>
                        <th className="pb-3 px-2">Bumped Item</th>
                        <th className="pb-3 px-2 text-right">Chess</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pivotRadar.slice(0, 4).map((p) => (
                        <tr key={p.itemId}>
                          <td className="py-3 px-2 font-medium text-[#1e293b]">
                            <p className="text-sm leading-snug">{p.title}</p>
                            <p className="text-xs text-slate-400">{p.fullName}</p>
                          </td>
                          <td className="py-3 px-2 text-slate-500 text-xs italic">
                            {p.bumpedItemTitle ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-bold">
                              {CHESS_ICON[p.chessPiece]} {p.chessPiece}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            </div>
          </div>

          {/* Distribution of Effort */}
          {alignment && alignment.totalWeight > 0 && (
            <div
              className="bg-white rounded-xl border p-5 space-y-4"
              style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
            >
              <div>
                <p className="font-bold text-slate-800">Distribution of Effort</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Strategic ♔/♕/♖ vs Tactical/Whirlwind ♗/♘/♙ — current week team total
                </p>
              </div>

              {alignment.strategicPercentage < 20 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">
                    Strategic Drift — only {alignment.strategicPercentage}% strategic effort.
                    Team may be drowning in Whirlwind.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {[
                  {
                    label: 'Strategic ♔/♕/♖',
                    pct: alignment.strategicPercentage,
                    color: alignment.strategicPercentage < 20 ? '#f97316' : '#22c55e',
                  },
                  {
                    label: 'Tactical/Whirlwind ♗/♘/♙',
                    pct: 100 - alignment.strategicPercentage,
                    color: '#94a3b8',
                  },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Commit Roll-up by layer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Star className="h-5 w-5" style={{ color: '#d4af37' }} />
                Weekly Commit Roll-up
              </h2>
            </div>

            {/* Queen layer commits */}
            {teamMembers.some((m) =>
              m.currentCommit &&
              ['LOCKED', 'RECONCILING', 'RECONCILED'].includes(m.currentCommit.status)
            ) && (
              <div
                className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
              >
                <div
                  className="p-4 border-b flex items-center justify-between"
                  style={{ borderColor: '#f1f5f9', backgroundColor: '#fafbff' }}
                >
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4" style={{ color: '#d4af37' }} />
                    <span className="font-bold uppercase tracking-wider text-sm text-slate-700">
                      The Queen{' '}
                      <span className="text-xs font-normal lowercase text-slate-400 ml-1">
                        High Mobility / Efficiency
                      </span>
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold border px-2 py-0.5 rounded-full"
                    style={{ borderColor: 'rgba(30,58,95,0.2)', color: '#1152d4' }}
                  >
                    {
                      teamMembers.filter((m) =>
                        m.currentCommit &&
                        ['LOCKED', 'RECONCILING', 'RECONCILED'].includes(m.currentCommit.status)
                      ).length
                    }{' '}
                    COMMITS
                  </span>
                </div>
                <div className="p-2 divide-y" style={{ borderColor: '#f8faff' }}>
                  {teamMembers
                    .filter((m) =>
                      m.currentCommit &&
                      ['LOCKED', 'RECONCILING', 'RECONCILED'].includes(m.currentCommit.status)
                    )
                    .slice(0, 5)
                    .map((m) => (
                      <div
                        key={m.userId}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg"
                      >
                        <div className="flex gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'rgba(30,58,95,0.06)' }}
                          >
                            <Users className="h-4 w-4" style={{ color: '#1152d4' }} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{m.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-slate-400">{m.currentCommit?.itemCount} items</p>
                              {m.currentCommit?.status === 'RECONCILING' && (
                                <span
                                  className="text-[10px] font-black px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#d4af37' }}
                                >
                                  RECONCILING
                                </span>
                              )}
                              {m.currentCommit?.status === 'RECONCILED' && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">
                                  Reconciled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-1 text-[10px] font-bold border px-2.5 py-1.5 rounded-lg transition-all hover:text-white"
                          style={{ borderColor: '#1152d4', color: '#1152d4' }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1152d4'
                            ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = ''
                            ;(e.currentTarget as HTMLButtonElement).style.color = '#1152d4'
                          }}
                          onClick={() =>
                            navigate(`/commits/${m.currentCommit!.id}?userId=${m.userId}`)
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          VIEW
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Pivot Radar */}
            {pivotRadar && pivotRadar.length > 0 && (
              <div
                className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: '#fed7aa', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
              >
                <div
                  className="p-4 border-b flex items-center justify-between"
                  style={{ borderColor: '#ffedd5', backgroundColor: '#fff7ed' }}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-orange-500 fill-orange-200" />
                    <span className="font-bold uppercase tracking-wider text-sm text-orange-800">
                      Pivot Radar{' '}
                      <span className="text-xs font-normal lowercase text-orange-500 ml-1">
                        unplanned mid-week pivots
                      </span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold border border-orange-200 text-orange-600 px-2 py-0.5 rounded-full">
                    {pivotRadar.length} ITEMS
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {pivotRadar.slice(0, 4).map((p) => (
                    <div
                      key={p.itemId}
                      className="rounded-lg border border-orange-100 bg-orange-50/50 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm">{p.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {p.fullName} · Week of {p.weekStartDate}
                          </p>
                          {p.bumpedItemTitle && (
                            <p className="text-xs text-orange-600 mt-1">Bumped: {p.bumpedItemTitle}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {CHESS_ICON[p.chessPiece]} {p.chessPiece}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Team member cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-800">Team Members</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-400">Sort by</p>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="itemCount">Item count</SelectItem>
                    <SelectItem value="alignment">Alignment</SelectItem>
                    <SelectItem value="lastUpdated">Last updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {sortedMembers.map((member) => (
                <TeamMemberCard key={member.userId} member={member} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-6">

          {/* Validation Queue */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <CheckCircle2 className="h-5 w-5" style={{ color: '#1152d4' }} />
                Validation Queue
              </h2>
              {validationQueue.length > 0 && (
                <span
                  className="w-6 h-6 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                  style={{ backgroundColor: '#d4af37' }}
                >
                  {validationQueue.length}
                </span>
              )}
            </div>

            <div
              className="bg-white rounded-2xl border overflow-hidden divide-y"
              style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
            >
              {validationQueue.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-sm text-slate-400">No pending reviews</p>
                  <p className="text-xs text-slate-300 mt-1">All submitted commits have been viewed.</p>
                </div>
              ) : (
                validationQueue.map((m) => (
                  <div key={m.userId} className="p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#d4af37' }}
                      >
                        Awaiting Review
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {m.currentCommit?.itemCount} items
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">{m.fullName}</p>
                    <p className="text-xs text-slate-400 mb-3">
                      {m.currentCommit?.itemCount} commits locked and waiting
                    </p>
                    <button
                      className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: '#1152d4' }}
                      onClick={() =>
                        navigate(`/commits/${m.currentCommit!.id}?userId=${m.userId}`)
                      }
                    >
                      View Commit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unit Reconciliation */}
          <div
            className="bg-white border rounded-2xl p-5"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: '#d4af37' }} />
              Unit Reconciliation
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Active Units</span>
                <span className="text-sm font-black" style={{ color: '#1152d4' }}>{totalMembers}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${reconciliationPct}%`, backgroundColor: '#1152d4' }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {reconciledMembers} of {totalMembers} units have reconciled their weekly commits.
              </p>
            </div>
          </div>

          {/* Team Integrity Score + Cohesion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#1152d4]/10 text-[#1152d4] flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-[#1e293b] text-sm">Team Integrity Score</p>
                <p className="text-[10px] text-slate-400">Monday promise → Friday reality</p>
              </div>
            </div>

            {/* Arc gauge */}
            <div className="relative size-28 mx-auto">
              <svg className="size-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="45" strokeWidth="8" className="stroke-slate-100" />
                <circle
                  cx="50" cy="50" fill="none" r="45" strokeWidth="8"
                  strokeDasharray="282.7"
                  strokeDashoffset={`${282.7 * (1 - (alignment?.teamIntegrityScore ?? 0) / 100)}`}
                  strokeLinecap="round"
                  style={{
                    stroke: (alignment?.teamIntegrityScore ?? 0) >= 80 ? '#22c55e' : (alignment?.teamIntegrityScore ?? 0) >= 50 ? '#d4af37' : '#ef4444',
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'stroke-dashoffset 0.4s ease',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#1e293b] leading-none">{alignment?.teamIntegrityScore ?? 0}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Integrity</span>
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <span
                className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{
                  color: (alignment?.teamIntegrityScore ?? 0) >= 80 ? '#22c55e' : (alignment?.teamIntegrityScore ?? 0) >= 50 ? '#d4af37' : '#ef4444',
                  backgroundColor: (alignment?.teamIntegrityScore ?? 0) >= 80 ? 'rgba(34,197,94,0.12)' : (alignment?.teamIntegrityScore ?? 0) >= 50 ? 'rgba(212,175,55,0.12)' : 'rgba(239,68,68,0.12)',
                }}
              >
                {(alignment?.teamIntegrityScore ?? 0) >= 80 ? 'MAX POWER' : (alignment?.teamIntegrityScore ?? 0) >= 50 ? 'GRINDING' : 'DRIFTING'}
              </span>
              <div className="relative group cursor-help">
                <p className="text-[10px] text-slate-400">
                  {alignment?.doneWeight ?? 0} pts done / {alignment?.lockedOnMondayWeight ?? 0} pts committed
                </p>
                <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 text-[10px] text-white bg-slate-800 rounded-lg px-2.5 py-2 z-20 shadow-xl leading-relaxed pointer-events-none">
                  Ratio of committed Monday weight completed or partially completed this week. Excludes unplanned mid-week pivots.
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2">
              <div className="text-center">
                <p className={`text-xl font-black ${teamAlignmentScore < 70 ? 'text-red-500' : 'text-[#1e293b]'}`}>{teamAlignmentScore}%</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alignment</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-[#1e293b]">{totalMembers}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Members</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-black ${teamAlignmentScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                  {teamAlignmentScore >= 70 ? 'Active' : 'At Risk'}
                </p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Health</p>
              </div>
            </div>

            {membersWithLowAlignment > 0 && (
              <p className="text-xs text-red-500 pt-2 border-t border-slate-100">
                {membersWithLowAlignment} member{membersWithLowAlignment !== 1 ? 's' : ''} below 70% alignment threshold
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
