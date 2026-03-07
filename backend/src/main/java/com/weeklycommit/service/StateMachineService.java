package com.weeklycommit.service;

import com.weeklycommit.dto.WeekResponse;
import com.weeklycommit.exception.CommitNotFoundException;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.StateTransition;
import com.weeklycommit.model.WeeklyCommit;
import com.weeklycommit.repository.CommitItemRepository;
import com.weeklycommit.repository.StateTransitionRepository;
import com.weeklycommit.repository.WeeklyCommitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class StateMachineService {

    private static final Map<String, String> VALID_FROM = Map.of(
            "LOCKED", "DRAFT",
            "DRAFT", "LOCKED",        // LOCKED→DRAFT retract uses key "DRAFT" with fromState check
            "RECONCILING", "LOCKED",
            "RECONCILED", "RECONCILING"
    );

    // Valid transitions: fromState → Set<allowedTargets>
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "DRAFT", Set.of("LOCKED"),
            "LOCKED", Set.of("DRAFT", "RECONCILING"),
            "RECONCILING", Set.of("RECONCILED"),
            "RECONCILED", Set.of()
    );

    private final WeeklyCommitRepository weeklyCommitRepository;
    private final CommitItemRepository commitItemRepository;
    private final StateTransitionRepository stateTransitionRepository;
    private final CommitService commitService;

    public StateMachineService(WeeklyCommitRepository weeklyCommitRepository,
                                CommitItemRepository commitItemRepository,
                                StateTransitionRepository stateTransitionRepository,
                                CommitService commitService) {
        this.weeklyCommitRepository = weeklyCommitRepository;
        this.commitItemRepository = commitItemRepository;
        this.stateTransitionRepository = stateTransitionRepository;
        this.commitService = commitService;
    }

    public WeekResponse transitionStatus(UUID commitId, UUID userId, UUID orgId,
                                          String targetStatus, String notes) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));

        String currentStatus = commit.getStatus();
        Set<String> allowed = TRANSITIONS.getOrDefault(currentStatus, Set.of());

        if (!allowed.contains(targetStatus)) {
            throw new InvalidStateTransitionException(
                    "Cannot transition from " + currentStatus + " to " + targetStatus);
        }

        // Per-transition validation
        if ("DRAFT".equals(currentStatus) && "LOCKED".equals(targetStatus)) {
            validateDraftToLocked(commitId);
        } else if ("LOCKED".equals(currentStatus) && "DRAFT".equals(targetStatus)) {
            validateLockedToDraft(commit);
        }

        // Apply timestamp
        LocalDateTime now = LocalDateTime.now();
        switch (targetStatus) {
            case "LOCKED" -> commit.setLockedAt(now);
            case "RECONCILING" -> commit.setReconcilingAt(now);
            case "RECONCILED" -> commit.setReconciledAt(now);
            default -> { /* DRAFT retract — no extra timestamp */ }
        }

        commit.setStatus(targetStatus);
        commit.setUpdatedAt(now);
        weeklyCommitRepository.save(commit);

        // Log transition immutably
        StateTransition transition = StateTransition.builder()
                .weeklyCommitId(commitId)
                .fromState(currentStatus)
                .toState(targetStatus)
                .transitionedBy(userId)
                .notes(notes)
                .build();
        stateTransitionRepository.save(transition);

        return commitService.toWeekResponse(commit);
    }

    private void validateDraftToLocked(UUID commitId) {
        List<CommitItem> items =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId);

        if (items.isEmpty()) {
            throw new InvalidStateTransitionException(
                    "Cannot lock — commit must have at least one item");
        }

        boolean anyMissingOutcome = items.stream()
                .anyMatch(i -> i.getOutcomeId() == null);
        if (anyMissingOutcome) {
            throw new InvalidStateTransitionException(
                    "Cannot lock — all items must be linked to an outcome");
        }

        boolean anyMissingPiece = items.stream()
                .anyMatch(i -> i.getChessPiece() == null || i.getChessPiece().isBlank());
        if (anyMissingPiece) {
            throw new InvalidStateTransitionException(
                    "Cannot lock — all items must have a chess piece assigned");
        }
    }

    private void validateLockedToDraft(WeeklyCommit commit) {
        if (commit.getViewedAt() != null) {
            throw new InvalidStateTransitionException(
                    "Cannot retract — manager has already viewed this commit");
        }
    }
}
