package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.CommitNotFoundException;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.exception.ItemNotFoundException;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class CommitService {

    private static final Map<String, Integer> CHESS_WEIGHTS = Map.of(
            "KING", 20,
            "QUEEN", 10,
            "ROOK", 5,
            "BISHOP", 3,
            "KNIGHT", 3,
            "PAWN", 1
    );

    private final WeeklyCommitRepository weeklyCommitRepository;
    private final CommitItemRepository commitItemRepository;
    private final OutcomeRepository outcomeRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final RallyCryRepository rallyCryRepository;

    public CommitService(WeeklyCommitRepository weeklyCommitRepository,
                         CommitItemRepository commitItemRepository,
                         OutcomeRepository outcomeRepository,
                         DefiningObjectiveRepository definingObjectiveRepository,
                         RallyCryRepository rallyCryRepository) {
        this.weeklyCommitRepository = weeklyCommitRepository;
        this.commitItemRepository = commitItemRepository;
        this.outcomeRepository = outcomeRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.rallyCryRepository = rallyCryRepository;
    }

    /**
     * Monday of the current work week (Mon–Fri). On Saturday or Sunday we use the week that just ended
     * so the locked commit stays visible (e.g. Sunday Mar 15 → Mar 9, not Mar 16).
     */
    public static LocalDate getCurrentWeekMonday() {
        LocalDate today = LocalDate.now();
        if (today.getDayOfWeek() == DayOfWeek.SATURDAY) {
            return today.minusDays(5);
        }
        if (today.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return today.minusDays(6);
        }
        return today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /**
     * Returns the commit for the current work week (Monday–Friday).
     * If a commit exists for that week (e.g. LOCKED with items), it is returned; otherwise a new DRAFT is created.
     */
    public WeekResponse getCurrentWeek(UUID userId, UUID orgId) {
        LocalDate monday = getCurrentWeekMonday();
        WeeklyCommit commit = weeklyCommitRepository
                .findByUserIdAndWeekStartDate(userId, monday)
                .orElseGet(() -> {
                    WeeklyCommit newCommit = WeeklyCommit.builder()
                            .userId(userId)
                            .orgId(orgId)
                            .weekStartDate(monday)
                            .status("DRAFT")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return weeklyCommitRepository.save(newCommit);
                });
        return toWeekResponse(commit);
    }

    /**
     * Returns the commit for the next work week (Monday + 7 days). Use this to "plan next week" or
     * run a full demo on Saturday/Sunday when you want an empty DRAFT. Creates a DRAFT if none exists.
     */
    public WeekResponse getNextWeek(UUID userId, UUID orgId) {
        LocalDate nextMonday = getCurrentWeekMonday().plusWeeks(1);
        WeeklyCommit commit = weeklyCommitRepository
                .findByUserIdAndWeekStartDate(userId, nextMonday)
                .orElseGet(() -> {
                    WeeklyCommit newCommit = WeeklyCommit.builder()
                            .userId(userId)
                            .orgId(orgId)
                            .weekStartDate(nextMonday)
                            .status("DRAFT")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return weeklyCommitRepository.save(newCommit);
                });
        return toWeekResponse(commit);
    }

    @Transactional(readOnly = true)
    public WeekResponse getCommitById(UUID commitId, UUID userId) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied to commit: " + commitId);
        }
        return toWeekResponse(commit);
    }

    public CommitItemResponse createItem(UUID commitId, UUID userId, CreateCommitItemRequest req) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied to commit: " + commitId);
        }
        if (!"DRAFT".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException(
                    "Cannot add items — commit is not in DRAFT status");
        }
        outcomeRepository.findById(req.getOutcomeId())
                .orElseThrow(() -> new ItemNotFoundException("Outcome not found: " + req.getOutcomeId()));

        int chessWeight = CHESS_WEIGHTS.get(req.getChessPiece());

        List<CommitItem> existing =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId);
        int nextOrder = existing.stream()
                .mapToInt(CommitItem::getPriorityOrder)
                .max()
                .orElse(0) + 1;

        CommitItem item = CommitItem.builder()
                .weeklyCommitId(commitId)
                .outcomeId(req.getOutcomeId())
                .title(req.getTitle())
                .description(req.getDescription())
                .chessPiece(req.getChessPiece())
                .chessWeight(chessWeight)
                .priorityOrder(nextOrder)
                .carryForward(false)
                .carryForwardCount(0)
                .unplanned(false)
                .updatedAt(LocalDateTime.now())
                .build();

        CommitItem saved = commitItemRepository.save(item);
        return toItemResponse(saved);
    }

    public CommitItemResponse createUnplannedItem(UUID commitId, UUID userId, CreateUnplannedItemRequest req) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied to commit: " + commitId);
        }
        if (!"LOCKED".equals(commit.getStatus()) && !"RECONCILING".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException(
                    "Unplanned items can only be added when the week is LOCKED or RECONCILING");
        }

        com.weeklycommit.model.TaskType taskType =
                req.getTaskType() != null ? req.getTaskType() : com.weeklycommit.model.TaskType.STRATEGIC;

        if (taskType == com.weeklycommit.model.TaskType.STRATEGIC) {
            if (req.getOutcomeId() == null) {
                throw new InvalidStateTransitionException("outcomeId is required for STRATEGIC unplanned items");
            }
            outcomeRepository.findById(req.getOutcomeId())
                    .orElseThrow(() -> new ItemNotFoundException("Outcome not found: " + req.getOutcomeId()));
        }

        int chessWeight = CHESS_WEIGHTS.get(req.getChessPiece());
        List<CommitItem> existing =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId);
        int nextOrder = existing.stream()
                .mapToInt(CommitItem::getPriorityOrder)
                .max()
                .orElse(0) + 1;

        if (req.getBumpedItemId() != null) {
            // Standard path: validate and record the displaced item
            CommitItem bumpedItem = commitItemRepository.findById(req.getBumpedItemId())
                    .orElseThrow(() -> new ItemNotFoundException("Bumped item not found: " + req.getBumpedItemId()));
            if (!bumpedItem.getWeeklyCommitId().equals(commitId)) {
                throw new InvalidStateTransitionException("Bumped item must belong to the same commit");
            }
            if (commitItemRepository.existsByWeeklyCommitIdAndBumpedItemId(commitId, req.getBumpedItemId())) {
                throw new InvalidStateTransitionException("That item has already been bumped by another unplanned item");
            }
        } else {
            // Debt-first path: no new displacement — verify ghost capacity covers the new item
            if (commit.getTotalLockedWeight() == null) {
                throw new InvalidStateTransitionException(
                        "Cannot add an unplanned item without a displacement: commit has no locked weight snapshot");
            }
            // Active weight = non-unplanned items that have NOT already been displaced
            java.util.Set<java.util.UUID> alreadyBumpedIds = existing.stream()
                    .filter(i -> i.isUnplanned() && i.getBumpedItemId() != null)
                    .map(CommitItem::getBumpedItemId)
                    .collect(java.util.stream.Collectors.toSet());
            int activeWeight = existing.stream()
                    .filter(i -> !i.isUnplanned() && !alreadyBumpedIds.contains(i.getId()))
                    .mapToInt(CommitItem::getChessWeight)
                    .sum();
            if (activeWeight + chessWeight > commit.getTotalLockedWeight()) {
                throw new InvalidStateTransitionException(
                        "Insufficient ghost capacity: displace a planned task first before adding this item");
            }
        }

        CommitItem item = CommitItem.builder()
                .weeklyCommitId(commitId)
                .outcomeId(taskType == com.weeklycommit.model.TaskType.STRATEGIC ? req.getOutcomeId() : null)
                .title(req.getTitle())
                .description(req.getDescription())
                .chessPiece(req.getChessPiece())
                .chessWeight(chessWeight)
                .priorityOrder(nextOrder)
                .carryForward(false)
                .carryForwardCount(0)
                .unplanned(true)
                .taskType(taskType)
                .kloCategory(req.getKloCategory())
                .bumpedItemId(req.getBumpedItemId())
                .updatedAt(LocalDateTime.now())
                .build();

        CommitItem saved = commitItemRepository.save(item);
        return toItemResponse(saved);
    }

    public CommitItemResponse updateItem(UUID commitId, UUID itemId, UUID userId,
                                         UpdateCommitItemRequest req) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied");
        }
        if (!"DRAFT".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException("Cannot edit items — commit is not in DRAFT status");
        }
        CommitItem item = commitItemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Item not found: " + itemId));
        if (item.isUnplanned()) {
            throw new InvalidStateTransitionException("Cannot edit unplanned items");
        }

        if (req.getTitle() != null) item.setTitle(req.getTitle());
        if (req.getDescription() != null) item.setDescription(req.getDescription());
        if (req.getOutcomeId() != null) {
            outcomeRepository.findById(req.getOutcomeId())
                    .orElseThrow(() -> new ItemNotFoundException("Outcome not found: " + req.getOutcomeId()));
            item.setOutcomeId(req.getOutcomeId());
        }
        if (req.getChessPiece() != null) {
            item.setChessPiece(req.getChessPiece());
            item.setChessWeight(CHESS_WEIGHTS.get(req.getChessPiece()));
        }
        item.setUpdatedAt(LocalDateTime.now());

        return toItemResponse(commitItemRepository.save(item));
    }

    public void deleteItem(UUID commitId, UUID itemId, UUID userId) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied");
        }
        if (!"DRAFT".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException("Cannot delete items — commit is not in DRAFT status");
        }
        CommitItem item = commitItemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Item not found: " + itemId));
        if (item.isUnplanned()) {
            throw new InvalidStateTransitionException("Cannot delete unplanned items");
        }
        commitItemRepository.delete(item);
    }

    public List<CommitItemResponse> reorderItems(UUID commitId, UUID userId, ReorderItemsRequest req) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied");
        }
        if (!"DRAFT".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException("Cannot reorder items — commit is not in DRAFT status");
        }

        List<UUID> requestedIds = req.getItems().stream()
                .map(ReorderItemDto::getId)
                .toList();

        Map<UUID, CommitItem> itemMap = commitItemRepository.findAllById(requestedIds).stream()
                .collect(Collectors.toMap(CommitItem::getId, Function.identity()));

        // Verify all items belong to this commit
        for (CommitItem ci : itemMap.values()) {
            if (!ci.getWeeklyCommitId().equals(commitId)) {
                throw new InvalidStateTransitionException("Item does not belong to this commit");
            }
        }

        // Verify all items are the same chess piece level
        long distinctPieces = itemMap.values().stream()
                .map(CommitItem::getChessPiece)
                .distinct()
                .count();
        if (distinctPieces > 1) {
            throw new InvalidStateTransitionException("Cross-piece reordering not permitted");
        }

        for (ReorderItemDto dto : req.getItems()) {
            CommitItem ci = itemMap.get(dto.getId());
            if (ci != null) {
                ci.setPriorityOrder(dto.getPriorityOrder());
                ci.setUpdatedAt(LocalDateTime.now());
                commitItemRepository.save(ci);
            }
        }

        return commitItemRepository
                .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId)
                .stream()
                .map(this::toItemResponse)
                .toList();
    }

    public CommitItemResponse reconcileItem(UUID commitId, UUID itemId, UUID userId,
                                            ReconcileItemRequest req) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied");
        }
        if (!"RECONCILING".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException(
                    "Cannot reconcile items — commit is not in RECONCILING status");
        }
        CommitItem item = commitItemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Item not found: " + itemId));
        if (!item.getWeeklyCommitId().equals(commitId)) {
            throw new ItemNotFoundException("Item not found: " + itemId);
        }

        if (req.isCarryForward() && !"PARTIAL".equals(req.getCompletionStatus())
                && !"NOT_COMPLETED".equals(req.getCompletionStatus())) {
            throw new InvalidStateTransitionException(
                    "Carry forward is only allowed for PARTIAL or NOT_COMPLETED items");
        }

        if ("BUMPED".equals(req.getCompletionStatus())) {
            boolean isTargetOfUnplanned = commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId)
                    .stream()
                    .anyMatch(other -> item.getId().equals(other.getBumpedItemId()));
            if (!isTargetOfUnplanned) {
                throw new InvalidStateTransitionException(
                        "BUMPED status is only for items that were bumped by an unplanned addition");
            }
            if (req.isCarryForward()) {
                throw new InvalidStateTransitionException("Carry forward is not allowed for BUMPED items");
            }
        }

        if (("PARTIAL".equals(req.getCompletionStatus()) || "NOT_COMPLETED".equals(req.getCompletionStatus()))
                && (req.getActualOutcome() == null || req.getActualOutcome().isBlank())) {
            throw new InvalidStateTransitionException(
                    "A reason for miss is required for PARTIAL or NOT_COMPLETED items");
        }

        item.setActualOutcome(req.getActualOutcome());
        item.setCompletionStatus(req.getCompletionStatus());
        item.setCarryForward(req.isCarryForward());
        item.setUpdatedAt(LocalDateTime.now());
        return toItemResponse(commitItemRepository.save(item));
    }

    public ReconcileCommitResponse.ReconciliationSummaryDto validateReconciliationAndGetSummary(
            UUID commitId, UUID userId) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!commit.getUserId().equals(userId)) {
            throw new UnauthorizedException("Access denied");
        }
        if (!"RECONCILING".equals(commit.getStatus())) {
            throw new InvalidStateTransitionException(
                    "Cannot complete reconciliation — commit is not in RECONCILING status");
        }
        List<CommitItem> items =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId);
        boolean anyMissingStatus = items.stream()
                .anyMatch(i -> i.getCompletionStatus() == null || i.getCompletionStatus().isBlank());
        if (anyMissingStatus) {
            throw new InvalidStateTransitionException(
                    "All items must have a completion status before reconciling");
        }

        long completed = items.stream().filter(i -> "COMPLETED".equals(i.getCompletionStatus())).count();
        long partial = items.stream().filter(i -> "PARTIAL".equals(i.getCompletionStatus())).count();
        long notCompleted = items.stream().filter(i -> "NOT_COMPLETED".equals(i.getCompletionStatus())).count();
        long bumped = items.stream().filter(i -> "BUMPED".equals(i.getCompletionStatus())).count();
        long carriedForward = items.stream().filter(CommitItem::isCarryForward).count();

        return ReconcileCommitResponse.ReconciliationSummaryDto.builder()
                .completedCount(completed)
                .partialCount(partial)
                .notCompletedCount(notCompleted)
                .bumpedCount(bumped)
                .carriedForwardCount(carriedForward)
                .build();
    }

    public void seedCarryForwards(UUID commitId) {
        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));
        if (!"RECONCILED".equals(commit.getStatus())) {
            return;
        }
        List<CommitItem> toCarry = commitItemRepository.findByWeeklyCommitIdAndCarryForwardTrue(commitId);
        if (toCarry.isEmpty()) return;

        LocalDate nextMonday = commit.getWeekStartDate().plusDays(7);
        WeeklyCommit nextWeek = weeklyCommitRepository
                .findByUserIdAndWeekStartDate(commit.getUserId(), nextMonday)
                .orElseGet(() -> {
                    WeeklyCommit newCommit = WeeklyCommit.builder()
                            .userId(commit.getUserId())
                            .orgId(commit.getOrgId())
                            .weekStartDate(nextMonday)
                            .status("DRAFT")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return weeklyCommitRepository.save(newCommit);
                });

        List<CommitItem> existing =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(nextWeek.getId());
        int nextOrder = existing.stream().mapToInt(CommitItem::getPriorityOrder).max().orElse(0) + 1;

        for (CommitItem source : toCarry) {
            if (commitItemRepository.existsByWeeklyCommitIdAndCarriedFromId(nextWeek.getId(), source.getId())) {
                continue;
            }
            CommitItem carried = CommitItem.builder()
                    .weeklyCommitId(nextWeek.getId())
                    .outcomeId(source.getOutcomeId())
                    .title(source.getTitle())
                    .description(source.getDescription())
                    .chessPiece(source.getChessPiece())
                    .chessWeight(source.getChessWeight())
                    .priorityOrder(nextOrder++)
                    .carryForward(false)
                    .carryForwardCount(0)
                    .carriedFromId(source.getId())
                    .unplanned(false)
                    .updatedAt(LocalDateTime.now())
                    .build();
            commitItemRepository.save(carried);

            source.setCarryForwardCount(source.getCarryForwardCount() + 1);
            source.setUpdatedAt(LocalDateTime.now());
            commitItemRepository.save(source);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    public WeekResponse toWeekResponse(WeeklyCommit commit) {
        List<CommitItem> items =
                commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commit.getId());

        int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();
        Integer alignmentScore = computeAlignmentScore(items);
        int totalDoneWeight = items.stream()
                .filter(i -> "COMPLETED".equals(i.getCompletionStatus()))
                .mapToInt(CommitItem::getChessWeight)
                .sum();

        List<CommitItemResponse> itemResponses = items.stream()
                .map(this::toItemResponse)
                .toList();

        return WeekResponse.builder()
                .id(commit.getId())
                .userId(commit.getUserId())
                .weekStartDate(commit.getWeekStartDate())
                .weekEndDate(commit.getWeekStartDate().plusDays(4))
                .status(commit.getStatus())
                .lockedAt(commit.getLockedAt())
                .reconcilingAt(commit.getReconcilingAt())
                .reconciledAt(commit.getReconciledAt())
                .viewedAt(commit.getViewedAt())
                .totalWeight(totalWeight)
                .alignmentScore(alignmentScore)
                .totalLockedWeight(commit.getTotalLockedWeight())
                .totalDoneWeight(totalDoneWeight)
                .items(itemResponses)
                .build();
    }

    /**
     * Alignment = (weight of STRATEGIC items / total weight) * 100.
     * KLO items count in the denominator (total capacity) but NOT the numerator.
     */
    public static Integer computeAlignmentScore(List<CommitItem> items) {
        int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();
        if (totalWeight == 0) return null;
        int alignedWeight = items.stream()
                .filter(i -> i.getTaskType() == null || i.getTaskType() == com.weeklycommit.model.TaskType.STRATEGIC)
                .filter(i -> i.getOutcomeId() != null)
                .mapToInt(CommitItem::getChessWeight)
                .sum();
        return (int) Math.round((double) alignedWeight / totalWeight * 100.0);
    }

    public UUID getRallyCryIdForOutcome(UUID outcomeId) {
        return outcomeRepository.findById(outcomeId)
                .flatMap(o -> definingObjectiveRepository.findById(o.getDefiningObjectiveId())
                        .map(DefiningObjective::getRallyCryId))
                .orElse(null);
    }

    public UUID getDefiningObjectiveIdForOutcome(UUID outcomeId) {
        return outcomeRepository.findById(outcomeId)
                .map(Outcome::getDefiningObjectiveId)
                .orElse(null);
    }

    public String getDefiningObjectiveTitle(UUID doId) {
        return definingObjectiveRepository.findById(doId)
                .map(DefiningObjective::getTitle)
                .orElse("");
    }

    public String getRallyCryTitle(UUID rallyCryId) {
        return rallyCryRepository.findById(rallyCryId)
                .map(RallyCry::getTitle)
                .orElse("");
    }

    public CommitItemResponse toItemResponse(CommitItem item) {
        OutcomeBreadcrumbDto breadcrumb = buildBreadcrumb(item.getOutcomeId());
        String bumpedItemTitle = null;
        if (item.getBumpedItemId() != null) {
            bumpedItemTitle = commitItemRepository.findById(item.getBumpedItemId())
                    .map(CommitItem::getTitle)
                    .orElse(null);
        }
        return CommitItemResponse.builder()
                .id(item.getId())
                .weeklyCommitId(item.getWeeklyCommitId())
                .outcomeId(item.getOutcomeId())
                .outcomeBreadcrumb(breadcrumb)
                .title(item.getTitle())
                .description(item.getDescription())
                .chessPiece(item.getChessPiece())
                .chessWeight(item.getChessWeight())
                .priorityOrder(item.getPriorityOrder())
                .actualOutcome(item.getActualOutcome())
                .completionStatus(item.getCompletionStatus())
                .carryForward(item.isCarryForward())
                .carryForwardCount(item.getCarryForwardCount())
                .carriedFromId(item.getCarriedFromId())
                .unplanned(item.isUnplanned())
                .taskType(item.getTaskType() != null ? item.getTaskType().name() : "STRATEGIC")
                .kloCategory(item.getKloCategory() != null ? item.getKloCategory().name() : null)
                .bumpedItemId(item.getBumpedItemId())
                .bumpedItemTitle(bumpedItemTitle)
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    // ── Team Outcome Weights ────────────────────────────────────────────────

    /**
     * Returns aggregate chess-weight totals per Outcome for the current week,
     * scoped to the caller's org.  Only DRAFT and LOCKED commits are counted.
     *
     * The query is a single GROUP-BY aggregate — no N+1 loading of full commit
     * objects.  Security boundary: orgId comes from the JWT and is never
     * caller-supplied, so a user can only see their own org's numbers.
     */
    @Transactional(readOnly = true)
    public TeamOutcomeWeightResponse getTeamOutcomeWeights(UUID orgId) {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<Object[]> rows = commitItemRepository
                .sumWeightsByOutcomeForOrgAndWeek(orgId, monday);

        // KLO items have outcomeId = null; filter them out before building the map
        // to avoid NullPointerException from Collectors.toMap (null keys are illegal).
        Map<UUID, Integer> weights = rows.stream()
                .filter(row -> row[0] != null)
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        int participatingCommits = weeklyCommitRepository
                .findByOrgIdAndWeekStartDate(orgId, monday)
                .stream()
                .filter(wc -> "DRAFT".equals(wc.getStatus()) || "LOCKED".equals(wc.getStatus()))
                .mapToInt(wc -> 1)
                .sum();

        return TeamOutcomeWeightResponse.builder()
                .weights(weights)
                .weekStartDate(monday)
                .participatingCommits(participatingCommits)
                .build();
    }

    private OutcomeBreadcrumbDto buildBreadcrumb(UUID outcomeId) {
        if (outcomeId == null) return null;
        return outcomeRepository.findById(outcomeId).map(outcome -> {
            String outcomeTitle = outcome.getTitle();
            String objectiveTitle = "";
            String rallyCryTitle = "";

            var objectiveOpt = definingObjectiveRepository.findById(outcome.getDefiningObjectiveId());
            if (objectiveOpt.isPresent()) {
                var objective = objectiveOpt.get();
                objectiveTitle = objective.getTitle();
                rallyCryTitle = rallyCryRepository.findById(objective.getRallyCryId())
                        .map(RallyCry::getTitle)
                        .orElse("");
            }

            return OutcomeBreadcrumbDto.builder()
                    .rallyCry(rallyCryTitle)
                    .definingObjective(objectiveTitle)
                    .outcome(outcomeTitle)
                    .build();
        }).orElse(null);
    }
}
