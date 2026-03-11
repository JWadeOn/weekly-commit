package com.weeklycommit.repository;

import com.weeklycommit.model.CommitItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommitItemRepository extends JpaRepository<CommitItem, UUID> {

    List<CommitItem> findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(UUID weeklyCommitId);

    List<CommitItem> findByWeeklyCommitIdAndCarryForwardTrue(UUID weeklyCommitId);

    boolean existsByWeeklyCommitIdAndCarriedFromId(UUID weeklyCommitId, UUID carriedFromId);

    boolean existsByWeeklyCommitIdAndBumpedItemId(UUID weeklyCommitId, UUID bumpedItemId);
}
