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

            project.setProjectTitle((String) payload.getOrDefault("projectTitle", "Untitled Project"));
            project.setProjectType((String) payload.get("projectType"));
            project.setQualityTier((String) payload.get("qualityTier"));

            Object areaObj = payload.get("totalArea");
            if (areaObj != null) {
                project.setTotalArea(Double.valueOf(areaObj.toString()));
            }

            if (payload.containsKey("location")) project.setLocation(mapper.writeValueAsString(payload.get("location")));
            if (payload.containsKey("budget")) project.setBudget(mapper.writeValueAsString(payload.get("budget")));
            if (payload.containsKey("timeline")) project.setTimeline(mapper.writeValueAsString(payload.get("timeline")));
            
            if (payload.containsKey("floors")) project.setFloors(mapper.writeValueAsString(payload.get("floors")));
            if (payload.containsKey("scopeOfWork")) project.setScopeOfWork(mapper.writeValueAsString(payload.get("scopeOfWork")));
            if (payload.containsKey("renovationAreas")) project.setRenovationAreas(mapper.writeValueAsString(payload.get("renovationAreas")));
            if (payload.containsKey("renovScope")) project.setRenovScope(mapper.writeValueAsString(payload.get("renovScope")));
            if (payload.containsKey("extensionDetails")) project.setExtensionDetails(mapper.writeValueAsString(payload.get("extensionDetails")));
            if (payload.containsKey("rooms")) project.setInteriorRooms(mapper.writeValueAsString(payload.get("rooms")));
            if (payload.containsKey("scope")) project.setInteriorScope(mapper.writeValueAsString(payload.get("scope")));
            if (payload.containsKey("interiorPreferences")) project.setInteriorPreferences(mapper.writeValueAsString(payload.get("interiorPreferences")));
            if (payload.containsKey("commercial")) project.setCommercial(mapper.writeValueAsString(payload.get("commercial")));
            if (payload.containsKey("industrial")) project.setIndustrial(mapper.writeValueAsString(payload.get("industrial")));
            if (payload.containsKey("custom")) project.setCustomDetails(mapper.writeValueAsString(payload.get("custom")));

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
                map.put("title", p.getProjectTitle()); 
                map.put("type", p.getProjectType());   
                map.put("area", p.getTotalArea());    
                map.put("status", p.getStatus() != null ? p.getStatus() : "OPEN FOR BIDS");
                map.put("bidsCount", 0); 
                map.put("updatedAt", p.getCreatedAt()); 

                if (p.getLocation() != null) {
                    try {
                        Map<String, Object> loc = mapper.readValue(p.getLocation(), Map.class);
                        map.put("city", loc.get("city"));
                        map.put("state", loc.get("state"));
                    } catch (Exception e) {
                        map.put("location", "Location Data");
                    }
                }
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

    // Customer Bids Summary (/api/customer/bids-summary)
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

    // Customer Project Bids List with Pagination (/api/customer/project-bids)
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
                item.put("title", p.getProjectTitle());
                item.put("category", p.getProjectType());
                item.put("area", p.getTotalArea() != null ? p.getTotalArea() + " sq.ft" : "");
                item.put("status", p.getStatus() != null ? p.getStatus() : "Open for Bids");
                item.put("bidsCount", 3);
                item.put("lowestBid", "₹ 1,50,000");
                item.put("highestBid", "₹ 4,50,000");
                item.put("postedDate", "Recently");
                item.put("location", "Location Data");
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
