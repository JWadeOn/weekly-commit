package com.weeklycommit.service;

import com.weeklycommit.dto.CommitItemResponse;
import com.weeklycommit.dto.CreateCommitItemRequest;
import com.weeklycommit.dto.CreateUnplannedItemRequest;
import com.weeklycommit.dto.WeekResponse;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.exception.ItemNotFoundException;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.Outcome;
import com.weeklycommit.model.WeeklyCommit;
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

@ExtendWith(MockitoExtension.class)
class CommitServiceTest {

    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private RallyCryRepository rallyCryRepository;

    private CommitService commitService;

    private final UUID userId = UUID.randomUUID();
    private final UUID orgId = UUID.randomUUID();
    private final UUID commitId = UUID.randomUUID();
    private final UUID outcomeId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        commitService = new CommitService(
                weeklyCommitRepository,
                commitItemRepository,
                outcomeRepository,
                definingObjectiveRepository,
                rallyCryRepository
        );
    }

    // ── getCurrentWeek ────────────────────────────────────────────────────────

    @Test
    void getCurrentWeek_createsNewDraftWhenNoneExists() {
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(userId), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        WeeklyCommit saved = WeeklyCommit.builder()
                .id(commitId)
                .userId(userId)
                .orgId(orgId)
                .weekStartDate(LocalDate.now())
                .status("DRAFT")
                .build();
        when(weeklyCommitRepository.save(any(WeeklyCommit.class))).thenReturn(saved);
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());

        WeekResponse result = commitService.getCurrentWeek(userId, orgId);

        assertThat(result.getStatus()).isEqualTo("DRAFT");
        assertThat(result.getItems()).isEmpty();

        ArgumentCaptor<WeeklyCommit> captor = ArgumentCaptor.forClass(WeeklyCommit.class);
        verify(weeklyCommitRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("DRAFT");
        assertThat(captor.getValue().getUserId()).isEqualTo(userId);
        assertThat(captor.getValue().getOrgId()).isEqualTo(orgId);
    }

    @Test
    void getCurrentWeek_returnsExistingCommit() {
        WeeklyCommit existing = WeeklyCommit.builder()
                .id(commitId)
                .userId(userId)
                .orgId(orgId)
                .weekStartDate(LocalDate.now())
                .status("LOCKED")
                .build();
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(userId), any(LocalDate.class)))
                .thenReturn(Optional.of(existing));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());

        WeekResponse result = commitService.getCurrentWeek(userId, orgId);

        assertThat(result.getStatus()).isEqualTo("LOCKED");
        verify(weeklyCommitRepository, never()).save(any());
    }

    // ── createItem ────────────────────────────────────────────────────────────

    @Test
    void createItem_failsWhenCommitNotInDraft() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        CreateCommitItemRequest req = CreateCommitItemRequest.builder()
                .title("Test").outcomeId(outcomeId).chessPiece("QUEEN").build();

        assertThatThrownBy(() -> commitService.createItem(commitId, userId, req))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void createItem_correctlyDerivesChessWeightFromPiece() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        Outcome outcome = Outcome.builder()
                .id(outcomeId)
                .title("Outcome")
                .definingObjectiveId(UUID.randomUUID())
                .build();
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());

        CommitItem saved = CommitItem.builder()
                .id(UUID.randomUUID())
                .weeklyCommitId(commitId)
                .outcomeId(outcomeId)
                .title("Test")
                .chessPiece("KING")
                .chessWeight(100)
                .priorityOrder(1)
                .carryForward(false)
                .carryForwardCount(0)
                .unplanned(false)
                .build();
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(saved);
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

        CreateCommitItemRequest req = CreateCommitItemRequest.builder()
                .title("Test").outcomeId(outcomeId).chessPiece("KING").build();

        CommitItemResponse response = commitService.createItem(commitId, userId, req);

        ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
        verify(commitItemRepository).save(captor.capture());
        assertThat(captor.getValue().getChessWeight()).isEqualTo(100);
        assertThat(captor.getValue().getChessPiece()).isEqualTo("KING");
    }

    @Test
    void createItem_allChessWeightsMappedCorrectly() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        Outcome outcome = Outcome.builder()
                .id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build();
        when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());
        when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

        int[] expectedWeights = {100, 80, 60, 40, 20, 10};
        String[] pieces = {"KING", "QUEEN", "ROOK", "BISHOP", "KNIGHT", "PAWN"};

        for (int i = 0; i < pieces.length; i++) {
            String piece = pieces[i];
            int expectedWeight = expectedWeights[i];

            CommitItem saved = CommitItem.builder()
                    .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                    .title("T").chessPiece(piece).chessWeight(expectedWeight)
                    .priorityOrder(1).carryForward(false).carryForwardCount(0).unplanned(false).build();
            when(commitItemRepository.save(any(CommitItem.class))).thenReturn(saved);

            CreateCommitItemRequest req = CreateCommitItemRequest.builder()
                    .title("T").outcomeId(outcomeId).chessPiece(piece).build();
            commitService.createItem(commitId, userId, req);

            ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
            verify(commitItemRepository, atLeastOnce()).save(captor.capture());
            CommitItem lastSaved = captor.getValue();
            assertThat(lastSaved.getChessWeight())
                    .as("Weight for " + piece).isEqualTo(expectedWeight);
        }
    }

    // ── deleteItem ────────────────────────────────────────────────────────────

    @Test
    void deleteItem_failsWhenCommitNotInDraft() {
        UUID itemId = UUID.randomUUID();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        assertThatThrownBy(() -> commitService.deleteItem(commitId, itemId, userId))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void deleteItem_failsWhenItemIsUnplanned() {
        UUID itemId = UUID.randomUUID();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        CommitItem item = CommitItem.builder()
                .id(itemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("U").chessPiece("QUEEN").chessWeight(80).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(true).build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> commitService.deleteItem(commitId, itemId, userId))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("unplanned");
    }

    // ── createUnplannedItem ───────────────────────────────────────────────────

    @Test
    void createUnplannedItem_failsWhenCommitNotLockedOrReconciling() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        UUID bumpedItemId = UUID.randomUUID();
        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Pivot").outcomeId(outcomeId).chessPiece("QUEEN").bumpedItemId(bumpedItemId).build();

        assertThatThrownBy(() -> commitService.createUnplannedItem(commitId, userId, req))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("LOCKED");
    }

    @Test
    void createUnplannedItem_savesWithUnplannedTrueAndBumpedItemId() {
        UUID bumpedItemId = UUID.randomUUID();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).status("LOCKED").build();
        CommitItem bumpedItem = CommitItem.builder()
                .id(bumpedItemId).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("Bumped").chessPiece("PAWN").chessWeight(10).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(outcomeRepository.findById(outcomeId)).thenReturn(
                Optional.of(Outcome.builder().id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build()));
        when(commitItemRepository.findById(bumpedItemId)).thenReturn(Optional.of(bumpedItem));
        when(commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, bumpedItemId)).thenReturn(false);
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(bumpedItem));
        CommitItem saved = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("Pivot").chessPiece("QUEEN").chessWeight(80).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(true).bumpedItemId(bumpedItemId).build();
        when(commitItemRepository.save(any(CommitItem.class))).thenReturn(saved);
        when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

        CreateUnplannedItemRequest req = CreateUnplannedItemRequest.builder()
                .title("Pivot").outcomeId(outcomeId).chessPiece("QUEEN").bumpedItemId(bumpedItemId).build();
        commitService.createUnplannedItem(commitId, userId, req);

        ArgumentCaptor<CommitItem> captor = ArgumentCaptor.forClass(CommitItem.class);
        verify(commitItemRepository).save(captor.capture());
        assertThat(captor.getValue().isUnplanned()).isTrue();
        assertThat(captor.getValue().getBumpedItemId()).isEqualTo(bumpedItemId);
    }

    // ── toWeekResponse / alignmentScore ────────────────────────────────────────

    @Test
    void toWeekResponse_returnsAlignmentScore100WhenAllItemsHaveOutcome() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId).weekStartDate(LocalDate.now())
                .status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        CommitItem item1 = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("A").chessPiece("KING").chessWeight(100).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem item2 = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId).outcomeId(outcomeId)
                .title("B").chessPiece("QUEEN").chessWeight(80).priorityOrder(2)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(item1, item2));
        when(outcomeRepository.findById(outcomeId)).thenReturn(
                Optional.of(Outcome.builder().id(outcomeId).title("O").definingObjectiveId(UUID.randomUUID()).build()));
        when(definingObjectiveRepository.findById(any())).thenReturn(Optional.empty());

        WeekResponse result = commitService.getCommitById(commitId, userId);

        assertThat(result.getTotalWeight()).isEqualTo(180);
        assertThat(result.getAlignmentScore()).isEqualTo(100);
    }

    @Test
    void toWeekResponse_returnsAlignmentScoreNullWhenNoItems() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId).weekStartDate(LocalDate.now())
                .status("DRAFT").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());

        WeekResponse result = commitService.getCommitById(commitId, userId);

        assertThat(result.getTotalWeight()).isEqualTo(0);
        assertThat(result.getAlignmentScore()).isNull();
    }
}
