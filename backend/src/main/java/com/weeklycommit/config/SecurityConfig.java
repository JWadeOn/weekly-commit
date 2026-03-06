package com.weeklycommit.config;

import com.weeklycommit.security.JwtAuthFilter;
import com.weeklycommit.security.OAuthSuccessHandler;
import com.weeklycommit.security.OAuthUserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuthUserService oAuthUserService;
    private final OAuthSuccessHandler oAuthSuccessHandler;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          OAuthUserService oAuthUserService,
                          OAuthSuccessHandler oAuthSuccessHandler) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.oAuthUserService = oAuthUserService;
        this.oAuthSuccessHandler = oAuthSuccessHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'; frame-ancestors 'none'")))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/callback").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
                // OAuth2 login initiation and callback (handled by Spring Security filters)
                .requestMatchers("/oauth2/**", "/login/**").permitAll()
                // OpenAPI / Actuator
                .requestMatchers(
                    "/swagger-ui/**", "/swagger-ui.html",
                    "/v3/api-docs/**", "/actuator/health"
                ).permitAll()
                // All other /api/** routes require a valid internal JWT
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            // OAuth2 Authorization Code Flow:
            //   - Initiate: GET /oauth2/authorization/mock  → redirects to mock OAuth provider
            //   - Callback: GET /api/auth/callback          → Spring Security exchanges code,
            //               calls OAuthUserService, then OAuthSuccessHandler issues JWT cookie
            .oauth2Login(oauth2 -> oauth2
                .redirectionEndpoint(redir -> redir.baseUri("/api/auth/callback"))
                .userInfoEndpoint(userInfo -> userInfo.oidcUserService(oAuthUserService))
                .successHandler(oAuthSuccessHandler)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:3001"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // required for cookies

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
