package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamAlignmentResponse {

    private long totalWeight;
    private long alignedWeight;
    private int alignmentPercentage;
    private long strategicWeight;
    private long tacticalWeight;
    private int strategicPercentage;
    private int teamIntegrityScore;
    private long lockedOnMondayWeight;
    private long doneWeight;
    private List<RallyCryBreakdownDto> rallyCryBreakdown;
    private List<UnderSupportedRallyCryDto> underSupportedRallyCries;
    private List<DefiningObjectiveBreakdownDto> definingObjectiveBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnderSupportedRallyCryDto {
        private UUID rallyCryId;
        private String title;
        private int supportPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RallyCryBreakdownDto {
        private UUID rallyCryId;
        private String title;
        private int supportingItemCount;
        private long supportingWeight;
        private int weightPercentage;
        private List<ContributorDto> contributors;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContributorDto {
        private UUID userId;
        private String fullName;
        private int itemCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DefiningObjectiveBreakdownDto {
        private UUID definingObjectiveId;
        private UUID rallyCryId;
        private String title;
        private int supportingItemCount;
        private long supportingWeight;
        private int weightPercentage;
        private int allocationSharePercentage;
        private boolean lowVelocity;
        private boolean hasPowerPiece;
    }
}
