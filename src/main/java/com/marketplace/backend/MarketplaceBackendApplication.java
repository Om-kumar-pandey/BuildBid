package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.User;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.stereotype.Service;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;


// ============================================================
// MAIN APPLICATION
// ============================================================

@SpringBootApplication
@EnableJpaRepositories(considerNestedRepositories = true)
public class MarketplaceBackendApplication {

    public static void main(String[] args) {
        org.springframework.boot.SpringApplication.run(
                MarketplaceBackendApplication.class,
                args
        );
    }


    // ========================================================
    // USER ROLES (Supports both legacy database values and new 4 roles)
    // ========================================================

    public enum Role {
        // Active 4 Roles
        CUSTOMER,
        CONTRACTOR,
        MATERIAL_SELLER,
        PROFESSIONAL,

        // Backward compatibility (prevents crash on old database records)
        SELLER,
        SERVICE_PROVIDER
    }


    // ========================================================
    // USER ENTITY
    // ========================================================

    @Entity
    @Table(name = "users")
    public static class MarketplaceUser {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false, length = 100)
        private String name;

        @Column(unique = true, length = 100)
        private String username;

        @Column(nullable = false, unique = true, length = 150)
        private String email;

        @Column(length = 20)
        private String phone;

        @Column(length = 150)
        private String location;

        @Column(nullable = false, length = 100)
        private String passwordHash;

        @Column(length = 500)
        private String profilePhotoUrl;

        @ElementCollection(fetch = FetchType.EAGER)
        @CollectionTable(
                name = "user_roles",
                joinColumns = @JoinColumn(name = "user_id")
        )
        @Column(name = "role")
        @Enumerated(EnumType.STRING)
        private Set<Role> roles = new HashSet<>();

        @Column(nullable = false)
        private boolean enabled = true;

        @Column(nullable = false)
        private LocalDateTime createdAt;

        @PrePersist
        public void onCreate() {
            createdAt = LocalDateTime.now();
        }

        // ====================================================
        // GETTERS
        // ====================================================

        public Long getId() { return id; }
        public String getName() { return name; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getPhone() { return phone; }
        public String getLocation() { return location; }
        public String getPasswordHash() { return passwordHash; }
        public String getProfilePhotoUrl() { return profilePhotoUrl; }
        public Set<Role> getRoles() { return roles; }
        public boolean isEnabled() { return enabled; }

        // ====================================================
        // SETTERS
        // ====================================================

        public void setName(String name) { this.name = name; }
        public void setUsername(String username) { this.username = username; }
        public void setEmail(String email) { this.email = email; }
        public void setPhone(String phone) { this.phone = phone; }
        public void setLocation(String location) { this.location = location; }
        public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
        public void setProfilePhotoUrl(String profilePhotoUrl) { this.profilePhotoUrl = profilePhotoUrl; }
        public void setRoles(Set<Role> roles) { this.roles = roles; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }


    // ========================================================
    // USER REPOSITORY
    // ========================================================

    public interface UserRepository extends JpaRepository<MarketplaceUser, Long> {
        Optional<MarketplaceUser> findByUsername(String username);
        Optional<MarketplaceUser> findByEmail(String email);
        boolean existsByUsername(String username);
        boolean existsByEmail(String email);
    }


    // ========================================================
    // REGISTER REQUEST
    // ========================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RegisterRequest(
            @NotBlank(message = "Name is required") @Size(max = 100) String name,
            String username,
            @NotBlank(message = "Email is required") @Email(message = "Invalid email format") @Size(max = 150) String email,
            String phone,
            String location,
            @NotBlank(message = "Password is required") @Size(min = 1, max = 100) String password,
            String role,
            String category
    ) {}


