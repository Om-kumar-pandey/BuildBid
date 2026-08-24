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
    // USER ROLES
    // ========================================================

    public enum Role {
        CUSTOMER,
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

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public String getUsername() {
            return username;
        }

        public String getEmail() {
            return email;
        }

        public String getPhone() {
            return phone;
        }

        public String getPasswordHash() {
            return passwordHash;
        }

        public String getProfilePhotoUrl() {
            return profilePhotoUrl;
        }

        public Set<Role> getRoles() {
            return roles;
        }

        public boolean isEnabled() {
            return enabled;
        }

        // ====================================================
        // SETTERS
        // ====================================================

        public void setName(String name) {
            this.name = name;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public void setPasswordHash(String passwordHash) {
            this.passwordHash = passwordHash;
        }

        public void setProfilePhotoUrl(String profilePhotoUrl) {
            this.profilePhotoUrl = profilePhotoUrl;
        }

        public void setRoles(Set<Role> roles) {
            this.roles = roles;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
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
    // REGISTER REQUEST (Updated with username & phone)
    // ========================================================

    public record RegisterRequest(

            @NotBlank
            @Size(max = 100)
            String name,

            @NotBlank
            @Size(min = 3, max = 50)
            String username,

            @NotBlank
            @Email
            @Size(max = 150)
            String email,

            String phone,

            @NotBlank
            @Size(min = 1, max = 100)
            String password,

            @NotBlank
            String role

    ) {
    }


    // ========================================================
    // LOGIN REQUEST (Matches Frontend Login Form)
    // ========================================================

    public record LoginRequest(

            @NotBlank
            @Email
            String email,

            @NotBlank
            String password

    ) {
    }


    // ========================================================
    // AUTH RESPONSE
    // ========================================================

    public record AuthResponse(

            String token,

            String tokenType,

            String username,

            Set<String> roles

    ) {
    }


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
                throw new IllegalArgumentException(
                        "JWT secret must be at least 32 characters"
                );
            }

            this.key = Keys.hmacShaKeyFor(
                    secret.getBytes(StandardCharsets.UTF_8)
            );
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
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

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

        public JwtAuthenticationFilter(
                JwtService jwtService,
                UserDetailsService userDetailsService
        ) {
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
                String token = authorizationHeader.substring(7);
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
            } catch (Exception ignored) {
                // Invalid token
            }

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

        public SecurityConfig(
                JwtAuthenticationFilter jwtFilter,
                UserDetailsService userDetailsService
        ) {
            this.jwtFilter = jwtFilter;
            this.userDetailsService = userDetailsService;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationProvider authenticationProvider() {
            DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
            provider.setUserDetailsService(userDetailsService);
            provider.setPasswordEncoder(passwordEncoder());
            return provider;
        }

        @Bean
        public AuthenticationManager authenticationManager(
                AuthenticationConfiguration configuration
        ) throws Exception {
            return configuration.getAuthenticationManager();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

            return http
                    .csrf(csrf -> csrf.disable())
                    .cors(cors -> {})
                    .sessionManagement(session ->
                            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                    )
                    .authorizeHttpRequests(auth ->
                            auth
                                    .requestMatchers(
                                            "/",
                                            "/index.html",
                                            "/api/auth/**",
                                            "/api/health"
                                    ).permitAll()
                                    .requestMatchers(
                                            HttpMethod.OPTIONS,
                                            "/**"
                                    ).permitAll()
                                    .anyRequest().authenticated()
                    )
                    .authenticationProvider(authenticationProvider())
                    .addFilterBefore(
                            jwtFilter,
                            UsernamePasswordAuthenticationFilter.class
                    )
                    .build();
        }

        @Bean
        public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {

            org.springframework.web.cors.CorsConfiguration configuration =
                    new org.springframework.web.cors.CorsConfiguration();

            configuration.setAllowedOriginPatterns(java.util.List.of("*"));
            configuration.setAllowedMethods(java.util.List.of(
                    "GET", "POST", "PUT", "DELETE", "OPTIONS"
            ));
            configuration.setAllowedHeaders(java.util.List.of("*"));
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

        // ================= REGISTER =================
        public AuthResponse register(RegisterRequest request) {

            String email = request.email().trim().toLowerCase();
            String username = request.username().trim();

            // Check if email already exists
            if (repository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email already exists");
            }

            // Check if username already exists
            if (repository.existsByUsername(username)) {
                throw new IllegalArgumentException("Username already exists");
            }

            Role role = mapFrontendRole(request.role());
            Set<Role> roles = new HashSet<>();
            roles.add(role);

            MarketplaceUser user = new MarketplaceUser();
            user.setName(request.name().trim());
            user.setUsername(username); // <--- Real username saved in SQL
            user.setEmail(email);
            user.setPhone(request.phone() != null ? request.phone().trim() : null); // <--- Real phone saved
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRoles(roles);

            MarketplaceUser savedUser = repository.save(user);

            UserDetails userDetails = createUserDetails(savedUser);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, savedUser);
        }

        // ================= LOGIN =================
        public AuthResponse login(LoginRequest request) {

            String email = request.email().trim().toLowerCase();

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.password()
                    )
            );

            MarketplaceUser user = repository.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            UserDetails userDetails = createUserDetails(user);
            String token = jwtService.createToken(userDetails);

            return createResponse(token, user);
        }

        // ================= ROLE MAPPING =================
        private Role mapFrontendRole(String frontendRole) {

            if (frontendRole == null || frontendRole.isBlank()) {
                return Role.CUSTOMER;
            }

            return switch (frontendRole.trim().toLowerCase()) {
                case "customer", "homeowner" -> Role.CUSTOMER;
                case "contractor", "seller" -> Role.SELLER;
                case "professional", "service_provider" -> Role.SERVICE_PROVIDER;
                default -> Role.CUSTOMER;
            };
        }

        // ================= USER DETAILS HELPER =================
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

        // ================= RESPONSE HELPER =================
        private AuthResponse createResponse(String token, MarketplaceUser user) {

            Set<String> roles = user.getRoles()
                    .stream()
                    .map(Enum::name)
                    .collect(Collectors.toSet());

            return new AuthResponse(
                    token,
                    "Bearer",
                    user.getUsername(), // Real username returned to frontend
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

        public AuthController(AuthService authService) {
            this.authService = authService;
        }

        @PostMapping("/register")
        @ResponseStatus(HttpStatus.CREATED)
        public AuthResponse register(
                @Valid @RequestBody RegisterRequest request
        ) {
            return authService.register(request);
        }

        @PostMapping("/login")
        public AuthResponse login(
                @Valid @RequestBody LoginRequest request
        ) {
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
            return Map.of(
                    "status", "UP",
                    "service", "marketplace-backend"
            );
        }
    }


    // ========================================================
    // PROFILE CONTROLLER
    // ========================================================

    @RestController
public static class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/me")
    public Map<String, Object> currentUser(
            org.springframework.security.core.Authentication authentication
    ) {

        String email = authentication.getName();

        MarketplaceUser user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found")
                );

        return Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "roles", user.getRoles(),
                "enabled", user.isEnabled()
        );
    }
}
}
