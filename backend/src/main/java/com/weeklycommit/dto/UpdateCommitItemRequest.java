package com.weeklycommit.dto;

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
public class UpdateCommitItemRequest {

    private String title;
    private String description;
    private UUID outcomeId;

    @Pattern(regexp = "KING|QUEEN|ROOK|BISHOP|KNIGHT|PAWN",
             message = "chessPiece must be one of KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN")
    private String chessPiece;
}
