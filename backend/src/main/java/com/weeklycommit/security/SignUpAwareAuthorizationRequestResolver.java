package com.weeklycommit.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.HashMap;
import java.util.Map;

/**
 * Forwards optional query parameters (e.g. screen_hint=signup) from the
 * authorization initiation request to the IdP authorization request.
 * Auth0 and other providers use screen_hint=signup to show sign-up instead of sign-in.
 */
public class SignUpAwareAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String AUTHORIZATION_BASE_URI = "/oauth2/authorization";

    /** Param forwarded to IdP to show sign-up screen (Auth0 Universal Login, etc.). */
    private static final String SCREEN_HINT_PARAM = "screen_hint";

    private final DefaultOAuth2AuthorizationRequestResolver defaultResolver;

    public SignUpAwareAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                AUTHORIZATION_BASE_URI
        );
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(defaultResolver.resolve(request), request);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return customize(defaultResolver.resolve(request, clientRegistrationId), request);
    }

    private static OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest request, HttpServletRequest httpRequest) {
        if (request == null) {
            return null;
        }
        String screenHint = httpRequest.getParameter(SCREEN_HINT_PARAM);
        if (screenHint == null || screenHint.isBlank()) {
            return request;
        }
        Map<String, Object> additionalParams = new HashMap<>(request.getAdditionalParameters());
        additionalParams.put(SCREEN_HINT_PARAM, screenHint.trim());
        return OAuth2AuthorizationRequest.from(request)
                .additionalParameters(additionalParams)
                .build();
    }
}
