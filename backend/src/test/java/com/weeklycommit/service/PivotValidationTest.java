package com.weeklycommit.service;

import com.weeklycommit.dto.CommitItemResponse;
import com.weeklycommit.dto.CreateUnplannedItemRequest;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-PV-x  Pivot Validation — Ghost-capacity and displacement guardrails.
 *
 * "validatePivot" is embedded in CommitService.createUnplannedItem().
 * Two paths are tested:
 *
 *   Path A — Standard displacement (bumpedItemId supplied):
 *     A new unplanned item explicitly displaces a planned item.
 *
 *   Path B — Ghost-capacity (bumpedItemId = null):
 *     An item is added WITHOUT a new displacement, using capacity freed by
 *     previously-bumped items.  Guard: activeWeight + newWeight ≤ totalLockedWeight.
 *
 * FOCUS TEST (per spec):
 *   User has exactly 1 BUMPED item (displaced by an earlier pivot) and 0 ACTIVE
 *   items remaining.  Adding a new 10-pt QUEEN via ghost capacity must be ALLOWED
 *   because activeWeight = 0 and 0 + 10 ≤ totalLockedWeight.
 */
@DisplayName("Pivot Validation — ghost capacity and displacement rules")
@ExtendWith(MockitoExtension.class)
class PivotValidationTest {

    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository    commitItemRepository;
    @Mock private OutcomeRepository       outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository      rallyCryRepository;

    private CommitService commitService;

