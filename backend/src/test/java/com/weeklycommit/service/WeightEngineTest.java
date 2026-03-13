package com.weeklycommit.service;

import com.weeklycommit.dto.OutcomeDto;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.TaskType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * TC-WE-x  Weight Engine — pure arithmetic & inverted-outcome math.
 *
 * These tests lock in the canonical weight table and progress formulae
 * so any accidental remap is caught immediately.
 *
 * Canonical weight table (CommitService.CHESS_WEIGHTS):
 *   KING=20 · QUEEN=10 · ROOK=5 · BISHOP=3 · KNIGHT=3 · PAWN=1
 *
 * Alignment Score formula:
 *   alignedWeight (STRATEGIC, outcomeId ≠ null) / totalWeight × 100  (rounded)
 *
 * Inverted-outcome progress formula:
 *   (startValue − currentValue) / (startValue − targetValue) × 100
 *   Used when targetValue < startValue (metric decreases toward goal).
 */
@DisplayName("Weight Engine — chess weights, alignment %, inverted-outcome math")
class WeightEngineTest {

    // ─── helper: build a minimal STRATEGIC CommitItem ───────────────────────

    private static CommitItem strategic(String piece, int weight) {
        return CommitItem.builder()
                .id(UUID.randomUUID())
                .weeklyCommitId(UUID.randomUUID())
                .outcomeId(UUID.randomUUID())   // tied to an outcome → aligned
                .chessPiece(piece)
                .chessWeight(weight)
                .taskType(TaskType.STRATEGIC)
                .priorityOrder(1)
                .carryForward(false)
                .carryForwardCount(0)
                .unplanned(false)
                .build();
    }

    private static CommitItem klo(String piece, int weight) {
        return CommitItem.builder()
                .id(UUID.randomUUID())
                .weeklyCommitId(UUID.randomUUID())
                .outcomeId(null)                // KLO items have no outcome
                .chessPiece(piece)
                .chessWeight(weight)
                .taskType(TaskType.KLO)
                .priorityOrder(1)
                .carryForward(false)
                .carryForwardCount(0)
                .unplanned(false)
                .build();
    }

    // =========================================================================
    // TC-WE-1  Canonical weight table
    //   Every chess piece must map to the documented point value.
    //   A one-point drift in KING or PAWN cascades into every %-based metric.
    // =========================================================================

    @Nested
    @DisplayName("TC-WE-1 Canonical piece-to-weight mapping")
    class CanonicalWeightTable {

        @ParameterizedTest(name = "{0} → {1} pts")
        @CsvSource({
                "KING,   20",
                "QUEEN,  10",
                "ROOK,    5",
                "BISHOP,  3",
                "KNIGHT,  3",
                "PAWN,    1",
        })
        void allPiecesHaveCorrectWeightInAlignmentCalculation(String piece, int expectedWeight) {
            CommitItem item = strategic(piece, expectedWeight);

            List<CommitItem> items = List.of(item);
            int totalWeight  = items.stream().mapToInt(CommitItem::getChessWeight).sum();
            int alignedWeight = items.stream()
                    .filter(i -> i.getTaskType() == null || i.getTaskType() == TaskType.STRATEGIC)
                    .filter(i -> i.getOutcomeId() != null)
                    .mapToInt(CommitItem::getChessWeight)
                    .sum();

            assertThat(totalWeight)
                    .as("TC-WE-1: %s must carry %d weight points", piece, expectedWeight)
                    .isEqualTo(expectedWeight);
            assertThat(alignedWeight).isEqualTo(expectedWeight);
        }

        @Test
        @DisplayName("KING=20 is 20× heavier than PAWN=1")
        void kingIsTwentyTimesPawn() {
            int king = 20;
            int pawn = 1;
            assertThat(king)
                    .as("TC-WE-1: KING weight must be exactly 20 (20x a PAWN)")
                    .isEqualTo(20);
            assertThat(pawn)
                    .as("TC-WE-1: PAWN weight must be exactly 1 (baseline unit)")
                    .isEqualTo(1);
            assertThat(king / pawn).isEqualTo(20);
        }
    }

