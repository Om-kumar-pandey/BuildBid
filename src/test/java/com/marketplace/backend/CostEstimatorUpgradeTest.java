package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * COMPREHENSIVE TESTS FOR PHASES 2-20:
 * BUILDBID COST ESTIMATOR ADVANCED FLOOR & ROOM ENGINE
 */
public class CostEstimatorUpgradeTest {

    private CostEstimatorRateRepository mockRepository;
    private GeoLocationService geoLocationService;
    private CostEstimatorService estimatorService;
    private List<CostEstimatorRate> allRates;

    @BeforeEach
    void setUp() {
        mockRepository = mock(CostEstimatorRateRepository.class);
        geoLocationService = new GeoLocationService();

        allRates = new ArrayList<>();
        when(mockRepository.save(any(CostEstimatorRate.class))).thenAnswer(inv -> {
            allRates.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(mockRepository.existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(false);
        when(mockRepository.existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
                anyString(), anyString(), anyString(), anyString())).thenReturn(false);

        CostEstimatorDataSeeder seeder = new CostEstimatorDataSeeder(mockRepository);
        seeder.run();

        when(mockRepository.findByStateIgnoreCaseAndCityIgnoreCaseAndProjectTypeAndIsActiveTrue(anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String city = inv.getArgument(1);
                    String proj = inv.getArgument(2);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getCity() != null && r.getCity().equalsIgnoreCase(city) &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        when(mockRepository.findByStateIgnoreCaseAndCityIsNullAndProjectTypeAndIsActiveTrue(anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String proj = inv.getArgument(1);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getCity() == null &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        when(mockRepository.findByStateIgnoreCaseAndProjectTypeAndIsActiveTrue(anyString(), anyString()))
                .thenAnswer(inv -> {
                    String state = inv.getArgument(0);
                    String proj = inv.getArgument(1);
                    return allRates.stream()
                            .filter(r -> r.getState().equalsIgnoreCase(state) &&
                                    r.getProjectType().equalsIgnoreCase(proj))
                            .collect(Collectors.toList());
                });

        estimatorService = new CostEstimatorService(mockRepository, geoLocationService);
    }

    @Test
    @DisplayName("TEST A: Reject when Ground Floor Area > Total Build-up Area")
    void testGroundFloorExceedsTotalBuildUp() {
        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("4000"));
        req.setNumberOfFloors(1);

        FloorRequirementDto ground = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("4001"));
        req.setFloors(List.of(ground));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("GROUND_AREA_EXCEEDS_TOTAL", res.getErrorCode());
        assertNotNull(res.getValidationErrors());
        assertTrue(res.getValidationErrors().stream().anyMatch(e -> "GROUND_AREA_EXCEEDS_TOTAL".equals(e.getCode())));
        assertNull(res.getTotal());
    }

    @Test
    @DisplayName("TEST B: Reject when Aggregate above-ground floor areas > Total Build-up Area")
    void testAggregateFloorAreaExceedsTotalBuildUp() {
        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("4000"));
        req.setNumberOfFloors(3);

        FloorRequirementDto g = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        FloorRequirementDto f1 = new FloorRequirementDto(1, "First Floor", new BigDecimal("1500"));
        FloorRequirementDto f2 = new FloorRequirementDto(2, "Second Floor", new BigDecimal("1000"));
        // Aggregate = 2000 + 1500 + 1000 = 4500 > 4000
        req.setFloors(List.of(g, f1, f2));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("AGGREGATE_AREA_EXCEEDS_TOTAL", res.getErrorCode());
        assertNotNull(res.getValidationErrors());
        assertNull(res.getTotal());
    }

    @Test
    @DisplayName("TEST C: Valid floor area distribution within Total Build-up Area")
    void testValidFloorAreaDistribution() {
        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("4000"));
        req.setNumberOfFloors(3);

        FloorRequirementDto g = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        FloorRequirementDto f1 = new FloorRequirementDto(1, "First Floor", new BigDecimal("1500"));
        FloorRequirementDto f2 = new FloorRequirementDto(2, "Second Floor", new BigDecimal("500"));
        // Aggregate = 2000 + 1500 + 500 = 4000 <= 4000
        req.setFloors(List.of(g, f1, f2));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertNotNull(res.getTotal());
        assertEquals(3, res.getFloors().size());
        assertEquals(new BigDecimal("4000.00"), res.getArea().getTotalAboveGroundAreaSqFt());
    }

    @Test
    @DisplayName("TEST D: Basement = YES requires positive basementAreaSqFt")
    void testBasementRequiredValidation() {
        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("3000"));
        req.setHasBasement(true);
        req.setBasementAreaSqFt(BigDecimal.ZERO); // Empty/zero basement
        req.setNumberOfFloors(1);
        req.setFloors(List.of(new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2500"))));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("BASEMENT_AREA_REQUIRED", res.getErrorCode());
        assertNull(res.getTotal());

        // Now provide valid basement area
        req.setBasementAreaSqFt(new BigDecimal("1000"));
        CostEstimationResponseDto res2 = estimatorService.calculate(req);
        assertTrue(res2.isSuccess());
        assertNotNull(res2.getTotal());
        assertNotNull(res2.getBasement());
        assertTrue(res2.getBasement().getAverage().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("TEST E: Standard Room Planning benchmark area calculation (3 Bedrooms = 360 sq ft)")
    void testStandardRoomBenchmarkArea() {
        FloorRequirementDto floor = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        floor.setRooms(Map.of("Bedrooms", 3));

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("3000"));
        req.setNumberOfFloors(1);
        req.setFloors(List.of(floor));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        CostEstimationResponseDto.FloorCostDto groundCost = res.getFloors().get(0);
        // 3 * 120 = 360 sq ft room program
        assertEquals(new BigDecimal("360.00"), groundCost.getRoomProgramAreaSqFt());
        // 20% planning allowance = 72 sq ft -> required = 432 sq ft
        assertEquals(new BigDecimal("72.00"), groundCost.getPlanningAllowanceSqFt());
        assertEquals(new BigDecimal("432.00"), groundCost.getRequiredProgramAreaSqFt());
        assertEquals("VALID", groundCost.getCapacityStatus());
    }

    @Test
    @DisplayName("TEST F: Custom Room Dimensions override standard planning default")
    void testCustomRoomDimensionsOverrideDefault() {
        FloorRequirementDto floor = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        floor.setRooms(Map.of("Bedrooms", 2));

        // Bedroom 1 customized to 12 x 14 ft (168 sq ft); Bedroom 2 left default (120 sq ft)
        Map<String, CustomRoomDimensionDto> customDims = new HashMap<>();
        customDims.put("Bedrooms_1", new CustomRoomDimensionDto(new BigDecimal("12"), new BigDecimal("14"), null));
        floor.setCustomDimensions(customDims);

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("3000"));
        req.setNumberOfFloors(1);
        req.setFloors(List.of(floor));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        // 168 (custom) + 120 (default) = 288 sq ft
        assertEquals(new BigDecimal("288.00"), res.getFloors().get(0).getRoomProgramAreaSqFt());
    }

    @Test
    @DisplayName("TEST G: Same as First Floor copies complete First Floor configuration")
    void testSameAsFirstFloorCopy() {
        FloorRequirementDto g = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("1500"));
        g.setRooms(Map.of("Bedrooms", 1, "Living Room", 1));

        FloorRequirementDto f1 = new FloorRequirementDto(1, "First Floor", new BigDecimal("1400"));
        f1.setRooms(Map.of("Bedrooms", 3, "Bathrooms", 2));

        FloorRequirementDto f2 = new FloorRequirementDto();
        f2.setFloorNumber(2);
        f2.setFloorName("Second Floor");
        f2.setCopyMode(FloorRequirementDto.COPY_MODE_SAME_AS_FIRST);

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("5000"));
        req.setNumberOfFloors(3);
        req.setFloors(List.of(g, f1, f2));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals(3, res.getFloors().size());

        CostEstimationResponseDto.FloorCostDto secondFloor = res.getFloors().get(2);
        assertEquals(new BigDecimal("1400.00"), secondFloor.getDeclaredAreaSqFt());
        assertEquals(Integer.valueOf(3), secondFloor.getRooms().get("Bedrooms"));
        assertEquals(Integer.valueOf(2), secondFloor.getRooms().get("Bathrooms"));
        assertEquals(FloorRequirementDto.COPY_MODE_SAME_AS_FIRST, secondFloor.getCopyMode());
        assertEquals(Integer.valueOf(1), secondFloor.getSourceFloor());
    }

    @Test
    @DisplayName("TEST H: Deep-copy override: Changing copied floor does not mutate source floor")
    void testDeepCopyOverrideIntegrity() {
        FloorRequirementDto source = new FloorRequirementDto(1, "First Floor", new BigDecimal("1500"));
        source.setRooms(new HashMap<>(Map.of("Bedrooms", 3)));

        FloorRequirementDto copied = source.deepCopy(2, "Second Floor", FloorRequirementDto.COPY_MODE_SAME_AS_FIRST, 1);
        // User customizes copied floor from 3 to 4 bedrooms
        copied.getRooms().put("Bedrooms", 4);

        // Assert source floor remains strictly 3
        assertEquals(Integer.valueOf(3), source.getRooms().get("Bedrooms"));
        assertEquals(Integer.valueOf(4), copied.getRooms().get("Bedrooms"));
    }

    @Test
    @DisplayName("TEST I: Same as Previous Floor inherits resolved previous floor")
    void testSameAsPreviousFloorCopy() {
        FloorRequirementDto g = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("1500"));
        g.setRooms(Map.of("Living Room", 1));

        FloorRequirementDto f1 = new FloorRequirementDto(1, "First Floor", new BigDecimal("1400"));
        f1.setRooms(Map.of("Bedrooms", 3));

        FloorRequirementDto f2 = new FloorRequirementDto();
        f2.setFloorNumber(2);
        f2.setFloorName("Second Floor");
        f2.setCopyMode(FloorRequirementDto.COPY_MODE_SAME_AS_FIRST);

        FloorRequirementDto f3 = new FloorRequirementDto();
        f3.setFloorNumber(3);
        f3.setFloorName("Third Floor");
        f3.setCopyMode(FloorRequirementDto.COPY_MODE_SAME_AS_PREVIOUS);

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("6000"));
        req.setNumberOfFloors(4);
        req.setFloors(List.of(g, f1, f2, f3));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertEquals(4, res.getFloors().size());

