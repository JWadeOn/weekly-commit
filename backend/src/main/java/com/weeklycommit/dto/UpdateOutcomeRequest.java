package com.weeklycommit.dto;

import com.weeklycommit.model.UnitType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOutcomeRequest {
    private UUID ownerId;
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    private Boolean active;
    private Double startValue;
    private Double targetValue;
    private Double currentValue;
    private String unit;
    private String unitLabel;
    private UnitType unitType;
}