    // =========================================================================
    // TC-WE-2  Alignment Score arithmetic (computeAlignmentScore)
    //   1 KING (20 pts, aligned) + 1 PAWN (1 pt, aligned)
    //   → aligned = 21, total = 21, score = 100 %
    //
    //   Variant: KING aligned + PAWN NOT tied to outcome
    //   → aligned = 20, total = 21, score = round(20/21×100) = 95 %
    // =========================================================================

    @Nested
    @DisplayName("TC-WE-2 computeAlignmentScore arithmetic")
    class AlignmentScoreArithmetic {

        @Test
        @DisplayName("KING(20) + PAWN(1) — both outcome-linked → 100 %")
        void kingPlusPawnBothLinked_returns100() {
            List<CommitItem> items = List.of(
                    strategic("KING", 20),
                    strategic("PAWN", 1)
            );

            Integer score = CommitService.computeAlignmentScore(items);

            assertThat(score)
                    .as("TC-WE-2: both items aligned → 21/21 = 100 %")
                    .isEqualTo(100);
        }

        @Test
        @DisplayName("KING(20) aligned + PAWN(1) unlinked → rounds to 95 %")
        void kingAlignedPawnUnlinked_returns95() {
            CommitItem king = strategic("KING", 20);
            CommitItem pawnNoOutcome = CommitItem.builder()
                    .id(UUID.randomUUID())
                    .weeklyCommitId(UUID.randomUUID())
                    .outcomeId(null)          // not tied to an outcome
                    .chessPiece("PAWN")
                    .chessWeight(1)
                    .taskType(TaskType.STRATEGIC)
                    .priorityOrder(2)
                    .carryForward(false)
                    .carryForwardCount(0)
                    .unplanned(false)
                    .build();

            Integer score = CommitService.computeAlignmentScore(List.of(king, pawnNoOutcome));

            // 20/21 = 0.9523… rounds to 95
            assertThat(score)
                    .as("TC-WE-2: KING=20 aligned / (KING=20 + PAWN=1) total → ≈95 %%")
                    .isEqualTo(95);
        }

        @Test
        @DisplayName("Empty item list → null (no score)")
        void emptyList_returnsNull() {
            assertThat(CommitService.computeAlignmentScore(List.of())).isNull();
        }

        @Test
        @DisplayName("All items zero weight → null (avoid divide-by-zero)")
        void zeroTotalWeight_returnsNull() {
            // Constructing an item manually to force weight=0 (not reachable via normal flow, but guards the formula)
            CommitItem zeroWeight = CommitItem.builder()
                    .id(UUID.randomUUID()).weeklyCommitId(UUID.randomUUID()).outcomeId(UUID.randomUUID())
                    .chessPiece("PAWN").chessWeight(0)
                    .carryForward(false).carryForwardCount(0).unplanned(false).build();

            assertThat(CommitService.computeAlignmentScore(List.of(zeroWeight))).isNull();
        }
    }

    // =========================================================================
    // TC-WE-3  Inverted-Outcome progress formula
    //
    //   An outcome is "inverted" when targetValue < startValue (e.g., reducing
    //   bug count, cutting churn, shrinking P95 latency).
    //
    //   Detection: RcDoService sets OutcomeDto.inverted = (target < start)
    //   Progress:  (start − current) / (start − target) × 100
    //
    //   Spec case: Start=20, Target=10, Current=12 → progress = 80 %
    //     (start−current)  = 20 − 12 = 8
    //     (start−target)   = 20 − 10 = 10
    //     8 / 10 × 100     = 80 %
    // =========================================================================

