package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * STEP 5 SECURITY & INTEGRITY TESTS:
 * SERVER-AUTHORITATIVE PROJECT PERSISTENCE + ESTIMATE SECURITY
 *
 * Verifies:
 * TEST 1 — Client manipulation ignored (client sends estimatedCost = 1, server recalculates and saves server value)
 * TEST 2 — Missing client estimate calculates and saves successfully
 * TEST 3 — Invalid project inputs (e.g. builtUpArea = 0) returns HTTP 400 and NO project is saved
 * TEST 4 — Rate unavailable returns HTTP 404 and NO project is saved
 * TEST 5 — Frozen project types (Renovation, Home Extension, Interior, Other) are preserved without active estimator routing
 * TEST 6 — Customer ownership derived strictly from authenticated token, client cannot spoof owner
 * TEST 7 — Existing valid project creation behavior preserved with server-authoritative estimate
 */
public class ProjectCreationSecurityTest {

    private ProjectRepository projectRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private CostEstimatorService costEstimatorService;
    private ProjectController projectController;

    private Authentication mockAuth;
    private MarketplaceBackendApplication.MarketplaceUser mockUser;

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        costEstimatorService = mock(CostEstimatorService.class);
        projectController = new ProjectController(projectRepository, userRepository, costEstimatorService);

        mockAuth = mock(Authentication.class);
        when(mockAuth.getName()).thenReturn("customer@buildbid.com");

