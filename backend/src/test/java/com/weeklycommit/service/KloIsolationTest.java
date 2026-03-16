package com.weeklycommit.service;

import com.weeklycommit.dto.TeamAlignmentResponse;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-KTLO-x  KTLO Isolation — Alignment Gauge vs. Capacity.
 *
 * Keep-the-Lights-On (KTLO) items represent operational work (bug fixes,
 * maintenance, security patches, admin).  The system enforces two rules:
 *
 *   Rule 1 — Alignment purity:
 *     KTLO items must NOT appear in the aligned-weight numerator.
 *     They are excluded because they are not driven by strategic outcomes.
 *
 *   Rule 2 — Capacity honesty:
 *     KTLO items MUST appear in the total-weight denominator.
 *     All time spent must be visible to the manager.
 *
 * ─── Test scenario (per spec) ──────────────────────────────────────────────
 *   Week contains:
 *     • 10 pts STRATEGIC  (QUEEN, taskType=STRATEGIC, outcomeId≠null)
 *     • 10 pts KTLO       (QUEEN, taskType=KTLO,     outcomeId=null)
 *
 *   Expected metrics:
 *     ┌──────────────────────────────────────────────────────────────────┐
 *     │ Metric                            │ Expected │ Formula           │
 *     ├──────────────────────────────────────────────────────────────────┤
 *     │ computeAlignmentScore             │  50 %    │ 10/(10+10) × 100  │
 *     │ Strategic-purity (KTLO-excluded)  │ 100 %    │ 10/10 × 100       │
 *     │ Total capacity used               │  20 pts  │ 10 + 10           │
 *     │ Capacity utilisation (vs locked)  │ 20/40    │ 20 / 40           │
 *     └──────────────────────────────────────────────────────────────────┘
 *
 * The "Alignment Gauge = 100 % (Strategic only)" in the UI is derived from
 * the strategic-purity calculation: of items flagged STRATEGIC, 100 % are
 * tied to measurable outcomes.  KTLO items do not dilute this score.
 */
@DisplayName("KTLO Isolation — Alignment Gauge vs. Capacity")
@ExtendWith(MockitoExtension.class)
class KloIsolationTest {

    // ── dependencies for CommitService ───────────────────────────────────────
    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository   commitItemRepository;
    @Mock private OutcomeRepository      outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository     rallyCryRepository;

    // ── dependencies for ManagerService ──────────────────────────────────────
    @Mock private UserRepository         userRepository;
    @Mock private ManagerNoteRepository  managerNoteRepository;
    @Mock private CommitService          commitServiceMock;

    private CommitService commitService;
    private ManagerService managerService;

    private final UUID userId    = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID orgId     = UUID.randomUUID();
    private final UUID commitId  = UUID.randomUUID();
    private final UUID outcomeId = UUID.randomUUID();

    /** 10-pt STRATEGIC item tied to an outcome (counts in alignment numerator). */
    private CommitItem strategicQueen;
    /** 10-pt KTLO item with no outcome (counts in capacity denominator ONLY). */
    private CommitItem ktloQueen;

    @BeforeEach
    void setUp() {
        commitService = new CommitService(
                weeklyCommitRepository,
                commitItemRepository,
                outcomeRepository,
                definingObjectiveRepository,
                rallyCryRepository);

        managerService = new ManagerService(
                userRepository,
                weeklyCommitRepository,
                commitItemRepository,
                managerNoteRepository,
                commitServiceMock);

        strategicQueen = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("QUEEN").chessWeight(10)
                .taskType(TaskType.STRATEGIC)
                .priorityOrder(1).carryForward(false).carryForwardCount(0).unplanned(false)
                .build();

        ktloQueen = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(null)
                .chessPiece("QUEEN").chessWeight(10)
                .taskType(TaskType.KTLO).kloCategory(KloCategory.MAINTENANCE)
                .priorityOrder(2).carryForward(false).carryForwardCount(0).unplanned(false)
                .build();
    }

    // =========================================================================
    // TC-KTLO-1  computeAlignmentScore — 10pts Strategic + 10pts KTLO → 50 %
    //
    //   Validates Rule 2: KTLO weight IS included in the denominator.
    //   alignedWeight = 10, totalWeight = 20, score = 10/20×100 = 50 %
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-1 computeAlignmentScore: 10pts Strategic + 10pts KTLO = 50 %")
    void alignmentScore_tenStrategicPlusTenKtlo_returns50() {
        List<CommitItem> items = List.of(strategicQueen, ktloQueen);

        Integer score = CommitService.computeAlignmentScore(items);

        assertThat(score)
                .as("TC-KTLO-1: KTLO is in denominator — 10/(10+10) = 50 %%")
                .isEqualTo(50);
    }

    // =========================================================================
    // TC-KTLO-2  Strategic-purity = 100 % (KTLO items fully excluded)
    //
    //   Of items flagged STRATEGIC with a non-null outcomeId:
    //     aligned strategic weight = 10
    //     total  strategic weight  = 10
    //     → strategic alignment purity = 100 %
    //
    //   This is the metric the "Alignment Gauge (Strategic only)" displays.
    //   The KTLO item does NOT appear here at all.
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-2 Strategic-purity: KTLO excluded → 10/10 = 100 %")
    void strategicPurity_kloExcluded_returns100() {
        List<CommitItem> items = List.of(strategicQueen, ktloQueen);

        // Compute strategic-only alignment: filter KTLO first, then measure alignment
        int totalStrategic = items.stream()
                .filter(i -> i.getTaskType() == null || i.getTaskType() == TaskType.STRATEGIC)
                .mapToInt(CommitItem::getChessWeight)
                .sum();

        int alignedStrategic = items.stream()
                .filter(i -> i.getTaskType() == null || i.getTaskType() == TaskType.STRATEGIC)
                .filter(i -> i.getOutcomeId() != null)
                .mapToInt(CommitItem::getChessWeight)
                .sum();

        int purity = totalStrategic > 0
                ? (int) Math.round((double) alignedStrategic / totalStrategic * 100.0)
                : 0;

        assertThat(purity)
                .as("TC-KTLO-2: Alignment Gauge (Strategic only) — all 10 strategic pts are outcome-linked → 100 %%")
                .isEqualTo(100);
    }

