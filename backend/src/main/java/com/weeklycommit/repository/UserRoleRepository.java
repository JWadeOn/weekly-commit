package com.weeklycommit.repository;

import com.weeklycommit.model.UserRole;
import com.weeklycommit.model.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    List<UserRole> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
