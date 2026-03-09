package com.weeklycommit.controller;

import com.weeklycommit.config.SecurityContextHelper;
import com.weeklycommit.dto.*;
import com.weeklycommit.service.RcdoAdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/manager/rcdo")
public class ManagerRcdoController {

    private final RcdoAdminService rcdoAdminService;

    public ManagerRcdoController(RcdoAdminService rcdoAdminService) {
        this.rcdoAdminService = rcdoAdminService;
    }

    @GetMapping
    public ResponseEntity<RcDoAdminResponse> getAdminHierarchy() {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(rcdoAdminService.getAdminHierarchy(managerId, orgId));
    }

    @GetMapping("/org-members")
    public ResponseEntity<List<OrgMemberDto>> getOrgMembers() {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        List<OrgMemberDto> members = rcdoAdminService.getOrgMembersForOutcomeOwner(managerId, orgId).stream()
                .map(u -> OrgMemberDto.builder()
                        .userId(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .build())
                .toList();
        return ResponseEntity.ok(members);
    }

    @PostMapping("/rally-cries")
    public ResponseEntity<RcDoAdminResponse.AdminRallyCryDto> createRallyCry(@Valid @RequestBody CreateRallyCryRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.status(201).body(rcdoAdminService.createRallyCry(managerId, orgId, req));
    }

    @PutMapping("/rally-cries/{id}")
    public ResponseEntity<RcDoAdminResponse.AdminRallyCryDto> updateRallyCry(
            @PathVariable UUID id, @Valid @RequestBody UpdateRallyCryRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(rcdoAdminService.updateRallyCry(managerId, id, req));
    }

    @DeleteMapping("/rally-cries/{id}")
    public ResponseEntity<Void> deactivateRallyCry(@PathVariable UUID id) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        rcdoAdminService.deactivateRallyCry(managerId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/defining-objectives")
    public ResponseEntity<RcDoAdminResponse.AdminDefiningObjectiveDto> createDefiningObjective(
            @Valid @RequestBody CreateDefiningObjectiveRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.status(201).body(rcdoAdminService.createDefiningObjective(managerId, req));
    }

    @PutMapping("/defining-objectives/{id}")
    public ResponseEntity<RcDoAdminResponse.AdminDefiningObjectiveDto> updateDefiningObjective(
            @PathVariable UUID id, @Valid @RequestBody UpdateDefiningObjectiveRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(rcdoAdminService.updateDefiningObjective(managerId, id, req));
    }

    @DeleteMapping("/defining-objectives/{id}")
    public ResponseEntity<Void> deactivateDefiningObjective(@PathVariable UUID id) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        rcdoAdminService.deactivateDefiningObjective(managerId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/outcomes")
    public ResponseEntity<RcDoAdminResponse.AdminOutcomeDto> createOutcome(@Valid @RequestBody CreateOutcomeRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.status(201).body(rcdoAdminService.createOutcome(managerId, orgId, req));
    }

    @PutMapping("/outcomes/{id}")
    public ResponseEntity<RcDoAdminResponse.AdminOutcomeDto> updateOutcome(
            @PathVariable UUID id, @Valid @RequestBody UpdateOutcomeRequest req) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(rcdoAdminService.updateOutcome(managerId, orgId, id, req));
    }

    @DeleteMapping("/outcomes/{id}")
    public ResponseEntity<Void> deactivateOutcome(@PathVariable UUID id) {
        UUID managerId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        rcdoAdminService.deactivateOutcome(managerId, orgId, id);
        return ResponseEntity.noContent().build();
    }
}
