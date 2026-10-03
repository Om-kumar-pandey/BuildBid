package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    public NotificationController(NotificationService notificationService,
                                  MarketplaceBackendApplication.UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping({"", "/"})
    public ResponseEntity<?> getNotifications(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "User not found"));
        }

        List<Map<String, Object>> notifs = notificationService.getUserNotifications(user);
        long unreadCount = notificationService.getUnreadCount(user);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("notifications", notifs);
        resp.put("unreadCount", unreadCount);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "User not found"));
        }

        try {
            boolean ok = notificationService.markAsRead(id, user);
            return ResponseEntity.ok(Map.of("success", ok));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not have permission to modify this notification"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Notification not found"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        MarketplaceBackendApplication.MarketplaceUser user = resolveUser(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "User not found"));
        }

        notificationService.markAllAsRead(user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private MarketplaceBackendApplication.MarketplaceUser resolveUser(String principal) {
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElse(null);
    }
}
