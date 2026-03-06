package com.weeklycommit.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID userId,
        UUID orgId,
        String email,
        String fullName,
        List<String> roles,
        Instant expiresAt
) {}
