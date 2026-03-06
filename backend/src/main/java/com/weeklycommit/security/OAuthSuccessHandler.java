package com.weeklycommit.security;

import com.weeklycommit.model.User;
import com.weeklycommit.model.UserRole;
import com.weeklycommit.repository.UserRoleRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

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
                                        Authentication authentication) throws IOException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();

        User user = oAuthUserService.findOrCreate(oidcUser);
        List<String> roles = userRoleRepository.findByUserId(user.getId())
                .stream()
                .map(UserRole::getRole)
                .toList();

        String jwt = jwtService.generateToken(user, roles);

        ResponseCookie cookie = ResponseCookie.from("jwt", jwt)
                .httpOnly(true)
                .secure(false)          // set true in production (HTTPS)
                .path("/")
                .maxAge(Duration.ofHours(jwtService.getExpiryHours()))
                .sameSite("Lax")        // Lax allows redirect from OAuth provider
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // Invalidate the OAuth session — subsequent requests use JWT only
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        response.sendRedirect(frontendUrl);
    }
}
