package com.weeklycommit.service;

import com.weeklycommit.dto.WeekResponse;
import com.weeklycommit.exception.CommitNotFoundException;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.WeeklyCommit;
import com.weeklycommit.repository.CommitItemRepository;
import com.weeklycommit.repository.StateTransitionRepository;
import com.weeklycommit.repository.WeeklyCommitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StateMachineServiceTest {

    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private StateTransitionRepository stateTransitionRepository;
    @Mock private CommitService commitService;

    private StateMachineService stateMachineService;

    private final UUID commitId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID orgId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        stateMachineService = new StateMachineService(
                weeklyCommitRepository,
                commitItemRepository,
                stateTransitionRepository,
                commitService
        );
    }

    private WeeklyCommit draftCommit() {
        return WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(LocalDate.now()).status("DRAFT").build();
    }

    private WeeklyCommit lockedCommit() {
        return WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(LocalDate.now()).status("LOCKED").build();
    }

    private CommitItem validItem(UUID id) {
        return CommitItem.builder()
                .id(id)
                .weeklyCommitId(commitId)
                .outcomeId(UUID.randomUUID())
                .title("Task")
                .chessPiece("QUEEN")
                .chessWeight(80)
                .priorityOrder(1)
                .carryForward(false)
                .carryForwardCount(0)
                .build();
    }

    // ── DRAFT → LOCKED ────────────────────────────────────────────────────────

    @Test
    void draftToLocked_succeedsWithValidItems() {
        WeeklyCommit commit = draftCommit();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(validItem(UUID.randomUUID())));
        when(weeklyCommitRepository.save(any())).thenReturn(commit);
        when(stateTransitionRepository.save(any())).thenReturn(null);
        when(commitService.toWeekResponse(any())).thenReturn(new WeekResponse());

        assertThatCode(() -> stateMachineService.transitionStatus(commitId, userId, orgId, "LOCKED", null))
                .doesNotThrowAnyException();

        verify(weeklyCommitRepository).save(argThat(c -> "LOCKED".equals(c.getStatus())));
        verify(stateTransitionRepository).save(argThat(t ->
                "DRAFT".equals(t.getFromState()) && "LOCKED".equals(t.getToState())));
    }

    @Test
    void draftToLocked_failsWithNoItems() {
        WeeklyCommit commit = draftCommit();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "LOCKED", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("at least one item");
    }

    @Test
    void draftToLocked_failsWhenItemMissingOutcomeId() {
        WeeklyCommit commit = draftCommit();
        CommitItem itemNoOutcome = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId)
                .outcomeId(null)            // missing
                .title("Task").chessPiece("PAWN").chessWeight(10).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(itemNoOutcome));

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "LOCKED", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("outcome");
    }

    @Test
    void draftToLocked_failsWhenItemMissingChessPiece() {
        WeeklyCommit commit = draftCommit();
        CommitItem itemNoPiece = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commitId)
                .outcomeId(UUID.randomUUID())
                .title("Task").chessPiece(null)   // missing
                .chessWeight(10).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).build();

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of(itemNoPiece));

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "LOCKED", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("chess piece");
    }

    // ── LOCKED → DRAFT (retract) ──────────────────────────────────────────────

    @Test
    void lockedToDraft_succeedsWhenViewedAtIsNull() {
        WeeklyCommit commit = lockedCommit();
        commit.setViewedAt(null);

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(weeklyCommitRepository.save(any())).thenReturn(commit);
        when(stateTransitionRepository.save(any())).thenReturn(null);
        when(commitService.toWeekResponse(any())).thenReturn(new WeekResponse());

        assertThatCode(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "DRAFT", null))
                .doesNotThrowAnyException();

        verify(weeklyCommitRepository).save(argThat(c -> "DRAFT".equals(c.getStatus())));
    }

    @Test
    void lockedToDraft_failsWhenManagerHasViewed() {
        WeeklyCommit commit = lockedCommit();
        commit.setViewedAt(LocalDateTime.now().minusHours(1));

        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "DRAFT", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("manager has already viewed");
    }

    // ── invalid transitions ───────────────────────────────────────────────────

    @Test
    void illegalTransition_draftToReconciling_throws() {
        WeeklyCommit commit = draftCommit();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "RECONCILING", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Cannot transition from DRAFT to RECONCILING");
    }

    @Test
    void illegalTransition_reconciledToAny_throws() {
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(userId).orgId(orgId)
                .weekStartDate(LocalDate.now()).status("RECONCILED").build();
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));

        assertThatThrownBy(() ->
                stateMachineService.transitionStatus(commitId, userId, orgId, "DRAFT", null))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Cannot transition from RECONCILED to DRAFT");
    }
}
