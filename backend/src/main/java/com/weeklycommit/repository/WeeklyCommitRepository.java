package com.weeklycommit.repository;

import com.weeklycommit.model.WeeklyCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeeklyCommitRepository extends JpaRepository<WeeklyCommit, UUID> {

    Optional<WeeklyCommit> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate);

    List<WeeklyCommit> findByUserIdOrderByWeekStartDateDesc(UUID userId);

    List<WeeklyCommit> findByOrgIdAndWeekStartDate(UUID orgId, LocalDate weekStartDate);

    List<WeeklyCommit> findByUserIdInAndWeekStartDate(List<UUID> userIds, LocalDate weekStartDate);
}
