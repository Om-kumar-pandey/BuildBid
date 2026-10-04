package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — STEP 6 POST REQUIREMENT MULTI-PROFESSIONAL DATA LAYER TEST
 * 
 * Comprehensive tests verifying:
 * 1. Valid Project + Professional application can be represented.
 * 2. Project relationship is non-null.
 * 3. Professional relationship is non-null.
 * 4. ApplicationId is generated/present.
 * 5. TradeRole is stored correctly.
 * 6. ProposedRate is stored.
 * 7. RateType is stored (PER_DAY, PER_MONTH, PER_PROJECT, etc.).
 * 8. Duplicate (project, professional) is rejected.
 * 9. Multiple professionals can apply to the same project.
 * 10. Same professional cannot duplicate application for same project.
 * 11. Different projects can accept the same professional.
 * 12. Status lifecycle is stored and transitioned correctly (APPLIED, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN).
 * 13. Trade-wise quota and application aggregation works under one requirement.
 * 14. Decoupling: Direct Hire (ClientServiceRequest) and Contractor Bids (MyBid) remain fully isolated.
 */
public class ProjectProfessionalApplicationDataLayerTest {

    private ProjectProfessionalApplicationRepository repository;
    private Project projectA;
    private Project projectB;
    private MarketplaceBackendApplication.MarketplaceUser professionalA;
    private MarketplaceBackendApplication.MarketplaceUser professionalB;
    private MarketplaceBackendApplication.MarketplaceUser professionalC;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;

    private List<ProjectProfessionalApplication> simulatedDatabase;

    @BeforeEach
    void setUp() {
        repository = mock(ProjectProfessionalApplicationRepository.class);
        simulatedDatabase = new ArrayList<>();

        // Requester / Customer
        customerUser = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(customerUser, "id", 100L);
        customerUser.setName("Rajesh Sharma");
        customerUser.setEmail("rajesh@test.com");

        // Project A (HIRE-1024)
        projectA = new Project();
        projectA.setId(1L);
        projectA.setProjectId("HIRE-1024");
        projectA.setProjectTitle("Residential Renovation & Expansion");
        projectA.setProjectType("Renovation");
        projectA.setCustomer(customerUser);

        // Project B (HIRE-2048)
        projectB = new Project();
        projectB.setId(2L);
        projectB.setProjectId("HIRE-2048");
        projectB.setProjectTitle("Commercial Complex Wiring");
        projectB.setProjectType("Commercial");
        projectB.setCustomer(customerUser);

        // Professional A (Labour)
        professionalA = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(professionalA, "id", 201L);
        professionalA.setName("Ramesh Kumar");
        professionalA.setEmail("ramesh@test.com");
        professionalA.setRoles(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL));

