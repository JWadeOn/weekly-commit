import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOutcomeHistory } from '@/hooks/useRcdoAdmin'
import { VERIFICATION_LABELS } from '@/types'
import type { VerificationType } from '@/types'

interface OutcomeHistoryDrawerProps {
  open: boolean
  onClose: () => void
  outcomeId: string | null
  outcomeTitle: string
  unit: string
}

const VERIFICATION_ICONS: Record<VerificationType, string> = {
  LOAD_TEST: '⚡',
  QA: '✅',
  PEER_REVIEW: '👥',
  DASHBOARD: '📊',
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OutcomeHistoryDrawer({
  open,
  onClose,
  outcomeId,
  outcomeTitle,
  unit,
}: OutcomeHistoryDrawerProps): React.ReactElement {
  const { data: history, isLoading } = useOutcomeHistory(open ? outcomeId : null)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-base">📜</span>
            Ledger of Execution
          </DialogTitle>
          <p className="text-sm text-slate-500 truncate">{outcomeTitle}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isLoading && (
            <p className="text-sm text-slate-400 text-center py-8">Loading history…</p>
          )}

          {!isLoading && (!history || history.length === 0) && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-semibold text-slate-600">No updates yet</p>
              <p className="text-xs text-slate-400 mt-1">
                The history will appear here once the first value update is recorded.
              </p>
            </div>
          )}

          {history && history.length > 0 && (
            <ol className="relative border-l-2 border-slate-100 ml-3 space-y-0">
              {history.map((entry, idx) => {
                const isFirst = idx === 0
                const delta = entry.oldValue != null ? entry.newValue - entry.oldValue : null
                const isProgress = delta != null && delta !== 0
                const vType = entry.verificationType as VerificationType
                return (
                  <li key={entry.id} className="ml-4 pb-6 last:pb-2">
                    {/* Timeline dot */}
                    <span
                      className={`absolute -left-[9px] flex size-4 items-center justify-center rounded-full ring-2 ring-white text-[8px] ${
                        isFirst ? 'bg-[#1152d4]' : 'bg-slate-200'
                      }`}
                    >
                      {isFirst ? '●' : '○'}
                    </span>

                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm space-y-2">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.oldValue != null && (
                              <span className="text-xs text-slate-400 line-through">
                                {entry.oldValue}{unit}
                              </span>
                            )}
                            <span className="text-xs font-black text-slate-800">
                              {entry.newValue}{unit}
                            </span>
                            {isProgress && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  delta! > 0
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-600 border border-red-200'
                                }`}
                              >
                                {delta! > 0 ? '+' : ''}{delta}{unit}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {entry.updatedByName ?? 'Unknown'} · {formatTs(entry.timestamp)}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600"
                          title={VERIFICATION_LABELS[vType] ?? vType}
                        >
                          {VERIFICATION_ICONS[vType] ?? '🔍'}
                          {VERIFICATION_LABELS[vType] ?? vType}
                        </span>
                      </div>

                      {/* Action narrative */}
                      <blockquote className="text-xs text-slate-600 italic border-l-2 border-[#1152d4]/30 pl-2.5 leading-relaxed">
                        "{entry.actionTaken}"
                      </blockquote>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
