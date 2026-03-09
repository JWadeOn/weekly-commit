import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { CommitStatus } from '@/types'

const STATUS_CONFIG: Record<CommitStatus, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'info' | 'purple' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  LOCKED: { label: 'Locked', variant: 'info' },
  RECONCILING: { label: 'Reconciling', variant: 'warning' },
  RECONCILED: { label: 'Reconciled', variant: 'success' },
}

interface StatusBadgeProps {
  status: CommitStatus
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { label, variant } = STATUS_CONFIG[status]
  return <Badge variant={variant}>{label}</Badge>
}