    // ========================================================
    // LOGIN REQUEST
    // ========================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LoginRequest(
            @NotBlank(message = "Email is required") @Email(message = "Invalid email format") String email,
            @NotBlank(message = "Password is required") String password,
            String role
    ) {}


    // ========================================================
    // AUTH RESPONSE
    // ========================================================

    public record AuthResponse(
            String token,
            String tokenType,
            String username,
            String name,
            String email,
            String phone,
            String location,
            Set<String> roles
    ) {}


    // ========================================================
    // JWT SERVICE
    // ========================================================

    @Service
    public static class JwtService {
        private final SecretKey key;
        private final long expiration;

        public JwtService(
                @Value("${app.jwt.secret}") String secret,
                @Value("${app.jwt.expiration-ms}") long expiration
        ) {
            if (secret.length() < 32) {
                throw new IllegalArgumentException("JWT secret must be at least 32 characters");
            }
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            this.expiration = expiration;
        }

        public String createToken(UserDetails user) {
            Date now = new Date();
            Date expiry = new Date(now.getTime() + expiration);

            return Jwts.builder()
                    .subject(user.getUsername())
                    .issuedAt(now)
                    .expiration(expiry)
                    .signWith(key)
                    .compact();
        }

        public String extractUsername(String token) {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
        }

        public boolean isValid(String token, UserDetails user) {
            try {
                var claims = Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                return claims.getSubject().equals(user.getUsername())
                        && claims.getExpiration().after(new Date());
            } catch (Exception e) {
                return false;
            }
        }
    }


    // ========================================================
    // USER DETAILS SERVICE
    // ========================================================

    @Service
    public static class CustomUserDetailsService implements UserDetailsService {
        private final UserRepository repository;

        public CustomUserDetailsService(UserRepository repository) {
            this.repository = repository;
        }

        @Override
        public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
            MarketplaceUser user = repository.findByEmail(email)
                    .orElseGet(() -> repository.findByUsername(email)
                            .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + email)));

            String[] roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .toArray(String[]::new);

            return User.withUsername(user.getEmail())
                    .password(user.getPasswordHash())
                    .roles(roles)
                    .disabled(!user.isEnabled())
                    .build();
        }
    }


    // ========================================================
    // JWT FILTER
    // ========================================================

    @Service
    public static class JwtAuthenticationFilter extends OncePerRequestFilter {
        private final JwtService jwtService;
        private final UserDetailsService userDetailsService;

        public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
            this.jwtService = jwtService;
            this.userDetailsService = userDetailsService;
        }

        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain
        ) throws ServletException, IOException {
            String authorizationHeader = request.getHeader("Authorization");

            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            try {
                String token = authorizationHeader.substring(7).trim();
                if (token.startsWith("Bearer ")) {
                    token = token.substring(7).trim();
                }
                if (token.startsWith("\"") && token.endsWith("\"")) {
                    token = token.substring(1, token.length() - 1).trim();
                }
                if (token.startsWith("'") && token.endsWith("'")) {
                    token = token.substring(1, token.length() - 1).trim();
                }
                String email = jwtService.extractUsername(token);

                if (org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication() == null) {

                    UserDetails user = userDetailsService.loadUserByUsername(email);

                    if (jwtService.isValid(token, user)) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        user,
                                        null,
                                        user.getAuthorities()
                                );

                        org.springframework.security.core.context.SecurityContextHolder
                                .getContext().setAuthentication(authentication);
                    }
                }
            } catch (Exception ignored) {}

            filterChain.doFilter(request, response);
        }
    }


    // ========================================================
    // SECURITY CONFIGURATION
    // ========================================================

    @Configuration
    public static class SecurityConfig {
        private final JwtAuthenticationFilter jwtFilter;
        private final UserDetailsService userDetailsService;

        public SecurityConfig(JwtAuthenticationFilter jwtFilter, UserDetailsService userDetailsService) {
            this.jwtFilter = jwtFilter;
            this.userDetailsService = userDetailsService;
        }

        @Bean
        public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

        @Bean
        public AuthenticationProvider authenticationProvider() {
            DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
            provider.setUserDetailsService(userDetailsService);
            provider.setPasswordEncoder(passwordEncoder());
            return provider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
            return configuration.getAuthenticationManager();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(csrf -> csrf.disable())
                    .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                    .sessionManagement(session ->
                            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                    )
                    .authorizeHttpRequests(auth -> auth
                            // Static resources served publicly from classpath:/static/
                            .requestMatchers(
                                    "/",
                                    "/index.html",
                                    "/*.html",
                                    "/*.js",
                                    "/*.css",
                                    "/*.png",
                                    "/*.jpg",
                                    "/*.jpeg",
                                    "/*.svg",
                                    "/*.ico",
                                    "/*.mp4",
                                    "/*.json",
                                    "/*.woff",
                                    "/*.woff2",
                                    "/*.ttf",
                                    "/customer dashboard.html", "/customer%20dashboard.html",
                                    "/customer projects.html", "/customer%20projects.html",
                                    "/create project.html", "/create%20project.html",
                                    "/dashborad.html", "/contactor.html", "/my-bids.html",
                                    "/website script.js", "/website%20script.js",
                                    "/website style.css", "/website%20style.css",
                                    "/cudashboard script.js", "/cudashboard%20script.js",
                                    "/cudashboard style.css", "/cudashboard%20style.css",
                                    "/cuprojects script.js", "/cuprojects%20script.js",
                                    "/cuprojects style.css", "/cuprojects%20style.css",
                                    "/createproject script.js", "/createproject%20script.js",
                                    "/createproject style.css", "/createproject%20style.css",
                                    "/my-bids.js", "/my-bids.css",
                                    "/animation.js", "/animation.css",
                                    "/layout.js", "/layout.css",
                                    "/styles.css",
                                    "/about build bid video.mp4", "/about%20build%20bid%20video.mp4",
                                    "/hero-building.jpg",
                                    "/logo.png"
                            ).permitAll()
                            // Public Auth, Health & Error
                            .requestMatchers("/api/auth/**", "/api/health", "/error").permitAll()
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            // Protected Business APIs
                            .requestMatchers(HttpMethod.POST, "/api/customer/projects/create").authenticated()
                            .requestMatchers(HttpMethod.GET, "/api/customer/projects", "/api/customer/projects/**").permitAll()
                            .requestMatchers("/api/customer/hiring/**").permitAll()
                            .anyRequest().authenticated()
                    )
                    .authenticationProvider(authenticationProvider())
                    .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                    .build();
        }

        @Bean
        public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
            org.springframework.web.cors.CorsConfiguration configuration =
                    new org.springframework.web.cors.CorsConfiguration();

            configuration.setAllowedOriginPatterns(java.util.List.of(
                    "https://buildbid-ap3j.onrender.com",
                    "https://*.onrender.com",
                    "http://localhost:*",
                    "http://127.0.0.1:*",
                    "http://localhost",
                    "http://127.0.0.1"
            ));
            configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
            configuration.setAllowedHeaders(java.util.List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
            configuration.setAllowCredentials(false);

            org.springframework.web.cors.UrlBasedCorsConfigurationSource source =
                    new org.springframework.web.cors.UrlBasedCorsConfigurationSource();

            source.registerCorsConfiguration("/**", configuration);
            return source;
        }
    }


    // ========================================================
    // AUTH SERVICE
    // ========================================================

    @Service
    public static class AuthService {
        private final UserRepository repository;
        private final PasswordEncoder passwordEncoder;
        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;

        public AuthService(
                UserRepository repository,
                PasswordEncoder passwordEncoder,
                AuthenticationManager authenticationManager,
                JwtService jwtService
        ) {
            this.repository = repository;
            this.passwordEncoder = passwordEncoder;
            this.authenticationManager = authenticationManager;
            this.jwtService = jwtService;
        }

        public AuthResponse register(RegisterRequest request) {
            String email = request.email().trim().toLowerCase();

            if (repository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email already exists. Please login instead.");
            }

            String username = (request.username() != null && !request.username().isBlank())
                    ? request.username().trim()
                    : email.split("@")[0] + "_" + (System.currentTimeMillis() % 10000);

            if (repository.existsByUsername(username)) {
                throw new IllegalArgumentException("Username already exists. Please choose a different username.");
            }

            Role role = mapFrontendRole(request.role());
            Set<Role> roles = new HashSet<>();
            roles.add(role);

            String phone = request.phone() != null ? request.phone().trim() : null;
            if (phone != null && phone.length() > 20) {
                phone = phone.substring(0, 20);
            }

            String location = request.location() != null ? request.location().trim() : null;
            if (location != null && location.length() > 150) {
                location = location.substring(0, 150);
            }

            MarketplaceUser user = new MarketplaceUser();
            user.setName(request.name().trim());
            user.setUsername(username);
            user.setEmail(email);
            user.setPhone(phone);
            user.setLocation(location);
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRoles(roles);

            MarketplaceUser savedUser = repository.save(user);

            UserDetails userDetails = createUserDetails(savedUser);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, savedUser);
        }

        public AuthResponse login(LoginRequest request) {
            String email = request.email().trim().toLowerCase();

            if (!repository.existsByEmail(email)) {
                throw new UsernameNotFoundException("Please sign up first, then login.");
            }

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );

            MarketplaceUser user = repository.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("Please sign up first, then login."));

            // Verify requested role against user's stored roles in database
            if (request.role() != null && !request.role().isBlank()) {
                Role requestedRole = mapFrontendRole(request.role());
                boolean matches = isMatchingRole(user.getRoles(), requestedRole);
                if (!matches) {
                    throw new IllegalArgumentException("Invalid role for this account");
                }
            }

            UserDetails userDetails = createUserDetails(user);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, user);
        }

        private boolean isMatchingRole(Set<Role> userRoles, Role requestedRole) {
            if (userRoles == null || userRoles.isEmpty()) {
                return false;
            }
            if (userRoles.contains(requestedRole)) {
                return true;
            }
            for (Role r : userRoles) {
                if (r == requestedRole) return true;
                if (requestedRole == Role.MATERIAL_SELLER && r == Role.SELLER) return true;
                if (requestedRole == Role.CONTRACTOR && r == Role.SELLER) return true;
                if (requestedRole == Role.PROFESSIONAL && r == Role.SERVICE_PROVIDER) return true;
            }
            return false;
        }

        // ====================================================
        // SAFE 4-ROLE MAPPING (Prevents breakdown of existing frontend)
        // ====================================================
        private Role mapFrontendRole(String frontendRole) {
            if (frontendRole == null || frontendRole.isBlank()) {
                return Role.CUSTOMER;
            }
            String formatted = frontendRole.trim().toLowerCase().replace(" ", "_");
            return switch (formatted) {
                case "customer", "homeowner" -> Role.CUSTOMER;
                case "contractor" -> Role.CONTRACTOR;
                case "material_seller", "materialseller", "seller" -> Role.MATERIAL_SELLER;
                case "professional", "service_provider" -> Role.PROFESSIONAL;
                default -> {
                    if (formatted.contains("contractor")) yield Role.CONTRACTOR;
                    if (formatted.contains("material") || formatted.contains("seller")) yield Role.MATERIAL_SELLER;
                    if (formatted.contains("profess") || formatted.contains("service")) yield Role.PROFESSIONAL;
                    yield Role.CUSTOMER;
                }
            };
        }

        private UserDetails createUserDetails(MarketplaceUser user) {
            String[] roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .toArray(String[]::new);

            return User.withUsername(user.getEmail())
                    .password(user.getPasswordHash())
                    .roles(roles)
                    .disabled(!user.isEnabled())
                    .build();
        }

        private AuthResponse createResponse(String token, MarketplaceUser user) {
            Set<String> roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .collect(Collectors.toSet());

            return new AuthResponse(
                    token,
                    "Bearer",
                    user.getUsername(),
                    user.getName() != null ? user.getName() : user.getUsername(),
                    user.getEmail(),
                    user.getPhone() != null ? user.getPhone() : "",
                    user.getLocation() != null ? user.getLocation() : "",
                    roles
            );
        }
    }


    // ========================================================
    // AUTH CONTROLLER
    // ========================================================

    @RestController
    @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService authService;

        public AuthController(AuthService authService) { this.authService = authService; }

        @PostMapping("/register")
        @ResponseStatus(HttpStatus.CREATED)
        public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
            return authService.register(request);
        }

        @PostMapping("/login")
        public AuthResponse login(@Valid @RequestBody LoginRequest request) {
            return authService.login(request);
        }

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", ex.getMessage(),
                    "message", ex.getMessage()
            ));
        }

        @ExceptionHandler(BadCredentialsException.class)
        public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid email or password",
                    "message", "Invalid email or password"
            ));
        }

        @ExceptionHandler(UsernameNotFoundException.class)
        public ResponseEntity<Map<String, String>> handleUserNotFound(UsernameNotFoundException ex) {
            String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "Please sign up first, then login.";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", msg,
                    "message", msg
            ));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
            String msg = ex.getBindingResult().getFieldErrors().stream()
                    .map(err -> (err.getDefaultMessage() != null ? err.getDefaultMessage() : err.getField() + " is invalid"))
                    .findFirst()
                    .orElse("Validation failed");
            return ResponseEntity.badRequest().body(Map.of(
                    "error", msg,
                    "message", msg
            ));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<Map<String, String>> handleGeneralException(Exception ex) {
            String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "Authentication request failed";
            return ResponseEntity.badRequest().body(Map.of(
                    "error", msg,
                    "message", msg
            ));
        }
    }


    // ========================================================
    // HEALTH CONTROLLER
    // ========================================================

    @RestController
    public static class HealthController {
        @GetMapping("/api/health")
        public Map<String, String> health() {
            return Map.of("status", "UP", "service", "marketplace-backend");
        }
    }


    // ========================================================
    // PROFILE CONTROLLER
    // ========================================================

    @RestController
    public static class ProfileController {
        private final UserRepository userRepository;

        public ProfileController(UserRepository userRepository) { this.userRepository = userRepository; }

        @GetMapping({"/api/me", "/api/user/profile", "/api/customer/profile"})
        public Map<String, Object> currentUser(org.springframework.security.core.Authentication authentication) {
            if (authentication == null || !authentication.isAuthenticated()) {
                throw new BadCredentialsException("Unauthenticated user");
            }
            String email = authentication.getName();

            MarketplaceUser user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByUsername(email)
                            .orElseThrow(() -> new UsernameNotFoundException("User not found")));

            String displayName = (user.getName() != null && !user.getName().isBlank())
                    ? user.getName().trim()
                    : (user.getUsername() != null ? user.getUsername().trim() : "");

            Map<String, Object> profile = new java.util.HashMap<>();
            profile.put("id", user.getId());
            profile.put("name", displayName);
            profile.put("fullName", displayName);
            profile.put("username", user.getUsername() != null ? user.getUsername() : "");
            profile.put("email", user.getEmail() != null ? user.getEmail() : "");
            profile.put("phone", user.getPhone() != null ? user.getPhone() : "");
            profile.put("location", user.getLocation() != null ? user.getLocation() : "");
            profile.put("roles", user.getRoles().stream().map(Enum::name).collect(Collectors.toSet()));
            profile.put("enabled", user.isEnabled());
            return profile;
        }
    }


    // ========================================================
    // WEB CONFIGURATION (Strict Classpath Static Handler)
    // ========================================================

    @Configuration
    public static class WebConfig implements org.springframework.web.servlet.config.annotation.WebMvcConfigurer {
        @Override
        public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
            registry.addResourceHandler("/**")
                    .addResourceLocations("classpath:/static/")
                    .setCachePeriod(3600);
        }
    }
}
