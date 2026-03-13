package com.weeklycommit.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOutcomeCurrentValueRequest {
    @NotNull(message = "Current value is required")
    private Double currentValue;
}