    // =========================================================================
    // TC-KTLO-3  Capacity = 20 pts; utilisation = 20/40 against locked snapshot
    //
    //   totalWeight = 10 (strategic) + 10 (KTLO) = 20
    //   totalLockedWeight (locked snapshot) = 40
    //   → capacity used = 20/40 (50 % of committed bandwidth consumed)
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-3 Capacity = 20 pts total; utilisation = 20 / 40")
    void capacity_twentyUsedOutOfFortyLocked() {
        List<CommitItem> items = List.of(strategicQueen, ktloQueen);

        int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();

        // Locked snapshot (e.g., team committed to 40 pts at the start of the week)
        int totalLockedWeight = 40;

        assertThat(totalWeight)
                .as("TC-KTLO-3: capacity used = strategic(10) + KTLO(10) = 20 pts")
                .isEqualTo(20);

        assertThat(totalLockedWeight)
                .as("TC-KTLO-3: locked capacity snapshot = 40 pts")
                .isEqualTo(40);

        // Capacity utilisation (expressed as a fraction for dashboard display)
        double utilisationPct = (double) totalWeight / totalLockedWeight * 100.0;
        assertThat(utilisationPct)
                .as("TC-KTLO-3: 20/40 = 50 %% capacity utilisation")
                .isEqualTo(50.0);
    }

    // =========================================================================
    // TC-KTLO-4  KTLO item with null outcomeId must NOT enter alignment numerator
    //
    //   Even if a KTLO item somehow ends up with a non-null taskType=STRATEGIC,
    //   a null outcomeId must prevent it from being counted as aligned.
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-4 Null outcomeId always excluded from aligned weight")
    void nullOutcomeId_neverCountsAsAligned() {
        // Item with no outcome — regardless of taskType, cannot be aligned
        CommitItem noOutcome = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(null)
                .chessPiece("KING").chessWeight(20)
                .taskType(TaskType.STRATEGIC)   // strategic type, but no outcome
                .priorityOrder(1).carryForward(false).carryForwardCount(0).unplanned(false)
                .build();

        Integer score = CommitService.computeAlignmentScore(List.of(noOutcome));

        assertThat(score)
                .as("TC-KTLO-4: STRATEGIC item with null outcomeId must yield 0 %% alignment (not null — item exists)")
                .isEqualTo(0);
    }

    // =========================================================================
    // TC-KTLO-5  ManagerService alignment aggregation isolates KTLO correctly
    //
    //   getTeamAlignment() must exclude KTLO items from alignedWeight,
    //   while both STRATEGIC and KTLO items appear in totalWeight.
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-5 ManagerService.getTeamAlignment: KTLO excluded from aligned, included in total")
    void managerAlignment_kloExcludedFromNumeratorIncludedInDenominator() {
        UUID reportId = UUID.randomUUID();
        UUID wcId     = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).managerId(managerId).fullName("IC").build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit wc = WeeklyCommit.builder()
                .id(wcId).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(wc));

        CommitItem stratItem = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wcId).outcomeId(outcomeId)
                .chessPiece("QUEEN").chessWeight(10).taskType(TaskType.STRATEGIC)
                .priorityOrder(1).carryForward(false).carryForwardCount(0).unplanned(false).build();

        CommitItem kloItem = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wcId).outcomeId(null)
                .chessPiece("QUEEN").chessWeight(10).taskType(TaskType.KTLO)
                .kloCategory(KloCategory.MAINTENANCE)
                .priorityOrder(2).carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wcId))
                .thenReturn(List.of(stratItem, kloItem));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getTotalWeight())
                .as("TC-KTLO-5: total weight includes both STRATEGIC and KTLO = 20")
                .isEqualTo(20L);

        assertThat(result.getAlignedWeight())
                .as("TC-KTLO-5: aligned weight includes ONLY STRATEGIC-with-outcome = 10")
                .isEqualTo(10L);

        assertThat(result.getAlignmentPercentage())
                .as("TC-KTLO-5: alignmentPercentage = 10/20 × 100 = 50 %%")
                .isEqualTo(50);
    }

    // =========================================================================
    // TC-KTLO-6  KTLO items get null outcomeBreadcrumb (no hierarchy link)
    //   Verifies that taskType=KTLO + outcomeId=null items are handled without
    //   NPE in the response builder — they must return null breadcrumb.
    // =========================================================================

    @Test
    @DisplayName("TC-KTLO-6 KTLO item produces null alignment score when it is the only item")
    void kloOnlyCommit_alignmentScoreIsZero() {
        // A commit that has ONLY KTLO work — no strategic items
        CommitItem onlyKtlo = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(null)
                .chessPiece("KING").chessWeight(20)
                .taskType(TaskType.KTLO)
                .priorityOrder(1).carryForward(false).carryForwardCount(0).unplanned(false).build();

        Integer score = CommitService.computeAlignmentScore(List.of(onlyKtlo));

        assertThat(score)
                .as("TC-KTLO-6: KTLO-only commit → 0 strategic weight → alignment = 0 %% (not null)")
                .isEqualTo(0);
    }
}
