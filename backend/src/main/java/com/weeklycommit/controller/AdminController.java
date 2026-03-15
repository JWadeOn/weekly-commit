package com.weeklycommit.controller;

import com.weeklycommit.config.SecurityContextHelper;
import com.weeklycommit.dto.AdminUserResponse;
import com.weeklycommit.dto.CreateUserRequest;
import com.weeklycommit.dto.UpdateUserRequest;
import com.weeklycommit.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /**
     * List all users in the admin's organization (with roles and manager).
     */
    @GetMapping("/users")
    public List<AdminUserResponse> listUsers() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return adminService.listUsers(orgId);
    }

    /**
     * Create an invited user. They claim this account when they first sign in with the same email.
     */
    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        AdminUserResponse created = adminService.createUser(orgId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update a user's manager and/or roles.
     */
    @PatchMapping("/users/{userId}")
    public AdminUserResponse updateUser(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRequest req) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return adminService.updateUser(orgId, userId, req);
    }
}
