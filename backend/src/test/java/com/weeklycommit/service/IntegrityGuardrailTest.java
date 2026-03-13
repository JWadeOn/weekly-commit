package com.weeklycommit.service;

import com.weeklycommit.dto.UpdateOutcomeCurrentValueRequest;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-IG-x  Integrity Guardrails — action_taken (The Method) minimum length.
 *
 * The system enforces that every outcome update includes a meaningful
 * description of what was actually done.  A one-word answer like "done"
 * does not meet the standard of evidence required by The Advantage framework.
 *
 * Constraint (UpdateOutcomeCurrentValueRequest.actionTaken):
 *   @NotBlank  — must not be null or whitespace-only
 *   @Size(min=20) — must be ≥ 20 characters after trimming
 *
 * These constraints are enforced by Spring's @Valid at the HTTP layer,
 * which translates them into HTTP 400 Bad Request responses.
 *
 * Tests in this class validate the constraint at:
 *   1. DTO field annotation level  (annotation presence / metadata)
 *   2. Jakarta Validator level     (same engine Spring MVC uses)
 *   3. Service layer               (correct field passed to audit record)
 */
@DisplayName("Integrity Guardrails — action_taken minimum length enforcement")
@ExtendWith(MockitoExtension.class)
class IntegrityGuardrailTest {

    private static Validator validator;

    // ── RcdoAdminService dependencies ────────────────────────────────────────
    @Mock private RallyCryRepository         rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository          outcomeRepository;
    @Mock private OutcomeUpdateRepository    outcomeUpdateRepository;
    @Mock private UserRepository             userRepository;

    private RcdoAdminService rcdoAdminService;

    private final UUID managerId  = UUID.randomUUID();
    private final UUID orgId      = UUID.randomUUID();
    private final UUID outcomeId  = UUID.randomUUID();
    private final UUID rcId       = UUID.randomUUID();
    private final UUID doId       = UUID.randomUUID();

    @BeforeAll
    static void initValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    @BeforeEach
    void setUp() {
        rcdoAdminService = new RcdoAdminService(
                rallyCryRepository,
                definingObjectiveRepository,
                outcomeRepository,
                outcomeUpdateRepository,
                userRepository);
    }

    // =========================================================================
    // TC-IG-1  DTO annotation contract
    //   The constraint annotations must exist on the DTO field so Spring MVC's
    //   @Valid can translate them into HTTP 400 responses.
    // =========================================================================

    @Nested
    @DisplayName("TC-IG-1 DTO field annotation contract")
    class DtoAnnotationContract {

        @Test
        @DisplayName("@Size(min=20) annotation exists on actionTaken field")
        void sizeAnnotation_minIs20() throws NoSuchFieldException {
            Field field = UpdateOutcomeCurrentValueRequest.class.getDeclaredField("actionTaken");
            Size sizeAnnotation = field.getAnnotation(Size.class);

            assertThat(sizeAnnotation)
                    .as("TC-IG-1: @Size must be present on actionTaken to trigger HTTP 400")
                    .isNotNull();
            assertThat(sizeAnnotation.min())
                    .as("TC-IG-1: minimum must be exactly 20 characters — guards against 'done' / 'fixed'")
                    .isEqualTo(20);
        }

        @Test
        @DisplayName("@NotBlank annotation exists on actionTaken field")
        void notBlankAnnotation_exists() throws NoSuchFieldException {
            Field field = UpdateOutcomeCurrentValueRequest.class.getDeclaredField("actionTaken");
            NotBlank notBlank = field.getAnnotation(NotBlank.class);

            assertThat(notBlank)
                    .as("TC-IG-1: @NotBlank must be present — null or empty strings must not reach the service")
                    .isNotNull();
        }

        @Test
        @DisplayName("@Size message explains the intent (not just 'invalid')")
        void sizeAnnotation_messageIsDescriptive() throws NoSuchFieldException {
            Field field = UpdateOutcomeCurrentValueRequest.class.getDeclaredField("actionTaken");
            Size sizeAnnotation = field.getAnnotation(Size.class);

            assertThat(sizeAnnotation.message())
                    .as("TC-IG-1: error message must explain WHY — not just 'too short'")
                    .isNotEmpty();
        }
    }

    // =========================================================================
    // TC-IG-2  Jakarta Validator — values that trigger a 400
    //   These are the inputs that must NOT reach the service layer.
    // =========================================================================

    @Nested
    @DisplayName("TC-IG-2 Jakarta Validator rejects short / blank action_taken")
    class ValidationRejectsShortInput {

