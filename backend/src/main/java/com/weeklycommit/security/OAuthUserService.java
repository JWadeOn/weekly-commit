package com.weeklycommit.security;

import com.weeklycommit.model.User;
import com.weeklycommit.model.UserRole;
import com.weeklycommit.repository.UserRepository;
import com.weeklycommit.repository.UserRoleRepository;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class OAuthUserService extends OidcUserService {

    // Org ID from seed data (V3__seed_data.sql) — single-org POC
    private static final UUID DEFAULT_ORG_ID =
            UUID.fromString("a0000000-0000-0000-0000-000000000001");

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public OAuthUserService(UserRepository userRepository, UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        findOrCreate(oidcUser);
        return oidcUser;
    }

    /** Prefix for demo seed users that can be "claimed" on first sign-in by email match. */
    private static final String DEMO_CLAIM_PREFIX = "demo-claim|";

    @Transactional
    public User findOrCreate(OidcUser oidcUser) {
        String subject = oidcUser.getSubject();
        String email = oidcUser.getEmail();
        String name = oidcUser.getFullName();

        return userRepository.findByOauthSubject(subject)
                .or(() -> claimDemoUserByEmail(subject, email, name))
                .orElseGet(() -> createNewUser(subject, email, name));
    }

    /**
     * If a seed user exists with this email and a claimable oauth_subject (demo-claim|...),
     * update it to the real IdP subject and return it. Used so deployed demo accounts
     * (V14__demo_two_teams) are claimed when the corresponding Auth0 user first signs in.
     */
    private Optional<User> claimDemoUserByEmail(String subject, String email, String name) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(email)
                .filter(user -> user.getOauthSubject() != null && user.getOauthSubject().startsWith(DEMO_CLAIM_PREFIX))
                .map(user -> {
                    user.setOauthSubject(subject);
                    if (name != null && !name.isBlank()) {
                        user.setFullName(name);
                    }
                    return userRepository.save(user);
                });
    }

    private User createNewUser(String subject, String email, String name) {
        User user = new User();
        user.setOrgId(DEFAULT_ORG_ID);
        user.setOauthSubject(subject);
        user.setEmail(email != null ? email : subject + "@unknown.local");
        user.setFullName(name != null ? name : "Unknown User");

        user = userRepository.save(user);

        UserRole employeeRole = new UserRole(user.getId(), "EMPLOYEE");
        userRoleRepository.save(employeeRole);

        return user;
    }
}
