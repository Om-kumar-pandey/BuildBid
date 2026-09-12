package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customer/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public ProjectController(ProjectRepository projectRepository, MarketplaceBackendApplication.UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createProject(@RequestBody Map<String, Object> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please login again."));
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not found in cloud database. Please login again.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        MarketplaceBackendApplication.MarketplaceUser user = userOptional.get();

        try {
            Project project = new Project();
            project.setCustomer(user);

            // Map unique Project ID (preserve "PRJ-..." generated on frontend or generate one)
            if (payload.get("projectId") != null && !payload.get("projectId").toString().isBlank()) {
                project.setProjectId(payload.get("projectId").toString());
            } else {
                project.setProjectId("PRJ-" + System.currentTimeMillis());
            }

            // Map basic fields safely from frontend payload
            if (payload.get("projectTitle") != null) {
                project.setTitle(payload.get("projectTitle").toString());
            } else if (payload.get("title") != null) {
                project.setTitle(payload.get("title").toString());
            }

            if (payload.get("projectType") != null) {
                project.setType(payload.get("projectType").toString());
            } else if (payload.get("type") != null) {
                project.setType(payload.get("type").toString());
            }

            if (payload.get("qualityTier") != null) {
                project.setQualityTier(payload.get("qualityTier").toString());
            }

            if (payload.get("totalArea") instanceof Number) {
                project.setBuiltUpArea(((Number) payload.get("totalArea")).doubleValue());
            } else if (payload.get("builtUpArea") instanceof Number) {
                project.setBuiltUpArea(((Number) payload.get("builtUpArea")).doubleValue());
            }

            if (payload.get("plotArea") instanceof Number) {
                project.setPlotArea(((Number) payload.get("plotArea")).doubleValue());
            }

            if (payload.get("floors") instanceof Number) {
                project.setFloors(((Number) payload.get("floors")).intValue());
            } else if (payload.get("floorsCount") instanceof Number) {
                project.setFloors(((Number) payload.get("floorsCount")).intValue());
            }

            if (payload.get("estimatedCost") != null) {
                project.setEstimatedCost(payload.get("estimatedCost").toString());
            }

            if (payload.get("description") != null) {
                project.setDescription(payload.get("description").toString());
            }

            if (payload.get("paymentPreference") != null) {
                project.setPaymentPreference(payload.get("paymentPreference").toString());
            }

            if (payload.get("privacyPreference") != null) {
                project.setPrivacyPreference(payload.get("privacyPreference").toString());
            }

            // Map location details
            Object locationObj = payload.get("location");
            if (locationObj instanceof Map) {
                Map<?, ?> location = (Map<?, ?>) locationObj;
                if (location.get("city") != null) project.setCity(location.get("city").toString());
                if (location.get("state") != null) project.setState(location.get("state").toString());
                if (location.get("pincode") != null) project.setPincode(location.get("pincode").toString());
                if (location.get("address") != null) project.setAddress(location.get("address").toString());
            }

            // Map budget range
            Object budgetObj = payload.get("budget");
            if (budgetObj instanceof Map) {
                Map<?, ?> budget = (Map<?, ?>) budgetObj;
                if (budget.get("min") instanceof Number) {
                    project.setBudgetMin(((Number) budget.get("min")).doubleValue());
                }
                if (budget.get("max") instanceof Number) {
                    project.setBudgetMax(((Number) budget.get("max")).doubleValue());
                }
            }

            // Map timeline/start date
            Object timelineObj = payload.get("timeline");
            if (timelineObj instanceof Map) {
                Map<?, ?> timeline = (Map<?, ?>) timelineObj;
                if (timeline.get("startDate") != null) {
                    project.setTargetStartDate(timeline.get("startDate").toString());
                }
            }

            // Store entire complex dynamic payload as JSON text in cloud database
            try {
                String completeJson = objectMapper.writeValueAsString(payload);
                project.setCompleteDataJson(completeJson);
            } catch (Exception e) {
                System.err.println("Failed to serialize payload JSON for cloud DB: " + e.getMessage());
            }

            // Persist entity to Cloud MySQL (visible via MySQL Workbench)
            Project savedProject = projectRepository.save(project);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Project posted and saved to Cloud MySQL successfully!");
            response.put("projectId", savedProject.getProjectId() != null ? savedProject.getProjectId() : "PRJ-" + savedProject.getId());
            response.put("id", savedProject.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log full exception on backend console without leaking database credentials or internals to client
            System.err.println("Database error while saving project: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save project to database. Please check your inputs and try again."));
        }
    }

    @GetMapping
    public ResponseEntity<?> getCustomerProjects(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not found.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        MarketplaceBackendApplication.MarketplaceUser user = userOptional.get();
        List<Project> projects = projectRepository.findByCustomer(user);

        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable String id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        try {
            Long numericId = Long.parseLong(id);
            Optional<Project> projectOptional = projectRepository.findById(numericId);
            if (projectOptional.isPresent()) {
                return ResponseEntity.ok(projectOptional.get());
            }
        } catch (NumberFormatException ignored) {}

        List<Project> all = projectRepository.findAll();
        for (Project p : all) {
            if (id.equals(p.getProjectId())) {
                return ResponseEntity.ok(p);
            }
        }

        return ResponseEntity.status(404).body(Map.of("error", "Project not found"));
    }
}

