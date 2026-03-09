package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.CommitNotFoundException;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.model.ManagerNote;
import com.weeklycommit.model.User;
import com.weeklycommit.model.WeeklyCommit;
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

@ExtendWith(MockitoExtension.class)
class ManagerServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private ManagerNoteRepository managerNoteRepository;
    @Mock private CommitService commitService;

    private ManagerService managerService;

    private final UUID managerId = UUID.randomUUID();
    private final UUID reportUserId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID orgId = UUID.randomUUID();
    private final UUID commitId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        managerService = new ManagerService(
                userRepository,
                weeklyCommitRepository,
                commitItemRepository,
                managerNoteRepository,
                commitService
        );
    }

    // ── getTeam ───────────────────────────────────────────────────────────────

    @Test
    void getTeam_returnsOnlyDirectReports() {
        User report = User.builder()
                .id(reportUserId)
                .orgId(orgId)
                .email("sarah@acme.com")
                .fullName("Sarah Employee")
                .oauthSubject("mock|employee")
                .managerId(managerId)
                .build();

        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportUserId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(weeklyCommitRepository.findByUserIdOrderByWeekStartDateDesc(reportUserId)).thenReturn(List.of());

        List<TeamMemberResponse> result = managerService.getTeam(managerId, orgId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo(reportUserId);
        assertThat(result.get(0).getFullName()).isEqualTo("Sarah Employee");
        assertThat(result.get(0).getEmail()).isEqualTo("sarah@acme.com");
        assertThat(result.get(0).getCurrentCommitId()).isNull();
        assertThat(result.get(0).getCurrentCommitStatus()).isNull();
        verify(userRepository).findByManagerId(managerId);
    }

    @Test
    void getTeam_includesCurrentCommitStatusWhenExists() {
        User report = User.builder()
                .id(reportUserId)
                .orgId(orgId)
                .email("sarah@acme.com")
                .fullName("Sarah Employee")
                .oauthSubject("mock|employee")
                .managerId(managerId)
                .build();

        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId)
                .userId(reportUserId)
                .orgId(orgId)
                .weekStartDate(LocalDate.now())
                .status("LOCKED")
                .build();

        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report));
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(reportUserId), any(LocalDate.class)))
                .thenReturn(Optional.of(commit));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commitId))
                .thenReturn(List.of());
        when(weeklyCommitRepository.findByUserIdOrderByWeekStartDateDesc(reportUserId)).thenReturn(List.of(commit));

        List<TeamMemberResponse> result = managerService.getTeam(managerId, orgId);

        assertThat(result.get(0).getCurrentCommitId()).isEqualTo(commitId);
        assertThat(result.get(0).getCurrentCommitStatus()).isEqualTo("LOCKED");
        assertThat(result.get(0).getItemCount()).isEqualTo(0);
        assertThat(result.get(0).getAlignmentScore()).isNull();
    }

    // ── getDirectReportCommit ─────────────────────────────────────────────────

    @Test
    void getDirectReportCommit_setsViewedAtOnFirstAccess() {
        User report = User.builder()
                .id(reportUserId).managerId(managerId).build();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId)
                .userId(reportUserId)
                .status("LOCKED")
                .viewedAt(null)
                .build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(weeklyCommitRepository.save(any())).thenReturn(commit);
        when(commitService.toWeekResponse(any())).thenReturn(WeekResponse.builder()
                .id(commitId).status("LOCKED").build());

        managerService.getDirectReportCommit(managerId, reportUserId, commitId);

        ArgumentCaptor<WeeklyCommit> captor = ArgumentCaptor.forClass(WeeklyCommit.class);
        verify(weeklyCommitRepository).save(captor.capture());
        assertThat(captor.getValue().getViewedAt()).isNotNull();
    }

    @Test
    void getDirectReportCommit_doesNotUpdateViewedAtIfAlreadySet() {
        LocalDateTime alreadyViewed = LocalDateTime.now().minusHours(1);
        User report = User.builder()
                .id(reportUserId).managerId(managerId).build();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId)
                .userId(reportUserId)
                .status("LOCKED")
                .viewedAt(alreadyViewed)
                .build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(commitService.toWeekResponse(any())).thenReturn(WeekResponse.builder()
                .id(commitId).status("LOCKED").viewedAt(alreadyViewed).build());

        WeekResponse result = managerService.getDirectReportCommit(managerId, reportUserId, commitId);

        verify(weeklyCommitRepository, never()).save(any());
        assertThat(result.getViewedAt()).isEqualTo(alreadyViewed);
    }

    @Test
    void getDirectReportCommit_throws403IfNotDirectReport() {
        User report = User.builder()
                .id(reportUserId)
                .managerId(otherUserId)   // managed by someone else
                .build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));

        assertThatThrownBy(() ->
                managerService.getDirectReportCommit(managerId, reportUserId, commitId))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not a direct report");
    }

    @Test
    void getDirectReportCommit_throws404WhenCommitNotFound() {
        User report = User.builder()
                .id(reportUserId).managerId(managerId).build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                managerService.getDirectReportCommit(managerId, reportUserId, commitId))
                .isInstanceOf(CommitNotFoundException.class);
    }

    // ── addNote ───────────────────────────────────────────────────────────────

    @Test
    void addNote_savesNoteAndReturnsWithManagerName() {
        User report = User.builder()
                .id(reportUserId).managerId(managerId).build();
        User manager = User.builder()
                .id(managerId).fullName("Alex Manager").build();
        WeeklyCommit commit = WeeklyCommit.builder()
                .id(commitId).userId(reportUserId).status("LOCKED").build();

        UUID noteId = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.now();
        ManagerNote savedNote = ManagerNote.builder()
                .id(noteId)
                .weeklyCommitId(commitId)
                .managerId(managerId)
                .note("Great alignment this week.")
                .createdAt(createdAt)
                .build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));
        when(weeklyCommitRepository.findById(commitId)).thenReturn(Optional.of(commit));
        when(managerNoteRepository.save(any(ManagerNote.class))).thenReturn(savedNote);
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

        ManagerNoteResponse result =
                managerService.addNote(managerId, reportUserId, commitId, "Great alignment this week.");

        assertThat(result.getId()).isEqualTo(noteId);
        assertThat(result.getManagerId()).isEqualTo(managerId);
        assertThat(result.getManagerName()).isEqualTo("Alex Manager");
        assertThat(result.getNote()).isEqualTo("Great alignment this week.");

        ArgumentCaptor<ManagerNote> captor = ArgumentCaptor.forClass(ManagerNote.class);
        verify(managerNoteRepository).save(captor.capture());
        assertThat(captor.getValue().getWeeklyCommitId()).isEqualTo(commitId);
        assertThat(captor.getValue().getManagerId()).isEqualTo(managerId);
    }

    @Test
    void addNote_throws403IfNotDirectReport() {
        User report = User.builder()
                .id(reportUserId)
                .managerId(otherUserId)
                .build();

        when(userRepository.findById(reportUserId)).thenReturn(Optional.of(report));

        assertThatThrownBy(() ->
                managerService.addNote(managerId, reportUserId, commitId, "note"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not a direct report");
    }
}
