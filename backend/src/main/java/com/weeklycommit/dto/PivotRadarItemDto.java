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
public class PivotRadarItemDto {
    private UUID userId;
    private String fullName;
    private UUID commitId;
    private UUID itemId;
    private LocalDate weekStartDate;
    private String title;
    private String description;
    private String actualOutcome;
    private OutcomeBreadcrumbDto outcomeBreadcrumb;
    private String chessPiece;
    private UUID bumpedItemId;
    private String bumpedItemTitle;
}
