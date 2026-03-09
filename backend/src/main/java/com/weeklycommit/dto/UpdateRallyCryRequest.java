package com.weeklycommit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRallyCryRequest {
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    private Boolean active;
}
