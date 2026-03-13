package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutcomeDto {
    private UUID id;
    private String title;
    private String description;
    private UUID ownerId;
    private Double startValue;
    private Double targetValue;
    private Double currentValue;
    private String unit;
    private String unitLabel;
    private String unitType;
    /** True when targetValue < startValue — gauge fills as the number decreases. */
    private boolean inverted;
    private LocalDateTime lastUpdated;
}
