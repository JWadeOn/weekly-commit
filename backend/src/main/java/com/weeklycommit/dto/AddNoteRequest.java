package com.weeklycommit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddNoteRequest {

    @NotBlank(message = "Note must not be blank")
    @Size(max = 4000, message = "Note must not exceed 4000 characters")
    private String note;
}
