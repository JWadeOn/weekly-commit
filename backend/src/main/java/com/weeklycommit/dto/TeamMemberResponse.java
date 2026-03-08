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
public class TeamMemberResponse {
    private UUID userId;
    private String fullName;
    private String email;
    private UUID currentCommitId;
    private String currentCommitStatus;
    private Double alignmentScore;
    private int itemCount;
}
