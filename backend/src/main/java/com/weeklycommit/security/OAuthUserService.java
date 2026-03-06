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

    @Transactional
    public User findOrCreate(OidcUser oidcUser) {
        String subject = oidcUser.getSubject();
        String email = oidcUser.getEmail();
        String name = oidcUser.getFullName();

        return userRepository.findByOauthSubject(subject)
                .orElseGet(() -> createNewUser(subject, email, name));
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
