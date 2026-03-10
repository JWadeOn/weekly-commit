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
import { useTeamDashboard, useTeamAlignment } from '@/hooks/useManager'
import type { TeamMemberResponse } from '@/types'

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

            {/* Alignment warning — shown when score falls below 70% threshold */}
            {lowAlignment && (
              <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  🚨 Alignment {alignmentScore}% — below 70% threshold
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
                  navigate(
                    `/commits/${member.currentCommit!.id}?userId=${member.userId}`
                  )
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

export function ManagerDashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { data: team, isLoading, error } = useTeamDashboard()
  const { data: alignment } = useTeamAlignment()

  type SortKey = 'name' | 'status' | 'itemCount' | 'alignment' | 'lastUpdated'
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const teamMembers: TeamMemberResponse[] = team?.teamMembers ?? []
  const sortedMembers = useMemo(() => {
    const list = [...teamMembers]
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName))
      case 'status':
        return list.sort((a, b) => {
          const sa = a.currentCommit?.status ?? ''
          const sb = b.currentCommit?.status ?? ''
          const order: Record<string, number> = { DRAFT: 0, LOCKED: 1, RECONCILING: 2, RECONCILED: 3 }
          return (order[sa] ?? -1) - (order[sb] ?? -1)
        })
      case 'itemCount':
        return list.sort(
          (a, b) => (b.currentCommit?.itemCount ?? 0) - (a.currentCommit?.itemCount ?? 0)
        )
      case 'alignment':
        return list.sort((a, b) => {
          const aa = a.currentCommit?.alignmentScore ?? -1
          const bb = b.currentCommit?.alignmentScore ?? -1
          return aa - bb
        })
      case 'lastUpdated':
        return list.sort((a, b) => {
          const ta = a.lastUpdated ?? ''
          const tb = b.lastUpdated ?? ''
          return tb.localeCompare(ta)
        })
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
  const rallyCryBreakdown = alignment?.rallyCryBreakdown ?? []

  const membersWithLowAlignment = teamMembers.filter(
    (m) => m.currentCommit?.alignmentScore !== null && (m.currentCommit?.alignmentScore ?? 100) < 70
  ).length

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Current week overview for your team
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/manager/strategy')}>
          <Target className="h-4 w-4 mr-2" />
          Open Strategy
        </Button>
      </div>
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

      {rallyCryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alignment by Rally Cry</CardTitle>
            <CardDescription className="text-xs">
              Current week — {alignment?.alignmentPercentage ?? 0}% aligned (
              {alignment?.alignedWeight ?? 0} / {alignment?.totalWeight ?? 0} weight)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {rallyCryBreakdown.map((rc) => (
                <li key={rc.rallyCryId} className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="truncate">{rc.title}</span>
                    <Badge variant="secondary" className="shrink-0 ml-2">
                      {rc.weightPercentage}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rc.supportingItemCount} items · {rc.supportingWeight} weight
                  </p>
                  {rc.contributors.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {rc.contributors.map((c) => `${c.fullName} (${c.itemCount})`).join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Distribution of Effort — Strategic vs Tactical/Whirlwind */}
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

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Sort by</p>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortKey)}
        >
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
