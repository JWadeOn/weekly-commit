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
import { useRcdo } from '@/hooks/useRcdo'
import { CHESS_ICON } from '@/types'
import type { ChessPiece, CreateCommitItemRequest, CommitItemResponse } from '@/types'
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
  const [outcomeSearch, setOutcomeSearch] = useState('')
  const [chessPiece, setChessPiece] = useState<ChessPiece>(editItem?.chessPiece ?? 'PAWN')
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

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setTitle(editItem?.title ?? '')
      setDescription(editItem?.description ?? '')
      setOutcomeId(editItem?.outcomeId ?? '')
      setOutcomeSearch('')
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
                  <SelectItem
                    key={piece}
                    value={piece}
                    title={CHESS_DESCRIPTION[piece]}
                  >
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
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {!rcdo && (
                <p className="p-3 text-sm text-muted-foreground">Loading outcomes...</p>
              )}
              {rcdo && filteredOutcomes.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  {outcomeSearch.trim() ? 'No outcomes match your search.' : 'No outcomes available.'}
                </p>
              )}
              {rcdo && filteredOutcomes.length > 0 && (
                <ul className="p-1">
                  {filteredOutcomes.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => setOutcomeId(o.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent transition-colors ${
                          outcomeId === o.id ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        <span className="block truncate">{o.title}</span>
                        <span className="block text-xs text-muted-foreground truncate">{o.breadcrumb}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {rcdo && outcomeId && (
              <p className="text-xs text-muted-foreground">
                {allOutcomes.find((o) => o.id === outcomeId)?.breadcrumb ?? ''}
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
