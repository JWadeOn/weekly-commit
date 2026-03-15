package com.weeklycommit.service;

import com.weeklycommit.dto.AdminUserResponse;
import com.weeklycommit.dto.CreateUserRequest;
import com.weeklycommit.dto.UpdateUserRequest;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.exception.UserNotFoundException;
import com.weeklycommit.model.User;
import com.weeklycommit.model.UserRole;
import com.weeklycommit.repository.UserRepository;
import com.weeklycommit.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final List<String> ALLOWED_ROLES = List.of("EMPLOYEE", "MANAGER", "ADMIN");
    private static final String INVITE_SUBJECT_PREFIX = "demo-claim|invite-";

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public AdminService(UserRepository userRepository, UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    /**
     * List all users in the admin's org with roles and manager name.
     */
    public List<AdminUserResponse> listUsers(UUID orgId) {
        List<User> users = userRepository.findByOrgId(orgId);
        return users.stream()
                .map(user -> {
                    String managerName = null;
                    if (user.getManagerId() != null) {
                        managerName = userRepository.findById(user.getManagerId())
                                .map(User::getFullName)
                                .orElse(null);
                    }
                    List<String> roles = userRoleRepository.findByUserId(user.getId())
                            .stream()
                            .map(UserRole::getRole)
                            .collect(Collectors.toList());
                    return new AdminUserResponse(
                            user.getId(),
                            user.getEmail(),
                            user.getFullName(),
                            user.getManagerId(),
                            managerName,
                            roles
                    );
                })
                .toList();
    }

    /**
     * Create an invited user. They will be "claimed" when they first sign in with the same email (OAuthUserService).
     */
    @Transactional
    public AdminUserResponse createUser(UUID orgId, CreateUserRequest req) {
        validateRoles(req.roles(), null);
        if (userRepository.findByEmail(req.email()).isPresent()) {
            throw new IllegalArgumentException("User with email already exists: " + req.email());
        }
        if (req.managerId() != null) {
            User manager = userRepository.findById(req.managerId())
                    .orElseThrow(() -> new UserNotFoundException("Manager not found: " + req.managerId()));
            if (!manager.getOrgId().equals(orgId)) {
                throw new UnauthorizedException("Manager must be in the same organization");
            }
        }

        User user = new User();
        user.setOrgId(orgId);
        user.setEmail(req.email());
        user.setFullName(req.fullName());
        user.setManagerId(req.managerId());
        user.setOauthSubject(INVITE_SUBJECT_PREFIX + UUID.randomUUID());
        user = userRepository.save(user);

        for (String role : req.roles()) {
            userRoleRepository.save(new UserRole(user.getId(), role));
        }

        return toAdminUserResponse(user);
    }

    /**
     * Update a user's manager and roles. User must be in the same org as the admin.
     */
    @Transactional
    public AdminUserResponse updateUser(UUID adminOrgId, UUID userId, UpdateUserRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        if (!user.getOrgId().equals(adminOrgId)) {
            throw new UnauthorizedException("User is not in your organization");
        }
        validateRoles(req.roles(), adminOrgId);

        if (req.managerId() != null) {
            User manager = userRepository.findById(req.managerId())
                    .orElseThrow(() -> new UserNotFoundException("Manager not found: " + req.managerId()));
            if (!manager.getOrgId().equals(adminOrgId)) {
                throw new UnauthorizedException("Manager must be in the same organization");
            }
            user.setManagerId(req.managerId());
        } else {
            user.setManagerId(null);
        }
        userRepository.save(user);

        userRoleRepository.deleteByUserId(userId);
        for (String role : req.roles()) {
            userRoleRepository.save(new UserRole(userId, role));
        }

        return toAdminUserResponse(userRepository.findById(userId).orElseThrow());
    }

    private void validateRoles(List<String> roles, UUID adminOrgId) {
        for (String role : roles) {
            if (!ALLOWED_ROLES.contains(role)) {
                throw new IllegalArgumentException("Invalid role: " + role + ". Allowed: " + ALLOWED_ROLES);
            }
        }
        if (roles.contains("ADMIN") && adminOrgId != null) {
            // Only an existing admin can assign ADMIN; here we allow it if the caller is admin (enforced by controller).
            // No extra check needed - controller already restricted to hasRole("ADMIN").
        }
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        String managerName = null;
        if (user.getManagerId() != null) {
            managerName = userRepository.findById(user.getManagerId())
                    .map(User::getFullName)
                    .orElse(null);
        }
        List<String> roles = userRoleRepository.findByUserId(user.getId())
                .stream()
                .map(UserRole::getRole)
                .collect(Collectors.toList());
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getManagerId(),
                managerName,
                roles
        );
    }
}
