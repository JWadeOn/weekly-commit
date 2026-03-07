package com.weeklycommit.repository;

import com.weeklycommit.model.Outcome;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutcomeRepository extends JpaRepository<Outcome, UUID> {

    List<Outcome> findByDefiningObjectiveIdAndActiveTrue(UUID objectiveId);
}
