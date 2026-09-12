package com.marketplace.backend;

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

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
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
import java.util.HashMap;
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
        Optional<MarketplaceUser> findByEmailIgnoreCase(String email);
        Optional<MarketplaceUser> findByUsernameIgnoreCase(String username);
        boolean existsByUsername(String username);
        boolean existsByEmail(String email);
        boolean existsByEmailIgnoreCase(String email);
        boolean existsByUsernameIgnoreCase(String username);
    }


    // ========================================================
    // REGISTER REQUEST
    // ========================================================

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Email @Size(max = 150) String email,
            String phone,
            String location,
            @NotBlank @Size(min = 1, max = 100) String password,
            @NotBlank String role
    ) {}


    // ========================================================
    // LOGIN REQUEST
    // ========================================================

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}


    // ========================================================
    // AUTH RESPONSE
    // ========================================================

    public record AuthResponse(
            String token,
            String tokenType,
            String username,
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

                String subject = claims.getSubject();
                return subject != null
                        && subject.equalsIgnoreCase(user.getUsername())
                        && claims.getExpiration() != null
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
        public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
            if (identifier == null || identifier.trim().isEmpty()) {
                throw new UsernameNotFoundException("Identifier cannot be blank");
            }
            String cleanIdentifier = identifier.trim();
            MarketplaceUser user = repository.findByEmailIgnoreCase(cleanIdentifier)
                    .or(() -> repository.findByUsernameIgnoreCase(cleanIdentifier))
                    .or(() -> repository.findByEmail(cleanIdentifier))
                    .or(() -> repository.findByUsername(cleanIdentifier))
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + cleanIdentifier));

            String[] roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .toArray(String[]::new);

            return User.withUsername(user.getEmail().toLowerCase())
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

            if (authorizationHeader == null || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
                filterChain.doFilter(request, response);
                return;
            }

            try {
                String token = authorizationHeader.substring(7).trim();
                if (!token.isEmpty() && !token.equalsIgnoreCase("null") && !token.equalsIgnoreCase("undefined")) {
                    String identifier = jwtService.extractUsername(token);

                    if (identifier != null && org.springframework.security.core.context.SecurityContextHolder
                            .getContext().getAuthentication() == null) {

                        UserDetails user = userDetailsService.loadUserByUsername(identifier);

                        if (jwtService.isValid(token, user)) {
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(
                                            user,
                                            null,
                                            user.getAuthorities()
                                    );
                            authentication.setDetails(
                                    new org.springframework.security.web.authentication.WebAuthenticationDetailsSource()
                                            .buildDetails(request)
                            );

                            org.springframework.security.core.context.SecurityContextHolder
                                    .getContext().setAuthentication(authentication);
                        }
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
                    .authorizeHttpRequests(auth ->
                        auth
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            .requestMatchers("/", "/index.html", "/*.html", "/*.js", "/*.css", "/api/auth/**", "/api/health").permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/projects/**", "/api/customer/projects/**").permitAll()
                            .requestMatchers("/api/customer/hiring/**").permitAll()
                            .requestMatchers("/api/me", "/api/customer/profile", "/api/user/profile").authenticated()
                            .requestMatchers(HttpMethod.POST, "/api/customer/projects/create").authenticated()
                            .anyRequest().authenticated()
                    )
                    .exceptionHandling(ex -> ex
                            .authenticationEntryPoint((request, response, authException) -> {
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.setContentType("application/json");
                                response.getWriter().write("{\"error\": \"Unauthorized or expired token. Please login again.\"}");
                            })
                            .accessDeniedHandler((request, response, accessDeniedException) -> {
                                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                response.setContentType("application/json");
                                response.getWriter().write("{\"error\": \"Forbidden: Access denied.\"}");
                            })
                    )
                    .authenticationProvider(authenticationProvider())
                    .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                    .build();
        }

        @Bean
        public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
            org.springframework.web.cors.CorsConfiguration configuration =
                    new org.springframework.web.cors.CorsConfiguration();

            configuration.setAllowedOriginPatterns(java.util.List.of("*"));
            configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
            configuration.setAllowedHeaders(java.util.List.of("*"));
            configuration.setExposedHeaders(java.util.List.of("Authorization", "Content-Type"));
            configuration.setAllowCredentials(false);
            configuration.setMaxAge(3600L);

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
            String username = request.username().trim();

            if (repository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email already exists");
            }
            if (repository.existsByUsername(username)) {
                throw new IllegalArgumentException("Username already exists");
            }

            Role role = mapFrontendRole(request.role());
            Set<Role> roles = new HashSet<>();
            roles.add(role);

            MarketplaceUser user = new MarketplaceUser();
            user.setName(request.name().trim());
            user.setUsername(username);
            user.setEmail(email);
            user.setPhone(request.phone() != null ? request.phone().trim() : null);
            user.setLocation(request.location() != null ? request.location().trim() : null);
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRoles(roles);

            MarketplaceUser savedUser = repository.save(user);

            UserDetails userDetails = createUserDetails(savedUser);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, savedUser);
        }

        public AuthResponse login(LoginRequest request) {
            String email = request.email().trim().toLowerCase();

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );

            MarketplaceUser user = repository.findByEmailIgnoreCase(email)
                    .or(() -> repository.findByUsernameIgnoreCase(email))
                    .or(() -> repository.findByEmail(email))
                    .or(() -> repository.findByUsername(email))
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            UserDetails userDetails = createUserDetails(user);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, user);
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
                default -> Role.CUSTOMER;
            };
        }

        private UserDetails createUserDetails(MarketplaceUser user) {
            String[] roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .toArray(String[]::new);

            return User.withUsername(user.getEmail().toLowerCase())
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

            return new AuthResponse(token, "Bearer", user.getUsername(), roles);
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

        @GetMapping({"/api/me", "/api/customer/profile", "/api/user/profile"})
        public Map<String, Object> currentUser(org.springframework.security.core.Authentication authentication) {
            if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Unauthorized or expired token. Please login again.");
            }

            String identifier = authentication.getName();

            MarketplaceUser user = userRepository.findByEmailIgnoreCase(identifier)
                    .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
                    .or(() -> userRepository.findByEmail(identifier))
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                            HttpStatus.NOT_FOUND, "User profile not found."));

            Set<String> roleNames = user.getRoles() != null
                    ? user.getRoles().stream().map(Enum::name).collect(Collectors.toSet())
                    : Set.of("CUSTOMER");

            String primaryRole = !roleNames.isEmpty() ? roleNames.iterator().next() : "CUSTOMER";

            Map<String, Object> profile = new HashMap<>();
            profile.put("id", user.getId());
            profile.put("name", user.getName() != null ? user.getName() : (user.getUsername() != null ? user.getUsername() : "Customer"));
            profile.put("username", user.getUsername() != null ? user.getUsername() : "");
            profile.put("email", user.getEmail() != null ? user.getEmail() : "");
            profile.put("phone", user.getPhone() != null ? user.getPhone() : "");
            profile.put("location", user.getLocation() != null ? user.getLocation() : "");
            profile.put("roles", roleNames);
            profile.put("role", primaryRole);
            profile.put("enabled", user.isEnabled());

            return profile;
        }
    }
}
