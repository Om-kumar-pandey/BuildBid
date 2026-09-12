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
    
    // This converts the JavaScript data into a string for SQL
    private final ObjectMapper objectMapper = new ObjectMapper(); 

    @Autowired
    public ProjectController(ProjectRepository projectRepository, MarketplaceBackendApplication.UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createProject(@RequestBody Map<String, Object> payload, Authentication authentication) {
        
        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not found. Please login again.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        MarketplaceBackendApplication.MarketplaceUser user = userOptional.get();
        Project project = new Project();
        project.setCustomer(user);

        // Pull out the basic fields safely
        if (payload.get("projectTitle") != null) project.setTitle(payload.get("projectTitle").toString());
        if (payload.get("projectType") != null) project.setType(payload.get("projectType").toString());
        if (payload.get("qualityTier") != null) project.setQualityTier(payload.get("qualityTier").toString());
        
        if (payload.get("totalArea") instanceof Number) {
            project.setBuiltUpArea(((Number) payload.get("totalArea")).doubleValue());
        }

        // Pull out the location fields safely (including address)
        Object locationObj = payload.get("location");
        if (locationObj instanceof Map) {
            Map<?, ?> location = (Map<?, ?>) locationObj;
            if (location.get("city") != null) project.setCity(location.get("city").toString());
            if (location.get("state") != null) project.setState(location.get("state").toString());
            if (location.get("pincode") != null) project.setPincode(location.get("pincode").toString());
            if (location.get("address") != null) project.setAddress(location.get("address").toString());
        }

        // Pull out budget fields safely
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

        // Pull out timeline fields safely
        Object timelineObj = payload.get("timeline");
        if (timelineObj instanceof Map) {
            Map<?, ?> timeline = (Map<?, ?>) timelineObj;
            if (timeline.get("startDate") != null) {
                project.setTargetStartDate(timeline.get("startDate").toString());
            }
        }

        // Save the ENTIRE payload (all dynamic JS data) as a JSON string
        try {
            String completeJson = objectMapper.writeValueAsString(payload);
            project.setCompleteDataJson(completeJson);
        } catch (Exception e) {
            System.err.println("Failed to convert payload to JSON: " + e.getMessage());
        }

        // Save to SQL Database
        Project savedProject = projectRepository.save(project);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Project created successfully!");
        response.put("projectId", savedProject.getId());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<?> getCustomerProjects(Authentication authentication) {
        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not found. Please login again.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        MarketplaceBackendApplication.MarketplaceUser user = userOptional.get();
        List<Project> projects = projectRepository.findByCustomer(user);

        return ResponseEntity.ok(projects);
    }
}
