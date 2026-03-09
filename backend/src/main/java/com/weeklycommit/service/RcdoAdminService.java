package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.exception.UnauthorizedException;
import com.weeklycommit.model.DefiningObjective;
import com.weeklycommit.model.Outcome;
import com.weeklycommit.model.RallyCry;
import com.weeklycommit.model.User;
import com.weeklycommit.repository.DefiningObjectiveRepository;
import com.weeklycommit.repository.OutcomeRepository;
import com.weeklycommit.repository.RallyCryRepository;
import com.weeklycommit.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RcdoAdminService {

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final UserRepository userRepository;

    public RcdoAdminService(RallyCryRepository rallyCryRepository,
                            DefiningObjectiveRepository definingObjectiveRepository,
                            OutcomeRepository outcomeRepository,
                            UserRepository userRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
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
                                            String ownerName = userRepository.findById(o.getOwnerId())
                                                    .map(User::getFullName)
                                                    .orElse("Unknown");
                                            return RcDoAdminResponse.AdminOutcomeDto.builder()
                                                    .id(o.getId())
                                                    .definingObjectiveId(o.getDefiningObjectiveId())
                                                    .title(o.getTitle())
                                                    .description(o.getDescription())
                                                    .ownerId(o.getOwnerId())
                                                    .ownerName(ownerName)
                                                    .active(o.isActive())
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

    private RcDoAdminResponse.AdminOutcomeDto toAdminOutcomeDto(Outcome o) {
        String ownerName = userRepository.findById(o.getOwnerId())
                .map(User::getFullName)
                .orElse("Unknown");
        return RcDoAdminResponse.AdminOutcomeDto.builder()
                .id(o.getId())
                .definingObjectiveId(o.getDefiningObjectiveId())
                .title(o.getTitle())
                .description(o.getDescription())
                .ownerId(o.getOwnerId())
                .ownerName(ownerName)
                .active(o.isActive())
                .build();
    }
}
