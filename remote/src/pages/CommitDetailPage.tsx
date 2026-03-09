import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/StatusBadge'
import { CommitItem } from '@/components/CommitItem'
import { useManagerCommit, useManagerNotes, useAddNote } from '@/hooks/useManager'
import { formatWeekRange, formatDateTime } from '@/utils/formatDate'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'
import type { ChessPiece, CommitItemResponse } from '@/types'

const CHESS_PIECE_ORDER: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

export function CommitDetailPage(): React.ReactElement {
  const { id: commitId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId') ?? ''

  const { data: commit, isLoading } = useManagerCommit(userId, commitId ?? '')
  const { data: notes } = useManagerNotes(userId, commitId ?? '')
  const addNote = useAddNote()

  const [noteText, setNoteText] = useState('')

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!commit) return <div className="p-8 text-center">Commit not found</div>

  const itemsByPiece = CHESS_PIECE_ORDER.reduce<Record<ChessPiece, CommitItemResponse[]>>(
    (acc, piece) => {
      acc[piece] = commit.items.filter(i => i.chessPiece === piece).sort((a, b) => a.priorityOrder - b.priorityOrder)
      return acc
    },
    {} as Record<ChessPiece, CommitItemResponse[]>
  )

  const handleAddNote = (): void => {
    if (!noteText.trim() || !commitId) return
    addNote.mutate(
      { commitId, userId, note: noteText.trim() },
      { onSuccess: () => setNoteText('') }
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commit Review</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={commit.status} />
          {commit.totalWeight > 0 && (
            <Badge variant="outline" className="text-xs">
              Weight: {commit.totalWeight}
            </Badge>
          )}
          {commit.alignmentScore !== null && (
            <Badge variant="info" className="text-xs">
              Alignment: {commit.alignmentScore}%
            </Badge>
          )}
        </div>
      </div>

      {/* Items */}
      {CHESS_PIECE_ORDER.map((piece) => {
        const items = itemsByPiece[piece]
        if (items.length === 0) return null
        return (
          <div key={piece} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="text-base">{CHESS_ICON[piece]}</span>
              <span>{piece}</span>
              <span className="text-xs font-normal">— wt {CHESS_WEIGHT[piece]}</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <CommitItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )
      })}

      <Separator />

      {/* Manager Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manager Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{note.authorName}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{note.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}

          <div className="space-y-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note for the employee..."
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!noteText.trim() || addNote.isPending}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
