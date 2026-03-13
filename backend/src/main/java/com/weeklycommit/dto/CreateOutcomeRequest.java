package com.weeklycommit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOutcomeRequest {
    @NotNull(message = "Defining Objective ID is required")
    private UUID definingObjectiveId;
    @NotNull(message = "Owner ID is required")
    private UUID ownerId;
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    /** Baseline value when the outcome was created. Defaults to 0 if omitted. */
    private Double startValue;
    @NotNull(message = "Target value is required. Outcomes must be quantitative (Advantage Rule).")
    private Double targetValue;
    @NotBlank(message = "Unit is required (e.g. ms, USD, Percentage, Tickets)")
    private String unit;
}
