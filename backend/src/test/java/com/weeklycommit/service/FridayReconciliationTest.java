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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-4.x  Friday Reconciliation — the "Truth Engine"
 *
 * Chess weights: KING=20, QUEEN=10, ROOK=5, BISHOP=3, KNIGHT=3, PAWN=1
 */
@ExtendWith(MockitoExtension.class)
class FridayReconciliationTest {

    // CommitService dependencies
    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository rallyCryRepository;

    // RcdoAdminService dependencies
    @Mock private UserRepository userRepository;
    @Mock private OutcomeUpdateRepository outcomeUpdateRepository;

    // ManagerService extra dependencies
    @Mock private ManagerNoteRepository managerNoteRepository;
    @Mock private CommitService commitServiceMock;

    private CommitService commitService;
    private RcdoAdminService rcdoAdminService;
    private ManagerService managerService;

    private final UUID userId   = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID orgId    = UUID.randomUUID();
    private final UUID commitId = UUID.randomUUID();
    private final UUID outcomeId = UUID.randomUUID();
    private final UUID doId     = UUID.randomUUID();
    private final UUID rcId     = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        commitService = new CommitService(
                weeklyCommitRepository,
                commitItemRepository,
                outcomeRepository,
                definingObjectiveRepository,
                rallyCryRepository);

        rcdoAdminService = new RcdoAdminService(
                rallyCryRepository,
                definingObjectiveRepository,
                outcomeRepository,
                outcomeUpdateRepository,
                userRepository);