        @ParameterizedTest(name = "[{index}] actionTaken = \"{0}\" → violation")
        @ValueSource(strings = {
                "",                   // blank — triggers @NotBlank
                " ",                  // whitespace — triggers @NotBlank
                "Done",               // 4 chars — triggers @Size
                "Fixed the bug",      // 14 chars — triggers @Size
                "19 chars of text!!!", // exactly 19 — still too short
        })
        @DisplayName("Strings under 20 chars or blank trigger ConstraintViolation")
        void shortOrBlankActionTaken_triggersViolation(String actionTaken) {
            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(12.0)
                    .actionTaken(actionTaken)
                    .verificationType(VerificationType.DASHBOARD)
                    .build();

            Set<ConstraintViolation<UpdateOutcomeCurrentValueRequest>> violations =
                    validator.validate(req);

            assertThat(violations)
                    .as("TC-IG-2: '%s' must produce at least one constraint violation → HTTP 400", actionTaken)
                    .isNotEmpty();

            boolean hasActionTakenViolation = violations.stream()
                    .anyMatch(v -> "actionTaken".equals(v.getPropertyPath().toString()));
            assertThat(hasActionTakenViolation)
                    .as("TC-IG-2: the violation must reference the actionTaken field")
                    .isTrue();
        }

        @Test
        @DisplayName("Null actionTaken triggers @NotBlank violation")
        void nullActionTaken_triggersViolation() {
            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(12.0)
                    .actionTaken(null)
                    .verificationType(VerificationType.DASHBOARD)
                    .build();

            Set<ConstraintViolation<UpdateOutcomeCurrentValueRequest>> violations =
                    validator.validate(req);

            assertThat(violations)
                    .as("TC-IG-2: null actionTaken must produce ConstraintViolation")
                    .isNotEmpty();
        }
    }

    // =========================================================================
    // TC-IG-3  Jakarta Validator — values that PASS (≥ 20 chars)
    //   These should reach the service without constraint violations.
    // =========================================================================

    @Nested
    @DisplayName("TC-IG-3 Jakarta Validator accepts valid action_taken")
    class ValidationAcceptsValidInput {

        @ParameterizedTest(name = "[{index}] actionTaken length={0}")
        @ValueSource(strings = {
                "Exactly twenty chars!", // 21 chars (space trimmed by service — annotation on raw value)
                "Ran load test against staging, P95 dropped from 300ms to 180ms",
                "Reviewed pull request, approved after two revision cycles",
                "Completed sprint 14 demo, all acceptance criteria passed",
        })
        @DisplayName("Strings ≥ 20 chars produce zero constraint violations")
        void validActionTaken_noViolations(String actionTaken) {
            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(15.0)
                    .actionTaken(actionTaken)
                    .verificationType(VerificationType.QA)
                    .build();

            Set<ConstraintViolation<UpdateOutcomeCurrentValueRequest>> violations =
                    validator.validateProperty(req, "actionTaken");

            assertThat(violations)
                    .as("TC-IG-3: '%s' is ≥20 chars → no violations", actionTaken)
                    .isEmpty();
        }

        @Test
        @DisplayName("Boundary: exactly 20-char string passes validation")
        void exactly20Chars_passes() {
            String exactly20 = "A".repeat(20); // "AAAAAAAAAAAAAAAAAAAA"
            assertThat(exactly20).hasSize(20);

            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(10.0)
                    .actionTaken(exactly20)
                    .verificationType(VerificationType.PEER_REVIEW)
                    .build();

            Set<ConstraintViolation<UpdateOutcomeCurrentValueRequest>> violations =
                    validator.validateProperty(req, "actionTaken");

            assertThat(violations)
                    .as("TC-IG-3: exactly 20 chars must be the passing boundary (min=20 is inclusive)")
                    .isEmpty();
        }

        @Test
        @DisplayName("Boundary: 19-char string fails validation (one char under)")
        void exactly19Chars_fails() {
            String under20 = "A".repeat(19);
            assertThat(under20).hasSize(19);

            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(10.0)
                    .actionTaken(under20)
                    .verificationType(VerificationType.PEER_REVIEW)
                    .build();

            Set<ConstraintViolation<UpdateOutcomeCurrentValueRequest>> violations =
                    validator.validateProperty(req, "actionTaken");

            assertThat(violations)
                    .as("TC-IG-3: 19 chars is one under the minimum — must fail (min=20 is inclusive)")
                    .isNotEmpty();
        }
    }

    // =========================================================================
    // TC-IG-4  Service layer — valid requests persist the actionTaken verbatim
    //   When a valid (≥20 char) actionTaken is provided, the service must:
    //     1. Persist the trimmed value in the OutcomeUpdate audit record.
    //     2. NOT silently truncate or replace it.
    // =========================================================================

    @Nested
    @DisplayName("TC-IG-4 Service persists valid actionTaken in audit record")
    class ServicePersistsActionTaken {

