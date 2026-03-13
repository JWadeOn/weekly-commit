package com.weeklycommit.repository;

import com.weeklycommit.model.OutcomeUpdate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OutcomeUpdateRepository extends JpaRepository<OutcomeUpdate, UUID> {
    List<OutcomeUpdate> findByOutcomeIdOrderByTimestampDesc(UUID outcomeId);
}