        managerService = new ManagerService(
                userRepository,
                weeklyCommitRepository,
                commitItemRepository,
                managerNoteRepository,
                commitServiceMock);
    }

    // =========================================================================
    // TC-4.1  The "King" Failure
    //   When an IC marks a KING-weight task as NOT_COMPLETED the "Reason for
    //   Miss" field becomes mandatory.  Same rule applies to PARTIAL status.
    // =========================================================================

    @Test
    void tc4_1_kingFailure_notCompletedRequiresReasonForMiss() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("RECONCILING").build();
        UUID itemId = UUID.randomUUID();
        CommitItem king = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findById(itemId)).thenReturn(Optional.of(king));

        ReconcileItemRequest req = ReconcileItemRequest.builder()
                .completionStatus("NOT_COMPLETED")
                .actualOutcome(null)   // No reason provided — must be blocked
                .carryForward(false)
                .build();

        assertThatThrownBy(() -> commitService.reconcileItem(commitId, itemId, userId, req))
                .as("TC-4.1: KING failure without a reason for miss must be blocked")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("reason for miss");
    }

    @Test
    void tc4_1_partialCompletion_alsoRequiresReasonForMiss() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("RECONCILING").build();
        UUID itemId = UUID.randomUUID();
        CommitItem king = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findById(itemId)).thenReturn(Optional.of(king));

        ReconcileItemRequest req = ReconcileItemRequest.builder()
                .completionStatus("PARTIAL")
                .actualOutcome("")    // Blank — must be blocked
                .carryForward(false)
                .build();

        assertThatThrownBy(() -> commitService.reconcileItem(commitId, itemId, userId, req))
                .as("TC-4.1: PARTIAL completion without a reason for miss must be blocked")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("reason for miss");
    }

    @Test
    void tc4_1_kingFailure_withReasonForMiss_succeeds() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("RECONCILING").build();
        UUID itemId = UUID.randomUUID();
        CommitItem king = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findById(itemId)).thenReturn(Optional.of(king));

        CommitItem saved = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .completionStatus("NOT_COMPLETED")
                .actualOutcome("Blocked by infrastructure outage")
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(saved);

        ReconcileItemRequest req = ReconcileItemRequest.builder()
                .completionStatus("NOT_COMPLETED")
                .actualOutcome("Blocked by infrastructure outage")
                .carryForward(false)
                .build();

        assertThatCode(() -> commitService.reconcileItem(commitId, itemId, userId, req))
                .as("TC-4.1: With a reason provided, NOT_COMPLETED reconciliation must succeed")
                .doesNotThrowAnyException();
    }

    // =========================================================================
    // TC-4.2  Integrity Score Math
    //   IC promised 40 pts (2 Kings @ 20 each), finished 20 pts (1 King).
    //   Team Integrity Score = doneWeight / mondayWeight × 100 = 50 %.
    // =========================================================================

    @Test
    void tc4_2_integrityScoreMath_50PercentWhenHalfKingsDone() {
        UUID reportId  = UUID.randomUUID();
        UUID king1Id   = UUID.randomUUID();
        UUID king2Id   = UUID.randomUUID();
        UUID wc        = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        // Commit is RECONCILING so mondayWeight is counted
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("RECONCILING").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        // 2 Kings promised; 1 completed, 1 not completed
        CommitItem king1 = CommitItem.builder()
                .id(king1Id).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .completionStatus("COMPLETED")
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem king2 = CommitItem.builder()
                .id(king2Id).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(2)
                .completionStatus("NOT_COMPLETED")
                .actualOutcome("Infra outage")
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(king1, king2));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getLockedOnMondayWeight())
                .as("TC-4.2: Monday weight = 2 Kings × 20 = 40")
                .isEqualTo(40L);
        assertThat(result.getDoneWeight())
                .as("TC-4.2: Done weight = 1 King completed × 20 = 20")
                .isEqualTo(20L);
        assertThat(result.getTeamIntegrityScore())
                .as("TC-4.2: Integrity Score = 20/40 = 50 %")
                .isEqualTo(50);
    }

    @Test
    void tc4_2_integrityScore_partialCountsAsDone() {
        UUID reportId = UUID.randomUUID();
        UUID wc       = UUID.randomUUID();

        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("RECONCILED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        // 1 KING completed (20) + 1 KING partial (20) + 1 KING not_completed (20)
        CommitItem done    = item(wc, "KING", 20, "COMPLETED");
        CommitItem partial = item(wc, "KING", 20, "PARTIAL");
        CommitItem miss    = item(wc, "KING", 20, "NOT_COMPLETED");

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(done, partial, miss));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        // done=20 + partial=20 = 40 of 60 promised → 67 %
        assertThat(result.getTeamIntegrityScore())
                .as("TC-4.2: PARTIAL counts toward doneWeight; 40/60 = 67 %")
                .isEqualTo(67);
    }

    // =========================================================================
    // TC-4.3  Achievement Gap
    //   Manager updates "Actual Value" on an Outcome.
    //   Success Gauge moves based on Start → Target delta; the service must
    //   persist the new currentValue and update lastUpdated.
    // =========================================================================

    @Test
    void tc4_3_achievementGap_updateOutcomeCurrentValue_persistsAndTimestamps() {
        User manager = User.builder().id(managerId).orgId(orgId).build();
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

        Outcome existing = Outcome.builder()
                .id(outcomeId)
                .definingObjectiveId(doId)
                .title("Monthly ARR")
                .startValue(100.0)
                .targetValue(150.0)
                .currentValue(100.0)
                .unit("USD-k")
                .active(true)
                .build();
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(existing));

        DefiningObjective do_ = DefiningObjective.builder().id(doId).rallyCryId(rcId).build();
        when(definingObjectiveRepository.findById(doId)).thenReturn(Optional.of(do_));

        RallyCry rc = RallyCry.builder().id(rcId).orgId(orgId).build();
        when(rallyCryRepository.findById(rcId)).thenReturn(Optional.of(rc));

        when(outcomeRepository.save(any(Outcome.class))).thenAnswer(inv -> inv.getArgument(0));
        when(outcomeUpdateRepository.save(any(OutcomeUpdate.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                .currentValue(125.0)
                .actionTaken("Optimized the DB index and rewrote the query to eliminate sequential scans.")
                .verificationType(VerificationType.LOAD_TEST)
                .build();

        RcDoAdminResponse.AdminOutcomeDto result =
                rcdoAdminService.updateOutcomeCurrentValue(managerId, orgId, outcomeId, req);

        assertThat(result.getCurrentValue())
                .as("TC-4.3: currentValue must reflect the manager's update (125.0)")
                .isEqualTo(125.0);
        assertThat(result.getStartValue())
                .as("TC-4.3: startValue is unchanged (baseline for gauge calculation)")
                .isEqualTo(100.0);
        assertThat(result.getTargetValue())
                .as("TC-4.3: targetValue is unchanged (target for gauge calculation)")
                .isEqualTo(150.0);

        ArgumentCaptor<Outcome> captor = ArgumentCaptor.forClass(Outcome.class);
        verify(outcomeRepository).save(captor.capture());
        assertThat(captor.getValue().getCurrentValue()).isEqualTo(125.0);
        assertThat(captor.getValue().getLastUpdated())
                .as("TC-4.3: lastUpdated timestamp must be set when currentValue changes")
                .isNotNull();
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private CommitItem item(UUID wc, String piece, int weight, String status) {
        return CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece(piece).chessWeight(weight).priorityOrder(1)
                .completionStatus(status)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
    }
}
