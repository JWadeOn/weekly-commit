package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.model.*;
import com.weeklycommit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-1.x  Strategy Setup — tests verify that the "Line of Sight" is established
 * correctly before any work is committed.
 *
 * Chess weights (KING=20, QUEEN=10, ROOK=5, BISHOP=3, KNIGHT=3, PAWN=1)
 */
@ExtendWith(MockitoExtension.class)
class StrategySetupTest {

    // ── RcdoAdminService dependencies ────────────────────────────────────────
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private OutcomeUpdateRepository outcomeUpdateRepository;
    @Mock private UserRepository userRepository;

    // ── ManagerService (team weight aggregation) dependencies ─────────────
    @Mock private WeeklyCommitRepository weeklyCommitRepository;
    @Mock private CommitItemRepository commitItemRepository;
    @Mock private ManagerNoteRepository managerNoteRepository;
    @Mock private CommitService commitService;

    private RcdoAdminService rcdoAdminService;
    private ManagerService managerService;

    private final UUID managerId  = UUID.randomUUID();
    private final UUID orgId      = UUID.randomUUID();
    private final UUID rcId       = UUID.randomUUID();
    private final UUID doId       = UUID.randomUUID();
    private final UUID outcomeId  = UUID.randomUUID();
    private final UUID ownerId    = UUID.randomUUID();
    private final UUID report1Id  = UUID.randomUUID();
    private final UUID report2Id  = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        rcdoAdminService = new RcdoAdminService(
                rallyCryRepository,
                definingObjectiveRepository,
                outcomeRepository,
                outcomeUpdateRepository,
                userRepository);

