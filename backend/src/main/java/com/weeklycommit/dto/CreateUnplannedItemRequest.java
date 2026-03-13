package com.weeklycommit.dto;

import com.weeklycommit.model.KloCategory;
import com.weeklycommit.model.TaskType;
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

    /**
     * Required for STRATEGIC items. Must be null for KLO items.
     * Validated in service based on taskType.
     */
    private UUID outcomeId;

    @NotBlank(message = "chessPiece is required")
    @Pattern(regexp = "KING|QUEEN|ROOK|BISHOP|KNIGHT|PAWN",
             message = "chessPiece must be one of KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN")
    private String chessPiece;

    /**
     * The planned item being displaced to make room for this unplanned entry.
     * May be null when the user has sufficient ghost capacity from prior displacements
     * (i.e. activeWeight + newWeight &lt;= totalLockedWeight). The service validates
     * capacity server-side when this is absent.
     */
    private UUID bumpedItemId;

    /** Defaults to STRATEGIC if omitted. */
    private TaskType taskType;

    /** Required when taskType is KLO. */
    private KloCategory kloCategory;

    /**
     * Human-readable reason recorded when adding into existing strategic debt
     * (no displacement required). Optional.
     */
    private String pivotReason;
}
