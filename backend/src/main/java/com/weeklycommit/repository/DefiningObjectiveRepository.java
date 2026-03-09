package com.weeklycommit.repository;

import com.weeklycommit.model.DefiningObjective;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DefiningObjectiveRepository extends JpaRepository<DefiningObjective, UUID> {

    List<DefiningObjective> findByRallyCryIdAndActiveTrue(UUID rallyCryId);
    List<DefiningObjective> findByRallyCryIdOrderByCreatedAtAsc(UUID rallyCryId);
}
