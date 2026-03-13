import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { VerificationType } from '@/types'
import { VERIFICATION_LABELS } from '@/types'

const MIN_ACTION_LENGTH = 20

interface ProofModalProps {
  open: boolean
  onClose: () => void
  outcomeTitle: string
  oldValue: number | null
  newValue: number
  unit: string
  onConfirm: (actionTaken: string, verificationType: VerificationType) => Promise<void>
  isPending: boolean
}

export function ProofModal({
  open,
  onClose,
  outcomeTitle,
  oldValue,
  newValue,
  unit,
  onConfirm,
  isPending,
}: ProofModalProps): React.ReactElement {
  const [actionTaken, setActionTaken] = useState('')
  const [verificationType, setVerificationType] = useState<VerificationType>('DASHBOARD')

  useEffect(() => {
    if (open) {
      setActionTaken('')
      setVerificationType('DASHBOARD')
    }
  }, [open])

  const charCount = actionTaken.trim().length
  const isValid = charCount >= MIN_ACTION_LENGTH

  const handleConfirm = async () => {
    if (!isValid || isPending) return
    await onConfirm(actionTaken.trim(), verificationType)
  }

  const delta = oldValue != null ? newValue - oldValue : null
  const deltaStr = delta != null
    ? `${delta >= 0 ? '+' : ''}${delta}${unit}`
    : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-base">🔬</span>
            Proof of Progress
          </DialogTitle>
          <div className="space-y-0.5 pt-1">
            <p className="text-sm font-semibold text-slate-700 truncate">{outcomeTitle}</p>
            <p className="text-xs text-slate-400">
              {oldValue != null ? `${oldValue}${unit}` : '—'}
              {' → '}
              <span className="font-bold text-slate-700">{newValue}{unit}</span>
              {deltaStr && (
                <span className={`ml-1.5 font-bold ${delta! >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ({deltaStr})
                </span>
              )}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Action Taken */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="action-taken" className="font-semibold">
                The Method <span className="text-red-500">*</span>
              </Label>
              <span
                className={`text-[11px] font-bold tabular-nums transition-colors ${
                  charCount === 0
                    ? 'text-slate-400'
                    : charCount < MIN_ACTION_LENGTH
                    ? 'text-red-500'
                    : 'text-green-600'
                }`}
              >
                {charCount} / {MIN_ACTION_LENGTH}
                {charCount >= MIN_ACTION_LENGTH && ' ✓'}
              </span>
            </div>
            <Textarea
              id="action-taken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              rows={3}
              placeholder="Describe what was actually done — e.g. 'Rewrote the query planner to use a covering index, eliminating 3 sequential scans per request.'"
              className={`resize-none transition-colors ${
                actionTaken.length > 0 && !isValid
                  ? 'border-red-300 focus-visible:ring-red-400/40'
                  : isValid
                  ? 'border-green-300 focus-visible:ring-green-400/40'
                  : ''
              }`}
            />
            {actionTaken.length > 0 && !isValid && (
              <p className="text-[11px] text-red-500 mt-1">
                Needs {MIN_ACTION_LENGTH - charCount} more character{MIN_ACTION_LENGTH - charCount !== 1 ? 's' : ''} — "done" isn't a method.
              </p>
            )}
          </div>

          {/* Verification Type */}
          <div>
            <Label htmlFor="verification-type" className="font-semibold mb-1.5 block">
              The Proof <span className="text-red-500">*</span>
            </Label>
            <Select value={verificationType} onValueChange={(v) => setVerificationType(v as VerificationType)}>
              <SelectTrigger id="verification-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(VERIFICATION_LABELS) as [VerificationType, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400 mt-1">
              Engineering success must be backed by data, not "feeling" faster.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!isValid || isPending}
            className="bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold"
          >
            {isPending ? 'Saving…' : 'Confirm Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
