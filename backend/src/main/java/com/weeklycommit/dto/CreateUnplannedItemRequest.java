package com.weeklycommit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUnplannedItemRequest {

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotNull(message = "outcomeId is required")
    private UUID outcomeId;

    @NotBlank(message = "chessPiece is required")
    @Pattern(regexp = "KING|QUEEN|ROOK|BISHOP|KNIGHT|PAWN",
             message = "chessPiece must be one of KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN")
    private String chessPiece;

    @NotNull(message = "bumpedItemId is required for unplanned items")
    private UUID bumpedItemId;
}
