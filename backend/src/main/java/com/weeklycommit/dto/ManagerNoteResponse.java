package com.weeklycommit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerNoteResponse {
    private UUID id;
    private UUID managerId;
    private String managerName;
    private String note;
    private LocalDateTime createdAt;
}
