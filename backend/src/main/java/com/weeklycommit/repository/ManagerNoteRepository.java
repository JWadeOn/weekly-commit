package com.weeklycommit.repository;

import com.weeklycommit.model.ManagerNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ManagerNoteRepository extends JpaRepository<ManagerNote, UUID> {

    List<ManagerNote> findByWeeklyCommitIdOrderByCreatedAtDesc(UUID weeklyCommitId);
}
