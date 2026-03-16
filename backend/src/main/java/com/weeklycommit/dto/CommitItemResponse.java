package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitItemResponse {
    private UUID id;
    private UUID weeklyCommitId;
    private UUID outcomeId;
    private OutcomeBreadcrumbDto outcomeBreadcrumb;
    private String title;
    private String description;
    private String chessPiece;
    private Integer chessWeight;
    private Integer priorityOrder;
    private String actualOutcome;
    private String completionStatus;
    private boolean carryForward;
    private int carryForwardCount;
    private UUID carriedFromId;
    private boolean unplanned;
    /** STRATEGIC (default) or KTLO — determines alignment score treatment. */
    private String taskType;
    /** Non-null only for KTLO items: BUGFIX, MAINTENANCE, SECURITY, ADMIN. */
    private String kloCategory;
    private UUID bumpedItemId;
    private String bumpedItemTitle;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