        @Test
        @DisplayName("Valid actionTaken is saved verbatim (trimmed) in OutcomeUpdate")
        void validActionTaken_persistedInAuditRecord() {
            String actionTaken = "Ran load test: P95 improved from 300ms to 150ms";
            assertThat(actionTaken.length()).isGreaterThanOrEqualTo(20);

            // Wire up the manager
            User manager = User.builder().id(managerId).orgId(orgId).build();
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

            // Wire up the RCDO hierarchy
            Outcome outcome = Outcome.builder()
                    .id(outcomeId).definingObjectiveId(doId)
                    .title("P95 latency").startValue(300.0).targetValue(100.0).currentValue(300.0)
                    .active(true).lastUpdated(LocalDateTime.now()).build();
            DefiningObjective do_ = DefiningObjective.builder()
                    .id(doId).rallyCryId(rcId).title("Performance").build();
            RallyCry rc = RallyCry.builder()
                    .id(rcId).orgId(orgId).title("Reliability").build();

            when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
            when(definingObjectiveRepository.findById(doId)).thenReturn(Optional.of(do_));
            when(rallyCryRepository.findById(rcId)).thenReturn(Optional.of(rc));
            when(outcomeRepository.save(any(Outcome.class))).thenReturn(outcome);
            // ownerId is null → toAdminOutcomeDto returns "Unassigned" without calling userRepository

            OutcomeUpdate savedAudit = OutcomeUpdate.builder()
                    .id(UUID.randomUUID()).outcomeId(outcomeId)
                    .oldValue(300.0).newValue(150.0)
                    .actionTaken(actionTaken.trim())
                    .verificationType(VerificationType.LOAD_TEST)
                    .updatedBy(managerId)
                    .timestamp(LocalDateTime.now())
                    .build();
            when(outcomeUpdateRepository.save(any(OutcomeUpdate.class))).thenReturn(savedAudit);

            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(150.0)
                    .actionTaken(actionTaken)
                    .verificationType(VerificationType.LOAD_TEST)
                    .build();

            rcdoAdminService.updateOutcomeCurrentValue(managerId, orgId, outcomeId, req);

            ArgumentCaptor<OutcomeUpdate> captor = ArgumentCaptor.forClass(OutcomeUpdate.class);
            verify(outcomeUpdateRepository).save(captor.capture());

            OutcomeUpdate persisted = captor.getValue();
            assertThat(persisted.getActionTaken())
                    .as("TC-IG-4: actionTaken must be persisted verbatim (trimmed)")
                    .isEqualTo(actionTaken.trim());
            assertThat(persisted.getNewValue())
                    .as("TC-IG-4: new current value must be recorded in the audit record")
                    .isEqualTo(150.0);
            assertThat(persisted.getOldValue())
                    .as("TC-IG-4: old value (300.0) must be captured for the audit trail")
                    .isEqualTo(300.0);
            assertThat(persisted.getVerificationType())
                    .as("TC-IG-4: verification type must be carried to the audit record")
                    .isEqualTo(VerificationType.LOAD_TEST);
            assertThat(persisted.getUpdatedBy())
                    .as("TC-IG-4: updatedBy must be the manager's userId (not null)")
                    .isEqualTo(managerId);
        }

        @Test
        @DisplayName("Service trims leading/trailing whitespace before persisting")
        void actionTakenWithPadding_trimmedBeforePersist() {
            String padded = "   Ran load test: P95 improved significantly   ";
            assertThat(padded.trim().length()).isGreaterThanOrEqualTo(20);

            User manager = User.builder().id(managerId).orgId(orgId).build();
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

            Outcome outcome = Outcome.builder()
                    .id(outcomeId).definingObjectiveId(doId)
                    .title("P95 latency").startValue(300.0).targetValue(100.0).currentValue(300.0)
                    .active(true).lastUpdated(LocalDateTime.now()).build();
            DefiningObjective do_ = DefiningObjective.builder()
                    .id(doId).rallyCryId(rcId).title("Performance").build();
            RallyCry rc = RallyCry.builder()
                    .id(rcId).orgId(orgId).title("Reliability").build();

            when(outcomeRepository.findById(outcomeId)).thenReturn(Optional.of(outcome));
            when(definingObjectiveRepository.findById(doId)).thenReturn(Optional.of(do_));
            when(rallyCryRepository.findById(rcId)).thenReturn(Optional.of(rc));
            when(outcomeRepository.save(any(Outcome.class))).thenReturn(outcome);
            // ownerId is null → toAdminOutcomeDto returns "Unassigned" without calling userRepository
            when(outcomeUpdateRepository.save(any(OutcomeUpdate.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            UpdateOutcomeCurrentValueRequest req = UpdateOutcomeCurrentValueRequest.builder()
                    .currentValue(200.0)
                    .actionTaken(padded)
                    .verificationType(VerificationType.DASHBOARD)
                    .build();

            rcdoAdminService.updateOutcomeCurrentValue(managerId, orgId, outcomeId, req);

            ArgumentCaptor<OutcomeUpdate> captor = ArgumentCaptor.forClass(OutcomeUpdate.class);
            verify(outcomeUpdateRepository).save(captor.capture());

            assertThat(captor.getValue().getActionTaken())
                    .as("TC-IG-4: service must call .trim() — no leading/trailing spaces stored")
                    .isEqualTo(padded.trim());
        }
    }
}
