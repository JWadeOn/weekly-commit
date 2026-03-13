package com.weeklycommit.service;

import com.weeklycommit.dto.*;
import com.weeklycommit.model.DefiningObjective;
import com.weeklycommit.model.Outcome;
import com.weeklycommit.model.RallyCry;
import com.weeklycommit.repository.DefiningObjectiveRepository;
import com.weeklycommit.repository.OutcomeRepository;
import com.weeklycommit.repository.RallyCryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class RcDoService {

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;

    public RcDoService(RallyCryRepository rallyCryRepository,
                       DefiningObjectiveRepository definingObjectiveRepository,
                       OutcomeRepository outcomeRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
    }

    public RcDoHierarchyResponse getHierarchy(UUID orgId) {
        List<RallyCry> rallyCries = rallyCryRepository.findByOrgIdAndActiveTrue(orgId);

        List<RallyCryDto> rallyCryDtos = rallyCries.stream()
                .map(rc -> {
                    List<DefiningObjective> objectives =
                            definingObjectiveRepository.findByRallyCryIdAndActiveTrue(rc.getId());

                    List<DefiningObjectiveDto> objectiveDtos = objectives.stream()
                            .map(obj -> {
                                List<Outcome> outcomes =
                                        outcomeRepository.findByDefiningObjectiveIdAndActiveTrue(obj.getId());

                                List<OutcomeDto> outcomeDtos = outcomes.stream()
                                        .map(o -> OutcomeDto.builder()
                                                .id(o.getId())
                                                .title(o.getTitle())
                                                .description(o.getDescription())
                                                .ownerId(o.getOwnerId())
                                                .startValue(o.getStartValue())
                                                .targetValue(o.getTargetValue())
                                                .currentValue(o.getCurrentValue())
                                                .unit(o.getUnit())
                                                .lastUpdated(o.getLastUpdated())
                                                .build())
                                        .toList();

                                return DefiningObjectiveDto.builder()
                                        .id(obj.getId())
                                        .title(obj.getTitle())
                                        .description(obj.getDescription())
                                        .outcomes(outcomeDtos)
                                        .build();
                            })
                            .toList();

                    return RallyCryDto.builder()
                            .id(rc.getId())
                            .title(rc.getTitle())
                            .description(rc.getDescription())
                            .definingObjectives(objectiveDtos)
                            .build();
                })
                .toList();

        return RcDoHierarchyResponse.builder()
                .rallyCries(rallyCryDtos)
                .build();
    }
}
