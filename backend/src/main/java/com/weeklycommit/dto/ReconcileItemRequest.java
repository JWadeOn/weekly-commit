package com.weeklycommit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconcileItemRequest {

    private String actualOutcome;

    @NotNull(message = "completionStatus is required")
    @Pattern(regexp = "COMPLETED|PARTIAL|NOT_COMPLETED",
             message = "completionStatus must be COMPLETED, PARTIAL, or NOT_COMPLETED")
    private String completionStatus;

    private boolean carryForward;
}