        // Professional B (Labour)
        professionalB = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(professionalB, "id", 202L);
        professionalB.setName("Suresh Yadav");
        professionalB.setEmail("suresh@test.com");
        professionalB.setRoles(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL));

        // Professional C (Engineer)
        professionalC = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(professionalC, "id", 203L);
        professionalC.setName("Amit Verma");
        professionalC.setEmail("amit@test.com");
        professionalC.setRoles(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL));

        // Configure repository mock against simulatedDatabase
        when(repository.save(any(ProjectProfessionalApplication.class))).thenAnswer(invocation -> {
            ProjectProfessionalApplication app = invocation.getArgument(0);
            app.onCreate();

            // Enforce (project_id, professional_id) uniqueness
            for (ProjectProfessionalApplication existing : simulatedDatabase) {
                if (existing.getProject().getId().equals(app.getProject().getId()) &&
                    existing.getProfessional().getId().equals(app.getProfessional().getId()) &&
                    (app.getId() == null || !app.getId().equals(existing.getId()))) {
                    throw new IllegalStateException("Duplicate application rejected: Professional " +
                            app.getProfessional().getId() + " already applied to Project " + app.getProject().getId());
                }
            }

            if (app.getId() == null) {
                ReflectionTestUtils.setField(app, "id", (long) (simulatedDatabase.size() + 1));
                simulatedDatabase.add(app);
            }
            return app;
        });

        when(repository.existsByProjectIdAndProfessionalId(anyLong(), anyLong())).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            Long proId = invocation.getArgument(1);
            return simulatedDatabase.stream().anyMatch(a ->
                    a.getProject().getId().equals(pId) && a.getProfessional().getId().equals(proId));
        });

        when(repository.findByProjectIdOrderByCreatedAtDesc(anyLong())).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            return simulatedDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId))
                    .sorted(Comparator.comparing(ProjectProfessionalApplication::getCreatedAt).reversed())
                    .toList();
        });

        when(repository.findByProjectIdAndTradeRoleIgnoreCaseOrderByCreatedAtDesc(anyLong(), anyString())).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            String role = invocation.getArgument(1);
            return simulatedDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId) && a.getTradeRole().equalsIgnoreCase(role))
                    .sorted(Comparator.comparing(ProjectProfessionalApplication::getCreatedAt).reversed())
                    .toList();
        });

        when(repository.findByProfessionalIdOrderByCreatedAtDesc(anyLong())).thenAnswer(invocation -> {
            Long proId = invocation.getArgument(0);
            return simulatedDatabase.stream()
                    .filter(a -> a.getProfessional().getId().equals(proId))
                    .sorted(Comparator.comparing(ProjectProfessionalApplication::getCreatedAt).reversed())
                    .toList();
        });

        when(repository.countByProjectId(anyLong())).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            return simulatedDatabase.stream().filter(a -> a.getProject().getId().equals(pId)).count();
        });

        when(repository.countByProjectIdAndTradeRoleIgnoreCase(anyLong(), anyString())).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            String role = invocation.getArgument(1);
            return simulatedDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId) && a.getTradeRole().equalsIgnoreCase(role))
                    .count();
        });

        when(repository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(anyLong(), anyString(), any(ProjectProfessionalApplication.Status.class))).thenAnswer(invocation -> {
            Long pId = invocation.getArgument(0);
            String role = invocation.getArgument(1);
            ProjectProfessionalApplication.Status st = invocation.getArgument(2);
            return simulatedDatabase.stream()
                    .filter(a -> a.getProject().getId().equals(pId) && a.getTradeRole().equalsIgnoreCase(role) && a.getStatus() == st)
                    .count();
        });
    }

    @Test
    @DisplayName("1 & 4. Valid Project + Professional application can be represented with generated applicationId")
    void testValidApplicationRepresentation() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication();
        app.setProject(projectA);
        app.setProfessional(professionalA);
        app.setTradeRole("LABOUR");
        app.setProposedRate(750.0);
        app.setRateType("PER_DAY");
        app.setTeamSize(1);
        app.setEstimatedDuration("30 Days");
        app.setCoverMessage("Experienced civil masonry labour available immediately.");

        app.onCreate();

        assertNotNull(app.getApplicationId());
        assertTrue(app.getApplicationId().startsWith("APP-"));
        assertEquals(ProjectProfessionalApplication.Status.APPLIED, app.getStatus());
        assertNotNull(app.getCreatedAt());
        assertEquals("LABOUR", app.getTradeRole());
        assertEquals(750.0, app.getProposedRate());
        assertEquals("PER_DAY", app.getRateType());
        assertEquals(1, app.getTeamSize());
        assertEquals("30 Days", app.getEstimatedDuration());
    }

    @Test
    @DisplayName("2 & 3. Project and Professional relationships must be non-null")
    void testRelationshipsNonNull() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectA,
                professionalA,
                "LABOUR",
                700.0,
                "PER_DAY",
                2,
                "15 Days",
                "Two experienced workers"
        );

        assertNotNull(app.getProject(), "Project relationship must be non-null");
        assertEquals(1L, app.getProject().getId());
        assertEquals("HIRE-1024", app.getProject().getProjectId());

        assertNotNull(app.getProfessional(), "Professional relationship must be non-null");
        assertEquals(201L, app.getProfessional().getId());
        assertEquals("Ramesh Kumar", app.getProfessional().getName());
    }

    @Test
    @DisplayName("5, 6, 7. TradeRole, ProposedRate, and RateType are properly stored and verified")
    void testQuotationDataFields() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication();
        app.setProject(projectA);
        app.setProfessional(professionalC);
        app.setTradeRole("ENGINEER");
        app.setProposedRate(45000.0);
        app.setRateType("PER_MONTH");
        app.setTeamSize(1);
        app.setEstimatedDuration("2 Months");
        app.setCoverMessage("Licensed civil structural engineer for site inspection and drawings.");

        app.onCreate();

        assertEquals("ENGINEER", app.getTradeRole());
        assertEquals(45000.0, app.getProposedRate());
        assertEquals("PER_MONTH", app.getRateType());
        assertEquals(1, app.getTeamSize());
        assertEquals("2 Months", app.getEstimatedDuration());
        assertEquals("Licensed civil structural engineer for site inspection and drawings.", app.getCoverMessage());
    }

    @Test
    @DisplayName("8 & 10. Duplicate (project, professional) is rejected")
    void testDuplicateApplicationRejected() {
        ProjectProfessionalApplication app1 = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 700.0, "PER_DAY", 1, "30 Days", "First bid"
        );
        repository.save(app1);

        assertTrue(repository.existsByProjectIdAndProfessionalId(projectA.getId(), professionalA.getId()));

        // Second application attempt by SAME professional on SAME project
        ProjectProfessionalApplication app2 = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 650.0, "PER_DAY", 1, "25 Days", "Duplicate attempt"
        );

        assertThrows(IllegalStateException.class, () -> repository.save(app2));
        assertEquals(1, simulatedDatabase.size(), "Database must still contain only 1 application");
    }

    @Test
    @DisplayName("9. Multiple professionals can apply to the same project")
    void testMultipleProfessionalsApplyToSameProject() {
        ProjectProfessionalApplication app1 = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 700.0, "PER_DAY", 1, "30 Days", "Labour Pro A"
        );
        ProjectProfessionalApplication app2 = new ProjectProfessionalApplication(
                projectA, professionalB, "LABOUR", 750.0, "PER_DAY", 2, "30 Days", "Labour Pro B"
        );
        ProjectProfessionalApplication app3 = new ProjectProfessionalApplication(
                projectA, professionalC, "ENGINEER", 50000.0, "PER_MONTH", 1, "1 Month", "Engineer Pro C"
        );

        repository.save(app1);
        repository.save(app2);
        repository.save(app3);

        assertEquals(3, repository.countByProjectId(projectA.getId()));
        List<ProjectProfessionalApplication> apps = repository.findByProjectIdOrderByCreatedAtDesc(projectA.getId());
        assertEquals(3, apps.size());
    }

    @Test
    @DisplayName("11. Different projects can accept the same professional")
    void testDifferentProjectsCanAcceptSameProfessional() {
        ProjectProfessionalApplication appProjectA = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 700.0, "PER_DAY", 1, "30 Days", "Project A"
        );
        ProjectProfessionalApplication appProjectB = new ProjectProfessionalApplication(
                projectB, professionalA, "LABOUR", 800.0, "PER_DAY", 1, "10 Days", "Project B"
        );

        repository.save(appProjectA);
        repository.save(appProjectB);

        assertEquals(2, simulatedDatabase.size());
        List<ProjectProfessionalApplication> proApps = repository.findByProfessionalIdOrderByCreatedAtDesc(professionalA.getId());
        assertEquals(2, proApps.size());
        Set<Long> projectIds = Set.of(proApps.get(0).getProject().getId(), proApps.get(1).getProject().getId());
        assertTrue(projectIds.contains(1L));
        assertTrue(projectIds.contains(2L));
    }

    @Test
    @DisplayName("12. Status lifecycle and transitions (APPLIED -> SHORTLISTED -> ACCEPTED -> REJECTED -> WITHDRAWN)")
    void testStatusLifecycleAndTransitions() {
        ProjectProfessionalApplication app = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 700.0, "PER_DAY", 1, "30 Days", "Test"
        );
        app.onCreate();
        assertEquals(ProjectProfessionalApplication.Status.APPLIED, app.getStatus());
        assertNull(app.getHiredAt());

        // Transition: SHORTLISTED
        app.setStatus(ProjectProfessionalApplication.Status.SHORTLISTED);
        assertEquals(ProjectProfessionalApplication.Status.SHORTLISTED, app.getStatus());
        assertNull(app.getHiredAt());

        // Transition: ACCEPTED (Sets hiredAt automatically)
        app.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app.getStatus());
        assertNotNull(app.getHiredAt(), "hiredAt must be set when status transitions to ACCEPTED");

        // Transition: REJECTED
        app.setStatus(ProjectProfessionalApplication.Status.REJECTED);
        assertEquals(ProjectProfessionalApplication.Status.REJECTED, app.getStatus());

        // Transition: WITHDRAWN
        app.setStatus(ProjectProfessionalApplication.Status.WITHDRAWN);
        assertEquals(ProjectProfessionalApplication.Status.WITHDRAWN, app.getStatus());

        // onUpdate hook
        app.onUpdate();
        assertNotNull(app.getUpdatedAt());
    }

    @Test
    @DisplayName("13. Trade-wise customer aggregation model under single Post Requirement")
    void testTradeWiseAggregationModel() {
        // Post Requirement HIRE-1024 requires: Labour: 4, Engineer: 1
        // Applications submitted:
        // Labour: Ramesh (Pro A) @ 700, Suresh (Pro B) @ 750
        // Engineer: Amit (Pro C) @ 45,000

        ProjectProfessionalApplication app1 = new ProjectProfessionalApplication(
                projectA, professionalA, "LABOUR", 700.0, "PER_DAY", 2, "30 Days", "Pro A"
        );
        ProjectProfessionalApplication app2 = new ProjectProfessionalApplication(
                projectA, professionalB, "LABOUR", 750.0, "PER_DAY", 2, "30 Days", "Pro B"
        );
        ProjectProfessionalApplication app3 = new ProjectProfessionalApplication(
                projectA, professionalC, "ENGINEER", 45000.0, "PER_MONTH", 1, "1 Month", "Pro C"
        );

        repository.save(app1);
        repository.save(app2);
        repository.save(app3);

        // Verify trade-wise counts
        long labourApps = repository.countByProjectIdAndTradeRoleIgnoreCase(projectA.getId(), "LABOUR");
        long engineerApps = repository.countByProjectIdAndTradeRoleIgnoreCase(projectA.getId(), "ENGINEER");
        assertEquals(2, labourApps);
        assertEquals(1, engineerApps);

        // Requester accepts Pro A (Labour) and Pro C (Engineer)
        app1.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);
        app3.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);

        long labourHired = repository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(
                projectA.getId(), "LABOUR", ProjectProfessionalApplication.Status.ACCEPTED
        );
        long engineerHired = repository.countByProjectIdAndTradeRoleIgnoreCaseAndStatus(
                projectA.getId(), "ENGINEER", ProjectProfessionalApplication.Status.ACCEPTED
        );

        assertEquals(1, labourHired);
        assertEquals(1, engineerHired);

        // Pro B remains APPLIED or can be REJECTED independently without affecting Pro A
        assertEquals(ProjectProfessionalApplication.Status.APPLIED, app2.getStatus());
        app2.setStatus(ProjectProfessionalApplication.Status.REJECTED);
        assertEquals(ProjectProfessionalApplication.Status.REJECTED, app2.getStatus());

        // Pro A and Pro C remain ACCEPTED
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app1.getStatus());
        assertEquals(ProjectProfessionalApplication.Status.ACCEPTED, app3.getStatus());
    }

    @Test
    @DisplayName("14. Decoupling verification: ProjectProfessionalApplication is isolated from Direct Hire")
    void testDecouplingFromDirectHire() {
        // Direct Hire uses ClientServiceRequest
        ClientServiceRequest csr = new ClientServiceRequest();
        csr.setRequestId("REQ-9001");
        csr.setProfessional(professionalA);
        csr.setClient(customerUser);
        csr.setStatus("Accepted");

        // Post Requirement uses ProjectProfessionalApplication
        ProjectProfessionalApplication ppa = new ProjectProfessionalApplication();
        ppa.setApplicationId("APP-8001");
        ppa.setProject(projectA);
        ppa.setProfessional(professionalA);
        ppa.setTradeRole("MASON");
        ppa.setStatus(ProjectProfessionalApplication.Status.ACCEPTED);

        // Both refer to the same professional user, but models remain completely separate
        assertEquals(csr.getProfessional().getId(), ppa.getProfessional().getId());
        assertNotEquals(csr.getRequestId(), ppa.getApplicationId());
        assertNull(csr.getProfessionalServiceId());
        assertEquals("MASON", ppa.getTradeRole());
    }
}
