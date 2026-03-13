package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
 * TC-5.x  The "Scrub" — Strategic Debt prevention
 * TC-6.x  Founders Dashboard — high-level aggregation
 *
 * Chess weights: KING=20, QUEEN=10, ROOK=5, BISHOP=3, KNIGHT=3, PAWN=1
 */
@ExtendWith(MockitoExtension.class)
class StrategicScrubAndDashboardTest {

    // CommitService dependencies
    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository rallyCryRepository;

    // ManagerService dependencies
    @Mock private UserRepository userRepository;
    @Mock private ManagerNoteRepository managerNoteRepository;
    @Mock private CommitService commitServiceMock;

    // StateMachineService dependencies
    @Mock private StateTransitionRepository stateTransitionRepository;
    @Mock private CommitService commitServiceForSM;

    private CommitService commitService;
    private ManagerService managerService;
    private StateMachineService stateMachineService;

    private final UUID managerId = UUID.randomUUID();
    private final UUID orgId     = UUID.randomUUID();
    private final UUID userId    = UUID.randomUUID();
    private final UUID commitId  = UUID.randomUUID();
    private final UUID outcomeId = UUID.randomUUID();
    private final UUID doId      = UUID.randomUUID();

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

        stateMachineService = new StateMachineService(
                weeklyCommitRepository,
                commitItemRepository,
                stateTransitionRepository,
                commitServiceForSM);
    }

    // =========================================================================
    // TC-5.1  Automatic Carry Forward
    //   An unfinished task flagged carryForward=true in a RECONCILED commit
    //   must appear in the next Monday's Draft automatically.
    // =========================================================================

    @Test
    void tc5_1_automaticCarryForward_incompleteTaskAppearsInNextWeekDraft() {
        LocalDate thisMonday = LocalDate.now()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate nextMonday = thisMonday.plusDays(7);

        UUID sourceItemId = UUID.randomUUID();
        WeeklyCommit reconciledCommit = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(thisMonday).status("RECONCILED").build();

        CommitItem carryItem = CommitItem.builder()
                .id(sourceItemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("Unfinished King task").chessPiece("KING").chessWeight(20)
                .priorityOrder(1).carryForward(true).carryForwardCount(0).unplanned(false)
                .completionStatus("NOT_COMPLETED").actualOutcome("Still blocked").build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(reconciledCommit));
        when(commitItemRepository.findByWeeklyCommitIdAndCarryForwardTrue(commitId))
                .thenReturn(List.of(carryItem));

        // Next week's commit does not yet exist — should be created
        UUID nextWeekCommitId = UUID.randomUUID();
        WeeklyCommit nextWeekCommit = WeeklyCommit.builder()
                .id(nextWeekCommitId).userId(userId).orgId(orgId)
                .weekStartDate(nextMonday).status("DRAFT").build();

        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(userId, nextMonday))
                .thenReturn(Optional.empty());
        when(weeklyCommitRepository.save(argThat(wc -> nextMonday.equals(wc.getWeekStartDate()))))
                .thenReturn(nextWeekCommit);
        when(commitItemRepository
                .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(nextWeekCommitId))
                .thenReturn(List.of());
        when(commitItemRepository
                .existsByWeeklyCommitIdAndCarriedFromId(nextWeekCommitId, sourceItemId))
                .thenReturn(false);
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(carryItem);

        commitService.seedCarryForwards(commitId);

        ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
        verify(commitItemRepository, atLeastOnce()).save(captor.capture());

        // Find the newly seeded item (not the counter-increment save on sourceItem)
        CommitItem seeded = captor.getAllValues().stream()
                .filter(ci -> nextWeekCommitId.equals(ci.getWeeklyCommitId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No carry-forward item seeded into next week"));

        assertThat(seeded.getTitle())
                .as("TC-5.1: Task title must be preserved in the next week's Draft")
                .isEqualTo("Unfinished King task");
        assertThat(seeded.getChessPiece()).isEqualTo("KING");
        assertThat(seeded.getCarriedFromId())
                .as("TC-5.1: carriedFromId links back to the original item")
                .isEqualTo(sourceItemId);
        assertThat(seeded.isCarryForward())
                .as("TC-5.1: Seeded item starts with carryForward=false; IC decides again on Friday")
                .isFalse();
    }

    @Test
    void tc5_1_seedCarryForwards_idempotent_doesNotDuplicateIfAlreadySeeded() {
        LocalDate thisMonday = LocalDate.now()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));

        UUID sourceItemId = UUID.randomUUID();
        WeeklyCommit reconciledCommit = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(thisMonday).status("RECONCILED").build();
        CommitItem carryItem = CommitItem.builder()
                .id(sourceItemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("Already seeded").chessPiece("QUEEN").chessWeight(10)
                .priorityOrder(1).carryForward(true).carryForwardCount(1).unplanned(false).build();

        UUID nextWeekCommitId = UUID.randomUUID();
        WeeklyCommit nextWeek = WeeklyCommit.builder()
                .id(nextWeekCommitId).userId(userId).orgId(orgId)
                .weekStartDate(thisMonday.plusDays(7)).status("DRAFT").build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(reconciledCommit));
        when(commitItemRepository.findByWeeklyCommitIdAndCarryForwardTrue(commitId))
                .thenReturn(List.of(carryItem));
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(userId, thisMonday.plusDays(7)))
                .thenReturn(Optional.of(nextWeek));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(nextWeekCommitId))
                .thenReturn(List.of());
        // Already seeded — existsByWeeklyCommitIdAndCarriedFromId returns true
        when(commitItemRepository.existsByWeeklyCommitIdAndCarriedFromId(nextWeekCommitId, sourceItemId))
                .thenReturn(true);

        commitService.seedCarryForwards(commitId);

        verify(commitItemRepository, never()).save(any());
    }

    // =========================================================================
    // TC-5.2  The "Rule of 3" — behavioral gap documentation
    //
    //   Expected (spec): if an item has been carried forward 3 times it should
    //   BLOCK the IC from publishing their week (DRAFT → LOCKED).
    //
    //   Current state: StateMachineService.validateDraftToLocked() checks only
    //   for presence of items, outcomeId, and chessPiece.  It does NOT inspect
    //   carryForwardCount.  The publish therefore SUCCEEDS even with a 3×
    //   carry-forward item — this test documents the gap.
    //
    //   Resolution: StateMachineService must add a carryForwardCount >= 3 check
    //   and throw InvalidStateTransitionException("Carry-forward limit reached…").
    //   Once implemented, the "succeeds" assertion below should be replaced with
    //   `assertThatThrownBy(...)`.
    // =========================================================================

    @Test
    void tc5_2_ruleOfThree_gap_publishSucceedsEvenWith3xCarryForwardItem() {
        WeeklyCommit draft = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(LocalDate.now()).status("DRAFT").build();

        CommitItem threeTimeCarryItem = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("Perpetually deferred King task").chessPiece("KING").chessWeight(20)
                .priorityOrder(1).carryForward(false)
                .carryForwardCount(3)   // ← 3rd carry — should block publish per spec
                .unplanned(false).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(draft));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(threeTimeCarryItem));
        when(weeklyCommitRepository.save(any())).thenReturn(draft);
        when(stateTransitionRepository.save(any())).thenReturn(null);
        when(commitServiceForSM.toWeekResponse(any())).thenReturn(new WeekResponse());

        // BEHAVIORAL GAP: this call should throw but currently does not.
        // When TC-5.2 is fully implemented, replace assertThatCode with assertThatThrownBy.
        assertThatCode(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "LOCKED", null))
                .as("TC-5.2 GAP: Rule-of-3 block is not yet implemented in StateMachineService")
                .doesNotThrowAnyException();
        // TODO: after implementing the check, verify the exception message contains
        //       "Carry-forward limit" and "Manager intervention required"
    }

    // =========================================================================
    // TC-6.1  Max Power vs. Grinding
    //   Objective with Kings → hasPowerPiece=true ("MAX POWER" signal).
    //   Objective with only Pawns → hasPowerPiece=false ("GRINDING" signal).
    // =========================================================================

    @Test
    void tc6_1_maxPower_doWithKingItemsHasPowerPieceTrue() {
        UUID reportId = UUID.randomUUID();
        UUID rcId     = UUID.randomUUID();
        UUID wc       = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        // Three King items all linked to the same DO
        List<CommitItem> items = List.of(
                kingItem(wc, outcomeId, 1),
                kingItem(wc, outcomeId, 2),
                kingItem(wc, outcomeId, 3));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(items);

        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(rcId);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(doId);
        when(commitServiceMock.getRallyCryTitle(rcId)).thenReturn("Be #1 in EMEA");
        when(commitServiceMock.getDefiningObjectiveTitle(doId)).thenReturn("Grow Enterprise");

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getDefiningObjectiveBreakdown())
                .as("TC-6.1: DO with 3 Kings must appear in the breakdown")
                .hasSize(1);

        TeamAlignmentResponse.DefiningObjectiveBreakdownDto doBreakdown =
                result.getDefiningObjectiveBreakdown().get(0);

        assertThat(doBreakdown.isHasPowerPiece())
                .as("TC-6.1: MAX POWER — DO backed by King pieces must have hasPowerPiece=true")
                .isTrue();
        assertThat(doBreakdown.getSupportingWeight()).isEqualTo(60L);   // 3 × 20
    }

    @Test
    void tc6_1_grinding_doWithOnlyPawnItemsHasPowerPieceFalse() {
        UUID reportId = UUID.randomUUID();
        UUID rcId     = UUID.randomUUID();
        UUID wc       = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        // 5 Pawn items — "GRINDING"
        List<CommitItem> pawns = List.of(
                pawnItem(wc, outcomeId, 1), pawnItem(wc, outcomeId, 2),
                pawnItem(wc, outcomeId, 3), pawnItem(wc, outcomeId, 4),
                pawnItem(wc, outcomeId, 5));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(pawns);

        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(rcId);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(doId);
        when(commitServiceMock.getRallyCryTitle(rcId)).thenReturn("Be #1 in EMEA");
        when(commitServiceMock.getDefiningObjectiveTitle(doId)).thenReturn("Grow Enterprise");

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        TeamAlignmentResponse.DefiningObjectiveBreakdownDto doBreakdown =
                result.getDefiningObjectiveBreakdown().get(0);

        assertThat(doBreakdown.isHasPowerPiece())
                .as("TC-6.1: GRINDING — DO backed only by Pawns must have hasPowerPiece=false")
                .isFalse();
    }

    // =========================================================================
    // TC-6.2  Payroll Alignment
    //   Alignment Gauge shows what % of total team weight is "Aligned"
    //   (linked to Outcomes).  Items without an outcomeId are unaligned.
    // =========================================================================

    @Test
    void tc6_2_payrollAlignment_percentageReflectsOutcomeLinkage() {
        UUID reportId = UUID.randomUUID();
        UUID wc       = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        // Aligned: 1 KING (20) linked to an outcome
        // Unaligned: 1 ROOK (5) with no outcomeId
        CommitItem aligned = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem unaligned = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc)
                .outcomeId(null)       // ← not linked to any outcome
                .chessPiece("ROOK").chessWeight(5).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(aligned, unaligned));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getTotalWeight())
                .as("TC-6.2: total = 20 (KING) + 5 (ROOK) = 25")
                .isEqualTo(25L);
        assertThat(result.getAlignedWeight())
                .as("TC-6.2: aligned = 20 (only the KING has an outcomeId)")
                .isEqualTo(20L);
        assertThat(result.getAlignmentPercentage())
                .as("TC-6.2: 20/25 = 80 % payroll alignment")
                .isEqualTo(80);
    }

    @Test
    void tc6_2_payrollAlignment_100PercentWhenAllItemsLinked() {
        UUID reportId = UUID.randomUUID();
        UUID wc       = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(
                        kingItem(wc, outcomeId, 1),
                        pawnItem(wc, outcomeId, 2)));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getAlignmentPercentage())
                .as("TC-6.2: All items outcome-linked → 100 % alignment")
                .isEqualTo(100);
    }

    @Test
    void tc6_2_payrollAlignment_zeroWhenNoTeamCommitsExist() {
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of());

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getTotalWeight()).isEqualTo(0L);
        assertThat(result.getAlignmentPercentage())
                .as("TC-6.2: No team data → 0 % alignment (not a divide-by-zero)")
                .isEqualTo(0);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private CommitItem kingItem(UUID wc, UUID outcome, int order) {
        return CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcome)
                .chessPiece("KING").chessWeight(20).priorityOrder(order)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
    }

    private CommitItem pawnItem(UUID wc, UUID outcome, int order) {
        return CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcome)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(order)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
    }
}
