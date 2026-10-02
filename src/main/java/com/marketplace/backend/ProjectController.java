package com.marketplace.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

@RestController
@RequestMapping("/api")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;
    private final CostEstimatorService costEstimatorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProjectController(ProjectRepository projectRepository, MarketplaceBackendApplication.UserRepository userRepository) {
        this(projectRepository, userRepository, null);
    }

    @Autowired
    public ProjectController(ProjectRepository projectRepository,
                             MarketplaceBackendApplication.UserRepository userRepository,
                             @Autowired(required = false) CostEstimatorService costEstimatorService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.costEstimatorService = costEstimatorService;
    }

    @Transactional
    @PostMapping({"/customer/projects/create", "/projects/create", "/customer/hiring/create", "/hiring/create"})
    public ResponseEntity<?> createProject(@RequestBody Map<String, Object> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please login again."));
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email));

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
            } else if (payload.get("projectCategory") != null && !payload.get("projectCategory").toString().isBlank()) {
                type = payload.get("projectCategory").toString();
            } else if (payload.get("type") != null && !payload.get("type").toString().isBlank()) {
                type = payload.get("type").toString();
            }
            project.setProjectType(type);
            project.setType(type);

            if (payload.get("qualityTier") != null) {
                project.setQualityTier(payload.get("qualityTier").toString());
            }

            // Map Areas
            Double areaVal = parseDoubleSafe(payload.get("totalArea"));
            if (areaVal == null) {
                areaVal = parseDoubleSafe(payload.get("builtUpArea"));
            }
            if (areaVal != null) {
                project.setTotalArea(areaVal);
                project.setBuiltUpArea(areaVal);
            }

            Double plotVal = parseDoubleSafe(payload.get("plotArea"));
            if (plotVal != null) {
                project.setPlotArea(plotVal);
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

            if (payload.get("description") != null && !payload.get("description").toString().isBlank()) {
                project.setDescription(payload.get("description").toString());
            } else if (payload.get("desc") != null && !payload.get("desc").toString().isBlank()) {
                project.setDescription(payload.get("desc").toString());
            } else if (payload.get("projectDescription") != null && !payload.get("projectDescription").toString().isBlank()) {
                project.setDescription(payload.get("projectDescription").toString());
            }

            if (payload.get("paymentPreference") != null) {
                project.setPaymentPreference(payload.get("paymentPreference").toString());
            }

            if (payload.get("privacyPreference") != null) {
                project.setPrivacyPreference(payload.get("privacyPreference").toString());
            }

            // Map location details
            String locCity = null;
            String locState = null;
            String locPincode = null;
            String locAddress = null;

            Object locationObj = payload.get("location");
            if (locationObj instanceof Map) {
                Map<?, ?> location = (Map<?, ?>) locationObj;
                if (location.get("city") != null) locCity = location.get("city").toString();
                if (location.get("state") != null) locState = location.get("state").toString();
                if (location.get("pincode") != null) locPincode = location.get("pincode").toString();
                if (location.get("address") != null) locAddress = location.get("address").toString();
            } else {
                if (payload.get("city") != null) locCity = payload.get("city").toString();
                if (payload.get("state") != null) locState = payload.get("state").toString();
                if (payload.get("pincode") != null) locPincode = payload.get("pincode").toString();
                if (payload.get("address") != null) locAddress = payload.get("address").toString();
            }

            if (locCity != null) project.setCity(locCity);
            if (locState != null) project.setState(locState);
            if (locPincode != null) project.setPincode(locPincode);
            if (locAddress != null) project.setAddress(locAddress);

            if (locationObj instanceof Map) {
                StringBuilder sb = new StringBuilder();
                if (locAddress != null && !locAddress.isBlank()) sb.append(locAddress).append(", ");
                if (locCity != null && !locCity.isBlank()) sb.append(locCity).append(", ");
                if (locState != null && !locState.isBlank()) sb.append(locState).append(" ");
                if (locPincode != null && !locPincode.isBlank()) sb.append(locPincode);
                project.setLocation(sb.toString().trim());
            } else if (locationObj != null) {
                project.setLocation(locationObj.toString());
            }

            // ========================================================
            // SERVER-AUTHORITATIVE ESTIMATE CALCULATION (STEP 5)
            // ========================================================
            String activeEstimatorType = mapToActiveEstimatorType(type);

            if (activeEstimatorType != null && costEstimatorService != null) {
                // 1. Built-up area
                BigDecimal builtUpAreaSqFt = null;
                if (areaVal != null && areaVal > 0) {
                    builtUpAreaSqFt = BigDecimal.valueOf(areaVal);
                } else if (payload.get("builtUpAreaSqFt") != null) {
                    Double b = parseDoubleSafe(payload.get("builtUpAreaSqFt"));
                    if (b != null && b > 0) builtUpAreaSqFt = BigDecimal.valueOf(b);
                }

                // 2. Basement area
                BigDecimal basementAreaSqFt = BigDecimal.ZERO;
                boolean hasBasement = false;
                if (payload.get("hasBasement") != null) {
                    Object hb = payload.get("hasBasement");
                    hasBasement = Boolean.TRUE.equals(hb) || "true".equalsIgnoreCase(hb.toString()) || "yes".equalsIgnoreCase(hb.toString());
                }
                if (hasBasement) {
                    Object bDetails = payload.get("basementDetails");
                    if (bDetails instanceof Map) {
                        Double bArea = parseDoubleSafe(((Map<?, ?>) bDetails).get("approxArea"));
                        if (bArea != null && bArea > 0) {
                            basementAreaSqFt = BigDecimal.valueOf(bArea);
                        }
                    } else if (payload.get("basementArea") != null) {
                        Double bArea = parseDoubleSafe(payload.get("basementArea"));
                        if (bArea != null && bArea > 0) basementAreaSqFt = BigDecimal.valueOf(bArea);
                    } else if (payload.get("basementAreaSqFt") != null) {
                        Double bArea = parseDoubleSafe(payload.get("basementAreaSqFt"));
                        if (bArea != null && bArea > 0) basementAreaSqFt = BigDecimal.valueOf(bArea);
                    }
                }

                // 3. Floor count
                int floorCount = 1;
                if (payload.get("floorsCount") != null) {
                    Double fc = parseDoubleSafe(payload.get("floorsCount"));
                    if (fc != null && fc >= 1) floorCount = fc.intValue();
                } else if (payload.get("floors") != null) {
                    Object fObj = payload.get("floors");
                    if (fObj instanceof Number) {
                        floorCount = ((Number) fObj).intValue();
                    } else if (fObj instanceof String) {
                        String fStr = ((String) fObj).trim();
                        try {
                            floorCount = Integer.parseInt(fStr);
                        } catch (NumberFormatException ignored) {
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d+").matcher(fStr);
                            if (m.find()) floorCount = Integer.parseInt(m.group());
                        }
                    } else if (fObj instanceof List) {
                        int listSize = ((List<?>) fObj).size();
                        if (listSize > 0) floorCount = listSize;
                    }
                }
                if (floorCount < 1) floorCount = 1;

                String qualityTier = "STANDARD";
                if (payload.get("qualityTier") != null && !payload.get("qualityTier").toString().isBlank()) {
                    String q = payload.get("qualityTier").toString().trim().toUpperCase();
                    if (q.equalsIgnoreCase("STANDARD")) qualityTier = "STANDARD";
                }

                // 4. Construct server-side authoritative CostEstimationRequestDto
                CostEstimationRequestDto estReq = new CostEstimationRequestDto(
                        activeEstimatorType,
                        locState != null ? locState.trim() : "",
                        locCity != null ? locCity.trim() : null,
                        null,
                        locPincode != null ? locPincode.trim() : null,
                        builtUpAreaSqFt,
                        basementAreaSqFt,
                        floorCount,
                        qualityTier
                );

                // 5. Execute authoritative CostEstimator calculation
                CostEstimationResponseDto estRes = costEstimatorService.calculate(estReq);

                if (!estRes.isSuccess()) {
                    // Calculation failed or rates unavailable: Atomic guard - DO NOT SAVE PROJECT
                    HttpStatus status = "RATES_UNAVAILABLE".equals(estRes.getErrorCode())
                            ? HttpStatus.NOT_FOUND
                            : HttpStatus.BAD_REQUEST;
                    return ResponseEntity.status(status).body(Map.of(
                            "error", estRes.getMessage() != null ? estRes.getMessage() : "Cost estimation failed.",
                            "errorCode", estRes.getErrorCode() != null ? estRes.getErrorCode() : "ESTIMATION_FAILED"
                    ));
                }

                // 6. Set server-authoritative calculated estimate (ignoring any client value)
                String serverCost = "\u20B9" + formatIndianCurrency(estRes.getTotal().getLow()) +
                        " \u2013 \u20B9" + formatIndianCurrency(estRes.getTotal().getHigh());
                project.setEstimatedCost(serverCost);

            } else {
                // Frozen project types (Renovation, Home Extension, Interior, Other):
                // Do NOT call active CostEstimator. Preserve existing frozen behavior.
                if (payload.get("estimatedCost") != null && !payload.get("estimatedCost").toString().isBlank()) {
                    project.setEstimatedCost(payload.get("estimatedCost").toString());
                } else {
                    project.setEstimatedCost("Custom Evaluation Required");
                }
            }

            // Map budget
            Object budgetObj = payload.get("budget");
            if (budgetObj instanceof Map) {
                Map<?, ?> budget = (Map<?, ?>) budgetObj;
                Double bMin = parseDoubleSafe(budget.get("min"));
                Double bMax = parseDoubleSafe(budget.get("max"));
                if (bMin != null) {
                    project.setBudgetMin(bMin);
                }
                if (bMax != null) {
                    project.setBudgetMax(bMax);
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

            // Ensure project status is OPEN for discovery and contractor dashboard
            if (payload.get("status") != null && !payload.get("status").toString().isBlank()) {
                String reqStatus = payload.get("status").toString().trim();
                if (reqStatus.equalsIgnoreCase("open for bids") || reqStatus.equalsIgnoreCase("open")) {
                    project.setStatus("OPEN");
                } else {
                    project.setStatus(reqStatus);
                }
            } else {
                project.setStatus("OPEN");
            }

            // Persist entity to Cloud MySQL
            Project savedProject = projectRepository.save(project);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Project posted and saved to Cloud MySQL successfully!");
            response.put("projectId", savedProject.getProjectId() != null ? savedProject.getProjectId() : "PRJ-" + savedProject.getId());
            response.put("id", savedProject.getId());
            response.put("estimatedCost", savedProject.getEstimatedCost());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Detailed exception logged on backend only (never leak credentials, SQL, or stack trace to client)
            System.err.println("Database error while saving project: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save project to database. Please check your inputs and try again."));
        }
    }

    private String mapToActiveEstimatorType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return null;
        }
        String t = rawType.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        if (t.contains("RENOVATION") || t.contains("EXTENSION") || t.contains("INTERIOR") || t.contains("OTHER")) {
            return null; // Frozen types
        }
        if (t.contains("COMMERCIAL")) {
            return "COMMERCIAL_CONSTRUCTION";
        }
        if (t.contains("INDUSTRIAL") || t.contains("WAREHOUSE")) {
            return "INDUSTRIAL_WAREHOUSE";
        }
        if (t.contains("NEW") || t.contains("CONSTRUCTION")) {
            return "NEW_CONSTRUCTION";
        }
        return null;
    }

    private String formatIndianCurrency(BigDecimal amount) {
        if (amount == null) return "0";
        long val = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        if (val == 0) return "0";
        boolean negative = val < 0;
        val = Math.abs(val);

        String s = Long.toString(val);
        if (s.length() <= 3) {
            return (negative ? "-" : "") + s;
        }

        String lastThree = s.substring(s.length() - 3);
        String remaining = s.substring(0, s.length() - 3);

        StringBuilder sb = new StringBuilder();
        while (remaining.length() > 2) {
            sb.insert(0, "," + remaining.substring(remaining.length() - 2));
            remaining = remaining.substring(0, remaining.length() - 2);
        }
        sb.insert(0, remaining);
        sb.append(",").append(lastThree);

        return (negative ? "-" : "") + sb.toString();
    }

    private Double parseDoubleSafe(Object val) {
        if (val == null) return null;
        if (val instanceof Number) {
            double d = ((Number) val).doubleValue();
            return (Double.isNaN(d) || Double.isInfinite(d)) ? null : d;
        }

        String s = val.toString().trim();
        if (s.isEmpty()) return null;

        // Strip known harmless currency prefixes (e.g. ₹ (\u20B9), Rs., Rs, INR)
        if (s.startsWith("\u20B9") || s.startsWith("₹")) {
            s = s.substring(1).trim();
        } else {
            String lower = s.toLowerCase();
            if (lower.startsWith("rs.") || lower.startsWith("rs ")) {
                s = s.substring(3).trim();
            } else if (lower.startsWith("rs")) {
                s = s.substring(2).trim();
            } else if (lower.startsWith("inr")) {
                s = s.substring(3).trim();
            }
        }

        // Strip known harmless area unit suffixes (e.g. sq ft, sq.ft., sqft, sqm)
        String lower = s.toLowerCase();
        if (lower.endsWith("sq. ft.")) {
            s = s.substring(0, s.length() - 7).trim();
        } else if (lower.endsWith("sq.ft.") || lower.endsWith("sq. feet")) {
            s = s.substring(0, s.length() - 6).trim();
        } else if (lower.endsWith("sq.ft") || lower.endsWith("sq ft")) {
            s = s.substring(0, s.length() - 5).trim();
        } else if (lower.endsWith("sqft")) {
            s = s.substring(0, s.length() - 4).trim();
        } else if (lower.endsWith("sqm") || lower.endsWith("sq m")) {
            s = s.substring(0, s.length() - (lower.endsWith("sqm") ? 3 : 4)).trim();
        }

        if (s.isEmpty()) return null;

        // Thousands separator validation: reject malformed comma usage
        if (s.contains(",")) {
            if (s.startsWith(",") || s.endsWith(",") || s.contains(",,") || s.contains(",.") || s.contains(".,")) {
                return null;
            }
            s = s.replace(",", "").trim();
        }

        // Strict numeric regex: optional leading '-', digits, optional single decimal point with digits
        if (!s.matches("^-?\\d+(\\.\\d+)?$")) {
            return null;
        }

        try {
            double d = Double.parseDouble(s);
            return (Double.isNaN(d) || Double.isInfinite(d)) ? null : d;
        } catch (Exception ignored) {
            return null;
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

    @GetMapping({"/customer/projects", "/projects"})
    public ResponseEntity<?> getCustomerProjects(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email));

        if (userOptional.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not found.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        MarketplaceBackendApplication.MarketplaceUser user = userOptional.get();
        List<Project> projects = projectRepository.findByCustomer(user);

        return ResponseEntity.ok(projects);
    }

    @GetMapping({"/customer/projects/{id}", "/projects/{id}"})
    public ResponseEntity<?> getProjectById(@PathVariable String id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String email = authentication.getName();
        Optional<MarketplaceBackendApplication.MarketplaceUser> userOptional = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email));

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found."));
        }

        MarketplaceBackendApplication.MarketplaceUser currentUser = userOptional.get();

        Project project = null;
        try {
            Long numericId = Long.parseLong(id);
            Optional<Project> projectOptional = projectRepository.findById(numericId);
            if (projectOptional.isPresent()) {
                project = projectOptional.get();
            }
        } catch (NumberFormatException ignored) {}

        if (project == null) {
            Optional<Project> byProjectId = projectRepository.findByProjectId(id);
            if (byProjectId.isPresent()) {
                project = byProjectId.get();
            } else {
                List<Project> all = projectRepository.findAll();
                for (Project p : all) {
                    if (id.equalsIgnoreCase(p.getProjectId())) {
                        project = p;
                        break;
                    }
                }
            }
        }

        if (project == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Project not found"));
        }

        // Ownership verification: ensure project belongs to the authenticated customer
        if (project.getCustomer() == null || project.getCustomer().getId() == null
                || !project.getCustomer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this project."));
        }

        return ResponseEntity.ok(project);
    }

    // ========================================================
    // CONTRACTOR DISCOVERY & DETAIL ENDPOINTS
    // ========================================================

    @GetMapping("/contractor/projects")
    public ResponseEntity<?> getContractorProjects(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        boolean isContractor = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CONTRACTOR") || a.getAuthority().equals("CONTRACTOR"));
        if (!isContractor) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Contractor role required."));
        }

        List<Project> openProjects = projectRepository.findByStatusOrderByCreatedAtDesc("OPEN");
        List<ContractorProjectResponse> responseList = openProjects.stream()
                .map(this::mapToContractorResponse)
                .toList();

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/contractor/projects/{id}")
    public ResponseEntity<?> getContractorProjectById(@PathVariable String id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized. Please login first."));
        }

        boolean isContractor = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CONTRACTOR") || a.getAuthority().equals("CONTRACTOR"));
        if (!isContractor) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Contractor role required."));
        }

        // Direct lookup by business project ID (e.g. PRJ-...)
        Optional<Project> byProjectId = projectRepository.findByProjectId(id);
        if (byProjectId.isPresent()) {
            return ResponseEntity.ok(mapToContractorResponse(byProjectId.get()));
        }

        // Numeric database ID lookup fallback
        try {
            Long numericId = Long.parseLong(id);
            Optional<Project> byId = projectRepository.findById(numericId);
            if (byId.isPresent()) {
                return ResponseEntity.ok(mapToContractorResponse(byId.get()));
            }
        } catch (NumberFormatException ignored) {}

        // Case-insensitive fallback lookup
        List<Project> all = projectRepository.findAll();
        if (all != null) {
            for (Project p : all) {
                if (id.equalsIgnoreCase(p.getProjectId())) {
                    return ResponseEntity.ok(mapToContractorResponse(p));
                }
            }
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found"));
    }

    private ContractorProjectResponse mapToContractorResponse(Project p) {
        if (p == null) return null;

        Map<String, Object> technicalDetails = new HashMap<>();
        if (p.getCompleteDataJson() != null && !p.getCompleteDataJson().isBlank()) {
            try {
                Map<?, ?> raw = objectMapper.readValue(p.getCompleteDataJson(), Map.class);
                String[] safeKeys = {
                    "hasBasement", "basementDetails", "floors", "purpose", "plotFacing",
                    "cornerPlot", "propertyType", "propertyAge", "existingType", "rooms",
                    "scope", "interiorPreferences", "commercial", "industrial", "custom",
                    "renovationAreas", "renovScope", "extensionDetails", "scopeOfWork"
                };
                for (String k : safeKeys) {
                    if (raw.containsKey(k) && raw.get(k) != null) {
                        technicalDetails.put(k, raw.get(k));
                    }
                }
            } catch (Exception ignored) {}
        }

        String displayTitle = (p.getProjectTitle() != null && !p.getProjectTitle().isBlank())
                ? p.getProjectTitle()
                : (p.getTitle() != null ? p.getTitle() : "BuildBid Project");

        String displayType = (p.getProjectType() != null && !p.getProjectType().isBlank())
                ? p.getProjectType()
                : (p.getType() != null ? p.getType() : "General Construction");

        StringBuilder locBuilder = new StringBuilder();
        if (p.getCity() != null && !p.getCity().isBlank()) {
            locBuilder.append(p.getCity());
        }
        if (p.getState() != null && !p.getState().isBlank()) {
            if (!locBuilder.isEmpty()) locBuilder.append(", ");
            locBuilder.append(p.getState());
        }
        if (p.getPincode() != null && !p.getPincode().isBlank()) {
            if (!locBuilder.isEmpty()) locBuilder.append(" ");
            locBuilder.append(p.getPincode());
        }
        String safeLocation = locBuilder.toString().trim();
        if (safeLocation.isEmpty()) {
            safeLocation = (p.getLocation() != null && !p.getLocation().isBlank()) ? p.getLocation() : "Location Not Specified";
        }

        return new ContractorProjectResponse(
                p.getId(),
                p.getProjectId() != null ? p.getProjectId() : "PRJ-" + p.getId(),
                displayTitle,
                displayTitle,
                displayType,
                displayType,
                p.getCity(),
                p.getState(),
                p.getPincode(),
                safeLocation,
                p.getTotalArea(),
                p.getBuiltUpArea(),
                p.getPlotArea(),
                p.getFloors(),
                p.getQualityTier(),
                p.getEstimatedCost(),
                p.getBudget(),
                p.getBudgetMin(),
                p.getBudgetMax(),
                p.getTimeline(),
                p.getTargetStartDate(),
                p.getPaymentPreference(),
                p.getPrivacyPreference(),
                p.getDescription(),
                p.getScopeOfWork(),
                p.getRenovationAreas(),
                p.getRenovScope(),
                p.getExtensionDetails(),
                p.getInteriorRooms(),
                p.getInteriorScope(),
                p.getInteriorPreferences(),
                p.getCommercial(),
                p.getIndustrial(),
                p.getCustomDetails(),
                technicalDetails,
                p.getStatus() != null ? p.getStatus() : "OPEN",
                p.getCreatedAt()
        );
    }

    public record ContractorProjectResponse(
            Long id,
            String projectId,
            String title,
            String projectTitle,
            String type,
            String projectType,
            String city,
            String state,
            String pincode,
            String location,
            Double totalArea,
            Double builtUpArea,
            Double plotArea,
            String floors,
            String qualityTier,
            String estimatedCost,
            String budget,
            Double budgetMin,
            Double budgetMax,
            String timeline,
            String targetStartDate,
            String paymentPreference,
            String privacyPreference,
            String description,
            String scopeOfWork,
            String renovationAreas,
            String renovScope,
            String extensionDetails,
            String interiorRooms,
            String interiorScope,
            String interiorPreferences,
            String commercial,
            String industrial,
            String customDetails,
            Map<String, Object> details,
            String status,
            LocalDateTime createdAt
    ) {}
}