        managerService = new ManagerService(
                userRepository,
                weeklyCommitRepository,
                commitItemRepository,
                managerNoteRepository,
                commitService);
    }

    // =========================================================================
    // TC-1.1  Define Objective (DO) without Outcome
    //   System allows DO creation; returned DTO has an empty outcomes list,
    //   signalling "Incomplete / No Targets" to the UI.
    // =========================================================================

    @Test
    void tc1_1_createDefiningObjective_allowedWithoutOutcomes() {
        User manager = User.builder().id(managerId).orgId(orgId).build();
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

        RallyCry rc = RallyCry.builder().id(rcId).orgId(orgId).title("Become #1 in EMEA").build();
        when(rallyCryRepository.findById(rcId)).thenReturn(Optional.of(rc));

        DefiningObjective saved = DefiningObjective.builder()
                .id(doId).rallyCryId(rcId).title("Grow Enterprise Segment").active(true).build();
        when(definingObjectiveRepository.save(any(DefiningObjective.class))).thenReturn(saved);

        CreateDefiningObjectiveRequest req = CreateDefiningObjectiveRequest.builder()
                .rallyCryId(rcId).title("Grow Enterprise Segment").build();

        RcDoAdminResponse.AdminDefiningObjectiveDto result =
                rcdoAdminService.createDefiningObjective(managerId, req);

        assertThat(result.getId()).isEqualTo(doId);
        assertThat(result.getTitle()).isEqualTo("Grow Enterprise Segment");
        assertThat(result.isActive()).isTrue();
        // Outcomes list is empty — the Objective Card is "Incomplete / No Targets"
        assertThat(result.getOutcomes())
                .as("A freshly created DO has no outcomes (Incomplete Card)")
                .isEmpty();
    }

    // =========================================================================
    // TC-1.2  Create Non-Quantitative Outcome — Advantage Rule enforcement
    //   The DTO carries @NotNull targetValue (enforced at the HTTP boundary via
    //   @Valid). A fully-formed request WITH a targetValue must be accepted by
    //   the service (pass case).
    // =========================================================================

    @Test
    void tc1_2_createOutcome_withQuantitativeTarget_succeeds() {
        User manager = User.builder().id(managerId).orgId(orgId).build();
        User owner   = User.builder().id(ownerId).orgId(orgId).fullName("Alex Owner").build();
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));

        DefiningObjective do_ = DefiningObjective.builder()
                .id(doId).rallyCryId(rcId).title("Grow Enterprise").build();
        when(definingObjectiveRepository.findById(doId)).thenReturn(Optional.of(do_));

        RallyCry rc = RallyCry.builder().id(rcId).orgId(orgId).title("Be #1").build();
        when(rallyCryRepository.findById(rcId)).thenReturn(Optional.of(rc));

        Outcome saved = Outcome.builder()
                .id(outcomeId)
                .definingObjectiveId(doId)
                .ownerId(ownerId)
                .title("Increase sales by 10%")
                .startValue(100.0)
                .targetValue(110.0)   // quantitative ← Advantage Rule
                .currentValue(100.0)
                .unit("USD")
                .active(true)
                .lastUpdated(LocalDateTime.now())
                .build();
        when(outcomeRepository.save(any(Outcome.class))).thenReturn(saved);

        CreateOutcomeRequest req = CreateOutcomeRequest.builder()
                .definingObjectiveId(doId)
                .ownerId(ownerId)
                .title("Increase sales by 10%")
                .startValue(100.0)
                .targetValue(110.0)   // "Increase sales by 10%" → quantitative
                .unit("USD")
                .build();

        RcDoAdminResponse.AdminOutcomeDto result =
                rcdoAdminService.createOutcome(managerId, orgId, req);

        assertThat(result.getTargetValue()).isEqualTo(110.0);
        assertThat(result.getStartValue()).isEqualTo(100.0);
        assertThat(result.getTitle()).isEqualTo("Increase sales by 10%");
    }

    @Test
    void tc1_2_outcomeRequest_targetValueAnnotatedNotNull() throws NoSuchFieldException {
        // Verify the DTO-level Advantage Rule constraint exists (guards the HTTP boundary).
        var field = CreateOutcomeRequest.class.getDeclaredField("targetValue");
        var notNull = field.getAnnotation(jakarta.validation.constraints.NotNull.class);
        assertThat(notNull)
                .as("targetValue must carry @NotNull — outcomes must be quantitative (Advantage Rule)")
                .isNotNull();
        assertThat(notNull.message()).containsIgnoringCase("quantitative");
    }

    // =========================================================================
    // TC-1.3  Team Weight Aggregation
    //   Manager Dashboard totalWeight = sum of all direct reports' current
    //   Chess Pieces.
    //   Report-1: 1 KING (20)  |  Report-2: 1 QUEEN (10)  → totalWeight = 30
    // =========================================================================

    @Test
    void tc1_3_teamWeightAggregation_equalsSumOfAllMembersChessPieces() {
        User report1 = User.builder().id(report1Id).orgId(orgId).fullName("Alice").managerId(managerId).build();
        User report2 = User.builder().id(report2Id).orgId(orgId).fullName("Bob").managerId(managerId).build();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(report1, report2));

        UUID commit1 = UUID.randomUUID();
        UUID commit2 = UUID.randomUUID();
        WeeklyCommit wc1 = WeeklyCommit.builder().id(commit1).userId(report1Id).status("LOCKED").build();
        WeeklyCommit wc2 = WeeklyCommit.builder().id(commit2).userId(report2Id).status("LOCKED").build();

        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(report1Id), any(LocalDate.class)))
                .thenReturn(Optional.of(wc1));
        when(weeklyCommitRepository.findByUserIdAndWeekStartDate(eq(report2Id), any(LocalDate.class)))
                .thenReturn(Optional.of(wc2));

        CommitItem kingItem = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commit1).outcomeId(outcomeId)
                .chessPiece("KING").chessWeight(20).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();
        CommitItem queenItem = CommitItem.builder()
                .id(UUID.randomUUID()).weeklyCommitId(commit2).outcomeId(outcomeId)
                .chessPiece("QUEEN").chessWeight(10).priorityOrder(1)
                .carryForward(false).carryForwardCount(0).unplanned(false).build();

        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commit1))
                .thenReturn(List.of(kingItem));
        when(commitItemRepository.findByWeeklyCommitIdOrderByChessWeightDescPriorityOrderAsc(commit2))
                .thenReturn(List.of(queenItem));

        // ManagerService.getTeam() exposes per-report alignment; getTeamAlignment() shows totals.
        // Verify via getTeamAlignment for TC-1.3.
        when(commitService.getRallyCryIdForOutcome(outcomeId)).thenReturn(null);
        when(commitService.getDefiningObjectiveIdForOutcome(outcomeId)).thenReturn(null);

        TeamAlignmentResponse result = managerService.getTeamAlignment(managerId, orgId);

        assertThat(result.getTotalWeight())
                .as("TC-1.3: totalWeight must be sum of all members' chess-piece weights (KING 20 + QUEEN 10)")
                .isEqualTo(30L);
        assertThat(result.getAlignedWeight()).isEqualTo(30L);
        assertThat(result.getAlignmentPercentage()).isEqualTo(100);
    }
}
