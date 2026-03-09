package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.CommitNotFoundException;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.model.CommitItem;
import com.weeklycommit.model.ManagerNote;
import com.weeklycommit.model.User;
import com.weeklycommit.model.WeeklyCommit;
import com.weeklycommit.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class ManagerService {

    private final UserRepository userRepository;
    private final WeeklyCommitRepository weeklyCommitRepository;
    private final CommitItemRepository commitItemRepository;
    private final ManagerNoteRepository managerNoteRepository;
    private final CommitService commitService;

    public ManagerService(UserRepository userRepository,
                          WeeklyCommitRepository weeklyCommitRepository,
                          CommitItemRepository commitItemRepository,
                          ManagerNoteRepository managerNoteRepository,
                          CommitService commitService) {
        this.userRepository = userRepository;
        this.weeklyCommitRepository = weeklyCommitRepository;
        this.commitItemRepository = commitItemRepository;
        this.managerNoteRepository = managerNoteRepository;
        this.commitService = commitService;
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeam(UUID managerId, UUID orgId) {
        List<User> reports = userRepository.findByManagerId(managerId);
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        return reports.stream().map(report -> {
            Optional<WeeklyCommit> commitOpt =
                    weeklyCommitRepository.findByUserIdAndWeekStartDate(report.getId(), monday);

            UUID currentCommitId = commitOpt.map(WeeklyCommit::getId).orElse(null);
            String currentCommitStatus = commitOpt.map(WeeklyCommit::getStatus).orElse(null);
            Double alignmentScore = null;
            int itemCount = 0;
            java.time.Instant lastUpdated = null;

            if (commitOpt.isPresent()) {
                List<CommitItem> items = commitItemRepository
                        .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitOpt.get().getId());
                itemCount = items.size();
                int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();
                if (totalWeight > 0) {
                    int alignedWeight = items.stream()
                            .filter(i -> i.getOutcomeId() != null)
                            .mapToInt(CommitItem::getChessWeight)
                            .sum();
                    alignmentScore = (double) alignedWeight / totalWeight * 100.0;
                }
                if (commitOpt.get().getUpdatedAt() != null) {
                    lastUpdated = commitOpt.get().getUpdatedAt().toInstant(ZoneOffset.UTC);
                }
            }

            List<Integer> alignmentTrend = computeAlignmentTrend(report.getId(), 4);

            return TeamMemberResponse.builder()
                    .userId(report.getId())
                    .fullName(report.getFullName())
                    .email(report.getEmail())
                    .currentCommitId(currentCommitId)
                    .currentCommitStatus(currentCommitStatus)
                    .alignmentScore(alignmentScore)
                    .itemCount(itemCount)
                    .alignmentTrend(alignmentTrend)
                    .lastUpdated(lastUpdated)
                    .build();
        }).toList();
    }

    private List<Integer> computeAlignmentTrend(UUID userId, int weeks) {
        List<WeeklyCommit> commits = weeklyCommitRepository.findByUserIdOrderByWeekStartDateDesc(userId);
        List<Integer> trend = new ArrayList<>();
        for (int i = 0; i < Math.min(weeks, commits.size()); i++) {
            WeeklyCommit c = commits.get(i);
            List<CommitItem> items = commitItemRepository
                    .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(c.getId());
            Integer score = CommitService.computeAlignmentScore(items);
            if (score != null) trend.add(score);
        }
        return trend;
    }

    public PagedResponse<CommitSummaryResponse> getDirectReportCommits(
            UUID managerId, UUID reportUserId, int page, int size) {
        verifyDirectReport(managerId, reportUserId);

        List<WeeklyCommit> all =
                weeklyCommitRepository.findByUserIdOrderByWeekStartDateDesc(reportUserId);

        // Set viewed_at on LOCKED commits the manager is seeing for the first time
        for (WeeklyCommit commit : all) {
            if ("LOCKED".equals(commit.getStatus()) && commit.getViewedAt() == null) {
                commit.setViewedAt(LocalDateTime.now());
                commit.setUpdatedAt(LocalDateTime.now());
                weeklyCommitRepository.save(commit);
            }
        }

        int total = all.size();
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) total / size);
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<WeeklyCommit> paged = all.subList(fromIndex, toIndex);

        List<CommitSummaryResponse> summaries = paged.stream().map(commit -> {
            List<CommitItem> items = commitItemRepository
                    .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commit.getId());
            int totalWeight = items.stream().mapToInt(CommitItem::getChessWeight).sum();
            long completed = items.stream()
                    .filter(i -> "COMPLETED".equals(i.getCompletionStatus())).count();
            long partial = items.stream()
                    .filter(i -> "PARTIAL".equals(i.getCompletionStatus())).count();
            long notCompleted = items.stream()
                    .filter(i -> "NOT_COMPLETED".equals(i.getCompletionStatus())).count();
            long carriedForward = items.stream().filter(CommitItem::isCarryForward).count();

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
        }).toList();

        return PagedResponse.<CommitSummaryResponse>builder()
                .content(summaries)
                .totalElements(total)
                .totalPages(totalPages)
                .build();
    }

    public WeekResponse getDirectReportCommit(UUID managerId, UUID reportUserId, UUID commitId) {
        verifyDirectReport(managerId, reportUserId);

        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));

        if (!commit.getUserId().equals(reportUserId)) {
            throw new UnauthorizedException("Commit does not belong to this user");
        }

        if (commit.getViewedAt() == null) {
            commit.setViewedAt(LocalDateTime.now());
            commit.setUpdatedAt(LocalDateTime.now());
            weeklyCommitRepository.save(commit);
        }

        return commitService.toWeekResponse(commit);
    }

    public ManagerNoteResponse addNote(UUID managerId, UUID reportUserId, UUID commitId, String note) {
        verifyDirectReport(managerId, reportUserId);

        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));

        if (!commit.getUserId().equals(reportUserId)) {
            throw new UnauthorizedException("Commit does not belong to this user");
        }

        ManagerNote managerNote = ManagerNote.builder()
                .weeklyCommitId(commitId)
                .managerId(managerId)
                .note(note)
                .build();
        ManagerNote saved = managerNoteRepository.save(managerNote);

        String managerName = userRepository.findById(managerId)
                .map(User::getFullName)
                .orElse("Unknown");

        return toNoteResponse(saved, managerName);
    }

    @Transactional(readOnly = true)
    public List<ManagerNoteResponse> getNotes(UUID managerId, UUID reportUserId, UUID commitId) {
        verifyDirectReport(managerId, reportUserId);

        WeeklyCommit commit = weeklyCommitRepository.findById(commitId)
                .orElseThrow(() -> new CommitNotFoundException("Commit not found: " + commitId));

        if (!commit.getUserId().equals(reportUserId)) {
            throw new UnauthorizedException("Commit does not belong to this user");
        }

        List<ManagerNote> notes =
                managerNoteRepository.findByWeeklyCommitIdOrderByCreatedAtDesc(commitId);

        return notes.stream().map(n -> {
            String managerName = userRepository.findById(n.getManagerId())
                    .map(User::getFullName)
                    .orElse("Unknown");
            return toNoteResponse(n, managerName);
        }).toList();
    }

    @Transactional(readOnly = true)
    public TeamAlignmentResponse getTeamAlignment(UUID managerId, UUID orgId) {
        List<User> reports = userRepository.findByManagerId(managerId);
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        long totalWeight = 0;
        long alignedWeight = 0;
        Map<UUID, RallyCryBucket> byRallyCry = new java.util.HashMap<>();

        for (User report : reports) {
            Optional<WeeklyCommit> commitOpt =
                    weeklyCommitRepository.findByUserIdAndWeekStartDate(report.getId(), monday);
            if (commitOpt.isEmpty()) continue;

            List<CommitItem> items = commitItemRepository
                    .findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitOpt.get().getId());
            for (CommitItem item : items) {
                int w = item.getChessWeight();
                totalWeight += w;
                if (item.getOutcomeId() != null) {
                    alignedWeight += w;
                    UUID rallyCryId = commitService.getRallyCryIdForOutcome(item.getOutcomeId());
                    if (rallyCryId != null) {
                        byRallyCry.computeIfAbsent(rallyCryId, k -> new RallyCryBucket())
                                .add(item.getChessWeight(), report.getId(), report.getFullName());
                    }
                }
            }
        }

        int alignmentPercentage = totalWeight > 0
                ? (int) Math.round((double) alignedWeight / totalWeight * 100.0)
                : 0;

        final long totalWeightFinal = totalWeight;
        List<TeamAlignmentResponse.RallyCryBreakdownDto> breakdown = byRallyCry.entrySet().stream()
                .map(e -> {
                    RallyCryBucket b = e.getValue();
                    int pct = totalWeightFinal > 0 ? (int) Math.round((double) b.weight / totalWeightFinal * 100.0) : 0;
                    return TeamAlignmentResponse.RallyCryBreakdownDto.builder()
                            .rallyCryId(e.getKey())
                            .title(commitService.getRallyCryTitle(e.getKey()))
                            .supportingItemCount(b.itemCount)
                            .supportingWeight(b.weight)
                            .weightPercentage(pct)
                            .contributors(b.getContributorsList())
                            .build();
                })
                .toList();

        int thresholdPct = 10;
        List<TeamAlignmentResponse.UnderSupportedRallyCryDto> underSupported = breakdown.stream()
                .filter(rc -> rc.getWeightPercentage() > 0 && rc.getWeightPercentage() < thresholdPct)
                .map(rc -> TeamAlignmentResponse.UnderSupportedRallyCryDto.builder()
                        .rallyCryId(rc.getRallyCryId())
                        .title(rc.getTitle())
                        .supportPercentage(rc.getWeightPercentage())
                        .build())
                .toList();

        return TeamAlignmentResponse.builder()
                .totalWeight(totalWeight)
                .alignedWeight(alignedWeight)
                .alignmentPercentage(alignmentPercentage)
                .rallyCryBreakdown(breakdown)
                .underSupportedRallyCries(underSupported)
                .build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void verifyDirectReport(UUID managerId, UUID reportUserId) {
        User report = userRepository.findById(reportUserId)
                .orElseThrow(() -> new UnauthorizedException("User not found: " + reportUserId));
        if (!managerId.equals(report.getManagerId())) {
            throw new UnauthorizedException("User is not a direct report of this manager");
        }
    }

    private ManagerNoteResponse toNoteResponse(ManagerNote note, String managerName) {
        return ManagerNoteResponse.builder()
                .id(note.getId())
                .managerId(note.getManagerId())
                .managerName(managerName)
                .note(note.getNote())
                .createdAt(note.getCreatedAt())
                .build();
    }

    private static class RallyCryBucket {
        long weight;
        int itemCount;
        Map<UUID, ContributorCount> contributors = new java.util.HashMap<>();

        void add(int itemWeight, UUID userId, String fullName) {
            weight += itemWeight;
            itemCount++;
            contributors.compute(userId, (k, v) -> v == null
                    ? new ContributorCount(userId, fullName, 1)
                    : new ContributorCount(userId, fullName, v.itemCount + 1));
        }

        List<TeamAlignmentResponse.ContributorDto> getContributorsList() {
            return contributors.values().stream()
                    .map(c -> TeamAlignmentResponse.ContributorDto.builder()
                            .userId(c.userId)
                            .fullName(c.fullName)
                            .itemCount(c.itemCount)
                            .build())
                    .toList();
        }
    }

    private record ContributorCount(UUID userId, String fullName, int itemCount) {}
}
