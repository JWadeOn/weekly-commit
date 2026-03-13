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
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'
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

const POWER_MULTIPLIER: Record<ChessPiece, string> = {
  KING: 'King Move: 20x Impact',
  QUEEN: 'Queen Move: 10x Impact',
  ROOK: 'Rook Move: 5x Impact',
  BISHOP: 'Bishop Move: 3x Impact',
  KNIGHT: 'Knight Move: 3x Impact',
  PAWN: 'Pawn Move: 1x Impact',
}

const STRATEGIC_GLOW: Partial<Record<ChessPiece, React.CSSProperties>> = {
  KING: { boxShadow: '0 0 0 1px rgba(212,175,55,0.5), 0 0 28px rgba(212,175,55,0.25)' },
  QUEEN: { boxShadow: '0 0 0 1px rgba(124,58,237,0.4), 0 0 28px rgba(124,58,237,0.2)' },
}

function findDoIdForOutcome(rcdo: RcDoHierarchyResponse | undefined, outcomeId: string): string {
  if (!rcdo || !outcomeId) return ''
  for (const rc of rcdo.rallyCries) {
    for (const do_ of rc.definingObjectives) {
      if (do_.outcomes.some((o) => o.id === outcomeId)) return do_.id
    }
  }
  return ''
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
  const [selectedDoId, setSelectedDoId] = useState('')
  const [outcomeId, setOutcomeId] = useState(editItem?.outcomeId ?? '')
  const [chessPiece, setChessPiece] = useState<ChessPiece>(editItem?.chessPiece ?? 'PAWN')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rc = rcdo?.rallyCries?.[0]
  const definingObjectives = rc?.definingObjectives ?? []
  const selectedDo = useMemo(
    () => definingObjectives.find((d) => d.id === selectedDoId) ?? null,
    [definingObjectives, selectedDoId]
  )
  const outcomes = selectedDo?.outcomes ?? []

  // Reset form when opening; derive DO from editItem outcome if editing
  React.useEffect(() => {
    if (open) {
      const initialOutcomeId = editItem?.outcomeId ?? ''
      setTitle(editItem?.title ?? '')
      setDescription(editItem?.description ?? '')
      setOutcomeId(initialOutcomeId)
      setSelectedDoId(findDoIdForOutcome(rcdo, initialOutcomeId))
      setChessPiece(editItem?.chessPiece ?? 'PAWN')
      setError(null)
    }
  }, [open, editItem, rcdo])

  const handleSelectDo = (doId: string): void => {
    setSelectedDoId(doId)
    setOutcomeId('')
  }

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

  const glowStyle = STRATEGIC_GLOW[chessPiece] ?? {}

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg transition-shadow duration-300" style={glowStyle}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-[#1e293b]">
            {editItem ? 'Edit Commit Item' : 'Add Commit Item'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Pick a Defining Objective */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aligned Outcome</span>
              <span className="text-[10px] font-bold text-[#1152d4] uppercase">(Mandatory)</span>
            </div>
            {rc && (
              <p className="text-xs text-slate-500">{rc.title}</p>
            )}
            {!rcdo && (
              <p className="text-sm text-slate-400">Loading...</p>
            )}
            {rcdo && definingObjectives.length === 0 && (
              <p className="text-sm text-slate-400">No defining objectives available.</p>
            )}
            {definingObjectives.length > 0 && (
              <div className="grid gap-1.5">
                {definingObjectives.map((do_) => {
                  const selected = selectedDoId === do_.id
                  return (
                    <button
                      key={do_.id}
                      type="button"
                      onClick={() => handleSelectDo(do_.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors flex items-start gap-2.5 ${
                        selected
                          ? 'bg-[#1152d4]/8 border-[#1152d4]/40 ring-1 ring-[#1152d4]/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? 'bg-[#1152d4] border-[#1152d4] text-white'
                            : 'border-slate-300'
                        }`}
                        aria-hidden
                      >
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-snug break-words">{do_.title}</p>
                        {do_.description && (
                          <p className="text-xs text-slate-400 mt-0.5 break-words">
                            {do_.description}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 2: Pick an Outcome within the selected DO */}
          {selectedDoId && (
            <div className="space-y-1.5 ml-2 pl-2 border-l-2 border-[#1152d4]/20">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Outcome</Label>
              {outcomes.length === 0 ? (
                <p className="text-sm text-slate-400">No outcomes defined for this objective.</p>
              ) : (
                <div className="grid gap-1">
                  {outcomes.map((o) => {
                    const selected = outcomeId === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOutcomeId(o.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors flex items-center gap-2.5 ${
                          selected
                            ? 'bg-[#1152d4]/8 border-[#1152d4]/40 ring-1 ring-[#1152d4]/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                            selected
                              ? 'bg-[#1152d4] border-[#1152d4] text-white'
                              : 'border-slate-300'
                          }`}
                          aria-hidden
                        >
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="font-medium break-words">{o.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Commit Description</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you deliver this week?"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chess Move</Label>
            <Select value={chessPiece} onValueChange={(v) => setChessPiece(v as ChessPiece)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHESS_PIECES.map((piece) => (
                  <SelectItem key={piece} value={piece} title={CHESS_DESCRIPTION[piece]}>
                    <span className="flex items-center gap-2">
                      <span>{CHESS_ICON[piece]}</span>
                      <span>{piece.charAt(0) + piece.slice(1).toLowerCase()}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Power Multiplier preview */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all duration-200"
              style={
                chessPiece === 'KING'
                  ? { borderColor: 'rgba(212,175,55,0.5)', backgroundColor: 'rgba(212,175,55,0.07)', color: '#7a5c00' }
                  : chessPiece === 'QUEEN'
                  ? { borderColor: 'rgba(124,58,237,0.4)', backgroundColor: 'rgba(124,58,237,0.06)', color: '#5b21b6' }
                  : { borderColor: '#e2e8f0', backgroundColor: '#f8faff', color: '#64748b' }
              }
            >
              <span>{POWER_MULTIPLIER[chessPiece]}</span>
              <span className="font-black text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ×{CHESS_WEIGHT[chessPiece]}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{CHESS_DESCRIPTION[chessPiece]}</p>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !outcomeId}
            className="bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold"
          >
            {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
