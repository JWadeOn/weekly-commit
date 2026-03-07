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
        return UUID.fromString((String) getDetails().get("userId"));
    }

    public static UUID getCurrentOrgId() {
        return UUID.fromString((String) getDetails().get("orgId"));
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
