package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeekResponse {
    private UUID id;
    private UUID userId;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private String status;
    private LocalDateTime lockedAt;
    private LocalDateTime reconcilingAt;
    private LocalDateTime reconciledAt;
    private LocalDateTime viewedAt;
    private int totalWeight;
    private Integer alignmentScore;
    /** Snapshot of total weight taken when the commit was locked. Null until locked. */
    private Integer totalLockedWeight;
    /** Sum of chessWeight for all items currently marked COMPLETED. */
    private int totalDoneWeight;
    private List<CommitItemResponse> items;
}