        CostEstimationResponseDto.FloorCostDto thirdFloor = res.getFloors().get(3);
        assertEquals(new BigDecimal("1400.00"), thirdFloor.getDeclaredAreaSqFt());
        assertEquals(Integer.valueOf(3), thirdFloor.getRooms().get("Bedrooms"));
        assertEquals(FloorRequirementDto.COPY_MODE_SAME_AS_PREVIOUS, thirdFloor.getCopyMode());
    }

    @Test
    @DisplayName("TEST J: Reject when Room Program Area exceeds Floor Capacity")
    void testRoomProgramExceedsFloorCapacity() {
        FloorRequirementDto floor = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("500"));
        // 4 Bedrooms (480 sq ft) + 1 Living Room (224 sq ft) = 704 sq ft + 20% allowance (140.8) = 844.8 > 500
        floor.setRooms(Map.of("Bedrooms", 4, "Living Room", 1));

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("2000"));
        req.setNumberOfFloors(1);
        req.setFloors(List.of(floor));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertFalse(res.isSuccess());
        assertEquals("ROOM_PROGRAM_EXCEEDS_FLOOR_CAPACITY", res.getErrorCode());
        assertNull(res.getTotal());
        assertTrue(res.getMessage().contains("require approximately"));
    }

    @Test
    @DisplayName("TEST K: Room requirements measurably impact construction cost")
    void testRoomRequirementsImpactCost() {
        // Floor with 1 bedroom
        FloorRequirementDto f1 = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        f1.setRooms(Map.of("Bedrooms", 1));

        CostEstimationRequestDto req1 = new CostEstimationRequestDto();
        req1.setProjectType("NEW_CONSTRUCTION");
        req1.setState("Delhi");
        req1.setCity("New Delhi");
        req1.setTotalBuildUpAreaSqFt(new BigDecimal("2000"));
        req1.setNumberOfFloors(1);
        req1.setFloors(List.of(f1));

        CostEstimationResponseDto res1 = estimatorService.calculate(req1);
        assertTrue(res1.isSuccess());

        // Same floor area but with 4 bedrooms + 3 bathrooms
        FloorRequirementDto f2 = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("2000"));
        f2.setRooms(Map.of("Bedrooms", 4, "Bathrooms", 3));

        CostEstimationRequestDto req2 = new CostEstimationRequestDto();
        req2.setProjectType("NEW_CONSTRUCTION");
        req2.setState("Delhi");
        req2.setCity("New Delhi");
        req2.setTotalBuildUpAreaSqFt(new BigDecimal("2000"));
        req2.setNumberOfFloors(1);
        req2.setFloors(List.of(f2));

        CostEstimationResponseDto res2 = estimatorService.calculate(req2);
        assertTrue(res2.isSuccess());

        // Additional rooms must increase the cost due to internal partitions, sanitary fixtures, and electrical points
        assertTrue(res2.getTotal().getAverage().compareTo(res1.getTotal().getAverage()) > 0,
                "Estimated cost for 4 bedrooms + 3 bathrooms should be higher than 1 bedroom on same floor plate");

        assertNotNull(res2.getBreakdown().getSanitaryPlumbing());
        assertTrue(res2.getBreakdown().getSanitaryPlumbing().getAverage().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("TEST L: Same as Previous Floor resolves correctly (Scenario I: First -> Second -> Third)")
    void testSameAsPreviousFloorChainResolution() {
        FloorRequirementDto ground = new FloorRequirementDto(0, "Ground Floor", new BigDecimal("1000"));
        ground.setRooms(Map.of("Bedrooms", 2));

        FloorRequirementDto first = new FloorRequirementDto(1, "1st Floor", new BigDecimal("1000"));
        first.setRooms(Map.of("Bedrooms", 3)); // 3 bedrooms on First

        FloorRequirementDto second = new FloorRequirementDto(2, "2nd Floor", new BigDecimal("1000"));
        second.setCopyMode("SAME_AS_FIRST_FLOOR"); // Second copies First

        FloorRequirementDto third = new FloorRequirementDto(3, "3rd Floor", new BigDecimal("1000"));
        third.setCopyMode("SAME_AS_PREVIOUS_FLOOR"); // Third copies Previous (which is Second)

        CostEstimationRequestDto req = new CostEstimationRequestDto();
        req.setProjectType("NEW_CONSTRUCTION");
        req.setState("Delhi");
        req.setCity("New Delhi");
        req.setTotalBuildUpAreaSqFt(new BigDecimal("4000"));
        req.setNumberOfFloors(4);
        req.setFloors(List.of(ground, first, second, third));

        CostEstimationResponseDto res = estimatorService.calculate(req);
        assertTrue(res.isSuccess());
        assertNotNull(res.getFloors());
        assertEquals(4, res.getFloors().size());

        // Both 2nd Floor and 3rd Floor should have inherited the 3 bedrooms from 1st Floor
        // 3 bedrooms * 120 = 360 sq.ft. room program
        assertEquals(new BigDecimal("360.00"), res.getFloors().get(1).getRoomProgramAreaSqFt());
        assertEquals(new BigDecimal("360.00"), res.getFloors().get(2).getRoomProgramAreaSqFt());
        assertEquals(new BigDecimal("360.00"), res.getFloors().get(3).getRoomProgramAreaSqFt());
    }

    @Test
    @DisplayName("TEST M: ProjectController persistence stores totalBuildUpAreaSqFt and floor requirements")
    void testProjectPersistenceStoresFloorRequirements() {
        ProjectRepository mockProjectRepo = mock(ProjectRepository.class);
        MarketplaceBackendApplication.UserRepository mockUserRepo = mock(MarketplaceBackendApplication.UserRepository.class);

        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setEmail("owner@buildbid.com");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 55L);
        when(mockUserRepo.findByEmail("owner@buildbid.com")).thenReturn(Optional.of(user));

        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("owner@buildbid.com");

        when(mockProjectRepo.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(p, "id", 202L);
            return p;
        });

        ProjectController projectController = new ProjectController(mockProjectRepo, mockUserRepo, estimatorService);

        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Luxury 3-Floor Residence");
        payload.put("projectType", "New Construction");
        payload.put("totalBuildUpAreaSqFt", 3000);
        payload.put("hasBasement", true);
        payload.put("basementAreaSqFt", 800);
        payload.put("location", Map.of("state", "Delhi", "city", "New Delhi", "pincode", "110001"));
        payload.put("floors", List.of(
                Map.of("floorIndex", 0, "floorName", "Ground Floor", "declaredAreaSqFt", 1000, "rooms", Map.of("Bedrooms", 2)),
                Map.of("floorIndex", 1, "floorName", "1st Floor", "declaredAreaSqFt", 1000, "rooms", Map.of("Bedrooms", 3)),
                Map.of("floorIndex", 2, "floorName", "2nd Floor", "declaredAreaSqFt", 1000, "copyMode", "SAME_AS_FIRST_FLOOR")
        ));

        org.springframework.http.ResponseEntity<?> response = projectController.createProject(payload, auth);
        assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());

        org.mockito.ArgumentCaptor<Project> captor = org.mockito.ArgumentCaptor.forClass(Project.class);
        verify(mockProjectRepo).save(captor.capture());

        Project saved = captor.getValue();
        assertEquals("Luxury 3-Floor Residence", saved.getTitle());
        assertTrue(saved.getEstimatedCost().startsWith("₹"));
        assertNotNull(saved.getCompleteDataJson());
        assertTrue(saved.getCompleteDataJson().contains("totalBuildUpAreaSqFt"));
        assertTrue(saved.getCompleteDataJson().contains("SAME_AS_FIRST_FLOOR"));
    }

    @Test
    @DisplayName("TEST N: ProjectController rejects project creation when Ground Area > Total Build-up Area")
    void testProjectCreationRejectsInvalidGroundArea() {
        ProjectRepository mockProjectRepo = mock(ProjectRepository.class);
        MarketplaceBackendApplication.UserRepository mockUserRepo = mock(MarketplaceBackendApplication.UserRepository.class);

        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setEmail("owner@buildbid.com");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 55L);
        when(mockUserRepo.findByEmail("owner@buildbid.com")).thenReturn(Optional.of(user));

        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("owner@buildbid.com");

        ProjectController projectController = new ProjectController(mockProjectRepo, mockUserRepo, estimatorService);

        Map<String, Object> payload = new HashMap<>();
        payload.put("projectTitle", "Invalid Villa");
        payload.put("projectType", "New Construction");
        payload.put("totalBuildUpAreaSqFt", 4000);
        payload.put("location", Map.of("state", "Delhi", "city", "New Delhi", "pincode", "110001"));
        payload.put("floors", List.of(
                Map.of("floorIndex", 0, "floorName", "Ground Floor", "declaredAreaSqFt", 4001)
        ));

        org.springframework.http.ResponseEntity<?> response = projectController.createProject(payload, auth);
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(mockProjectRepo, never()).save(any(Project.class));
    }
}
