package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.exception.ItemNotFoundException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.junit.jupiter.api.BeforeEach;
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
 * TC-2.x  Monday Promise — immutable LOCK discipline
 * TC-3.x  Mid-Week Pivot — strategic-drift capture
 *
 * Chess weights used in these tests: KING=20, PAWN=1
 */
@ExtendWith(MockitoExtension.class)
class MidWeekPivotTest {

    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository rallyCryRepository;

    // For TC-3.3 pivot-radar test
    @Mock private UserRepository userRepository;
    @Mock private ManagerNoteRepository managerNoteRepository;
    @Mock private CommitService commitServiceMock;

    private CommitService commitService;
    private ManagerService managerService;

    private final UUID userId    = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID orgId     = UUID.randomUUID();
    private final UUID commitId  = UUID.randomUUID();
    private final UUID outcomeId = UUID.randomUUID();

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
    }

    // =========================================================================
    // TC-2.2  Chess Weight Calculation
    //   1 King (weight=20) + 1 Pawn (weight=1).
    //   Allocation Gauge: strategicWeight / totalWeight = 20/21 ≈ 95 %.
    //   (Tested via ManagerService.getTeamAlignment — see also FoundersDashboardTest)
    // =========================================================================

    @Test
    void tc2_2_chessWeightCalculation_kingPlusPawnGives95PercentStrategic() {
        UUID reportId = UUID.randomUUID();
        User report = User.builder().id(reportId).orgId(orgId).fullName("IC").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        UUID wc = UUID.randomUUID();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).orgId(orgId).status("LOCKED").build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        CommitItem king = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem pawn = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(king, pawn));
        when(commitServiceMock.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitServiceMock.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getTotalWeight()).isEqualTo(21L);
        assertThat(result.getStrategicWeight())
                .as("TC-2.2: KING is strategic; strategic weight = 20")
                .isEqualTo(20L);
        assertThat(result.getTacticalWeight())
                .as("TC-2.2: PAWN is tactical; tactical weight = 1")
                .isEqualTo(1L);
        assertThat(result.getStrategicPercentage())
                .as("TC-2.2: 20/21 rounds to 95 % strategic focus")
                .isEqualTo(95);
    }

    // =========================================================================
    // TC-2.3  The Immutable Lock
    //   After "Publish" (LOCKED state) the IC cannot edit or delete a task
    //   without going through a Pivot (createUnplannedItem).
    // =========================================================================

    @Test
    void tc2_3_immutableLock_updateItemBlockedAfterPublish() {
        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        UUID itemId = UUID.randomUUID();
        CommitItem item = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));

        assertThatThrownBy(() ->
                commitService.updateItem(commitId, itemId, userId,
                        UpdateCommitItemRequest.builder().title("Edited title").build()))
                .as("TC-2.3: Cannot edit a task once the week is LOCKED")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void tc2_3_immutableLock_deleteItemBlockedAfterPublish() {
        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        UUID itemId = UUID.randomUUID();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));

        assertThatThrownBy(() ->
                commitService.deleteItem(commitId, itemId, userId))
                .as("TC-2.3: Cannot delete a task once the week is LOCKED")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("DRAFT");
    }

    // =========================================================================
    // TC-3.1  Unplanned Task Entry
    //   When a week is LOCKED an IC can only add work via the Pivot path
    //   (createUnplannedItem), which requires a bumpedItemId.
    //   The service must accept the call and mark the new item unplanned=true.
    // =========================================================================

    @Test
    void tc3_1_unplannedItemEntry_requiresLockedCommitAndBumpedItem() {
        UUID bumpedId = UUID.randomUUID();
        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        CommitItem bumped = CommitItem.builder()
                .id(bumpedId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        Outcome outcome = Outcome.builder()
                .id(outcomeId).title("Target Outcome").definingObjectiveId(UUID.randomUUID()).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        when(commitItemRepository.findById(bumpedId)).thenReturn(Optional.of(bumped));
        when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedId))
                .thenReturn(false);
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(bumped));

        CommitItem pivot = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(true)
                .bumpedItemId(bumpedId).build();
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(pivot);
        when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Emergency incident investigation")
                .outcomeId(outcomeId)
                .chessPiece("PAWN")
                .bumpedItemId(bumpedId)
                .build();

        CommitItemResponse result = commitService.createUnplannedItem(commitId, userId, req);

        assertThat(result.isUnplanned())
                .as("TC-3.1: Pivot item must be flagged unplanned=true")
                .isTrue();
        assertThat(result.getBumpedItemId())
                .as("TC-3.1: Pivot item must reference the bumped item")
                .isEqualTo(bumpedId);
    }

    @Test
    void tc3_1_addingUnplannedItem_toDraftCommit_isBlocked() {
        WeeklyCommit draft = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(draft));

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Surprise task")
                .outcomeId(outcomeId)
                .chessPiece("PAWN")
                .bumpedItemId(UUID.randomUUID())
                .build();

        assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                .as("TC-3.1: Unplanned items only allowed in LOCKED or RECONCILING state")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("LOCKED");
    }

    // =========================================================================
    // TC-3.2  Forced Trade-Off
    //   The system must require a bumpedItemId when adding an unplanned item.
    //   Without a valid bumped item the request is rejected.
    // =========================================================================

    @Test
    void tc3_2_forcedTradeOff_missingBumpedItemThrows() {
        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        Outcome outcome = Outcome.builder()
                .id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build();

        UUID missingBumpId = UUID.randomUUID();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        // Bumped item not found — simulates user not selecting a trade-off
        when(commitItemRepository.findById(missingBumpId)).thenReturn(Optional.empty());

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Pivot task")
                .outcomeId(outcomeId)
                .chessPiece("PAWN")
                .bumpedItemId(missingBumpId)
                .build();

        assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                .as("TC-3.2: Bumped item must exist — forced trade-off cannot be skipped")
                .isInstanceOf(ItemNotFoundException.class)
                .hasMessageContaining("Bumped item not found");
    }

    @Test
    void tc3_2_forcedTradeOff_itemAlreadyBumped_isRejected() {
        UUID bumpedId = UUID.randomUUID();
        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        CommitItem bumped = CommitItem.builder()
                .id(bumpedId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        Outcome outcome = Outcome.builder()
                .id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        when(commitItemRepository.findById(bumpedId)).thenReturn(Optional.of(bumped));
        // Item has already been bumped by another pivot
        when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedId))
                .thenReturn(true);

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Second pivot")
                .outcomeId(outcomeId)
                .chessPiece("PAWN")
                .bumpedItemId(bumpedId)
                .build();

        assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                .as("TC-3.2: Cannot bump the same item twice")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("already been bumped");
    }

    // =========================================================================
    // TC-3.3  Drift Alert
    //   Adding a Pawn that bumps a King is captured by the Pivot Radar so the
    //   Manager Dashboard can flag strategic drift.
    //   Verify getPivotRadar returns unplanned items with their bumped-item ref.
    // =========================================================================

    @Test
    void tc3_3_driftAlert_pivotRadarCapturesKingBumpedByPawn() {
        UUID reportId  = UUID.randomUUID();
        UUID wc        = UUID.randomUUID();
        UUID kingId    = UUID.randomUUID();
        UUID pivotId   = UUID.randomUUID();

        User report = User.builder().id(reportId).fullName("IC Smith").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(wc).userId(reportId).weekStartDate(LocalDate.now()).build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));

        CommitItem kingItem = CommitItem.builder()
                .id(kingId).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem pivotItem = CommitItem.builder()
                .id(pivotId).weeklyCommitId(wc).outcomeId(outcomeId)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(true)
                .bumpedItemId(kingId)
                .title("Emergency hotfix").build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(wc))
                .thenReturn(List.of(kingItem, pivotItem));

        CommitItemResponse pivotResp = CommitItemResponse.builder()
                .id(pivotId)
                .chessPiece("PAWN")
                .bumpedItemId(kingId)
                .bumpedItemTitle("Q3 growth initiative")
                .build();
        when(commitServiceMock.toItemResponse(pivotItem)).thenReturn(pivotResp);

        List<PivotRadarItemDto> radar = managerService.getPivotRadar(managerId, orgId, 1);

        assertThat(radar)
                .as("TC-3.3: Pivot Radar must contain the unplanned PAWN that bumped the KING")
                .hasSize(1);

        PivotRadarItemDto drift = radar.get(0);
        assertThat(drift.getChessPiece()).isEqualTo("PAWN");
        assertThat(drift.getBumpedItemId())
                .as("TC-3.3: Drift entry records which King-level item was displaced")
                .isEqualTo(kingId);
        assertThat(drift.getBumpedItemTitle()).isEqualTo("Q3 growth initiative");
    }
}
