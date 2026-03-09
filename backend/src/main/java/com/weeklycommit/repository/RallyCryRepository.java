package com.weeklycommit.repository;

import com.weeklycommit.model.RallyCry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RallyCryRepository extends JpaRepository<RallyCry, UUID> {

    List<RallyCry> findByOrgIdAndActiveTrue(UUID orgId);
    List<RallyCry> findByOrgIdOrderByCreatedAtAsc(UUID orgId);
}
