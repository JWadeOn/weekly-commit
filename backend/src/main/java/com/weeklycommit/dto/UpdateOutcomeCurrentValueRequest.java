package com.weeklycommit.dto;

import com.weeklycommit.model.VerificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "Action taken is required")
    @Size(min = 20, message = "Action taken must be at least 20 characters — describe what was actually done, not just 'done'.")
    private String actionTaken;

    @NotNull(message = "Verification type is required")
    private VerificationType verificationType;
}
