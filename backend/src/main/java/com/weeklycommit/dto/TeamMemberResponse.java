package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberResponse {
    private UUID userId;
    private String fullName;
    private String email;
    private UUID currentCommitId;
    private String currentCommitStatus;
    private Double alignmentScore;
    private int itemCount;
    private List<Integer> alignmentTrend;
    private Instant lastUpdated;
    private boolean hasCarriedForwardItems;
    private boolean hasObjectiveDecay;
    private int maxCarryForwardCount;
}
