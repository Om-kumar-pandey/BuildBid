package src.java.com.marketplace.backend;

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

import org.springframework.http.HttpStatus;

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


        @Column(nullable = false, unique = true, length = 30)
        private String username;


        @Column(nullable = false, unique = true, length = 150)
        private String email;


        @Column(nullable = false, unique = true, length = 20)
        private String phone;


        @Column(nullable = false, length = 100)
        private String passwordHash;


        @Column(length = 500)
        private String profilePhotoUrl;


        @ElementCollection(fetch = FetchType.EAGER)
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


        // Getters

        public Long getId() {
            return id;
        }


        public String getUsername() {
            return username;
        }


        public String getPasswordHash() {
            return passwordHash;
        }


        public Set<Role> getRoles() {
            return roles;
        }


        public boolean isEnabled() {
            return enabled;
        }


        // Setters

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


        public void setRoles(Set<Role> roles) {
            this.roles = roles;
        }
    }


    // ========================================================
    // USER REPOSITORY
    // ========================================================

    public interface UserRepository
            extends JpaRepository<MarketplaceUser, Long> {


        Optional<MarketplaceUser> findByUsername(
                String username
        );


        boolean existsByUsername(
                String username
        );


        boolean existsByEmail(
                String email
        );


        boolean existsByPhone(
                String phone
        );
    }


    // ========================================================
    // REGISTER REQUEST
    // ========================================================

    public record RegisterRequest(

            @NotBlank
            @Size(max = 100)
            String name,


            @NotBlank
            @Size(min = 3, max = 30)
            @Pattern(
                    regexp = "^[a-zA-Z0-9_]+$",
                    message =
                            "Username may contain letters, digits and underscore only"
            )
            String username,


            @NotBlank
            @Email
            String email,


            @NotBlank
            @Pattern(
                    regexp = "^[0-9]{10,15}$",
                    message =
                            "Phone must contain 10 to 15 digits"
            )
            String phone,


            @NotBlank
            @Size(min = 17, max = 128)
            @Pattern(
                    regexp =
                            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{17,128}$",
                    message =
                            "Password must contain uppercase, lowercase, digit and special character"
            )
            String password,


            @NotEmpty
            Set<String> roles
    ) {
    }


    // ========================================================
    // LOGIN REQUEST
    // ========================================================

    public record LoginRequest(

            @NotBlank
            String username,


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

                @Value("${app.jwt.secret}")
                String secret,

                @Value("${app.jwt.expiration-ms}")
                long expiration

        ) {

            if (secret.length() < 32) {

                throw new IllegalArgumentException(
                        "JWT secret must be at least 32 characters"
                );
            }


            key = Keys.hmacShaKeyFor(
                    secret.getBytes(StandardCharsets.UTF_8)
            );


            this.expiration = expiration;
        }


        public String createToken(
                UserDetails user
        ) {

            Date now = new Date();


            Date expiry = new Date(
                    now.getTime() + expiration
            );


            return Jwts.builder()

                    .subject(
                            user.getUsername()
                    )

                    .issuedAt(now)

                    .expiration(expiry)

                    .signWith(key)

                    .compact();
        }


        public String extractUsername(
                String token
        ) {

            return Jwts.parser()

                    .verifyWith(key)

                    .build()

                    .parseSignedClaims(token)

                    .getPayload()

                    .getSubject();
        }


        public boolean isValid(

                String token,

                UserDetails user

        ) {

            try {

                var claims = Jwts.parser()

                        .verifyWith(key)

                        .build()

                        .parseSignedClaims(token)

                        .getPayload();


                return claims

                        .getSubject()

                        .equals(user.getUsername())

                        && claims

                        .getExpiration()

                        .after(new Date());

            }

            catch (Exception e) {

                return false;
            }
        }
    }


    // ========================================================
    // USER DETAILS SERVICE
    // ========================================================

    @Service
    public static class CustomUserDetailsService
            implements UserDetailsService {


        private final UserRepository repository;


        public CustomUserDetailsService(
                UserRepository repository
        ) {

            this.repository = repository;
        }


        @Override
        public UserDetails loadUserByUsername(

                String username

        ) throws UsernameNotFoundException {


            MarketplaceUser user =

                    repository

                            .findByUsername(username)

                            .orElseThrow(

                                    () -> new UsernameNotFoundException(
                                            "User not found"
                                    )
                            );


            String[] roles =

                    user

                            .getRoles()

                            .stream()

                            .map(Enum::name)

                            .toArray(String[]::new);


            return User

                    .withUsername(
                            user.getUsername()
                    )

                    .password(
                            user.getPasswordHash()
                    )

                    .roles(roles)

                    .disabled(
                            !user.isEnabled()
                    )

                    .build();
        }
    }


    // ========================================================
    // JWT FILTER
    // ========================================================

    @Service
    public static class JwtAuthenticationFilter
            extends OncePerRequestFilter {


        private final JwtService jwtService;

        private final UserDetailsService userDetailsService;


        public JwtAuthenticationFilter(

                JwtService jwtService,

                UserDetailsService userDetailsService

        ) {

            this.jwtService = jwtService;

            this.userDetailsService =
                    userDetailsService;
        }


        @Override
        protected void doFilterInternal(

                HttpServletRequest request,

                HttpServletResponse response,

                FilterChain filterChain

        ) throws ServletException, IOException {


            String authorizationHeader =

                    request.getHeader(
                            "Authorization"
                    );


            if (

                    authorizationHeader == null

                            ||

                    !authorizationHeader.startsWith(
                            "Bearer "
                    )

            ) {

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            try {

                String token =

                        authorizationHeader.substring(
                                7
                        );


                String username =

                        jwtService.extractUsername(
                                token
                        );


                if (

                        org.springframework.security.core.context
                                .SecurityContextHolder
                                .getContext()
                                .getAuthentication()
                                == null

                ) {


                    UserDetails user =

                            userDetailsService

                                    .loadUserByUsername(
                                            username
                                    );


                    if (

                            jwtService.isValid(
                                    token,
                                    user
                            )

                    ) {


                        UsernamePasswordAuthenticationToken

                                authentication =

                                new UsernamePasswordAuthenticationToken(

                                        user,

                                        null,

                                        user.getAuthorities()
                                );


                        org.springframework.security.core.context
                                .SecurityContextHolder
                                .getContext()
                                .setAuthentication(
                                        authentication
                                );
                    }
                }

            }

            catch (Exception ignored) {

                // Invalid token.
            }


            filterChain.doFilter(
                    request,
                    response
            );
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

            this.userDetailsService =
                    userDetailsService;
        }


        @Bean
        public PasswordEncoder passwordEncoder() {

            return new BCryptPasswordEncoder();
        }


        @Bean
        public AuthenticationProvider authenticationProvider() {

           DaoAuthenticationProvider provider =
                   new DaoAuthenticationProvider();

           provider.setUserDetailsService(userDetailsService);

           provider.setPasswordEncoder(passwordEncoder());

           return provider;
        }


        @Bean
        public AuthenticationManager authenticationManager(

                AuthenticationConfiguration configuration

        ) throws Exception {


            return configuration

                    .getAuthenticationManager();
        }


        @Bean
        public SecurityFilterChain securityFilterChain(

                HttpSecurity http

        ) throws Exception {


            return http

                    .csrf(
                            csrf ->
                                    csrf.disable()
                    )


                    .sessionManagement(

                            session ->

                                    session.sessionCreationPolicy(

                                            SessionCreationPolicy
                                                    .STATELESS
                                    )
                    )


                    .authorizeHttpRequests(

                            auth ->

                                    auth

                                            .requestMatchers(

                                                    "/api/auth/**",

                                                    "/api/health"

                                            )

                                            .permitAll()


                                            .anyRequest()

                                            .authenticated()
                    )


                    .authenticationProvider(

                            authenticationProvider()
                    )


                    .addFilterBefore(

                            jwtFilter,

                            UsernamePasswordAuthenticationFilter
                                    .class
                    )


                    .build();
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

            this.passwordEncoder =
                    passwordEncoder;

            this.authenticationManager =
                    authenticationManager;

            this.jwtService =
                    jwtService;
        }


        // ----------------------------------------------------
        // REGISTER
        // ----------------------------------------------------

        public AuthResponse register(

                RegisterRequest request

        ) {


            if (

                    repository.existsByUsername(
                            request.username()
                    )

            ) {

                throw new IllegalArgumentException(
                        "Username already exists"
                );
            }


            if (

                    repository.existsByEmail(
                            request.email()
                    )

            ) {

                throw new IllegalArgumentException(
                        "Email already exists"
                );
            }


            if (

                    repository.existsByPhone(
                            request.phone()
                    )

            ) {

                throw new IllegalArgumentException(
                        "Phone number already exists"
                );
            }


            Set<Role> roles =

                    request

                            .roles()

                            .stream()

                            .map(

                                    role ->

                                            Role.valueOf(
                                                    role.toUpperCase()
                                            )

                            )

                            .collect(
                                    Collectors.toSet()
                            );


            MarketplaceUser user =
                    new MarketplaceUser();


            user.setName(
                    request.name().trim()
            );


            user.setUsername(
                    request.username().trim()
            );


            user.setEmail(
                    request.email()
                            .trim()
                            .toLowerCase()
            );


            user.setPhone(
                    request.phone().trim()
            );


            user.setPasswordHash(

                    passwordEncoder.encode(
                            request.password()
                    )
            );


            user.setRoles(roles);


            MarketplaceUser savedUser =

                    repository.save(user);


            UserDetails userDetails =

                    createUserDetails(
                            savedUser
                    );


            String token =

                    jwtService.createToken(
                            userDetails
                    );


            return createResponse(
                    token,
                    savedUser
            );
        }


        // ----------------------------------------------------
        // LOGIN
        // ----------------------------------------------------

        public AuthResponse login(

                LoginRequest request

        ) {


            authenticationManager.authenticate(

                    new UsernamePasswordAuthenticationToken(

                            request.username(),

                            request.password()
                    )
            );


            MarketplaceUser user =

                    repository

                            .findByUsername(
                                    request.username()
                            )

                            .orElseThrow();


            UserDetails userDetails =

                    createUserDetails(user);


            String token =

                    jwtService.createToken(
                            userDetails
                    );


            return createResponse(
                    token,
                    user
            );
        }


        // ----------------------------------------------------
        // CREATE USER DETAILS
        // ----------------------------------------------------

        private UserDetails createUserDetails(

                MarketplaceUser user

        ) {


            return User

                    .withUsername(
                            user.getUsername()
                    )

                    .password(
                            user.getPasswordHash()
                    )

                    .roles(

                            user

                                    .getRoles()

                                    .stream()

                                    .map(Enum::name)

                                    .toArray(
                                            String[]::new
                                    )
                    )

                    .build();
        }


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        private AuthResponse createResponse(

                String token,

                MarketplaceUser user

        ) {


            Set<String> roles =

                    user

                            .getRoles()

                            .stream()

                            .map(Enum::name)

                            .collect(
                                    Collectors.toSet()
                            );


            return new AuthResponse(

                    token,

                    "Bearer",

                    user.getUsername(),

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


        public AuthController(
                AuthService authService
        ) {

            this.authService =
                    authService;
        }


        @PostMapping("/register")
        @ResponseStatus(HttpStatus.CREATED)
        public AuthResponse register(

                @Valid
                @RequestBody
                RegisterRequest request

        ) {

            return authService.register(
                    request
            );
        }


        @PostMapping("/login")
        public AuthResponse login(

                @Valid
                @RequestBody
                LoginRequest request

        ) {

            return authService.login(
                    request
            );
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

                    "status",
                    "UP",

                    "service",
                    "marketplace-backend"
            );
        }
    }


    // ========================================================
    // PROFILE CONTROLLER
    // ========================================================

    @RestController
    public static class ProfileController {


        @GetMapping("/api/me")
        public Map<String, String> currentUser(

                org.springframework.security.core.Authentication
                        authentication

        ) {


            return Map.of(

                    "username",
                    authentication.getName()
            );
        }
    }
}