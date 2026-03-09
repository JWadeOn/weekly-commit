package com.weeklycommit.controller;

import com.weeklycommit.config.SecurityContextHelper;
import com.weeklycommit.dto.*;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.WeeklyCommit;
import com.weeklycommit.repository.CommitItemRepository;
import com.weeklycommit.repository.WeeklyCommitRepository;
import com.weeklycommit.service.CommitService;
import com.weeklycommit.service.StateMachineService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/commits")
public class CommitController {

    private final CommitService commitService;
    private final StateMachineService stateMachineService;
    private final WeeklyCommitRepository weeklyCommitRepository;
    private final CommitItemRepository commitItemRepository;

    public CommitController(CommitService commitService,
                             StateMachineService stateMachineService,
                             WeeklyCommitRepository weeklyCommitRepository,
                             CommitItemRepository commitItemRepository) {
        this.commitService = commitService;
        this.stateMachineService = stateMachineService;
        this.weeklyCommitRepository = weeklyCommitRepository;
        this.commitItemRepository = commitItemRepository;
    }

    @GetMapping("/current")
    public ResponseEntity<WeekResponse> getCurrent() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(commitService.getCurrentWeek(userId, orgId));
    }

    @GetMapping("/history")
    public ResponseEntity<PagedResponse<CommitSummaryResponse>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        UUID userId = SecurityContextHelper.getCurrentUserId();
        LocalDate currentMonday = LocalDate.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<WeeklyCommit> all = weeklyCommitRepository.findByUserIdOrderByWeekStartDateDesc(userId);
        List<WeeklyCommit> past = all.stream()
                .filter(c -> c.getWeekStartDate().isBefore(currentMonday))
                .toList();

        int total = past.size();
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<WeeklyCommit> paged = past.subList(fromIndex, toIndex);

        List<CommitSummaryResponse> summaries = paged.stream()
                .map(commit -> {
                    List<CommitItem> items =
                            commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(
                                    commit.getId());
                    int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();
                    long completed = items.stream()
                            .filter(i -> "COMPLETED".equals(i.getCompletionStatus())).count();
                    long partial = items.stream()
                            .filter(i -> "PARTIAL".equals(i.getCompletionStatus())).count();
                    long notCompleted = items.stream()
                            .filter(i -> "NOT_COMPLETED".equals(i.getCompletionStatus())).count();
                    long carriedForward = items.stream()
                            .filter(CommitItem::isCarryForward).count();

                    return CommitSummaryResponse.builder()
                            .id(commit.getId())
                            .weekStartDate(commit.getWeekStartDate())
                            .weekEndDate(commit.getWeekStartDate().plusDays(4))
                            .status(commit.getStatus())
                            .totalWeight(totalWeight)
                            .alignmentScore(CommitService.computeAlignmentScore(items))
                            .itemCount(items.size())
                            .completedCount(completed)
                            .partialCount(partial)
                            .notCompletedCount(notCompleted)
                            .carriedForwardCount(carriedForward)
                            .build();
                })
                .toList();

        return ResponseEntity.ok(PagedResponse.<CommitSummaryResponse>builder()
                .content(summaries)
                .totalElements(total)
                .totalPages(totalPages)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WeekResponse> getById(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(commitService.getCommitById(id, userId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<WeekResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StatusUpdateRequest req) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(
                stateMachineService.transitionStatus(id, userId, orgId, req.getStatus(), req.getNotes()));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<CommitItemResponse> createItem(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommitItemRequest req) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.status(201).body(commitService.createItem(id, userId, req));
    }

    @PutMapping("/{id}/items/{itemId}")
    public ResponseEntity<CommitItemResponse> updateItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateCommitItemRequest req) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(commitService.updateItem(id, itemId, userId, req));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Void> deleteItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        commitService.deleteItem(id, itemId, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/items/reorder")
    public ResponseEntity<List<CommitItemResponse>> reorderItems(
            @PathVariable UUID id,
            @Valid @RequestBody ReorderItemsRequest req) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(commitService.reorderItems(id, userId, req));
    }

    @PutMapping("/{id}/items/{itemId}/reconcile")
    public ResponseEntity<CommitItemResponse> reconcileItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody ReconcileItemRequest req) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(commitService.reconcileItem(id, itemId, userId, req));
    }

    @PostMapping("/{id}/reconcile")
    public ResponseEntity<ReconcileCommitResponse> completeReconciliation(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        ReconcileCommitResponse.ReconciliationSummaryDto summary =
                commitService.validateReconciliationAndGetSummary(id, userId);
        stateMachineService.transitionStatus(id, userId, orgId, "RECONCILED", null);
        commitService.seedCarryForwards(id);
        ReconcileCommitResponse response = ReconcileCommitResponse.builder()
                .id(id)
                .status("RECONCILED")
                .summary(summary)
                .build();
        return ResponseEntity.ok(response);
    }
}