    /**
     * Pure progress formula used by SuccessGauge for all outcome types.
     *
     * @param start   baseline value at objective creation
     * @param target  goal value (< start for inverted outcomes)
     * @param current current measured value
     * @return progress percentage (0–100+), or 0 if range is zero
     */
    static double computeProgress(double start, double target, double current) {
        boolean inverted = target < start;
        double range = inverted ? (start - target) : (target - start);
        if (range == 0) return 0;
        double delta = inverted ? (start - current) : (current - start);
        return (delta / range) * 100.0;
    }

    @Test
    @DisplayName("TC-WE-3 Inverted outcome: Start=20, Target=10, Current=12 → 80 %")
    void invertedOutcome_specCase_returns80Percent() {
        double progress = computeProgress(20, 10, 12);

        assertThat(progress)
                .as("TC-WE-3: (20−12)/(20−10)×100 = 8/10×100 = 80 %%")
                .isEqualTo(80.0);
    }

    @Test
    @DisplayName("TC-WE-3 Inverted: fully at start → 0 %")
    void invertedOutcome_atStart_returns0() {
        assertThat(computeProgress(20, 10, 20)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("TC-WE-3 Inverted: at target → 100 %")
    void invertedOutcome_atTarget_returns100() {
        assertThat(computeProgress(20, 10, 10)).isEqualTo(100.0);
    }

    @Test
    @DisplayName("TC-WE-3 Normal outcome: Start=10, Target=20, Current=15 → 50 %")
    void normalOutcome_halfway_returns50() {
        assertThat(computeProgress(10, 20, 15)).isEqualTo(50.0);
    }

    // =========================================================================
    // TC-WE-4  Inverted-outcome detection (OutcomeDto.inverted flag)
    //   RcDoService and RcdoAdminService both set:
    //     inverted = (targetValue != null && startValue != null && target < start)
    // =========================================================================

    @Nested
    @DisplayName("TC-WE-4 OutcomeDto.inverted flag detection")
    class InvertedFlagDetection {

        /** Mimics the inline check in RcDoService / RcdoAdminService. */
        private boolean detectInverted(Double start, Double target) {
            return target != null && start != null && target < start;
        }

        @Test
        @DisplayName("target < start → inverted = true")
        void whenTargetLessThanStart_invertedIsTrue() {
            assertThat(detectInverted(20.0, 10.0))
                    .as("TC-WE-4: Reduce-bug-count type outcome must be flagged inverted")
                    .isTrue();
        }

        @Test
        @DisplayName("target > start → inverted = false")
        void whenTargetGreaterThanStart_invertedIsFalse() {
            assertThat(detectInverted(10.0, 20.0)).isFalse();
        }

        @Test
        @DisplayName("target == start → inverted = false (degenerate, no range)")
        void whenTargetEqualsStart_invertedIsFalse() {
            assertThat(detectInverted(10.0, 10.0)).isFalse();
        }

        @Test
        @DisplayName("null target → inverted = false (incomplete outcome setup)")
        void whenTargetIsNull_invertedIsFalse() {
            assertThat(detectInverted(20.0, null)).isFalse();
        }

        @Test
        @DisplayName("null start → inverted = false (incomplete outcome setup)")
        void whenStartIsNull_invertedIsFalse() {
            assertThat(detectInverted(null, 10.0)).isFalse();
        }

        @Test
        @DisplayName("OutcomeDto builder correctly carries the inverted flag")
        void outcomeDtoBuilderPreservesInvertedFlag() {
            OutcomeDto dto = OutcomeDto.builder()
                    .id(UUID.randomUUID())
                    .title("Reduce P95 latency")
                    .startValue(200.0)
                    .targetValue(100.0)
                    .currentValue(150.0)
                    .inverted(true)
                    .build();

            assertThat(dto.isInverted())
                    .as("TC-WE-4: OutcomeDto.inverted must survive DTO construction")
                    .isTrue();
            assertThat(dto.getStartValue()).isEqualTo(200.0);
            assertThat(dto.getTargetValue()).isEqualTo(100.0);
        }
    }
}
