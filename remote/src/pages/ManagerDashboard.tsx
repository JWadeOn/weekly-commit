import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Eye, AlertTriangle, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { useTeamDashboard, useTeamAlignment, useRcdoHierarchy } from '@/hooks/useManager'
import type { TeamMemberResponse, DefiningObjectiveBreakdownDto } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function svgLines(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]
  const cut = text.lastIndexOf(' ', maxLen)
  if (cut < 0) return [text.slice(0, maxLen - 1) + '…']
  const rest = text.slice(cut + 1)
  return [text.slice(0, cut), rest.length > maxLen ? rest.slice(0, maxLen - 1) + '…' : rest]
}

function gaugeColor(pct: number): string {
  if (pct >= 25) return '#22c55e'
  if (pct >= 10) return '#3b82f6'
  return '#f97316'
}

// ── NorthStarViz ──────────────────────────────────────────────────────────────

function NorthStarViz({
  rallyCryTitle,
  definingObjectives,
  teamAlignmentPct,
}: {
  rallyCryTitle: string
  definingObjectives: DefiningObjectiveBreakdownDto[]
  teamAlignmentPct: number
}): React.ReactElement {
  const W = 700
  const STAR_CX = W / 2
  const STAR_CY = 66
  const STAR_OUTER = 28
  const STAR_INNER = 11
  const DO_R = 42
  const DO_STROKE = 8
  const BAR_Y = 192
  const DO_CY = 288

  const N = definingObjectives.length
  const colW = N > 0 ? W / (N + 1) : W / 2
  const doXAt = (i: number) => Math.round(colW * (i + 1))
  const SVG_H = N > 0 ? 378 : 210

  // Star polygon
  const starPts = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 === 0 ? STAR_OUTER : STAR_INNER
    return `${(STAR_CX + r * Math.cos(angle)).toFixed(1)},${(STAR_CY + r * Math.sin(angle)).toFixed(1)}`
  }).join(' ')

  const rcLines = svgLines(rallyCryTitle, 44)
  const lastTitleY = STAR_CY + STAR_OUTER + 18 + (rcLines.length - 1) * 18
  const alignTextY = lastTitleY + 20
  const connectorTopY = alignTextY + 14

  const gradId = `starGlow-${rallyCryTitle.slice(0, 8).replace(/\s/g, '')}`

  return (
    <svg
      viewBox={`0 0 ${W} ${SVG_H}`}
      className="w-full"
      aria-label={`North Star: ${rallyCryTitle}`}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="0%" r="65%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={SVG_H} fill={`url(#${gradId})`} rx="8" />

      {/* "NORTH STAR" label */}
      <text
        x={STAR_CX}
        y={STAR_CY - STAR_OUTER - 9}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#92400e"
        letterSpacing="3"
      >
        NORTH STAR
      </text>

      {/* Star polygon */}
      <polygon
        points={starPts}
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.5"
        filter="url(#glow)"
      />

      {/* Rally cry title */}
      {rcLines.map((line, idx) => (
        <text
          key={idx}
          x={STAR_CX}
          y={STAR_CY + STAR_OUTER + 18 + idx * 18}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#111827"
        >
          {line}
        </text>
      ))}

      {/* Team alignment % */}
      <text x={STAR_CX} y={alignTextY} textAnchor="middle" fontSize="11" fill="#6b7280">
        {teamAlignmentPct}% team aligned this week
      </text>

      {/* Tree connectors */}
      {N > 0 && (
        <>
          <line
            x1={STAR_CX}
            y1={connectorTopY}
            x2={STAR_CX}
            y2={BAR_Y}
            stroke="#d1d5db"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          {N > 1 && (
            <line
              x1={doXAt(0)}
              y1={BAR_Y}
              x2={doXAt(N - 1)}
              y2={BAR_Y}
              stroke="#d1d5db"
              strokeWidth="1.5"
            />
          )}
          {definingObjectives.map((_, i) => (
            <line
              key={i}
              x1={doXAt(i)}
              y1={BAR_Y}
              x2={doXAt(i)}
              y2={DO_CY - DO_R - 3}
              stroke="#d1d5db"
              strokeWidth="1.5"
            />
          ))}
        </>
      )}

      {/* DO circle gauges */}
      {definingObjectives.map((obj, i) => {
        const cx = doXAt(i)
        const circumference = 2 * Math.PI * DO_R
        const pct = Math.min(obj.weightPercentage, 100)
        const dashOffset = circumference * (1 - pct / 100)
        const color = pct === 0 ? '#d1d5db' : gaugeColor(pct)
        const doTitleLines = svgLines(obj.title, 18)

        return (
          <g key={obj.definingObjectiveId}>
            <circle cx={cx} cy={DO_CY} r={DO_R} fill="white" />
            <circle
              cx={cx}
              cy={DO_CY}
              r={DO_R}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={DO_STROKE}
            />
            <circle
              cx={cx}
              cy={DO_CY}
              r={DO_R}
              fill="none"
              stroke={color}
              strokeWidth={DO_STROKE}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${dashOffset}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${DO_CY})`}
            />
            <text
              x={cx}
              y={DO_CY - 5}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill={color}
            >
              {pct}%
            </text>
            <text x={cx} y={DO_CY + 13} textAnchor="middle" fontSize="9.5" fill="#9ca3af">
              {obj.supportingItemCount} item{obj.supportingItemCount !== 1 ? 's' : ''}
            </text>
            {doTitleLines.map((line, idx) => (
              <text
                key={idx}
                x={cx}
                y={DO_CY + DO_R + 17 + idx * 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#374151"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── AlignmentTrend ────────────────────────────────────────────────────────────

function AlignmentTrend({ trend }: { trend?: number[] }): React.ReactElement {
  const t = trend ?? []
  if (t.length < 2) return <span className="text-xs text-muted-foreground">—</span>
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
      <span className="text-xs text-red-600 flex items-center gap-0.5">
        <TrendingDown className="h-3 w-3" />
        {diff}
      </span>
    )
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
      <Minus className="h-3 w-3" />0
    </span>
  )
}

// ── TeamMemberCard ────────────────────────────────────────────────────────────

function TeamMemberCard({ member }: { member: TeamMemberResponse }): React.ReactElement {
  const navigate = useNavigate()
  const alignmentScore = member.currentCommit?.alignmentScore ?? null
  const lowAlignment = alignmentScore !== null && alignmentScore < 70

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{member.fullName}</CardTitle>
            <CardDescription className="text-xs">{member.email}</CardDescription>
          </div>
          <AlignmentTrend trend={member.alignmentTrend} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {member.currentCommit ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <StatusBadge status={member.currentCommit.status} />
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>{member.currentCommit.itemCount} items</span>
                <span>·</span>
                <span>wt {member.currentCommit.totalWeight}</span>
                {alignmentScore !== null && (
                  <>
                    <span>·</span>
                    <span>{alignmentScore}% aligned</span>
                  </>
                )}
              </div>
            </div>

            {lowAlignment && (
              <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  Alignment {alignmentScore}% — below 70% threshold
                </span>
              </div>
            )}

            {member.currentCommit.hasObjectiveDecay && (
              <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700">
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

            {(member.currentCommit.status === 'LOCKED' ||
              member.currentCommit.status === 'RECONCILING' ||
              member.currentCommit.status === 'RECONCILED') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() =>
                  navigate(`/commits/${member.currentCommit!.id}?userId=${member.userId}`)
                }
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                {member.currentCommit.viewedAt ? 'Review Again' : 'View Commit'}
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No commit this week</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── ManagerDashboard ──────────────────────────────────────────────────────────

export function ManagerDashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { data: team, isLoading, error } = useTeamDashboard()
  const { data: alignment } = useTeamAlignment()
  const { data: rcdo } = useRcdoHierarchy()

  type SortKey = 'name' | 'status' | 'itemCount' | 'alignment' | 'lastUpdated'
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const teamMembers: TeamMemberResponse[] = team?.teamMembers ?? []

  // Build the north-star data: one entry per active rally cry, with ALL active DOs
  // under it — merging RCDO hierarchy (complete) with alignment weights (partial).
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
            }
          }),
      }))
  }, [rcdo, alignment])

  const sortedMembers = useMemo(() => {
    const list = [...teamMembers]
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName))
      case 'status':
        return list.sort((a, b) => {
          const order: Record<string, number> = {
            DRAFT: 0,
            LOCKED: 1,
            RECONCILING: 2,
            RECONCILED: 3,
          }
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading team...</div>
  if (error) return <div className="p-8 text-center text-destructive">Failed to load team</div>
  if (!team) return <div className="p-8 text-center">No team data</div>

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
    (m) =>
      m.currentCommit?.alignmentScore !== null &&
      (m.currentCommit?.alignmentScore ?? 100) < 70,
  ).length

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Current week overview for your team
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => navigate('/manager/strategy')}
        >
          <Target className="h-4 w-4 mr-2" />
          Open Strategy
        </Button>
      </div>

      {/* Team alignment score */}
      <div className="flex items-center justify-between">
        <div />
        <div className="text-right">
          <p
            className={`text-3xl font-bold ${teamAlignmentScore < 70 ? 'text-red-600' : 'text-foreground'}`}
          >
            {teamAlignmentScore}%
          </p>
          <p className="text-xs text-muted-foreground">Team Alignment</p>
          {membersWithLowAlignment > 0 && (
            <p className="text-xs text-red-600 mt-0.5">
              {membersWithLowAlignment} member{membersWithLowAlignment !== 1 ? 's' : ''} below
              threshold
            </p>
          )}
        </div>
      </div>

      {/* Under-supported alert */}
      {underSupportedRallyCries.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-800">Under-Supported Rally Cries</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {underSupportedRallyCries.map((rc) => (
                <li key={rc.id} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-900 truncate mr-2">{rc.title}</span>
                  <Badge variant="warning" className="shrink-0">
                    {rc.supportPercentage}%
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* North Star visualization — one card per active Rally Cry */}
      {northStarData.map((rc) => (
        <Card key={rc.rallyCryId} className="overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Strategic Alignment</CardTitle>
            <CardDescription className="text-xs">
              Current week — {alignment?.alignmentPercentage ?? 0}% aligned (
              {alignment?.alignedWeight ?? 0} / {alignment?.totalWeight ?? 0} weight)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <NorthStarViz
              rallyCryTitle={rc.rallyCryTitle}
              definingObjectives={rc.definingObjectives}
              teamAlignmentPct={alignment?.alignmentPercentage ?? 0}
            />
          </CardContent>
        </Card>
      ))}

      {/* Distribution of Effort */}
      {alignment && alignment.totalWeight > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution of Effort</CardTitle>
            <CardDescription className="text-xs">
              Strategic ♔/♕/♖ vs Tactical/Whirlwind ♗/♘/♙ — current week team total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alignment.strategicPercentage < 20 && (
              <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-2 text-xs text-orange-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  Strategic Drift — only {alignment.strategicPercentage}% of effort is strategic
                  (King/Queen/Rook). Team may be drowning in Whirlwind.
                </span>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Strategic ♔/♕/♖</span>
                <span className="font-medium">{alignment.strategicPercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${alignment.strategicPercentage < 20 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${alignment.strategicPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tactical/Whirlwind ♗/♘/♙</span>
                <span className="font-medium">{100 - alignment.strategicPercentage}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Strategic weight: {alignment.strategicWeight} · Tactical weight:{' '}
              {alignment.tacticalWeight} · Total: {alignment.totalWeight}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Team member cards */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Sort by</p>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-44">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {sortedMembers.map((member) => (
          <TeamMemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  )
}
