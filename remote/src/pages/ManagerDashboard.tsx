import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/StatusBadge'
import { useTeamDashboard } from '@/hooks/useManager'
import type { TeamMemberResponse } from '@/types'

function AlignmentTrend({ trend }: { trend: number[] }): React.ReactElement {
  if (trend.length < 2) return <span className="text-xs text-muted-foreground">—</span>
  const last = trend[trend.length - 1] ?? 0
  const prev = trend[trend.length - 2] ?? 0
  const diff = last - prev
  if (diff > 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{diff}</span>
  if (diff < 0) return <span className="text-xs text-red-600 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{diff}</span>
  return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>
}

function TeamMemberCard({ member }: { member: TeamMemberResponse }): React.ReactElement {
  const navigate = useNavigate()

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
                {member.currentCommit.alignmentScore !== null && (
                  <>
                    <span>·</span>
                    <span>{member.currentCommit.alignmentScore}% aligned</span>
                  </>
                )}
              </div>
            </div>

            {member.currentCommit.hasCarriedForwardItems && (
              <Badge variant="warning" className="text-xs">Has carried forward items</Badge>
            )}

            {(member.currentCommit.status === 'LOCKED' || member.currentCommit.status === 'RECONCILING' || member.currentCommit.status === 'RECONCILED') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/commits/${member.currentCommit!.id}?userId=${member.userId}`)}
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
  const { data: team, isLoading, error } = useTeamDashboard()

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading team...</div>
  if (error) return <div className="p-8 text-center text-destructive">Failed to load team</div>
  if (!team) return <div className="p-8 text-center">No team data</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Current week overview for your team
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{team.teamAlignmentScore}%</p>
          <p className="text-xs text-muted-foreground">Team Alignment</p>
        </div>
      </div>

      {team.underSupportedRallyCries.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-800">Under-Supported Rally Cries</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {team.underSupportedRallyCries.map((rc) => (
                <li key={rc.id} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-900 truncate mr-2">{rc.title}</span>
                  <Badge variant="warning" className="shrink-0">{rc.supportPercentage}%</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        {team.teamMembers.map((member) => (
          <TeamMemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  )
}
