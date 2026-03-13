package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregate chess-weight totals per Outcome for the current week, scoped to the
 * caller's org.  Only DRAFT and LOCKED commits are counted — reconciled weeks
 * are excluded so the numbers reflect live execution capacity.
 *
 * Shape returned to the client:
 * {
 *   "weights": { "outcome-uuid": 42, ... },
 *   "weekStartDate": "2026-03-09",
 *   "participatingCommits": 4
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamOutcomeWeightResponse {

    /** outcomeId → summed chess weight across all DRAFT + LOCKED commits this week */
    private Map<UUID, Integer> weights;

    /** Monday of the week this snapshot covers */
    private LocalDate weekStartDate;

    /** Number of DRAFT/LOCKED commits included in this aggregate */
    private int participatingCommits;
}
