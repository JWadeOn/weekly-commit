package com.weeklycommit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Request to update a user's manager and/or roles (admin only).
 * Send the full desired state: managerId (null = no manager) and roles.
 */
public record UpdateUserRequest(
        UUID managerId,
        @NotNull @Size(min = 1) List<@NotBlank String> roles
) {}
