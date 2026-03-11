import React from 'react'
import { Pencil, Trash2, GripVertical, RotateCcw } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'
import type { CommitItemResponse } from '@/types'

interface CommitItemProps {
  item: CommitItemResponse
  isDraggable?: boolean
  onEdit?: (item: CommitItemResponse) => void
  onDelete?: (item: CommitItemResponse) => void
}

export function CommitItem({ item, isDraggable = false, onEdit, onDelete }: CommitItemProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
    >
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg leading-none" title={item.chessPiece}>
            {CHESS_ICON[item.chessPiece]}
          </span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {item.chessPiece}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">wt {CHESS_WEIGHT[item.chessPiece]}</span>
          {item.carryForwardCount > 0 && (
            <Badge variant="warning" className="gap-1 text-xs py-0">
              <RotateCcw className="h-3 w-3" />
              CF×{item.carryForwardCount}
            </Badge>
          )}
          {item.unplanned && (
            <Badge variant="secondary" className="text-xs py-0">Unplanned</Badge>
          )}
          {item.bumpedItemTitle && (
            <span className="text-xs text-muted-foreground">Bumped: {item.bumpedItemTitle}</span>
          )}
          {item.carriedFromId != null && (
            <Badge variant="outline" className="text-xs py-0">Carried forward</Badge>
          )}
          {item.carryForward && (
            <Badge variant="secondary" className="text-xs py-0">carry forward</Badge>
          )}
        </div>

        <p className="text-sm font-medium text-foreground">{item.title}</p>

        {item.outcomeBreadcrumb && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {item.outcomeBreadcrumb.rallyCry}
            <span className="mx-1">›</span>
            {item.outcomeBreadcrumb.definingObjective}
            <span className="mx-1">›</span>
            {item.outcomeBreadcrumb.outcome}
          </p>
        )}

        {item.description && (
          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        )}
      </div>

      {(onEdit || onDelete) && !item.unplanned && (
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
