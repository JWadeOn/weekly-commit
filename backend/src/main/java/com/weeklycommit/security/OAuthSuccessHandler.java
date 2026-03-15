package com.weeklycommit.security;

import com.weeklycommit.model.User;
import com.weeklycommit.model.UserRole;
import com.weeklycommit.repository.UserRoleRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

@Slf4j
@Component
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private final OAuthUserService oAuthUserService;
    private final JwtService jwtService;
    private final UserRoleRepository userRoleRepository;

    public OAuthSuccessHandler(OAuthUserService oAuthUserService,
                                JwtService jwtService,
                                UserRoleRepository userRoleRepository) {
        this.oAuthUserService = oAuthUserService;
        this.jwtService = jwtService;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
            OidcUser oidcUser = (OidcUser) oauthToken.getPrincipal();

            log.info("OAuth success handler fired for: {}", oidcUser.getEmail());

            User user = oAuthUserService.findOrCreate(oidcUser);
            log.info("User found/created: id={}, email={}", user.getId(), user.getEmail());

            List<String> roles = userRoleRepository.findByUserId(user.getId())
                    .stream()
                    .map(UserRole::getRole)
                    .toList();
            log.info("Roles resolved: {}", roles);

            String jwt = jwtService.generateToken(user, roles);

            // Cross-origin (host on different domain) requires SameSite=None; Secure so browser sends cookie on fetch()
            boolean crossOrigin = frontendUrl != null && frontendUrl.startsWith("http");
            ResponseCookie cookie = ResponseCookie.from("jwt", jwt)
                    .httpOnly(true)
                    .secure(crossOrigin)     // true in production (HTTPS) when frontend is separate origin
                    .path("/")
                    .maxAge(Duration.ofHours(jwtService.getExpiryHours()))
                    .sameSite(crossOrigin ? "None" : "Lax")  // None required for cross-origin requests from host to API
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            // Invalidate the OAuth session — subsequent requests use JWT only
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }

            log.info("JWT cookie set, redirecting to {}", frontendUrl);
            response.sendRedirect(frontendUrl);

        } catch (Exception e) {
            log.error("OAuth success handler failed", e);
            response.sendRedirect(frontendUrl + "/auth-error");
        }
    }
}
