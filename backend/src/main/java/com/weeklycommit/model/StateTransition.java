package com.weeklycommit.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "state_transitions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StateTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "weekly_commit_id", nullable = false)
    private UUID weeklyCommitId;

    @Column(name = "from_state")
    private String fromState;

    @Column(name = "to_state", nullable = false)
    private String toState;

    @Column(name = "transitioned_by", nullable = false)
    private UUID transitionedBy;

    @Column(name = "transitioned_at", insertable = false, updatable = false)
    private LocalDateTime transitionedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
