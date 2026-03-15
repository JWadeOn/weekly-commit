package com.weeklycommit.config;

import com.weeklycommit.security.JwtAuthFilter;
import com.weeklycommit.security.OAuthSuccessHandler;
import com.weeklycommit.security.OAuthUserService;
import com.weeklycommit.security.SignUpAwareAuthorizationRequestResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuthUserService oAuthUserService;
    private final OAuthSuccessHandler oAuthSuccessHandler;
    private final SignUpAwareAuthorizationRequestResolver authorizationRequestResolver;
    private final String corsAllowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          OAuthUserService oAuthUserService,
                          OAuthSuccessHandler oAuthSuccessHandler,
                          ClientRegistrationRepository clientRegistrationRepository,
                          @Value("${app.cors-allowed-origins}") String corsAllowedOrigins) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.oAuthUserService = oAuthUserService;
        this.oAuthSuccessHandler = oAuthSuccessHandler;
        this.authorizationRequestResolver = new SignUpAwareAuthorizationRequestResolver(clientRegistrationRepository);
        this.corsAllowedOrigins = corsAllowedOrigins;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // IF_REQUIRED: session created only for the OAuth2 dance (stores state/nonce).
            // OAuthSuccessHandler invalidates it after issuing the JWT cookie, so all
            // subsequent API calls are stateless JWT-only.
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            )
            .headers(headers -> headers
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'; frame-ancestors 'none'")))
            .exceptionHandling(ex -> ex
                .defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    new AntPathRequestMatcher("/api/**")
                )
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
                .requestMatchers("/oauth2/**", "/login/**", "/error").permitAll()
                .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "DUAL_ROLE")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            // OAuth2 Authorization Code Flow:
            //   Initiate:  GET /oauth2/authorization/oidc  → redirects to provider
            //   Callback:  GET /login/oauth2/code/oidc     → Spring Security exchanges code,
            //              calls OAuthUserService, then OAuthSuccessHandler issues JWT cookie
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(auth -> auth
                    .authorizationRequestResolver(authorizationRequestResolver))
                .userInfoEndpoint(userInfo -> userInfo.oidcUserService(oAuthUserService))
                .successHandler(oAuthSuccessHandler)
                .failureHandler((request, response, exception) -> {
                    log.error("OAuth authentication failed: {}", exception.getMessage(), exception);
                    response.sendRedirect("http://localhost:3000/auth-error");
                })
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        if (origins.isEmpty()) {
            origins = List.of("http://localhost:3000", "http://localhost:3001");
        }
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
