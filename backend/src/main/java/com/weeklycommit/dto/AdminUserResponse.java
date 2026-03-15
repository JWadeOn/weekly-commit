package com.weeklycommit.dto;

import java.util.List;
import java.util.UUID;

/**
 * User summary for admin listing and management.
 */
public record AdminUserResponse(
        UUID id,
        String email,
        String fullName,
        UUID managerId,
        String managerName,
        List<String> roles
) {}
