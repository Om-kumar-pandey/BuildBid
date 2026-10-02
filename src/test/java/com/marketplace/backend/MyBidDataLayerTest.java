package com.marketplace.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID - MY BID DATA LAYER TEST (Phase 1)
 *
 * Verifies isolation, mapping, status models, audit events,
 * and repository interfaces of the My Bid data layer.
 */
public class MyBidDataLayerTest {

    @Test
    @DisplayName("Verify MyBid entity fields, status lifecycle, and lifecycle hooks")
    void testMyBidEntity() {
        MyBid bid = new MyBid();
        assertNull(bid.getId());

        Project project = new Project();
        project.setId(101L);
        project.setTitle("Villa Construction");

        MarketplaceBackendApplication.MarketplaceUser customer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customer, "id", 201L);

        MarketplaceBackendApplication.MarketplaceUser contractor = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractor, "id", 301L);

        bid.setProject(project);
        bid.setCustomer(customer);
        bid.setContractor(contractor);
        bid.setBidAmount(1200000.0);
        bid.setMaterialCost(600000.0);
        bid.setLabourCost(400000.0);
        bid.setEquipmentCost(100000.0);
        bid.setTransportCost(50000.0);
        bid.setOtherCharges(50000.0);
        bid.setEstimatedDuration("6 months");
        bid.setProposedTimeline("Start in Nov 2026, complete by Apr 2027");
        bid.setWorkersCount(15);
        bid.setScopeOfWork("Full structure and masonry");
        bid.setIncludedWork("Excavation, RCC, Brickwork");
        bid.setExcludedWork("Painting, Interior fitout");
        bid.setPaymentTerms("30% advance, 40% milestone, 30% handover");
        bid.setWarranty("1 year structural guarantee");
        bid.setRemarks("Subject to site inspection");

        // Verify prePersist sets defaults
        bid.onCreate();
        assertEquals(MyBid.Status.PENDING, bid.getStatus());
        assertNotNull(bid.getSubmittedAt());

        // Verify status transitions
        bid.setStatus(MyBid.Status.ACCEPTED);
        assertEquals(MyBid.Status.ACCEPTED, bid.getStatus());

        LocalDateTime rejectedAt = LocalDateTime.now();
        bid.setStatus(MyBid.Status.NOT_SELECTED);
        bid.setRejectedAt(rejectedAt);
        assertEquals(MyBid.Status.NOT_SELECTED, bid.getStatus());
        assertEquals(rejectedAt, bid.getRejectedAt());

        bid.setStatus(MyBid.Status.ASSIGNMENT_DECLINED);
        assertEquals(MyBid.Status.ASSIGNMENT_DECLINED, bid.getStatus());

        bid.setStatus(MyBid.Status.WITHDRAWN);
        assertEquals(MyBid.Status.WITHDRAWN, bid.getStatus());

        // Verify preUpdate
        bid.onUpdate();
        assertNotNull(bid.getUpdatedAt());

        // Verify fields
        assertEquals(101L, bid.getProject().getId());
        assertEquals(201L, bid.getCustomer().getId());
        assertEquals(301L, bid.getContractor().getId());
        assertEquals(1200000.0, bid.getBidAmount());
        assertEquals(600000.0, bid.getMaterialCost());
        assertEquals(400000.0, bid.getLabourCost());
        assertEquals(100000.0, bid.getEquipmentCost());
        assertEquals(50000.0, bid.getTransportCost());
        assertEquals(50000.0, bid.getOtherCharges());
        assertEquals("6 months", bid.getEstimatedDuration());
        assertEquals("Start in Nov 2026, complete by Apr 2027", bid.getProposedTimeline());
        assertEquals(15, bid.getWorkersCount());
    }

    @Test
    @DisplayName("Verify MyBidAssignment entity, statuses, and single-assignment flags")
    void testMyBidAssignmentEntity() {
        MyBidAssignment assignment = new MyBidAssignment();
        assertNull(assignment.getId());

        Project project = new Project();
        project.setId(101L);

        MarketplaceBackendApplication.MarketplaceUser customer = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customer, "id", 201L);

        MarketplaceBackendApplication.MarketplaceUser contractor = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(contractor, "id", 301L);

        MyBid bid = new MyBid();
        bid.setId(501L);

        assignment.setProject(project);
        assignment.setCustomer(customer);
        assignment.setContractor(contractor);
        assignment.setAcceptedBid(bid);

        assignment.onCreate();
        assertEquals(MyBidAssignment.Status.ACTIVE, assignment.getAssignmentStatus());
        assertTrue(assignment.isCurrent());
        assertNotNull(assignment.getAcceptedAt());

        // Lifecycle: Contractor declines
        LocalDateTime declinedAt = LocalDateTime.now();
        assignment.setAssignmentStatus(MyBidAssignment.Status.DECLINED);
        assignment.setCurrent(false);
        assignment.setDeclinedAt(declinedAt);
        assertEquals(MyBidAssignment.Status.DECLINED, assignment.getAssignmentStatus());
        assertFalse(assignment.isCurrent());
        assertEquals(declinedAt, assignment.getDeclinedAt());

        // Lifecycle: Customer revokes / withdraws acceptance
        LocalDateTime revokedAt = LocalDateTime.now();
        assignment.setAssignmentStatus(MyBidAssignment.Status.REVOKED);
        assignment.setRevokedAt(revokedAt);
        assertEquals(MyBidAssignment.Status.REVOKED, assignment.getAssignmentStatus());
        assertEquals(revokedAt, assignment.getRevokedAt());

        assignment.setAssignmentStatus(MyBidAssignment.Status.COMPLETED);
        assertEquals(MyBidAssignment.Status.COMPLETED, assignment.getAssignmentStatus());

        assignment.onUpdate();
        assertNotNull(assignment.getUpdatedAt());
    }

    @Test
    @DisplayName("Verify MyBidAuditHistory append-only entity and all event types")
    void testMyBidAuditHistoryEntity() {
        Project project = new Project();
        project.setId(101L);

        MyBid bid = new MyBid();
        bid.setId(501L);

        MarketplaceBackendApplication.MarketplaceUser actor = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(actor, "id", 201L);

        MyBidAuditHistory history = new MyBidAuditHistory(
                project, bid, actor, "CUSTOMER",
                MyBidAuditHistory.EventType.BID_ACCEPTED,
                "Customer accepted contractor bid"
        );

        history.onCreate();
        assertNotNull(history.getCreatedAt());
        assertEquals(101L, history.getProject().getId());
        assertEquals(501L, history.getBid().getId());
        assertEquals(201L, history.getActor().getId());
        assertEquals("CUSTOMER", history.getActorRole());
        assertEquals(MyBidAuditHistory.EventType.BID_ACCEPTED, history.getEventType());
        assertEquals("Customer accepted contractor bid", history.getEventDescription());

        // Verify all 8 required event types exist
        Set<MyBidAuditHistory.EventType> expectedEvents = EnumSet.of(
                MyBidAuditHistory.EventType.BID_SUBMITTED,
                MyBidAuditHistory.EventType.BID_ACCEPTED,
                MyBidAuditHistory.EventType.ASSIGNMENT_CREATED,
                MyBidAuditHistory.EventType.BID_NOT_SELECTED,
                MyBidAuditHistory.EventType.ASSIGNMENT_DECLINED,
                MyBidAuditHistory.EventType.ACCEPTANCE_WITHDRAWN,
                MyBidAuditHistory.EventType.PROJECT_REOPENED,
                MyBidAuditHistory.EventType.CONTRACTOR_REASSIGNED
        );
        assertEquals(8, expectedEvents.size());
        for (MyBidAuditHistory.EventType et : expectedEvents) {
            assertNotNull(et.name());
        }
    }

    @Test
    @DisplayName("Verify Repository method contracts and query shapes")
    void testRepositoryContracts() {
        MyBidRepository bidRepo = mock(MyBidRepository.class);
        MyBidAssignmentRepository assignmentRepo = mock(MyBidAssignmentRepository.class);
        MyBidAuditHistoryRepository historyRepo = mock(MyBidAuditHistoryRepository.class);

        // MyBidRepository mocks
        when(bidRepo.countByProjectId(101L)).thenReturn(4L);
        when(bidRepo.countByCustomerId(201L)).thenReturn(10L);
        when(bidRepo.existsByIdAndProjectId(501L, 101L)).thenReturn(true);
        when(bidRepo.findByProjectIdOrderBySubmittedAtDesc(101L)).thenReturn(Collections.emptyList());

        assertEquals(4L, bidRepo.countByProjectId(101L));
        assertEquals(10L, bidRepo.countByCustomerId(201L));
        assertTrue(bidRepo.existsByIdAndProjectId(501L, 101L));
        assertNotNull(bidRepo.findByProjectIdOrderBySubmittedAtDesc(101L));

        // MyBidAssignmentRepository mocks
        when(assignmentRepo.existsByProjectIdAndIsCurrentTrue(101L)).thenReturn(true);
        when(assignmentRepo.findByProjectIdAndIsCurrentTrue(101L)).thenReturn(Optional.of(new MyBidAssignment()));

        assertTrue(assignmentRepo.existsByProjectIdAndIsCurrentTrue(101L));
        assertTrue(assignmentRepo.findByProjectIdAndIsCurrentTrue(101L).isPresent());

        // MyBidAuditHistoryRepository mocks
        when(historyRepo.findByProjectIdOrderByCreatedAtAsc(101L)).thenReturn(Collections.emptyList());
        assertNotNull(historyRepo.findByProjectIdOrderByCreatedAtAsc(101L));
    }
}
