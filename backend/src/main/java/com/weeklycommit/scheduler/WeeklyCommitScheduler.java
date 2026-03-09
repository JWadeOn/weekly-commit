package com.weeklycommit.scheduler;

import com.weeklycommit.model.WeeklyCommit;
import com.weeklycommit.repository.UserRepository;
import com.weeklycommit.repository.WeeklyCommitRepository;
import com.weeklycommit.service.CommitService;
import com.weeklycommit.service.StateMachineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * UTC-based scheduled jobs for weekly commit lifecycle.
 * Monday 6am UTC: ensure current week DRAFT exists for all users.
 * Friday 5pm UTC: transition LOCKED commits to RECONCILING.
 */
@Component
public class WeeklyCommitScheduler {

    private static final Logger log = LoggerFactory.getLogger(WeeklyCommitScheduler.class);

    private final UserRepository userRepository;
    private final WeeklyCommitRepository weeklyCommitRepository;
    private final CommitService commitService;
    private final StateMachineService stateMachineService;

    public WeeklyCommitScheduler(UserRepository userRepository,
                                 WeeklyCommitRepository weeklyCommitRepository,
                                 CommitService commitService,
                                 StateMachineService stateMachineService) {
        this.userRepository = userRepository;
        this.weeklyCommitRepository = weeklyCommitRepository;
        this.commitService = commitService;
        this.stateMachineService = stateMachineService;
    }

    @Scheduled(cron = "0 0 6 * * MON")
    public void ensureCurrentWeekDrafts() {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        log.info("Scheduler: ensuring current week DRAFTs for week starting {}", monday);

        userRepository.findAll().forEach(user -> {
            try {
                commitService.getCurrentWeek(user.getId(), user.getOrgId());
            } catch (Exception e) {
                log.warn("Failed to ensure DRAFT for user {}: {}", user.getId(), e.getMessage());
            }
        });
    }

    @Scheduled(cron = "0 0 17 * * FRI")
    public void transitionLockedToReconciling() {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        log.info("Scheduler: transitioning LOCKED to RECONCILING for week starting {}", monday);

        List<WeeklyCommit> locked = weeklyCommitRepository.findByStatusAndWeekStartDate("LOCKED", monday);
        for (WeeklyCommit commit : locked) {
            try {
                stateMachineService.transitionStatus(
                        commit.getId(), commit.getUserId(), commit.getOrgId(), "RECONCILING", null);
            } catch (Exception e) {
                log.warn("Failed to transition commit {}: {}", commit.getId(), e.getMessage());
            }
        }
    }
}
