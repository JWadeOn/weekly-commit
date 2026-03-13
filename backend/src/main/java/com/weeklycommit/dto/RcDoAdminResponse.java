package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RcDoAdminResponse {
    private List<AdminRallyCryDto> rallyCries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminRallyCryDto {
        private UUID id;
        private String title;
        private String description;
        private boolean active;
        private List<AdminDefiningObjectiveDto> definingObjectives;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminDefiningObjectiveDto {
        private UUID id;
        private UUID rallyCryId;
        private String title;
        private String description;
        private boolean active;
        private List<AdminOutcomeDto> outcomes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminOutcomeDto {
        private UUID id;
        private UUID definingObjectiveId;
        private String title;
        private String description;
        private UUID ownerId;
        private String ownerName;
        private boolean active;
        private Double startValue;
        private Double targetValue;
        private Double currentValue;
        private String unit;
        private LocalDateTime lastUpdated;
    }
}
