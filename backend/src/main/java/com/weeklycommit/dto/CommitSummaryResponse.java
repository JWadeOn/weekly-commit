package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitSummaryResponse {
    private UUID id;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private String status;
    private int totalWeight;
    private Integer alignmentScore;
    private int itemCount;
    private long completedCount;
    private long partialCount;
    private long notCompletedCount;
    private long carriedForwardCount;
}
