package com.weeklycommit.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "outcome_updates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutcomeUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "outcome_id", nullable = false)
    private UUID outcomeId;

    @Column(name = "old_value")
    private Double oldValue;

    @Column(name = "new_value", nullable = false)
    private Double newValue;

    @Column(name = "action_taken", columnDefinition = "TEXT", nullable = false)
    private String actionTaken;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_type", nullable = false, length = 20)
    private VerificationType verificationType;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
}
