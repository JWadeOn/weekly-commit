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

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${app.frontend-url:}")
    private String frontendUrl;

    @Value("${app.idp-logout-url:}")
    private String idpLogoutUrl;

    @Value("${spring.security.oauth2.client.provider.oidc-provider.issuer-uri:}")
    private String oauthIssuerUri;

    @Value("${spring.security.oauth2.client.registration.oidc.client-id:}")
    private String oauthClientId;

    /**
     * POST /api/auth/logout
     * Clears JWT and session cookies, invalidates the server session, and returns
     * the IdP logout URL so the frontend can redirect and clear the IdP session
     * (e.g. Auth0). Otherwise "Sign In" would reuse the IdP session and auto-sign in.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {
        // Invalidate Spring session so server forgets the user
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Match SameSite/Secure used when setting cookie so browser clears it
        boolean crossOrigin = frontendUrl != null && !frontendUrl.isBlank() && frontendUrl.startsWith("http");
        boolean secure = crossOrigin || request.isSecure();
        ResponseCookie clearJwt = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(0)
                .sameSite(crossOrigin ? "None" : "Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearJwt.toString());

        // Clear JSESSIONID so the browser drops the session cookie
        ResponseCookie clearSession = ResponseCookie.from("JSESSIONID", "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(0)
                .sameSite(crossOrigin ? "None" : "Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearSession.toString());

        String idpRedirect = resolveIdpLogoutUrl();
        Map<String, String> body = new java.util.HashMap<>();
        body.put("message", "Logged out successfully");
        if (idpRedirect != null) {
            body.put("idpLogoutUrl", idpRedirect);
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(body);
    }

    /**
     * Resolve the IdP logout URL so the client can redirect and clear the IdP session.
     * Uses app.idp-logout-url if set; otherwise builds Auth0-style URL from issuer + client-id.
     */
    private String resolveIdpLogoutUrl() {
        if (idpLogoutUrl != null && !idpLogoutUrl.isBlank()) {
            return idpLogoutUrl;
        }
        if (oauthIssuerUri == null || oauthIssuerUri.isBlank() || oauthClientId == null || oauthClientId.isBlank()
                || frontendUrl == null || frontendUrl.isBlank()) {
            return null;
        }
        try {
            URI issuer = URI.create(oauthIssuerUri.trim());
            String host = issuer.getScheme() + "://" + issuer.getHost();
            if (issuer.getPort() > 0 && issuer.getPort() != ("https".equals(issuer.getScheme()) ? 443 : 80)) {
                host += ":" + issuer.getPort();
            }
            // Auth0: https://tenant.auth0.com/v2/logout?client_id=...&returnTo=...
            if (host.contains("auth0.com")) {
                String returnTo = URLEncoder.encode(frontendUrl, StandardCharsets.UTF_8);
                return host + "/v2/logout?client_id=" + URLEncoder.encode(oauthClientId, StandardCharsets.UTF_8)
                        + "&returnTo=" + returnTo;
            }
            // Optional: add Keycloak etc. here via end_session_endpoint
            return null;
        } catch (Exception e) {
            return null;
        }
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
