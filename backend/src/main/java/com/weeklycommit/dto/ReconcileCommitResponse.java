package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconcileCommitResponse {

    private UUID id;
    private String status;
    private ReconciliationSummaryDto summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReconciliationSummaryDto {
        private long completedCount;
        private long partialCount;
        private long notCompletedCount;
        private long carriedForwardCount;
    }
}
