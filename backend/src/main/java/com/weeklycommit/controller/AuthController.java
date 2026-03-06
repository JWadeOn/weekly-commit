package com.weeklycommit.controller;

import com.weeklycommit.dto.UserResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    /**
     * GET /api/auth/callback
     *
     * This URL is intercepted by Spring Security's OAuth2LoginAuthenticationFilter
     * (configured via oauth2Login().redirectionEndpoint().baseUri("/api/auth/callback")).
     * Spring Security exchanges the authorization code for tokens, calls OAuthUserService
     * to find-or-create the user, then delegates to OAuthSuccessHandler which issues the
     * internal JWT as an httpOnly cookie and redirects to the frontend.
     *
     * This controller method is never reached for the actual OAuth callback — it exists
     * only for documentation and completeness.
     */

    /**
     * POST /api/auth/logout
     * Clears the JWT cookie. No auth required.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        ResponseCookie clearCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * GET /api/auth/me
     * Returns the current user extracted from the JWT cookie (set by JwtAuthFilter).
     * Requires a valid JWT cookie.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) authentication.getDetails();

        UUID userId = UUID.fromString((String) details.get("userId"));
        UUID orgId = UUID.fromString((String) details.get("orgId"));
        String email = (String) details.get("email");
        String fullName = (String) details.get("fullName");

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) details.get("roles");

        Instant expiresAt = (Instant) details.get("expiresAt");

        return ResponseEntity.ok(new UserResponse(userId, orgId, email, fullName, roles, expiresAt));
    }
}
