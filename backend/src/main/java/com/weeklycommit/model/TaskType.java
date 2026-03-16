package com.weeklycommit.model;

public enum TaskType {
    /** Tied to an Outcome in the RCDO hierarchy — counts in alignment score. */
    STRATEGIC,
    /** Keep-the-lights-on work (bugs, maintenance, security, admin).
     *  Counts in total capacity but NOT in alignment numerator. */
    KTLO
}
