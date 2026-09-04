package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") 
public class NewFrontendController {

    @Autowired
    private ProjectRepository projectRepository;

    @PostMapping("/customer/projects/create")
    public ResponseEntity<?> createProject(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Project project = new Project();

            // 1. Basic & Core Text/Title Mappings
            String titleVal = (String) payload.getOrDefault("projectTitle", "BuildBid Project");
            project.setProjectTitle(titleVal);
            project.setTitle(titleVal);

            String typeVal = (String) payload.get("projectType");
            project.setProjectType(typeVal);
            project.setType(typeVal);

            project.setQualityTier((String) payload.get("qualityTier"));
            project.setStatus("OPEN FOR BIDS");

            // 2. Areas & Numeric Mappings
            Object areaObj = payload.get("totalArea");
            if (areaObj != null) {
                Double areaVal = Double.valueOf(areaObj.toString());
                project.setTotalArea(areaVal);
                project.setBuiltUpArea(areaVal);
            }

            // 3. Location Breakdown (City, State, Pincode, Address texts)
            if (payload.containsKey("location") && payload.get("location") != null) {
                Object locObj = payload.get("location");
                if (locObj instanceof Map) {
                    Map<String, Object> locMap = (Map<String, Object>) locObj;
                    project.setCity((String) locMap.get("city"));
                    project.setState((String) locMap.get("state"));
                    project.setPincode((String) locMap.get("pincode"));
                    project.setLocation(mapper.writeValueAsString(locMap));
                } else {
                    project.setLocation(locObj.toString());
                }
            }

            // 4. Budget & Timeline Text/JSON Mappings
            if (payload.containsKey("budget") && payload.get("budget") != null) {
                Object budgetObj = payload.get("budget");
                project.setBudget(budgetObj instanceof String ? (String) budgetObj : mapper.writeValueAsString(budgetObj));
            }
            if (payload.containsKey("timeline") && payload.get("timeline") != null) {
                Object timelineObj = payload.get("timeline");
                project.setTimeline(timelineObj instanceof String ? (String) timelineObj : mapper.writeValueAsString(timelineObj));
            }
            
            // 5. All Specific Sections, Descriptions, Rooms, Scopes & Custom Details Mappings
            if (payload.containsKey("floors") && payload.get("floors") != null) {
                project.setFloors(mapper.writeValueAsString(payload.get("floors")));
            }
            if (payload.containsKey("scopeOfWork") && payload.get("scopeOfWork") != null) {
                project.setScopeOfWork(mapper.writeValueAsString(payload.get("scopeOfWork")));
            }
            if (payload.containsKey("renovationAreas") && payload.get("renovationAreas") != null) {
                project.setRenovationAreas(mapper.writeValueAsString(payload.get("renovationAreas")));
            }
            if (payload.containsKey("renovScope") && payload.get("renovScope") != null) {
                project.setRenovScope(mapper.writeValueAsString(payload.get("renovScope")));
            }
            if (payload.containsKey("extensionDetails") && payload.get("extensionDetails") != null) {
                project.setExtensionDetails(mapper.writeValueAsString(payload.get("extensionDetails")));
            }
            if (payload.containsKey("rooms") && payload.get("rooms") != null) {
                project.setInteriorRooms(mapper.writeValueAsString(payload.get("rooms")));
            }
            if (payload.containsKey("scope") && payload.get("scope") != null) {
                project.setInteriorScope(mapper.writeValueAsString(payload.get("scope")));
            }
            if (payload.containsKey("interiorPreferences") && payload.get("interiorPreferences") != null) {
                project.setInteriorPreferences(mapper.writeValueAsString(payload.get("interiorPreferences")));
            }
            if (payload.containsKey("commercial") && payload.get("commercial") != null) {
                project.setCommercial(mapper.writeValueAsString(payload.get("commercial")));
            }
            if (payload.containsKey("industrial") && payload.get("industrial") != null) {
                project.setIndustrial(mapper.writeValueAsString(payload.get("industrial")));
            }
            
            // Catch-all for custom descriptions, deliverable notes, or any extra text inputs
            if (payload.containsKey("custom") && payload.get("custom") != null) {
                Object customObj = payload.get("custom");
                project.setCustomDetails(customObj instanceof String ? (String) customObj : mapper.writeValueAsString(customObj));
            }

            Project savedProject = projectRepository.save(project);
            return ResponseEntity.ok(savedProject);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Error saving project: " + e.getMessage()));
        }
    }

    @GetMapping("/customer/projects")
    public ResponseEntity<?> getAllProjects() {
        try {
            List<Project> projects = projectRepository.findAll();
            List<Map<String, Object>> responseList = new ArrayList<>();
            ObjectMapper mapper = new ObjectMapper();

            for (Project p : projects) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("title", p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle()); 
                map.put("type", p.getProjectType() != null ? p.getProjectType() : p.getType());   
                map.put("area", p.getTotalArea() != null ? p.getTotalArea() : p.getBuiltUpArea());    
                map.put("status", p.getStatus() != null ? p.getStatus() : "OPEN FOR BIDS");
                map.put("bidsCount", 0); 
                map.put("updatedAt", p.getCreatedAt()); 
                map.put("city", p.getCity());
                map.put("state", p.getState());
                map.put("pincode", p.getPincode());

                responseList.add(map);
            }
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/projects/config")
    public ResponseEntity<?> getProjectConfig(@RequestParam(required = false) String type) {
        return ResponseEntity.ok(Map.of("status", "success", "message", "Configuration loaded", "type", type != null ? type : "all"));
    }

    @GetMapping("/customer/projects/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable Long id) {
        Optional<Project> project = projectRepository.findById(id);
        if (project.isPresent()) {
            return ResponseEntity.ok(project.get());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/customer/bids-summary")
    public ResponseEntity<?> getCustomerBidsSummary() {
        try {
            long totalProjects = projectRepository.count();
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalProjects", totalProjects);
            summary.put("totalBids", totalProjects * 3); 
            summary.put("pendingReview", totalProjects > 0 ? 1 : 0);
            summary.put("bidsAccepted", totalProjects > 0 ? 1 : 0);
            summary.put("completedProjects", 0);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/customer/project-bids")
    public ResponseEntity<?> getProjectBidsList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            List<Project> allProjects = projectRepository.findAll();
            List<Map<String, Object>> formattedList = new ArrayList<>();

            for (Project p : allProjects) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", p.getId());
                item.put("title", p.getProjectTitle() != null ? p.getProjectTitle() : p.getTitle());
                item.put("category", p.getProjectType() != null ? p.getProjectType() : p.getType());
                item.put("area", (p.getTotalArea() != null ? p.getTotalArea() : (p.getBuiltUpArea() != null ? p.getBuiltUpArea() : "")) + " sq.ft");
                item.put("status", p.getStatus() != null ? p.getStatus() : "Open for Bids");
                item.put("bidsCount", 3);
                item.put("lowestBid", "₹ 1,50,000");
                item.put("highestBid", "₹ 4,50,000");
                item.put("postedDate", "Recently");
                item.put("location", (p.getCity() != null ? p.getCity() : "") + ", " + (p.getState() != null ? p.getState() : ""));
                formattedList.add(item);
            }

            int totalItems = formattedList.size();
            int startIndex = (page - 1) * limit;
            int endIndex = Math.min(startIndex + limit, totalItems);
            
            List<Map<String, Object>> paginatedData = new ArrayList<>();
            if (startIndex < totalItems) {
                paginatedData = formattedList.subList(startIndex, endIndex);
            }

            Map<String, Object> paginationMeta = new HashMap<>();
            paginationMeta.put("currentPage", page);
            paginationMeta.put("totalPages", Math.max(1, (int) Math.ceil((double) totalItems / limit)));
            paginationMeta.put("totalItems", totalItems);
            paginationMeta.put("startIndex", totalItems > 0 ? startIndex + 1 : 0);
            paginationMeta.put("endIndex", endIndex);

            Map<String, Object> response = new HashMap<>();
            response.put("data", paginatedData);
            response.put("pagination", paginationMeta);
            response.put("total", totalItems);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
