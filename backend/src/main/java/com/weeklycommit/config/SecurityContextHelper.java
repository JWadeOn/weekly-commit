package com.weeklycommit.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class SecurityContextHelper {

    private SecurityContextHelper() {}

    @SuppressWarnings("unchecked")
    private static Map<String, Object> getDetails() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getDetails() instanceof Map)) {
            throw new IllegalStateException("No authenticated user in SecurityContext");
        }
        return (Map<String, Object>) auth.getDetails();
    }

    public static UUID getCurrentUserId() {
        Map<String, Object> details = getDetails();
        Object userId = details.get("userId");
        if (userId == null || !(userId instanceof String)) {
            throw new IllegalStateException("Missing or invalid userId in token (userId=" + userId + ")");
        }
        return UUID.fromString((String) userId);
    }

    public static UUID getCurrentOrgId() {
        Map<String, Object> details = getDetails();
        Object orgId = details.get("orgId");
        if (orgId == null || !(orgId instanceof String)) {
            throw new IllegalStateException("Missing or invalid orgId in token (orgId=" + orgId + ")");
        }
        return UUID.fromString((String) orgId);
    }

    @SuppressWarnings("unchecked")
    public static List<String> getCurrentRoles() {
        return (List<String>) getDetails().get("roles");
    }

    public static boolean hasRole(String role) {
        List<String> roles = getCurrentRoles();
        return roles != null && roles.contains(role);
    }
}