    private final UUID userId    = UUID.randomUUID();
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
    }

    // =========================================================================
    // TC-PV-1  [FOCUS] Ghost-capacity path — 1 BUMPED + 0 ACTIVE → ALLOWED
    //
    //   Scenario:
    //     • Week was locked with totalLockedWeight = 20 (1 KING).
    //     • Mid-week: a PAWN pivot bumped the KING. The KING is now "displaced."
    //     • User now wants to add a new QUEEN (10 pts) without displacing anything
    //       else (ghost-capacity path, bumpedItemId = null).
    //
    //   Expected outcome:
    //     • activeWeight = 0  (the KING is displaced; no other planned items remain)
    //     • 0 + 10 ≤ 20 (totalLockedWeight)  → ALLOWED — no exception
    //     • Saved item: unplanned=true, bumpedItemId=null, chessWeight=10
    // =========================================================================

    @Nested
    @DisplayName("TC-PV-1 Ghost-capacity path")
    class GhostCapacityPath {

        @Test
        @DisplayName("1 BUMPED + 0 ACTIVE: adding a 10-pt QUEEN is allowed")
        void oneBumpedZeroActive_addQueenAllowed() {
            UUID kingId    = UUID.randomUUID();
            UUID earlyPivotId = UUID.randomUUID();

            // The LOCKED commit — snapshot captured 20 pts at lock time (1 KING)
            WeeklyCommit lockedCommit = WeeklyCommit.builder()
                    .id(commitId).userId(userId).orgId(orgId)
                    .status("LOCKED")
                    .totalLockedWeight(20)   // ghost-capacity snapshot = 20 pts
                    .build();

            // Planned item that was already displaced (its ID referenced by earlyPivot)
            CommitItem displacedKing = CommitItem.builder()
                    .id(kingId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("KING").chessWeight(20).priorityOrder(1)
                    .carryForward(false).carryForwardCount(0).unplanned(false).build();

            // The earlier pivot that displaced the KING
            CommitItem earlyPivot = CommitItem.builder()
                    .id(earlyPivotId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                    .carryForward(false).carryForwardCount(0)
                    .unplanned(true).bumpedItemId(kingId).build();

            // Saved response for the new QUEEN pivot
            CommitItem savedQueen = CommitItem.builder()
                    .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("QUEEN").chessWeight(10).priorityOrder(3)
                    .carryForward(false).carryForwardCount(0)
                    .unplanned(true).bumpedItemId(null).build();

            when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(lockedCommit));
            when(outcomeRepository.findById(outcomeId))
                    .thenReturn(Optional.of(Outcome.builder().id(outcomeId)
                            .title("Reduce churn").definingObjectiveId(UUID.randomUUID()).build()));
            when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                    .thenReturn(List.of(displacedKing, earlyPivot));
            when(commitItemRepository.save(any(CommitItem.class))).thenReturn(savedQueen);
            when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

            // Ghost-capacity request: no bumpedItemId
            CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                    .title("Urgent customer-success follow-up")
                    .outcomeId(outcomeId)
                    .chessPiece("QUEEN")
                    .bumpedItemId(null)    // ghost-capacity — no new displacement
                    .taskType(TaskType.STRATEGIC)
                    .build();

            // Must NOT throw — ghost capacity covers the 10 pts
            assertThatNoException()
                    .as("TC-PV-1: 0 active weight + 10 (QUEEN) ≤ 20 totalLockedWeight → ALLOWED")
                    .isThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req));

            // Verify the saved item is unplanned with no bumpedItemId
            ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
            verify(commitItemRepository).save(captor.capture());
            CommitItem persisted = captor.getValue();

            assertThat(persisted.isUnplanned())
                    .as("TC-PV-1: ghost-capacity item must be flagged unplanned=true")
                    .isTrue();
            assertThat(persisted.getBumpedItemId())
                    .as("TC-PV-1: no displacement — bumpedItemId must be null")
                    .isNull();
            assertThat(persisted.getChessWeight())
                    .as("TC-PV-1: QUEEN must carry exactly 10 pts")
                    .isEqualTo(10);
        }

        @Test
        @DisplayName("Insufficient ghost capacity: blocked when activeWeight + newWeight > locked")
        void insufficientGhostCapacity_rejected() {
            UUID kingId       = UUID.randomUUID();
            UUID earlyPivotId = UUID.randomUUID();

            // Locked with only 5 pts ghost capacity left (totalLockedWeight = 1)
            WeeklyCommit tightCommit = WeeklyCommit.builder()
                    .id(commitId).userId(userId).orgId(orgId)
                    .status("LOCKED")
                    .totalLockedWeight(1)   // only 1 pt of ghost capacity
                    .build();

            // A KING that's already displaced
            CommitItem displacedKing = CommitItem.builder()
                    .id(kingId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("KING").chessWeight(20).priorityOrder(1)
                    .carryForward(false).carryForwardCount(0).unplanned(false).build();

            CommitItem earlyPivot = CommitItem.builder()
                    .id(earlyPivotId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                    .carryForward(false).carryForwardCount(0)
                    .unplanned(true).bumpedItemId(kingId).build();

            when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(tightCommit));
            when(outcomeRepository.findById(outcomeId))
                    .thenReturn(Optional.of(Outcome.builder().id(outcomeId)
                            .title("O").definingObjectiveId(UUID.randomUUID()).build()));
            when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                    .thenReturn(List.of(displacedKing, earlyPivot));

            // QUEEN = 10 pts; 0 + 10 > 1 (totalLockedWeight) → REJECTED
            CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                    .title("Overloaded pivot attempt")
                    .outcomeId(outcomeId)
                    .chessPiece("QUEEN")
                    .bumpedItemId(null)
                    .taskType(TaskType.STRATEGIC)
                    .build();

            assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                    .as("TC-PV-1: 0 active + 10 QUEEN > 1 locked → must reject")
                    .isInstanceOf(InvalidStateTransitionException.class)
                    .hasMessageContaining("ghost capacity");
        }

        @Test
        @DisplayName("No locked-weight snapshot at all → ghost capacity path rejected")
        void nullTotalLockedWeight_rejected() {
            WeeklyCommit commitNoSnapshot = WeeklyCommit.builder()
                    .id(commitId).userId(userId).orgId(orgId)
                    .status("LOCKED")
                    .totalLockedWeight(null)   // never snapshotted
                    .build();

            when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commitNoSnapshot));
            when(outcomeRepository.findById(outcomeId))
                    .thenReturn(Optional.of(Outcome.builder().id(outcomeId)
                            .title("O").definingObjectiveId(UUID.randomUUID()).build()));
            when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                    .thenReturn(List.of());

            CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                    .title("Pivot without snapshot")
                    .outcomeId(outcomeId)
                    .chessPiece("PAWN")
                    .bumpedItemId(null)
                    .taskType(TaskType.STRATEGIC)
                    .build();

            assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                    .as("TC-PV-1: No locked-weight snapshot → cannot use ghost capacity")
                    .isInstanceOf(InvalidStateTransitionException.class)
                    .hasMessageContaining("no locked weight snapshot");
        }
    }

    // =========================================================================
    // TC-PV-2  Standard displacement path (bumpedItemId provided)
    //   The new unplanned item must record which planned item it displaced.
    //   Guardrail: the same planned item cannot be bumped twice.
    // =========================================================================

    @Nested
    @DisplayName("TC-PV-2 Standard displacement path")
    class StandardDisplacementPath {

        @Test
        @DisplayName("Valid displacement: new item accepted, bumpedItemId recorded")
        void validDisplacement_itemSavedWithBumpedRef() {
            UUID bumpedId = UUID.randomUUID();

            WeeklyCommit locked = WeeklyCommit.builder()
                    .id(commitId).userId(userId).status("LOCKED").build();
            CommitItem planned = CommitItem.builder()
                    .id(bumpedId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("KING").chessWeight(20).priorityOrder(1)
                    .carryForward(false).carryForwardCount(0).unplanned(false).build();
            Outcome outcome = Outcome.builder()
                    .id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build();

            CommitItem savedPivot = CommitItem.builder()
                    .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("QUEEN").chessWeight(10).priorityOrder(2)
                    .carryForward(false).carryForwardCount(0)
                    .unplanned(true).bumpedItemId(bumpedId).build();

            when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
            when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
            when(commitItemRepository.findById(bumpedId)).thenReturn(Optional.of(planned));
            when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedId))
                    .thenReturn(false);
            when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                    .thenReturn(List.of(planned));
            when(commitItemRepository.save(any(CommitItem.class))).thenReturn(savedPivot);
            when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

            CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                    .title("Compliance audit response")
                    .outcomeId(outcomeId)
                    .chessPiece("QUEEN")
                    .bumpedItemId(bumpedId)
                    .build();

            CommitItemResponse result = commitService.createUnplannedItem(commitId, userId, req);

            ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
            verify(commitItemRepository).save(captor.capture());

            assertThat(captor.getValue().isUnplanned())
                    .as("TC-PV-2: displacement path must set unplanned=true")
                    .isTrue();
            assertThat(captor.getValue().getBumpedItemId())
                    .as("TC-PV-2: displacement must record which item was bumped")
                    .isEqualTo(bumpedId);
        }

        @Test
        @DisplayName("Double-displacement rejected: same item cannot be bumped twice")
        void doubleBump_rejected() {
            UUID bumpedId = UUID.randomUUID();

            WeeklyCommit locked = WeeklyCommit.builder()
                    .id(commitId).userId(userId).status("LOCKED").build();
            CommitItem planned = CommitItem.builder()
                    .id(bumpedId).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .chessPiece("KING").chessWeight(20).priorityOrder(1)
                    .carryForward(false).carryForwardCount(0).unplanned(false).build();
            Outcome outcome = Outcome.builder()
                    .id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build();

            when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
            when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
            when(commitItemRepository.findById(bumpedId)).thenReturn(Optional.of(planned));
            // Already bumped once
            when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedId))
                    .thenReturn(true);

            CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                    .title("Second pivot on same item")
                    .outcomeId(outcomeId)
                    .chessPiece("PAWN")
                    .bumpedItemId(bumpedId)
                    .build();

            assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                    .as("TC-PV-2: double-displacement must be rejected")
                    .isInstanceOf(InvalidStateTransitionException.class)
                    .hasMessageContaining("already been bumped");
        }
    }

    // =========================================================================
    // TC-PV-3  State guard: unplanned items only in LOCKED / RECONCILING
    //   Adding a pivot to a DRAFT commit must be rejected immediately.
    // =========================================================================

    @Test
    @DisplayName("TC-PV-3 DRAFT commit → pivot rejected (state guard)")
    void draftCommit_pivotRejected() {
        WeeklyCommit draft = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(draft));

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Cannot pivot in draft")
                .outcomeId(outcomeId)
                .chessPiece("PAWN")
                .bumpedItemId(UUID.randomUUID())
                .build();

        assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                .as("TC-PV-3: pivots only permitted in LOCKED or RECONCILING")
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("LOCKED");
    }

    // =========================================================================
    // TC-PV-4  KTLO unplanned item: outcomeId is optional for KTLO pivots
    //   An on-call incident (KTLO) can be added mid-week without an outcome.
    //   It still displaces a planned item or uses ghost capacity.
    // =========================================================================

    @Test
    @DisplayName("TC-PV-4 KTLO pivot: outcomeId=null accepted; displacement recorded")
    void kloPivot_noOutcomeId_acceptedWhenDisplacing() {
        UUID bumpedId = UUID.randomUUID();

        WeeklyCommit locked = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        CommitItem planned = CommitItem.builder()
                .id(bumpedId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        CommitItem savedKlo = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(null)
                .chessPiece("PAWN").chessWeight(1).priorityOrder(2)
                .taskType(TaskType.KTLO).kloCategory(KloCategory.BUGFIX)
                .carryForward(false).carryForwardCount(0)
                .unplanned(true).bumpedItemId(bumpedId).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(locked));
        when(commitItemRepository.findById(bumpedId)).thenReturn(Optional.of(planned));
        when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedId))
                .thenReturn(false);
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(planned));
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(savedKlo);

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("On-call P1 production incident")
                .outcomeId(null)           // KTLO items don't link to outcomes
                .chessPiece("PAWN")
                .bumpedItemId(bumpedId)
                .taskType(TaskType.KTLO)
                .kloCategory(KloCategory.BUGFIX)
                .build();

        assertThatNoException()
                .as("TC-PV-4: KTLO pivot with null outcomeId + valid bumpedItemId must be accepted")
                .isThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req));

        ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
        verify(commitItemRepository).save(captor.capture());
        assertThat(captor.getValue().getTaskType())
                .as("TC-PV-4: saved item must carry KTLO task type")
                .isEqualTo(TaskType.KTLO);
        assertThat(captor.getValue().getOutcomeId())
                .as("TC-PV-4: KTLO item must have null outcomeId")
                .isNull();
    }
}
