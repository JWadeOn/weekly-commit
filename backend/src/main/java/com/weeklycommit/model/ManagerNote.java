package com.weeklycommit.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "manager_notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "weekly_commit_id", nullable = false)
    private UUID weeklyCommitId;

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
