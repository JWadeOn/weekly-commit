package com.weeklycommit.repository;

import com.weeklycommit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByOauthSubject(String oauthSubject);

    Optional<User> findByEmail(String email);
}
