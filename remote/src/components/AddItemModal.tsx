import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRcdo } from '@/hooks/useRcdo'
import { CHESS_ICON } from '@/types'
import type { ChessPiece, CreateCommitItemRequest, CommitItemResponse } from '@/types'

const CHESS_PIECES: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (item: CreateCommitItemRequest) => Promise<unknown>
  editItem?: CommitItemResponse | null
  onUpdate?: (item: { title: string; description?: string; outcomeId: string; chessPiece: ChessPiece }) => Promise<unknown>
}

export function AddItemModal({ open, onClose, onSubmit, editItem, onUpdate }: AddItemModalProps): React.ReactElement {
  const { data: rcdo } = useRcdo()
  const [title, setTitle] = useState(editItem?.title ?? '')
  const [description, setDescription] = useState(editItem?.description ?? '')
  const [outcomeId, setOutcomeId] = useState(editItem?.outcomeId ?? '')
  const [chessPiece, setChessPiece] = useState<ChessPiece>(editItem?.chessPiece ?? 'PAWN')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setTitle(editItem?.title ?? '')
      setDescription(editItem?.description ?? '')
      setOutcomeId(editItem?.outcomeId ?? '')
      setChessPiece(editItem?.chessPiece ?? 'PAWN')
      setError(null)
    }
  }, [open, editItem])

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!outcomeId) { setError('Outcome is required'); return }

    setSubmitting(true)
    setError(null)
    try {
      if (editItem && onUpdate) {
        await onUpdate({ title: title.trim(), description: description.trim() || undefined, outcomeId, chessPiece })
      } else {
        await onSubmit({ title: title.trim(), description: description.trim() || undefined, outcomeId, chessPiece })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Item' : 'Add Commit Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you accomplish this week?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Chess Piece Priority</Label>
            <Select value={chessPiece} onValueChange={(v) => setChessPiece(v as ChessPiece)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHESS_PIECES.map((piece) => (
                  <SelectItem key={piece} value={piece}>
                    {CHESS_ICON[piece]} {piece}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Outcome (RCDO)</Label>
            <Select value={outcomeId} onValueChange={setOutcomeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an outcome..." />
              </SelectTrigger>
              <SelectContent>
                {rcdo?.rallyCries.map((rc) =>
                  rc.definingObjectives.map((do_) =>
                    do_.outcomes.map((outcome) => (
                      <SelectItem key={outcome.id} value={outcome.id}>
                        {outcome.title}
                      </SelectItem>
                    ))
                  )
                )}
                {!rcdo && (
                  <SelectGroup>
                    <SelectLabel>Loading...</SelectLabel>
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {rcdo && outcomeId && (
              <p className="text-xs text-muted-foreground">
                {(() => {
                  for (const rc of rcdo.rallyCries) {
                    for (const do_ of rc.definingObjectives) {
                      for (const outcome of do_.outcomes) {
                        if (outcome.id === outcomeId) {
                          return `${rc.title} › ${do_.title}`
                        }
                      }
                    }
                  }
                  return null
                })()}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
