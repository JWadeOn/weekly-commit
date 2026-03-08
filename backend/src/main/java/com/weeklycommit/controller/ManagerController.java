package com.weeklycommit.controller;

import com.weeklycommit.config.SecurityContextHelper;
import com.weeklycommit.dto.*;
import com.weeklycommit.service.ManagerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {

    private final ManagerService managerService;

    public ManagerController(ManagerService managerService) {
        this.managerService = managerService;
    }

    @GetMapping("/team")
    public ResponseEntity<List<TeamMemberResponse>> getTeam() {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(managerService.getTeam(managerId, orgId));
    }

    @GetMapping("/team/{userId}/commits")
    public ResponseEntity<PagedResponse<CommitSummaryResponse>> getDirectReportCommits(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(managerService.getDirectReportCommits(managerId, userId, page, size));
    }

    @GetMapping("/team/{userId}/commits/{commitId}")
    public ResponseEntity<WeekResponse> getDirectReportCommit(
            @PathVariable UUID userId,
            @PathVariable UUID commitId) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(managerService.getDirectReportCommit(managerId, userId, commitId));
    }

    @PostMapping("/team/{userId}/commits/{commitId}/notes")
    public ResponseEntity<ManagerNoteResponse> addNote(
            @PathVariable UUID userId,
            @PathVariable UUID commitId,
            @Valid @RequestBody AddNoteRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.status(201)
                .body(managerService.addNote(managerId, userId, commitId, req.getNote()));
    }

    @GetMapping("/team/{userId}/commits/{commitId}/notes")
    public ResponseEntity<List<ManagerNoteResponse>> getNotes(
            @PathVariable UUID userId,
            @PathVariable UUID commitId) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(managerService.getNotes(managerId, userId, commitId));
    }
}
