package com.weeklycommit.security;

import com.weeklycommit.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiry-hours}")
    private long expiryHours;

    public String generateToken(User user, List<String> roles) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expiryHours, ChronoUnit.HOURS);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("orgId", user.getOrgId().toString())
                .claim("roles", roles)
                .claim("email", user.getEmail())
                .claim("fullName", user.getFullName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey())
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public UUID extractUserId(String token) {
        Claims claims = parseClaims(token);
        String sub = claims.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new JwtException("Missing or empty subject (userId) in token");
        }
        try {
            return UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            throw new JwtException("Invalid userId in token: " + sub, e);
        }
    }

    public UUID extractOrgId(String token) {
        Claims claims = parseClaims(token);
        Object orgIdObj = claims.get("orgId");
        if (orgIdObj == null) {
            throw new JwtException("Missing orgId in token");
        }
        String orgIdStr = orgIdObj.toString();
        if (orgIdStr.isBlank()) {
            throw new JwtException("Empty orgId in token");
        }
        try {
            return UUID.fromString(orgIdStr);
        } catch (IllegalArgumentException e) {
            throw new JwtException("Invalid orgId in token: " + orgIdStr, e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object rolesObj = parseClaims(token).get("roles");
        if (rolesObj == null) return List.of();
        if (rolesObj instanceof List<?> list) {
            return list.stream()
                    .filter(o -> o != null)
                    .map(Object::toString)
                    .toList();
        }
        if (rolesObj instanceof String s && !s.isBlank()) {
            return List.of(s);
        }
        return List.of();
    }

    public String extractEmail(String token) {
        return (String) parseClaims(token).get("email");
    }

    public String extractFullName(String token) {
        return (String) parseClaims(token).get("fullName");
    }

    public Instant extractExpiry(String token) {
        return parseClaims(token).getExpiration().toInstant();
    }

    public long getExpiryHours() {
        return expiryHours;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
