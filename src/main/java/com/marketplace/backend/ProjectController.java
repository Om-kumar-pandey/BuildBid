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
import java.util.function.Consumer;

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

            // Map Title & Project Title (Satisfies Cloud MySQL project_title NOT NULL constraint)
            String title = "BuildBid Project";
            if (payload.get("projectTitle") != null && !payload.get("projectTitle").toString().isBlank()) {
                title = payload.get("projectTitle").toString();
            } else if (payload.get("title") != null && !payload.get("title").toString().isBlank()) {
                title = payload.get("title").toString();
            }
            project.setProjectTitle(title);
            project.setTitle(title);

            // Map Type & Project Type (Satisfies Cloud MySQL project_type NOT NULL constraint)
            String type = "New Construction";
            if (payload.get("projectType") != null && !payload.get("projectType").toString().isBlank()) {
                type = payload.get("projectType").toString();
            } else if (payload.get("type") != null && !payload.get("type").toString().isBlank()) {
                type = payload.get("type").toString();
            }
            project.setProjectType(type);
            project.setType(type);

            if (payload.get("qualityTier") != null) {
                project.setQualityTier(payload.get("qualityTier").toString());
            }

            // Map Areas
            Double areaVal = null;
            if (payload.get("totalArea") instanceof Number) {
                areaVal = ((Number) payload.get("totalArea")).doubleValue();
            } else if (payload.get("builtUpArea") instanceof Number) {
                areaVal = ((Number) payload.get("builtUpArea")).doubleValue();
            }
            if (areaVal != null) {
                project.setTotalArea(areaVal);
                project.setBuiltUpArea(areaVal);
            }

            if (payload.get("plotArea") instanceof Number) {
                project.setPlotArea(((Number) payload.get("plotArea")).doubleValue());
            }

            // Map Floors (Cloud MySQL floors column is TEXT)
            if (payload.get("floors") != null) {
                Object f = payload.get("floors");
                if (f instanceof String) {
                    project.setFloors((String) f);
                } else {
                    try {
                        project.setFloors(objectMapper.writeValueAsString(f));
                    } catch (Exception ignored) {
                        project.setFloors(f.toString());
                    }
                }
            } else if (payload.get("floorsCount") != null) {
                project.setFloors(payload.get("floorsCount").toString());
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

                StringBuilder sb = new StringBuilder();
                if (location.get("address") != null && !location.get("address").toString().isBlank()) {
                    sb.append(location.get("address")).append(", ");
                }
                if (location.get("city") != null && !location.get("city").toString().isBlank()) {
                    sb.append(location.get("city")).append(", ");
                }
                if (location.get("state") != null && !location.get("state").toString().isBlank()) {
                    sb.append(location.get("state")).append(" ");
                }
                if (location.get("pincode") != null && !location.get("pincode").toString().isBlank()) {
                    sb.append(location.get("pincode"));
                }
                project.setLocation(sb.toString().trim());
            } else if (locationObj != null) {
                project.setLocation(locationObj.toString());
            }

            // Map budget
            Object budgetObj = payload.get("budget");
            if (budgetObj instanceof Map) {
                Map<?, ?> budget = (Map<?, ?>) budgetObj;
                if (budget.get("min") instanceof Number) {
                    project.setBudgetMin(((Number) budget.get("min")).doubleValue());
                }
                if (budget.get("max") instanceof Number) {
                    project.setBudgetMax(((Number) budget.get("max")).doubleValue());
                }
                project.setBudget(budget.get("min") + " - " + budget.get("max"));
            } else if (budgetObj != null) {
                project.setBudget(budgetObj.toString());
            }

            // Map timeline
            Object timelineObj = payload.get("timeline");
            if (timelineObj instanceof Map) {
                Map<?, ?> timeline = (Map<?, ?>) timelineObj;
                if (timeline.get("startDate") != null) {
                    project.setTargetStartDate(timeline.get("startDate").toString());
                    project.setTimeline(timeline.get("startDate").toString());
                }
            } else if (timelineObj != null) {
                project.setTimeline(timelineObj.toString());
            }
            if (payload.get("targetStartDate") != null) {
                project.setTargetStartDate(payload.get("targetStartDate").toString());
            }

            // Map dynamic category-specific fields into designated database columns
            setJsonOrString(payload.get("scopeOfWork"), project::setScopeOfWork);
            setJsonOrString(payload.get("renovationAreas"), project::setRenovationAreas);
            setJsonOrString(payload.get("renovScope"), project::setRenovScope);
            setJsonOrString(payload.get("extensionDetails"), project::setExtensionDetails);
            setJsonOrString(payload.get("rooms") != null ? payload.get("rooms") : payload.get("interiorRooms"), project::setInteriorRooms);
            setJsonOrString(payload.get("scope") != null ? payload.get("scope") : payload.get("interiorScope"), project::setInteriorScope);
            setJsonOrString(payload.get("interiorPreferences"), project::setInteriorPreferences);
            setJsonOrString(payload.get("commercial"), project::setCommercial);
            setJsonOrString(payload.get("industrial"), project::setIndustrial);
            setJsonOrString(payload.get("custom") != null ? payload.get("custom") : payload.get("customDetails"), project::setCustomDetails);

            // Store entire complete dynamic payload as JSON text in cloud database
            try {
                String completeJson = objectMapper.writeValueAsString(payload);
                project.setCompleteDataJson(completeJson);
            } catch (Exception e) {
                System.err.println("Failed to serialize payload JSON for completeDataJson: " + e.getMessage());
            }

            // Persist entity to Cloud MySQL
            Project savedProject = projectRepository.save(project);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Project posted and saved to Cloud MySQL successfully!");
            response.put("projectId", savedProject.getProjectId() != null ? savedProject.getProjectId() : "PRJ-" + savedProject.getId());
            response.put("id", savedProject.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Detailed exception logged on backend only (never leak credentials, SQL, or stack trace to client)
            System.err.println("Database error while saving project: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save project to database. Please check your inputs and try again."));
        }
    }

    private void setJsonOrString(Object value, Consumer<String> consumer) {
        if (value == null) return;
        if (value instanceof String) {
            consumer.accept((String) value);
        } else {
            try {
                consumer.accept(objectMapper.writeValueAsString(value));
            } catch (Exception ignored) {
                consumer.accept(value.toString());
            }
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