        mockUser = new MarketplaceBackendApplication.MarketplaceUser();
        mockUser.setEmail("customer@buildbid.com");
        mockUser.setName("Rajesh Sharma");
        ReflectionTestUtils.setField(mockUser, "id", 42L);

        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(mockUser));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project p = invocation.getArgument(0);
            ReflectionTestUtils.setField(p, "id", 101L);
            return p;
        });
    }

    private CostEstimationResponseDto createSuccessfulEstimate(BigDecimal low, BigDecimal high) {
        CostEstimationResponseDto res = new CostEstimationResponseDto();
        res.setSuccess(true);
        res.setProjectType("NEW_CONSTRUCTION");
        res.setTotal(new CostEstimationResponseDto.TotalEstimateDto(low, low.add(high).divide(new BigDecimal("2")), high));
        return res;
    }

    @Test
    @DisplayName("TEST 1: Client Manipulation — Client sends estimatedCost = 1, server overrides with authoritative estimate")
    void testClientManipulationIgnored() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Dream Villa");
        payload.put("projectType", "New Construction");
        payload.put("builtUpArea", 2500.0);
        payload.put("floors", 2);
        payload.put("qualityTier", "Standard");
        payload.put("location", Map.of("state", "Maharashtra", "city", "Mumbai", "pincode", "400001"));

        // Malicious client manipulation: trying to force a 1 Rupee estimate into the database
        payload.put("estimatedCost", "1");

        // Server calculation returns 90 Lakhs - 1.05 Crores
        BigDecimal low = new BigDecimal("9000000");
        BigDecimal high = new BigDecimal("10500000");
        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(createSuccessfulEstimate(low, high));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertNotNull(savedProject);

        // VERIFY: The client supplied "1" was rejected and NEVER saved
        assertNotEquals("1", savedProject.getEstimatedCost());
        assertTrue(savedProject.getEstimatedCost().contains("90,00,000"));
        assertTrue(savedProject.getEstimatedCost().contains("1,05,00,000"));

        // VERIFY: API Response returns the server-calculated estimate
        @SuppressWarnings("unchecked")
        Map<String, Object> resBody = (Map<String, Object>) response.getBody();
        assertNotNull(resBody);
        assertNotEquals("1", resBody.get("estimatedCost"));
        assertEquals(savedProject.getEstimatedCost(), resBody.get("estimatedCost"));
    }

    @Test
    @DisplayName("TEST 2: Missing Client Estimate — Valid project without estimatedCost calculates and saves successfully")
    void testMissingClientEstimateCalculatesAndSaves() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Office Complex");
        payload.put("projectType", "Commercial");
        payload.put("builtUpArea", 5000.0);
        payload.put("floors", 3);
        payload.put("location", Map.of("state", "Delhi", "city", "New Delhi", "pincode", "110001"));
        // Notice: NO estimatedCost supplied by client

        BigDecimal low = new BigDecimal("15000000");
        BigDecimal high = new BigDecimal("18000000");
        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(createSuccessfulEstimate(low, high));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());

        Project savedProject = captor.getValue();
        assertNotNull(savedProject.getEstimatedCost());
        assertTrue(savedProject.getEstimatedCost().contains("1,50,00,000"));
        assertTrue(savedProject.getEstimatedCost().contains("1,80,00,000"));
    }

    @Test
    @DisplayName("TEST 3: Invalid Project Inputs — builtUpArea = 0 returns HTTP 400 and NO project saved")
    void testInvalidProjectInputsRejectsAndDoesNotSave() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Zero Area Project");
        payload.put("projectType", "New Construction");
        payload.put("builtUpArea", 0.0); // Invalid built-up area
        payload.put("floors", 1);
        payload.put("location", Map.of("state", "Karnataka", "city", "Bengaluru"));

        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(CostEstimationResponseDto.failure("Built-up area must be greater than zero.", "INVALID_BUILT_UP_AREA"));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        // ATOMICITY: No project must EVER be saved with invalid inputs
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("TEST 4: Rate Unavailable — Location with unavailable rates returns HTTP 404 and NO project saved")
    void testRatesUnavailableRejectsAndDoesNotSave() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Remote Warehouse");
        payload.put("projectType", "Industrial");
        payload.put("builtUpArea", 10000.0);
        payload.put("floors", 1);
        payload.put("location", Map.of("state", "NonExistentState", "city", "RemoteCity"));

        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(CostEstimationResponseDto.failure("Cost estimation rates unavailable for location", "RATES_UNAVAILABLE"));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());

        // ATOMICITY: No project saved with null, zero, or missing rates
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("TEST 5: Frozen Project Types — Renovation does not invoke active estimator and preserves frozen behavior")
    void testFrozenProjectTypePreserved() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Apartment Kitchen Renovation");
        payload.put("projectType", "Renovation"); // Frozen project type
        payload.put("builtUpArea", 800.0);
        payload.put("estimatedCost", "Custom Contractor Quote Needed");
        payload.put("location", Map.of("state", "Delhi", "city", "New Delhi"));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        // VERIFY: Active Cost Estimator is NEVER called for frozen project types
        verify(costEstimatorService, never()).calculate(any());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());

        Project savedProject = captor.getValue();
        assertEquals("Custom Contractor Quote Needed", savedProject.getEstimatedCost());
    }

    @Test
    @DisplayName("TEST 6: Ownership Security — Client payload cannot spoof or override authenticated customer ownership")
    void testOwnershipSecurityEnforced() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Security Test Project");
        payload.put("projectType", "New Construction");
        payload.put("builtUpArea", 1200.0);
        payload.put("floors", 1);
        payload.put("location", Map.of("state", "Uttar Pradesh", "city", "Noida"));

        // Malicious client attempt: try to set project owner to another user ID (999)
        payload.put("customerId", 999L);
        payload.put("userId", 999L);
        payload.put("customer", Map.of("id", 999L, "email", "victim@buildbid.com"));

        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(createSuccessfulEstimate(new BigDecimal("3000000"), new BigDecimal("3500000")));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());

        Project savedProject = captor.getValue();
        assertNotNull(savedProject.getCustomer());

        // VERIFY: Owner is derived strictly from authentication context (ID 42, customer@buildbid.com)
        assertEquals(42L, savedProject.getCustomer().getId());
        assertEquals("customer@buildbid.com", savedProject.getCustomer().getEmail());
    }

    @Test
    @DisplayName("TEST 7: Existing Project Creation Regression — Full project payload with budget, timeline, and dynamic fields preserved")
    void testExistingProjectCreationRegression() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("projectId", "PRJ-REGRESSION-001");
        payload.put("projectTitle", "Complete Villa Construction");
        payload.put("projectType", "New Construction");
        payload.put("totalArea", 3000.0);
        payload.put("plotArea", 4000.0);
        payload.put("floors", 2);
        payload.put("qualityTier", "Standard");
        payload.put("description", "High quality construction with garden");
        payload.put("paymentPreference", "Milestone Based");
        payload.put("privacyPreference", "Public to verified contractors");
        payload.put("budget", Map.of("min", 8000000.0, "max", 10000000.0));
        payload.put("timeline", Map.of("startDate", "2026-11-01"));
        payload.put("location", Map.of(
                "address", "Sector 62",
                "city", "Noida",
                "state", "Uttar Pradesh",
                "pincode", "201301"
        ));

        when(costEstimatorService.calculate(any(CostEstimationRequestDto.class)))
                .thenReturn(createSuccessfulEstimate(new BigDecimal("8500000"), new BigDecimal("9800000")));

        ResponseEntity<?> response = projectController.createProject(payload, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());

        Project saved = captor.getValue();
        assertEquals("PRJ-REGRESSION-001", saved.getProjectId());
        assertEquals("Complete Villa Construction", saved.getProjectTitle());
        assertEquals("New Construction", saved.getProjectType());
        assertEquals("Noida", saved.getCity());
        assertEquals("Uttar Pradesh", saved.getState());
        assertEquals("201301", saved.getPincode());
        assertEquals(3000.0, saved.getTotalArea());
        assertEquals(4000.0, saved.getPlotArea());
        assertEquals("2", saved.getFloors());
        assertEquals("OPEN", saved.getStatus());
        assertEquals(8000000.0, saved.getBudgetMin());
        assertEquals(10000000.0, saved.getBudgetMax());
        assertEquals("2026-11-01", saved.getTargetStartDate());
        assertTrue(saved.getEstimatedCost().contains("85,00,000"));
        assertTrue(saved.getEstimatedCost().contains("98,00,000"));
    }
}
