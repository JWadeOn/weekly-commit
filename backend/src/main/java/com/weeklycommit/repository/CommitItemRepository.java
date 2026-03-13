package com.weeklycommit.repository;

import com.weeklycommit.model.CommitItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface CommitItemRepository extends JpaRepository<CommitItem, UUID> {

    List<CommitItem> findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(UUID weeklyCommitId);

    List<CommitItem> findByWeeklyCommitIdAndCarryForwardTrue(UUID weeklyCommitId);

    boolean existsByWeeklyCommitIdAndCarriedFromId(UUID weeklyCommitId, UUID carriedFromId);

    boolean existsByWeeklyCommitIdAndBumpedItemId(UUID weeklyCommitId, UUID bumpedItemId);

    /**
     * Single-query aggregate: sums chess weight per outcome across all DRAFT and LOCKED
     * weekly commits in the given org for the given week.
     *
     * Returns Object[2] rows where:
     *   [0] = outcomeId  (UUID)
     *   [1] = totalWeight (Long — SUM result)
     *
     * The subquery replaces a JOIN because CommitItem has no @ManyToOne mapping to
     * WeeklyCommit (bare UUID FK by design to keep the model simple).
     */
    @Query("""
            SELECT ci.outcomeId, SUM(ci.chessWeight)
            FROM CommitItem ci
            WHERE ci.outcomeId IS NOT NULL
              AND ci.weeklyCommitId IN (
                SELECT wc.id
                FROM WeeklyCommit wc
                WHERE wc.orgId        = :orgId
                  AND wc.weekStartDate = :weekStartDate
                  AND wc.status       IN ('DRAFT', 'LOCKED')
            )
            GROUP BY ci.outcomeId
            """)
    List<Object[]> sumWeightsByOutcomeForOrgAndWeek(
            @Param("orgId") UUID orgId,
            @Param("weekStartDate") LocalDate weekStartDate);
}
