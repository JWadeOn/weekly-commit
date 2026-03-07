package com.weeklycommit.repository;

import com.weeklycommit.model.StateTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StateTransitionRepository extends JpaRepository<StateTransition, UUID> {

    List<StateTransition> findByWeeklyCommitIdOrderByTransitionedAtAsc(UUID weeklyCommitId);
}
