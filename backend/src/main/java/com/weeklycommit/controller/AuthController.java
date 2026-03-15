package com.weeklycommit.controller;

import com.weeklycommit.dto.ErrorResponse;
import com.weeklycommit.dto.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${app.frontend-url:}")
    private String frontendUrl;

    /**
     * POST /api/auth/logout
     * Clears JWT and session cookies and invalidates the server session.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {
        // Invalidate Spring session so server forgets the user
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Match SameSite/Secure used when setting cookie so browser clears it
        boolean crossOrigin = frontendUrl != null && frontendUrl.startsWith("http");
        ResponseCookie clearJwt = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(crossOrigin)
                .path("/")
                .maxAge(0)
                .sameSite(crossOrigin ? "None" : "Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearJwt.toString());

        // Clear JSESSIONID so the browser drops the session cookie
        ResponseCookie clearSession = ResponseCookie.from("JSESSIONID", "")
                .httpOnly(true)
                .secure(crossOrigin)
                .path("/")
                .maxAge(0)
                .sameSite(crossOrigin ? "None" : "Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearSession.toString());

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(Map.of("message", "Logged out successfully"));
    }

    /**
     * GET /api/auth/me
     * Returns the current user extracted from the JWT cookie (set by JwtAuthFilter).
     * Returns 401 if no valid JWT is present.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("UNAUTHORIZED", "Authentication required"));
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) authentication.getDetails();

        UUID userId = UUID.fromString((String) details.get("userId"));
        UUID orgId = UUID.fromString((String) details.get("orgId"));
        String email = (String) details.get("email");
        String fullName = (String) details.get("fullName");

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) details.get("roles");

        Instant expiresAt = (Instant) details.get("expiresAt");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(new UserResponse(userId, orgId, email, fullName, roles, expiresAt));
    }
}
