# API Reference
## Weekly Commit Module — v1.1

Base URL: `/api`
Auth: JWT in httpOnly cookie on all routes except `/api/auth/**`
All responses: `application/json`
All errors: `{ "code": "ERROR_CODE", "message": "Human readable message" }`

---

## Authentication

### POST /api/auth/callback
OAuth Authorization Code exchange. Receives code from provider,
validates, finds or creates user, issues internal JWT.

**Request:**
```json
{
  "code": "oauth-authorization-code",
  "state": "csrf-state-parameter"
}
```

**Response 200:**
```json
{
  "userId": "uuid",
  "orgId": "uuid",
  "email": "user@acme.com",
  "fullName": "Sarah Employee",
  "roles": ["EMPLOYEE"],
  "expiresAt": "2024-01-01T00:00:00Z"
}
```
Sets httpOnly JWT cookie on response.

**Errors:** 401 INVALID_OAUTH_CODE, 400 INVALID_STATE_PARAMETER

---

### POST /api/auth/logout
Clears JWT cookie.

**Response 200:** `{ "message": "Logged out successfully" }`

---

## RCDO Hierarchy

### GET /api/rcdo/hierarchy
Returns full RCDO tree for the authenticated user's org.

**Response 200:**
```json
{
  "rallyCries": [
    {
      "id": "uuid",
      "title": "Achieve product-market fit in SMB segment",
      "definingObjectives": [
        {
          "id": "uuid",
          "title": "Ship 3 customer-requested features by Q3",
          "outcomes": [
            {
              "id": "uuid",
              "title": "Reduce API response time below 200ms",
              "ownerId": "uuid"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Weekly Commits

### GET /api/commits/current
Returns current week's commit for the authenticated user.
Creates a DRAFT if none exists for the current week.

**Response 200:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "weekStartDate": "2024-01-01",
  "weekEndDate": "2024-01-05",
  "status": "DRAFT",
  "lockedAt": null,
  "reconcilingAt": null,
  "reconciledAt": null,
  "viewedAt": null,
  "totalWeight": 0,
  "alignmentScore": null,
  "items": []
}
```

---

### GET /api/commits/history
Returns past weeks' commits for the authenticated user.

**Query params:** `page` (default 0), `size` (default 10)

**Response 200:**
```json
{
  "content": [
    {
      "id": "uuid",
      "weekStartDate": "2024-01-01",
      "weekEndDate": "2024-01-05",
      "status": "RECONCILED",
      "totalWeight": 420,
      "alignmentScore": 85,
      "itemCount": 6,
      "completedCount": 4,
      "partialCount": 1,
      "notCompletedCount": 1,
      "carriedForwardCount": 1
    }
  ],
  "totalElements": 12,
  "totalPages": 2
}
```

---

### GET /api/commits/:id
Returns a single commit with all items.

**Response 200:** Full commit object with items array.

**Errors:** 404 COMMIT_NOT_FOUND, 403 FORBIDDEN

---

### PATCH /api/commits/:id/status
State machine transition endpoint. Only valid transitions are accepted.

**Request:**
```json
{
  "status": "LOCKED",
  "notes": "Optional transition notes"
}
```

**Response 200:** Updated commit object.

**Errors:**
- 400 INVALID_STATE_TRANSITION — illegal transition attempted
- 400 VALIDATION_FAILED — items missing RCDO or chess piece (for DRAFT→LOCKED)
- 400 MINIMUM_ITEMS_REQUIRED — no items on commit (for DRAFT→LOCKED)
- 400 RETRACT_NOT_PERMITTED — manager has already viewed (for LOCKED→DRAFT)
- 404 COMMIT_NOT_FOUND

---

## Commit Items

### POST /api/commits/:id/items
Create a new commit item.

**Request:**
```json
{
  "title": "Implement bulk import API endpoint",
  "description": "Optional additional context",
  "outcomeId": "uuid",
  "chessPiece": "QUEEN"
}
```

**Response 201:** Created commit item object.

**Errors:**
- 400 COMMIT_NOT_IN_DRAFT — can only add items in DRAFT state
- 400 VALIDATION_FAILED — missing required fields
- 404 COMMIT_NOT_FOUND
- 404 OUTCOME_NOT_FOUND

---

### PUT /api/commits/:id/items/:itemId
Update an existing commit item. Only permitted in DRAFT state.

**Request:** Same as POST, all fields optional.

**Response 200:** Updated commit item object.

**Errors:**
- 400 COMMIT_NOT_IN_DRAFT
- 404 ITEM_NOT_FOUND

---

### DELETE /api/commits/:id/items/:itemId
Delete a commit item. Only permitted in DRAFT state.

**Response 204:** No content.

**Errors:**
- 400 COMMIT_NOT_IN_DRAFT
- 404 ITEM_NOT_FOUND

---

### PATCH /api/commits/:id/items/reorder
Update priority_order for items within the same chess piece level.

**Request:**
```json
{
  "items": [
    { "id": "uuid", "priorityOrder": 1 },
    { "id": "uuid", "priorityOrder": 2 }
  ]
}
```

**Response 200:** Array of updated items.

