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
        Project project = new Project();
        project.setCustomer(user);

        // Map basic fields safely from frontend payload
        if (payload.get("projectTitle") != null) {
            project.setTitle(payload.get("projectTitle").toString());
        }
        if (payload.get("projectType") != null) {
            project.setType(payload.get("projectType").toString());
        }
        if (payload.get("qualityTier") != null) {
            project.setQualityTier(payload.get("qualityTier").toString());
        }

        if (payload.get("totalArea") instanceof Number) {
            project.setBuiltUpArea(((Number) payload.get("totalArea")).doubleValue());
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
        try {
            Project savedProject = projectRepository.save(project);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Project posted and saved to Cloud MySQL successfully!");
            response.put("projectId", savedProject.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error saving project to DB: " + e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Database error: " + e.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable("id") Long id) {
        Optional<Project> projectOptional = projectRepository.findById(id);
        if (projectOptional.isEmpty()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Project not found with id: " + id));
        }
        return ResponseEntity.ok(projectOptional.get());
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
}
