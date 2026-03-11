package com.weeklycommit.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "commit_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "weekly_commit_id", nullable = false)
    private UUID weeklyCommitId;

    @Column(name = "outcome_id", nullable = false)
    private UUID outcomeId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "chess_piece", nullable = false)
    private String chessPiece;

    @Column(name = "chess_weight", nullable = false)
    private Integer chessWeight;

    @Column(name = "priority_order", nullable = false)
    private Integer priorityOrder;

    @Column(name = "actual_outcome", columnDefinition = "TEXT")
    private String actualOutcome;

    @Column(name = "completion_status")
    private String completionStatus;

    @Column(name = "carry_forward", nullable = false)
    private boolean carryForward;

    @Column(name = "carry_forward_count", nullable = false)
    private int carryForwardCount;

    @Column(name = "carried_from_id")
    private UUID carriedFromId;

    @Column(name = "unplanned", nullable = false)
    private boolean unplanned;

    @Column(name = "bumped_item_id")
    private UUID bumpedItemId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
