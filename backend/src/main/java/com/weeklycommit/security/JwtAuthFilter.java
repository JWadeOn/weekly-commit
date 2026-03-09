package com.weeklycommit.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = extractJwtFromCookie(request);

        if (jwt == null) {
            log.debug("No JWT cookie found, skipping filter");
            filterChain.doFilter(request, response);
            return;
        }

        log.debug("JWT cookie found, validating...");

        if (SecurityContextHolder.getContext().getAuthentication() == null
                && jwtService.validateToken(jwt)) {
            try {
                String userId = jwtService.extractUserId(jwt).toString();
                String orgId = jwtService.extractOrgId(jwt).toString();
                String email = jwtService.extractEmail(jwt);
                String fullName = jwtService.extractFullName(jwt);
                List<String> roles = jwtService.extractRoles(jwt);

                if (roles == null) {
                    roles = Collections.emptyList();
                }

                List<SimpleGrantedAuthority> authorities = roles.stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .toList();

                Map<String, Object> details = new HashMap<>();
                details.put("userId", userId);
                details.put("orgId", orgId);
                details.put("email", email);
                details.put("fullName", fullName);
                details.put("roles", roles);
                details.put("expiresAt", jwtService.extractExpiry(jwt));

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);
                auth.setDetails(details);

                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("JWT valid for userId: {}", userId);

            } catch (JwtException ex) {
                log.warn("JWT validation failed: {}", ex.getMessage());
            } catch (Exception ex) {
                log.warn("JWT parsing/setup failed, request will be unauthenticated: {}", ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/api/health")
                || path.equals("/api/auth/logout")
                || path.startsWith("/oauth2/")
                || path.startsWith("/login/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/actuator");
    }

    private String extractJwtFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "jwt".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
