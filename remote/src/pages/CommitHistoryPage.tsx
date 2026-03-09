import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { useCommitHistory } from '@/hooks/useCurrentCommit'
import { formatWeekRange } from '@/utils/formatDate'

export function CommitHistoryPage(): React.ReactElement {
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const { data, isLoading, error } = useCommitHistory(page)

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading history...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Failed to load commit history</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commit History</h1>
          <p className="text-sm text-muted-foreground mt-1">Your past weekly commits</p>
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">{data.totalElements} weeks</p>
        )}
      </div>

      {(!data || data.content.length === 0) ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No past commits yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Completed weeks will appear here after reconciliation.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((commit) => (
              <Card
                key={commit.id}
                className="hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/commits/${commit.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <p className="font-medium text-sm">
                        {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={commit.status} />
                        {commit.totalWeight > 0 && (
                          <Badge variant="outline" className="text-xs">
                            wt {commit.totalWeight}
                          </Badge>
                        )}
                        {commit.alignmentScore !== null && (
                          <Badge
                            variant={commit.alignmentScore >= 70 ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {commit.alignmentScore}% aligned
                          </Badge>
                        )}
                      </div>
                    </div>

                    {commit.status === 'RECONCILED' && (
                      <div className="text-right text-xs space-y-0.5 shrink-0">
                        <p className="text-green-700 font-medium">{commit.completedCount} done</p>
                        {commit.partialCount > 0 && (
                          <p className="text-yellow-700">{commit.partialCount} partial</p>
                        )}
                        {commit.notCompletedCount > 0 && (
                          <p className="text-red-700">{commit.notCompletedCount} not done</p>
                        )}
                        {commit.carriedForwardCount > 0 && (
                          <p className="text-blue-700">{commit.carriedForwardCount} carried fwd</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