**Errors:**
- 400 COMMIT_NOT_IN_DRAFT
- 400 CROSS_PIECE_REORDER_NOT_PERMITTED — items span multiple chess piece levels

---

## Reconciliation

### PUT /api/commits/:id/items/:itemId/reconcile
Update reconciliation data for a single commit item.

**Request:**
```json
{
  "actualOutcome": "Completed the endpoint, deployed to staging",
  "completionStatus": "COMPLETED",
  "carryForward": false
}
```

**Response 200:** Updated commit item.

**Errors:**
- 400 COMMIT_NOT_IN_RECONCILING
- 400 CARRY_FORWARD_NOT_PERMITTED — carry forward only on PARTIAL or NOT_COMPLETED
- 404 ITEM_NOT_FOUND

---

### POST /api/commits/:id/reconcile
Complete reconciliation. Transitions RECONCILING → RECONCILED.
Triggers carry-forward seeding into next week's DRAFT.

**Response 200:** Final reconciled commit with summary.

```json
{
  "id": "uuid",
  "status": "RECONCILED",
  "summary": {
    "completedCount": 4,
    "partialCount": 1,
    "notCompletedCount": 1,
    "carriedForwardCount": 1
  }
}
```

**Errors:**
- 400 COMMIT_NOT_IN_RECONCILING
- 400 INCOMPLETE_RECONCILIATION — not all items have completion status

---

## Manager

### GET /api/manager/team
Returns all direct reports with current week commit status.

**Response 200:**
```json
{
  "teamMembers": [
    {
      "userId": "uuid",
      "fullName": "Sarah Employee",
      "email": "sarah@acme.com",
      "currentCommit": {
        "id": "uuid",
        "status": "LOCKED",
        "itemCount": 5,
        "totalWeight": 380,
        "alignmentScore": 92,
        "lockedAt": "2024-01-01T09:00:00Z",
        "viewedAt": null,
        "hasCarriedForwardItems": false
      },
      "alignmentTrend": [85, 90, 88, 92]
    }
  ],
  "teamAlignmentScore": 87,
  "underSupportedRallyCries": [
    {
      "id": "uuid",
      "title": "Rally Cry title",
      "supportPercentage": 15
    }
  ]
}
```

---

### GET /api/manager/team/:userId/commits
Returns commit history for a specific team member.

**Query params:** `page`, `size`

**Response 200:** Paginated commit history (same shape as /api/commits/history).

**Errors:** 403 FORBIDDEN — user is not a direct report

---

### GET /api/manager/team/:userId/commits/:commitId
Returns full commit detail for a team member.
Sets viewed_at on the commit if not already set (disables IC retract).

**Response 200:** Full commit object with items.

**Errors:**
- 403 FORBIDDEN
- 404 COMMIT_NOT_FOUND

---

### POST /api/manager/commits/:commitId/notes
Add a manager note to a commit.

**Request:**
```json
{
  "note": "Great alignment this week. Let's discuss the ROOK items in 1:1."
}
```

**Response 201:** Created note object.

**Errors:** 403 FORBIDDEN, 404 COMMIT_NOT_FOUND

---

### GET /api/manager/team/alignment
Returns team-level alignment breakdown mapped to Rally Cries.

**Response 200:**
```json
{
  "totalWeight": 1840,
  "alignedWeight": 1580,
  "alignmentPercentage": 86,
  "rallyCryBreakdown": [
    {
      "rallyCryId": "uuid",
      "title": "Achieve PMF in SMB segment",
      "supportingItemCount": 14,
      "supportingWeight": 1200,
      "weightPercentage": 65,
      "contributors": [
        { "userId": "uuid", "fullName": "Sarah Employee", "itemCount": 5 }
      ]
    }
  ]
}
```

---

## Internal Scheduled Jobs
These endpoints are not publicly exposed. Triggered internally by Spring @Scheduled.

### POST /internal/jobs/create-weekly-drafts
Runs Monday 6am. Creates DRAFT commits for all active users who don't have one for the current week. Seeds carry-forward items.
Idempotent — safe to run multiple times.

### POST /internal/jobs/trigger-reconciling
Runs Friday 5pm. Transitions all LOCKED commits to RECONCILING.
Idempotent — safe to run multiple times.

### POST /internal/jobs/seed-carry-forwards
Triggered after RECONCILED transition. Seeds carry_forward=true items into next week's DRAFT.
Idempotent — checks for existing carried items before inserting.

---

## Commit Item Object Shape
```json
{
  "id": "uuid",
  "weeklyCommitId": "uuid",
  "outcomeId": "uuid",
  "outcomeBreadcrumb": {
    "rallyCry": "Achieve PMF in SMB segment",
    "definingObjective": "Ship 3 customer-requested features by Q3",
    "outcome": "Reduce API response time below 200ms"
  },
  "title": "Implement bulk import endpoint",
  "description": "Optional context",
  "chessPiece": "QUEEN",
  "chessWeight": 80,
  "priorityOrder": 1,
  "actualOutcome": null,
  "completionStatus": null,
  "carryForward": false,
  "carryForwardCount": 0,
  "carriedFromId": null,
  "createdAt": "2024-01-01T09:00:00Z",
  "updatedAt": "2024-01-01T09:00:00Z"
}
```
