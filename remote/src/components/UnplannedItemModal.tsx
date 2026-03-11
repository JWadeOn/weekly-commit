import React, { useState, useMemo } from 'react'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check } from 'lucide-react'
import { useRcdo } from '@/hooks/useRcdo'
import { CHESS_ICON } from '@/types'
import type { ChessPiece, CreateUnplannedItemRequest, CommitItemResponse } from '@/types'
import type { RcDoHierarchyResponse } from '@/types'

const CHESS_PIECES: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

const CHESS_DESCRIPTION: Record<ChessPiece, string> = {
  KING: 'Critical — the week fails without this.',
  QUEEN: 'Very high — major impact if missed.',
  ROOK: 'High — important for the week.',
  BISHOP: 'Medium — meaningful progress.',
  KNIGHT: 'Lower — good to have.',
  PAWN: 'Lowest — small but valuable.',
}

function flattenOutcomes(rcdo: RcDoHierarchyResponse | undefined): { id: string; title: string; breadcrumb: string }[] {
  if (!rcdo) return []
  const out: { id: string; title: string; breadcrumb: string }[] = []
  for (const rc of rcdo.rallyCries) {
    for (const do_ of rc.definingObjectives) {
      for (const outcome of do_.outcomes) {
        out.push({
          id: outcome.id,
          title: outcome.title,
          breadcrumb: `${rc.title} › ${do_.title}`,
        })
      }
    }
  }
  return out
}

interface UnplannedItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (item: CreateUnplannedItemRequest) => Promise<unknown>
  /** Current commit items (non-unplanned only) to choose which one is being bumped */
  bumpableItems: CommitItemResponse[]
}

export function UnplannedItemModal({
  open,
  onClose,
  onSubmit,
  bumpableItems,
}: UnplannedItemModalProps): React.ReactElement {
  const { data: rcdo } = useRcdo()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [outcomeId, setOutcomeId] = useState('')
  const [outcomeSearch, setOutcomeSearch] = useState('')
  const [chessPiece, setChessPiece] = useState<ChessPiece>('PAWN')
  const [bumpedItemId, setBumpedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allOutcomes = useMemo(() => flattenOutcomes(rcdo), [rcdo])
  const filteredOutcomes = useMemo(() => {
    const q = outcomeSearch.trim().toLowerCase()
    if (!q) return allOutcomes
    return allOutcomes.filter(
      (o) =>
        o.title.toLowerCase().includes(q) || o.breadcrumb.toLowerCase().includes(q)
    )
  }, [allOutcomes, outcomeSearch])

  React.useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setOutcomeId('')
      setOutcomeSearch('')
      setChessPiece('PAWN')
      setBumpedItemId(bumpableItems.length > 0 ? bumpableItems[0]?.id ?? '' : '')
      setError(null)
    }
  }, [open, bumpableItems])

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!outcomeId) {
      setError('Outcome is required')
      return
    }
    if (!bumpedItemId) {
      setError('You must select which Monday commit item you are bumping to make room.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        outcomeId,
        chessPiece,
        bumpedItemId,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add unplanned item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add unplanned item (Strategic pivot)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adding an unplanned item means you are making room by bumping one of your Monday commitments. Select which item you are bumping below.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-title">Title</Label>
            <Input
              id="unplanned-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What unplanned item are you adding?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unplanned-desc">Description (optional)</Label>
            <Textarea
              id="unplanned-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this needed mid-week?"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Which Monday commit are you bumping? <span className="text-destructive">*</span></Label>
            <Select value={bumpedItemId} onValueChange={setBumpedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item to bump..." />
              </SelectTrigger>
              <SelectContent>
                {bumpableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex items-center gap-2">
                      <span>{CHESS_ICON[item.chessPiece]}</span>
                      <span className="truncate">{item.title}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bumpableItems.length === 0 && (
              <p className="text-xs text-muted-foreground">No bumpable items in this commit.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Chess Piece Priority</Label>
            <Select value={chessPiece} onValueChange={(v) => setChessPiece(v as ChessPiece)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHESS_PIECES.map((piece) => (
                  <SelectItem key={piece} value={piece} title={CHESS_DESCRIPTION[piece]}>
                    <span className="flex flex-col items-start gap-0.5">
                      <span>{CHESS_ICON[piece]} {piece}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {CHESS_DESCRIPTION[piece]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Outcome (RCDO)</Label>
            <Input
              placeholder="Search outcomes..."
              value={outcomeSearch}
              onChange={(e) => setOutcomeSearch(e.target.value)}
              className="mb-1"
            />
            <div className="border rounded-md max-h-40 overflow-y-auto pr-2">
              {!rcdo && (
                <p className="p-3 text-sm text-muted-foreground">Loading outcomes...</p>
              )}
              {rcdo && filteredOutcomes.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  {outcomeSearch.trim() ? 'No outcomes match.' : 'No outcomes available.'}
                </p>
              )}
              {rcdo && filteredOutcomes.length > 0 && (
                <ul className="p-1 pr-2">
                  {filteredOutcomes.map((o) => {
                    const selected = outcomeId === o.id
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setOutcomeId(o.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-start gap-2 ${
                            selected
                              ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                              : 'hover:bg-accent border border-transparent'
                          }`}
                        >
                          <span
                            className={`mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border ${
                              selected ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/40'
                            }`}
                            aria-hidden
                          >
                            {selected ? <Check className="h-2.5 w-2.5" /> : null}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium break-words">{o.title}</span>
                            <span className="block text-xs text-muted-foreground break-words mt-0.5">{o.breadcrumb}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || bumpableItems.length === 0}>
            {submitting ? 'Adding...' : 'Add unplanned item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
