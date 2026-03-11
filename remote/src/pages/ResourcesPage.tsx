import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'
import type { ChessPiece } from '@/types'

const TERMS: Array<{
  term: string
  definition: string
  example: string
}> = [
  {
    term: 'Rally Cry (RC)',
    definition:
      "Your organization's single most important goal right now — the thematic focus everyone's work should support. Typically set for 3–12 months.",
    example: '"Become the #1 choice for small-business payroll in our region" or "Ship the new mobile app by Q2."',
  },
  {
    term: 'Defining Objectives',
    definition:
      'Four to six categories of work that directly advance the Rally Cry. Team-level goals that break the Rally Cry into actionable areas.',
    example: '"Reduce API latency," "Train support staff on the new product," "Complete security audit."',
  },
  {
    term: 'Outcomes',
    definition:
      'Specific, measurable results tied to a Defining Objective. Individual-level targets; each commit item you add must link to exactly one Outcome.',
    example: '"Cut p99 latency to under 200ms," "All Tier 1 support certified on Feature X."',
  },
  {
    term: 'RCDO',
    definition:
      'Short for Rally Cry → Defining Objectives → Outcomes. The three-level hierarchy that connects your weekly work to organizational strategy. Every commit item traces up to one Rally Cry.',
    example: 'Rally Cry: "Mobile First" → Defining Objective: "Improve app performance" → Outcome: "Reduce cold start to < 2s."',
  },
  {
    term: 'Weekly Commit',
    definition:
      'Your list of planned work for the week. Each item has a title, optional description, a chess piece (priority), and must be linked to an Outcome (RCDO). You submit it to lock the week; after that you reconcile what actually happened.',
    example: 'Monday: plan 5 items (e.g. 1 King, 2 Queens, 2 Rooks). Friday: mark each Completed, Partial, or Not Completed and optionally carry forward.',
  },
  {
    term: 'Reconciliation',
    definition:
      'The process of comparing what you committed to on Monday ("The Promise") with what actually happened by Friday ("The Reality"). You set a completion status and, for partial or missed items, a reason and optionally carry forward to next week.',
    example: 'Item "Ship login flow" → status: Completed, actual outcome: "Shipped to staging Tuesday."',
  },
  {
    term: 'Carry Forward',
    definition:
      'When an item was not completed, you can mark it to carry forward so it appears in next week\'s draft. It keeps title, description, and RCDO link but resets outcome and priority for the new week.',
    example: '"Finish API docs" was Partial → you carry it forward; next week it appears in your draft as a new item to prioritize again.',
  },
]

const CHESS_PIECE_ORDER: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

export function ResourcesPage(): React.ReactElement {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Definitions and examples of key terms used in Weekly Commit
        </p>
      </div>

      <div className="space-y-6">
        {TERMS.map(({ term, definition, example }) => (
          <Card key={term} className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{term}</CardTitle>
              <CardDescription className="text-sm font-normal text-foreground/90">
                {definition}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">Example: </span>
                {example}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chess pieces (priority)</CardTitle>
          <CardDescription className="text-sm font-normal text-foreground/90">
            Each commit item is assigned a piece. Higher-weight pieces mean higher priority; drag to
            reorder within the same piece.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2 text-sm">
            {CHESS_PIECE_ORDER.map((piece) => (
              <li key={piece} className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>{CHESS_ICON[piece]}</span>
                <span className="font-medium">{piece}</span>
                <span className="text-muted-foreground">— weight {CHESS_WEIGHT[piece]}</span>
                <span className="text-muted-foreground">
                  {piece === 'KING' && 'Critical; week fails without this'}
                  {piece === 'QUEEN' && 'Highest leverage'}
                  {piece === 'ROOK' && 'Core delivery'}
                  {piece === 'BISHOP' && 'Important but not blocking'}
                  {piece === 'KNIGHT' && 'Nice to have'}
                  {piece === 'PAWN' && 'Small tasks, low leverage'}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
