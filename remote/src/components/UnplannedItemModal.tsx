import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
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
import { Check, Lock } from 'lucide-react'
import { useRcdo } from '@/hooks/useRcdo'
import { CHESS_ICON } from '@/types'
import type { ChessPiece, CreateUnplannedItemRequest, CommitItemResponse } from '@/types'

const CHESS_PIECES: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

const CHESS_DESCRIPTION: Record<ChessPiece, string> = {
  KING: 'Critical — the week fails without this.',
  QUEEN: 'Very high — major impact if missed.',
  ROOK: 'High — important for the week.',
  BISHOP: 'Medium — meaningful progress.',
  KNIGHT: 'Lower — good to have.',
  PAWN: 'Lowest — small but valuable.',
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
  const [selectedDoId, setSelectedDoId] = useState('')
  const [outcomeId, setOutcomeId] = useState('')
  const [chessPiece, setChessPiece] = useState<ChessPiece>('PAWN')
  const [bumpedItemId, setBumpedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rc = rcdo?.rallyCries?.[0]
  const definingObjectives = rc?.definingObjectives ?? []
  const selectedDo = useMemo(
    () => definingObjectives.find((d) => d.id === selectedDoId) ?? null,
    [definingObjectives, selectedDoId]
  )
  const outcomes = selectedDo?.outcomes ?? []

  React.useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setSelectedDoId('')
      setOutcomeId('')
      setChessPiece('PAWN')
      setBumpedItemId(bumpableItems.length > 0 ? bumpableItems[0]?.id ?? '' : '')
      setError(null)
    }
  }, [open, bumpableItems])

  const handleSelectDo = (doId: string): void => {
    setSelectedDoId(doId)
    setOutcomeId('')
  }

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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#1e293b] leading-tight">Mid-Week Pivot Detected</h2>
              <p className="text-sm text-slate-500 mt-1">Adding tasks mid-week requires resource recalibration.</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter rounded shrink-0">
              Unplanned Entry
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* New commitment form */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">The New Commitment</p>
            <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-lg">{CHESS_ICON[chessPiece]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What unplanned item are you adding?"
                    className="border-0 bg-transparent p-0 h-auto text-sm font-semibold text-[#1e293b] focus-visible:ring-0 placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-500 mt-0.5">Chess Move: {chessPiece.charAt(0) + chessPiece.slice(1).toLowerCase()} ({CHESS_DESCRIPTION[chessPiece].split(' — ')[0]})</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                  ▌▌▌ Resource Impact: High
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Why is this needed? (optional)</Label>
            <Textarea
              id="unplanned-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context for the mid-week pivot..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Chess piece */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chess Move</Label>
            <Select value={chessPiece} onValueChange={(v) => setChessPiece(v as ChessPiece)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHESS_PIECES.map((piece) => (
                  <SelectItem key={piece} value={piece}>
                    <span className="flex items-center gap-2">
                      <span>{CHESS_ICON[piece]}</span>
                      <span>{piece.charAt(0) + piece.slice(1).toLowerCase()}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DO + Outcome selection */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aligned Outcome (Mandatory)</Label>
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
                      <span className={`mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                        selected ? 'bg-[#1152d4] border-[#1152d4] text-white' : 'border-slate-300'
                      }`} aria-hidden>
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="font-medium leading-snug break-words">{do_.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {selectedDoId && outcomes.length > 0 && (
              <div className="grid gap-1 ml-2 pl-2 border-l-2 border-[#1152d4]/20">
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
                      <span className={`shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                        selected ? 'bg-[#1152d4] border-[#1152d4] text-white' : 'border-slate-300'
                      }`} aria-hidden>
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="font-medium break-words">{o.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bump selection */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">
              Which planned task is being displaced (bumped)?
            </p>
            <p className="text-xs text-slate-400 italic mb-3">Mandatory selection to maintain velocity</p>
            {bumpableItems.length === 0 ? (
              <p className="text-sm text-slate-400">No bumpable items in this commit.</p>
            ) : (
              <div className="space-y-2">
                {bumpableItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      bumpedItemId === item.id
                        ? 'border-[#1152d4]/40 bg-[#1152d4]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bumped-item"
                      value={item.id}
                      checked={bumpedItemId === item.id}
                      onChange={() => setBumpedItemId(item.id)}
                      className="shrink-0 accent-[#1152d4]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1e293b] truncate">{item.title}</p>
                      <p className="text-xs text-slate-400">Chess Move: {CHESS_ICON[item.chessPiece]} {item.chessPiece.charAt(0) + item.chessPiece.slice(1).toLowerCase()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        {/* Dark footer */}
        <div className="bg-[#0f172a] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="h-4 w-4 shrink-0" />
            <span className="text-xs italic">&ldquo;A promise made is a debt unpaid.&rdquo;</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || bumpableItems.length === 0 || !outcomeId || !title.trim()}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1152d4] hover:bg-[#1152d4]/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-[#1152d4]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Confirm Commitment & Lock'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
