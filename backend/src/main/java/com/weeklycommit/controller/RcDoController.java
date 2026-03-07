package com.weeklycommit.controller;

import com.weeklycommit.config.SecurityContextHelper;
import com.weeklycommit.dto.RcDoHierarchyResponse;
import com.weeklycommit.service.RcDoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/rcdo")
public class RcDoController {

    private final RcDoService rcDoService;

    public RcDoController(RcDoService rcDoService) {
        this.rcDoService = rcDoService;
    }

    @GetMapping("/hierarchy")
    public ResponseEntity<RcDoHierarchyResponse> getHierarchy() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(rcDoService.getHierarchy(orgId));
    }
}
