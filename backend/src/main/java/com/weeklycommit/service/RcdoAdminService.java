package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.InvalidStateTransitionException;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.model.DefiningObjective;
import com.weeklycommit.model.Outcome;
import com.weeklycommit.model.OutcomeUpdate;
import com.weeklycommit.model.RallyCry;
import com.weeklycommit.model.User;
import com.weeklycommit.repository.DefiningObjectiveRepository;
import com.weeklycommit.repository.OutcomeRepository;
import com.weeklycommit.repository.OutcomeUpdateRepository;
import com.weeklycommit.repository.RallyCryRepository;
import com.weeklycommit.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RcdoAdminService {

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final OutcomeUpdateRepository outcomeUpdateRepository;
    private final UserRepository userRepository;

    public RcdoAdminService(RallyCryRepository rallyCryRepository,
                            DefiningObjectiveRepository definingObjectiveRepository,
                            OutcomeRepository outcomeRepository,
                            OutcomeUpdateRepository outcomeUpdateRepository,
                            UserRepository userRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
        this.outcomeUpdateRepository = outcomeUpdateRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public RcDoAdminResponse getAdminHierarchy(UUID managerId, UUID orgId) {
        verifyManagerOrg(managerId, orgId);

        List<RallyCry> rallyCries = rallyCryRepository.findByOrgIdOrderByCreatedAtAsc(orgId);
        List<RcDoAdminResponse.AdminRallyCryDto> rcDtos = rallyCries.stream()
                .map(rc -> {
                    List<DefiningObjective> objectives = definingObjectiveRepository.findByRallyCryIdOrderByCreatedAtAsc(rc.getId());
                    List<RcDoAdminResponse.AdminDefiningObjectiveDto> doDtos = objectives.stream()
                            .map(do_ -> {
                                List<Outcome> outcomes = outcomeRepository.findByDefiningObjectiveIdOrderByCreatedAtAsc(do_.getId());
                                List<RcDoAdminResponse.AdminOutcomeDto> outcomeDtos = outcomes.stream()
                                        .map(o -> {
                                            String ownerName = o.getOwnerId() == null ? "Unassigned"
                                                    : userRepository.findById(o.getOwnerId())
                                                            .map(User::getFullName)
                                                            .orElse("Unknown");
                                            boolean inv = o.getTargetValue() != null && o.getStartValue() != null
                                                    && o.getTargetValue() < o.getStartValue();
                                            return RcDoAdminResponse.AdminOutcomeDto.builder()
                                                    .id(o.getId())
                                                    .definingObjectiveId(o.getDefiningObjectiveId())
                                                    .title(o.getTitle())
                                                    .description(o.getDescription())
                                                    .ownerId(o.getOwnerId())
                                                    .ownerName(ownerName)
                                                    .active(o.isActive())
                                                    .startValue(o.getStartValue())
                                                    .targetValue(o.getTargetValue())
                                                    .currentValue(o.getCurrentValue())
                                                    .unit(o.getUnit())
                                                    .unitLabel(o.getUnitLabel())
                                                    .unitType(o.getUnitType() != null ? o.getUnitType().name() : null)
                                                    .inverted(inv)
                                                    .lastUpdated(o.getLastUpdated())
                                                    .build();
                                        })
                                        .toList();
                                return RcDoAdminResponse.AdminDefiningObjectiveDto.builder()
                                        .id(do_.getId())
                                        .rallyCryId(do_.getRallyCryId())
                                        .title(do_.getTitle())
                                        .description(do_.getDescription())
                                        .active(do_.isActive())
                                        .outcomes(outcomeDtos)
                                        .build();
                            })
                            .toList();
                    return RcDoAdminResponse.AdminRallyCryDto.builder()
                            .id(rc.getId())
                            .title(rc.getTitle())
                            .description(rc.getDescription())
                            .active(rc.isActive())
                            .definingObjectives(doDtos)
                            .build();
                })
                .toList();

        return RcDoAdminResponse.builder().rallyCries(rcDtos).build();
    }

    @Transactional(readOnly = true)
    public List<User> getOrgMembersForOutcomeOwner(UUID managerId, UUID orgId) {
        verifyManagerOrg(managerId, orgId);
        return userRepository.findByOrgId(orgId);
    }

    @Transactional
    public RcDoAdminResponse.AdminRallyCryDto createRallyCry(UUID managerId, UUID orgId, CreateRallyCryRequest req) {
        verifyManagerOrg(managerId, orgId);

        List<RallyCry> existing = rallyCryRepository.findByOrgIdAndActiveTrue(orgId);
        if (!existing.isEmpty()) {
            throw new InvalidStateTransitionException(
                    "An organization can have only one active Rally Cry (Lencioni, The Advantage). " +
                    "Deactivate the current Rally Cry before creating a new one.");
        }

        RallyCry rc = RallyCry.builder()
                .orgId(orgId)
                .title(req.getTitle().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .active(true)
                .build();
        RallyCry saved = rallyCryRepository.save(rc);
        return toAdminRallyCryDto(saved);
    }

    @Transactional
    public RcDoAdminResponse.AdminRallyCryDto updateRallyCry(UUID managerId, UUID rallyCryId, UpdateRallyCryRequest req) {
        RallyCry rc = rallyCryRepository.findById(rallyCryId)
                .orElseThrow(() -> new IllegalArgumentException("Rally Cry not found"));
        verifyManagerOrg(managerId, rc.getOrgId());

        rc.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) rc.setDescription(req.getDescription().trim());
        if (req.getActive() != null) rc.setActive(req.getActive());
        RallyCry saved = rallyCryRepository.save(rc);
        return toAdminRallyCryDto(saved);
    }

    @Transactional
    public void deactivateRallyCry(UUID managerId, UUID rallyCryId) {
        RallyCry rc = rallyCryRepository.findById(rallyCryId)
                .orElseThrow(() -> new IllegalArgumentException("Rally Cry not found"));
        verifyManagerOrg(managerId, rc.getOrgId());
        rc.setActive(false);
        rallyCryRepository.save(rc);
    }

    @Transactional
    public RcDoAdminResponse.AdminDefiningObjectiveDto createDefiningObjective(UUID managerId, CreateDefiningObjectiveRequest req) {
        RallyCry rc = rallyCryRepository.findById(req.getRallyCryId())
                .orElseThrow(() -> new IllegalArgumentException("Rally Cry not found"));
        verifyManagerOrg(managerId, rc.getOrgId());

        DefiningObjective do_ = DefiningObjective.builder()
                .rallyCryId(req.getRallyCryId())
                .title(req.getTitle().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .active(true)
                .build();
        DefiningObjective saved = definingObjectiveRepository.save(do_);
        return toAdminDefiningObjectiveDto(saved);
    }

    @Transactional
    public RcDoAdminResponse.AdminDefiningObjectiveDto updateDefiningObjective(UUID managerId, UUID definingObjectiveId,
                                                                                 UpdateDefiningObjectiveRequest req) {
        DefiningObjective do_ = definingObjectiveRepository.findById(definingObjectiveId)
                .orElseThrow(() -> new IllegalArgumentException("Defining Objective not found"));
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        verifyManagerOrg(managerId, rc.getOrgId());

        do_.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) do_.setDescription(req.getDescription().trim());
        if (req.getActive() != null) do_.setActive(req.getActive());
        DefiningObjective saved = definingObjectiveRepository.save(do_);
        return toAdminDefiningObjectiveDto(saved);
    }

    @Transactional
    public void deactivateDefiningObjective(UUID managerId, UUID definingObjectiveId) {
        DefiningObjective do_ = definingObjectiveRepository.findById(definingObjectiveId)
                .orElseThrow(() -> new IllegalArgumentException("Defining Objective not found"));
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        verifyManagerOrg(managerId, rc.getOrgId());
        do_.setActive(false);
        definingObjectiveRepository.save(do_);
    }

    @Transactional
    public RcDoAdminResponse.AdminOutcomeDto createOutcome(UUID managerId, UUID orgId, CreateOutcomeRequest req) {
        verifyManagerOrg(managerId, orgId);
        verifyOutcomeOwnerInOrg(req.getOwnerId(), orgId);

        DefiningObjective do_ = definingObjectiveRepository.findById(req.getDefiningObjectiveId())
                .orElseThrow(() -> new IllegalArgumentException("Defining Objective not found"));
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        if (!rc.getOrgId().equals(orgId)) {
            throw new UnauthorizedException("Defining Objective does not belong to your organization");
        }

        Outcome o = Outcome.builder()
                .definingObjectiveId(req.getDefiningObjectiveId())
                .ownerId(req.getOwnerId())
                .title(req.getTitle().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .active(true)
                .startValue(req.getStartValue() != null ? req.getStartValue() : 0.0)
                .targetValue(req.getTargetValue())
                .currentValue(req.getStartValue() != null ? req.getStartValue() : 0.0)
                .unit(req.getUnit() != null ? req.getUnit().trim() : null)
                .unitLabel(req.getUnitLabel() != null ? req.getUnitLabel().trim() : null)
                .unitType(req.getUnitType())
                .lastUpdated(LocalDateTime.now())
                .build();
        Outcome saved = outcomeRepository.save(o);
        return toAdminOutcomeDto(saved);
    }

    @Transactional
    public RcDoAdminResponse.AdminOutcomeDto updateOutcome(UUID managerId, UUID orgId, UUID outcomeId, UpdateOutcomeRequest req) {
        verifyManagerOrg(managerId, orgId);

        Outcome o = outcomeRepository.findById(outcomeId)
                .orElseThrow(() -> new IllegalArgumentException("Outcome not found"));
        DefiningObjective do_ = definingObjectiveRepository.findById(o.getDefiningObjectiveId()).orElseThrow();
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        if (!rc.getOrgId().equals(orgId)) {
            throw new UnauthorizedException("Outcome does not belong to your organization");
        }

        o.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) o.setDescription(req.getDescription().trim());
        if (req.getActive() != null) o.setActive(req.getActive());
        if (req.getOwnerId() != null) {
            verifyOutcomeOwnerInOrg(req.getOwnerId(), orgId);
            o.setOwnerId(req.getOwnerId());
        }
        if (req.getStartValue() != null) o.setStartValue(req.getStartValue());
        if (req.getTargetValue() != null) o.setTargetValue(req.getTargetValue());
        if (req.getCurrentValue() != null) {
            o.setCurrentValue(req.getCurrentValue());
            o.setLastUpdated(LocalDateTime.now());
        }
        if (req.getUnit() != null && !req.getUnit().isBlank()) o.setUnit(req.getUnit().trim());
        if (req.getUnitLabel() != null) o.setUnitLabel(req.getUnitLabel().trim());
        if (req.getUnitType() != null) o.setUnitType(req.getUnitType());
        Outcome saved = outcomeRepository.save(o);
        return toAdminOutcomeDto(saved);
    }

    @Transactional
    public void deactivateOutcome(UUID managerId, UUID orgId, UUID outcomeId) {
        verifyManagerOrg(managerId, orgId);
        Outcome o = outcomeRepository.findById(outcomeId)
                .orElseThrow(() -> new IllegalArgumentException("Outcome not found"));
        DefiningObjective do_ = definingObjectiveRepository.findById(o.getDefiningObjectiveId()).orElseThrow();
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        if (!rc.getOrgId().equals(orgId)) {
            throw new UnauthorizedException("Outcome does not belong to your organization");
        }
        o.setActive(false);
        outcomeRepository.save(o);
    }

    private void verifyManagerOrg(UUID managerId, UUID orgId) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        if (!orgId.equals(manager.getOrgId())) {
            throw new UnauthorizedException("Organization mismatch");
        }
        // Optionally verify manager has MANAGER role - could use UserRoleRepository
    }

    private void verifyOutcomeOwnerInOrg(UUID ownerId, UUID orgId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Owner not found"));
        if (!orgId.equals(owner.getOrgId())) {
            throw new IllegalArgumentException("Outcome owner must be in your organization");
        }
    }

    private RcDoAdminResponse.AdminRallyCryDto toAdminRallyCryDto(RallyCry rc) {
        return RcDoAdminResponse.AdminRallyCryDto.builder()
                .id(rc.getId())
                .title(rc.getTitle())
                .description(rc.getDescription())
                .active(rc.isActive())
                .definingObjectives(List.of())
                .build();
    }

    private RcDoAdminResponse.AdminDefiningObjectiveDto toAdminDefiningObjectiveDto(DefiningObjective do_) {
        return RcDoAdminResponse.AdminDefiningObjectiveDto.builder()
                .id(do_.getId())
                .rallyCryId(do_.getRallyCryId())
                .title(do_.getTitle())
                .description(do_.getDescription())
                .active(do_.isActive())
                .outcomes(List.of())
                .build();
    }

    @Transactional
    public RcDoAdminResponse.AdminOutcomeDto updateOutcomeCurrentValue(
            UUID managerId, UUID orgId, UUID outcomeId, UpdateOutcomeCurrentValueRequest req) {
        verifyManagerOrg(managerId, orgId);

        Outcome o = outcomeRepository.findById(outcomeId)
                .orElseThrow(() -> new IllegalArgumentException("Outcome not found"));
        DefiningObjective do_ = definingObjectiveRepository.findById(o.getDefiningObjectiveId()).orElseThrow();
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        if (!rc.getOrgId().equals(orgId)) {
            throw new UnauthorizedException("Outcome does not belong to your organization");
        }

        Double oldValue = o.getCurrentValue();
        o.setCurrentValue(req.getCurrentValue());
        o.setLastUpdated(LocalDateTime.now());
        Outcome saved = outcomeRepository.save(o);

        // Immutable audit record — The Ledger of Execution
        OutcomeUpdate audit = OutcomeUpdate.builder()
                .outcomeId(outcomeId)
                .oldValue(oldValue)
                .newValue(req.getCurrentValue())
                .actionTaken(req.getActionTaken().trim())
                .verificationType(req.getVerificationType())
                .updatedBy(managerId)
                .timestamp(LocalDateTime.now())
                .build();
        outcomeUpdateRepository.save(audit);

        return toAdminOutcomeDto(saved);
    }

    @Transactional(readOnly = true)
    public List<OutcomeUpdateDto> getOutcomeHistory(UUID managerId, UUID orgId, UUID outcomeId) {
        verifyManagerOrg(managerId, orgId);

        Outcome o = outcomeRepository.findById(outcomeId)
                .orElseThrow(() -> new IllegalArgumentException("Outcome not found"));
        DefiningObjective do_ = definingObjectiveRepository.findById(o.getDefiningObjectiveId()).orElseThrow();
        RallyCry rc = rallyCryRepository.findById(do_.getRallyCryId()).orElseThrow();
        if (!rc.getOrgId().equals(orgId)) {
            throw new UnauthorizedException("Outcome does not belong to your organization");
        }

        return outcomeUpdateRepository.findByOutcomeIdOrderByTimestampDesc(outcomeId).stream()
                .map(upd -> {
                    String updaterName = upd.getUpdatedBy() == null ? null
                            : userRepository.findById(upd.getUpdatedBy())
                                    .map(User::getFullName)
                                    .orElse(null);
                    return OutcomeUpdateDto.builder()
                            .id(upd.getId())
                            .outcomeId(upd.getOutcomeId())
                            .oldValue(upd.getOldValue())
                            .newValue(upd.getNewValue())
                            .actionTaken(upd.getActionTaken())
                            .verificationType(upd.getVerificationType().name())
                            .updatedByName(updaterName)
                            .timestamp(upd.getTimestamp())
                            .build();
                })
                .toList();
    }

    private RcDoAdminResponse.AdminOutcomeDto toAdminOutcomeDto(Outcome o) {
        String ownerName = o.getOwnerId() == null ? "Unassigned"
                : userRepository.findById(o.getOwnerId())
                        .map(User::getFullName)
                        .orElse("Unknown");
        boolean inverted = o.getTargetValue() != null && o.getStartValue() != null
                && o.getTargetValue() < o.getStartValue();
        return RcDoAdminResponse.AdminOutcomeDto.builder()
                .id(o.getId())
                .definingObjectiveId(o.getDefiningObjectiveId())
                .title(o.getTitle())
                .description(o.getDescription())
                .ownerId(o.getOwnerId())
                .ownerName(ownerName)
                .active(o.isActive())
                .startValue(o.getStartValue())
                .targetValue(o.getTargetValue())
                .currentValue(o.getCurrentValue())
                .unit(o.getUnit())
                .unitLabel(o.getUnitLabel())
                .unitType(o.getUnitType() != null ? o.getUnitType().name() : null)
                .inverted(inverted)
                .lastUpdated(o.getLastUpdated())
                .build();
    }
}
