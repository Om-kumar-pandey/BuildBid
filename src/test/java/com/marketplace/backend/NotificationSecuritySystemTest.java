package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — NOTIFICATION SECURITY & ISOLATION SYSTEM TEST
 * 
 * Deep security and isolation audit test suite verifying:
 * 1. Role Isolation (CUSTOMER, CONTRACTOR, PROFESSIONAL, MATERIAL_SELLER)
 * 2. User Isolation (Customer A vs B, Contractor A vs B, Pro A vs B, Seller A vs B)
 * 3. Authentication Binding (principal from Spring Security / JWT, no client query param override)
 * 4. IDOR Protection (cannot mark another user's notification as read; fails with HTTP 403)
 * 5. Missing Notification Handling (HTTP 404)
 * 6. Mark All Read Security (affects only authenticated user's notifications)
 * 7. Unread Count Scoping (no cross-user count leakage)
 * 8. Private Data Leakage Audit (no recipient user, password, phone, or token exposed)
 * 9. Procurement Notifications Scoping (Direct Buy, Quotation, Multi-Seller Purchase Allocation, Lifecycle)
 */
public class NotificationSecuritySystemTest {

    private NotificationRepository notificationRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private NotificationService notificationService;
    private NotificationController notificationController;

    // 8 distinct test users across 4 roles
    private MarketplaceBackendApplication.MarketplaceUser customerA;
    private MarketplaceBackendApplication.MarketplaceUser customerB;
    private MarketplaceBackendApplication.MarketplaceUser contractorA;
    private MarketplaceBackendApplication.MarketplaceUser contractorB;
    private MarketplaceBackendApplication.MarketplaceUser professionalA;
    private MarketplaceBackendApplication.MarketplaceUser professionalB;
    private MarketplaceBackendApplication.MarketplaceUser sellerA;
    private MarketplaceBackendApplication.MarketplaceUser sellerB;

    // In-memory notifications store for realistic repository mocking
    private List<Notification> notificationStore;
    private long notificationIdCounter;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        notificationService = new NotificationService(notificationRepository);
        notificationController = new NotificationController(notificationService, userRepository);

        notificationStore = new ArrayList<>();
        notificationIdCounter = 100L;

        // Initialize 8 test users
        customerA = createUser(1L, "customerA@buildbid.com", "Customer Alpha", MarketplaceBackendApplication.Role.CUSTOMER);
        customerB = createUser(2L, "customerB@buildbid.com", "Customer Beta", MarketplaceBackendApplication.Role.CUSTOMER);

        contractorA = createUser(3L, "contractorA@buildbid.com", "Contractor Alpha", MarketplaceBackendApplication.Role.CONTRACTOR);
        contractorB = createUser(4L, "contractorB@buildbid.com", "Contractor Beta", MarketplaceBackendApplication.Role.CONTRACTOR);

        professionalA = createUser(5L, "proA@buildbid.com", "Professional Alpha", MarketplaceBackendApplication.Role.PROFESSIONAL);
        professionalB = createUser(6L, "proB@buildbid.com", "Professional Beta", MarketplaceBackendApplication.Role.PROFESSIONAL);

        sellerA = createUser(7L, "sellerA@buildbid.com", "Seller Alpha Materials", MarketplaceBackendApplication.Role.MATERIAL_SELLER);
        sellerB = createUser(8L, "sellerB@buildbid.com", "Seller Beta Materials", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        // Mock userRepository lookup by email
        List<MarketplaceBackendApplication.MarketplaceUser> allUsers = List.of(
                customerA, customerB, contractorA, contractorB, professionalA, professionalB, sellerA, sellerB
        );
        for (MarketplaceBackendApplication.MarketplaceUser u : allUsers) {
            when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            when(userRepository.findByUsername(u.getEmail())).thenReturn(Optional.of(u));
        }

        // Mock notificationRepository methods backed by notificationStore
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            if (n.getId() == null) {
                ReflectionTestUtils.setField(n, "id", ++notificationIdCounter);
                notificationStore.add(n);
            }
            return n;
        });

        when(notificationRepository.findById(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return notificationStore.stream().filter(n -> id.equals(n.getId())).findFirst();
        });

        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(anyLong())).thenAnswer(invocation -> {
            Long recipientId = invocation.getArgument(0);
            List<Notification> res = new ArrayList<>();
            for (Notification n : notificationStore) {
                if (n.getRecipient() != null && recipientId.equals(n.getRecipient().getId())) {
                    res.add(n);
                }
            }
            res.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
            return res;
        });

        when(notificationRepository.countByRecipientIdAndIsReadFalse(anyLong())).thenAnswer(invocation -> {
            Long recipientId = invocation.getArgument(0);
            return notificationStore.stream()
                    .filter(n -> n.getRecipient() != null && recipientId.equals(n.getRecipient().getId()) && !Boolean.TRUE.equals(n.getIsRead()))
                    .count();
        });

        when(notificationRepository.markAllAsReadForUser(anyLong())).thenAnswer(invocation -> {
            Long recipientId = invocation.getArgument(0);
            int count = 0;
            for (Notification n : notificationStore) {
                if (n.getRecipient() != null && recipientId.equals(n.getRecipient().getId()) && !Boolean.TRUE.equals(n.getIsRead())) {
                    n.setIsRead(true);
                    count++;
                }
            }
            return count;
        });
    }

    private MarketplaceBackendApplication.MarketplaceUser createUser(Long id, String email, String name, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        ReflectionTestUtils.setField(user, "id", id);
        user.setEmail(email);
        user.setName(name);
        user.setRoles(Set.of(role));
        return user;
    }

    private Authentication mockAuthFor(MarketplaceBackendApplication.MarketplaceUser user) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(user.getEmail());
        when(auth.isAuthenticated()).thenReturn(true);
        return auth;
    }

    private Notification createTestNotification(MarketplaceBackendApplication.MarketplaceUser recipient, String title, String msg, String type, String refId) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setTitle(title);
        n.setTitleHi(title + " (हिंदी)");
        n.setMessage(msg);
        n.setMessageHi(msg + " (हिंदी संदेश)");
        n.setNotificationType(type);
        n.setReferenceId(refId);
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(n);
    }

    // =========================================================================
    // 1. TEST GROUP A — CUSTOMER ISOLATION
    // =========================================================================

    @Test
    @DisplayName("Group A: Customer A receives Customer A notification, invisible to Customer B, Contractor, Pro, Seller")
    void testGroupA_CustomerIsolation() {
        createTestNotification(customerA, "CUSTOMER_A_ONLY", "Confidential to Customer A", "ORDER_UPDATE", "ORD-CA-1");

        // Customer A can view
        ResponseEntity<?> respA = notificationController.getNotifications(mockAuthFor(customerA));
        assertEquals(HttpStatus.OK, respA.getStatusCode());
        Map<?, ?> bodyA = (Map<?, ?>) respA.getBody();
        List<?> notifsA = (List<?>) bodyA.get("notifications");
        assertEquals(1, notifsA.size());
        assertEquals("CUSTOMER_A_ONLY", ((Map<?, ?>) notifsA.get(0)).get("title"));

        // Customer B cannot view
        ResponseEntity<?> respB = notificationController.getNotifications(mockAuthFor(customerB));
        Map<?, ?> bodyB = (Map<?, ?>) respB.getBody();
        assertEquals(0, ((List<?>) bodyB.get("notifications")).size());

        // Contractor cannot view
        ResponseEntity<?> respCont = notificationController.getNotifications(mockAuthFor(contractorA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCont.getBody()).get("notifications")).size());

        // Professional cannot view
        ResponseEntity<?> respPro = notificationController.getNotifications(mockAuthFor(professionalA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respPro.getBody()).get("notifications")).size());

        // Seller cannot view
        ResponseEntity<?> respSell = notificationController.getNotifications(mockAuthFor(sellerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respSell.getBody()).get("notifications")).size());
    }

    // =========================================================================
    // 2. TEST GROUP B — CONTRACTOR ISOLATION
    // =========================================================================

    @Test
    @DisplayName("Group B: Contractor A receives Contractor A notification, invisible to Contractor B, Customer, Pro, Seller")
    void testGroupB_ContractorIsolation() {
        createTestNotification(contractorA, "CONTRACTOR_A_ONLY", "Confidential to Contractor A", "BID_ACCEPTED", "BID-CTA-1");

        // Contractor A can view
        ResponseEntity<?> respA = notificationController.getNotifications(mockAuthFor(contractorA));
        assertEquals(1, ((List<?>) ((Map<?, ?>) respA.getBody()).get("notifications")).size());

        // Contractor B cannot view
        ResponseEntity<?> respB = notificationController.getNotifications(mockAuthFor(contractorB));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respB.getBody()).get("notifications")).size());

        // Customer cannot view
        ResponseEntity<?> respCust = notificationController.getNotifications(mockAuthFor(customerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCust.getBody()).get("notifications")).size());

        // Professional cannot view
        ResponseEntity<?> respPro = notificationController.getNotifications(mockAuthFor(professionalA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respPro.getBody()).get("notifications")).size());

        // Seller cannot view
        ResponseEntity<?> respSell = notificationController.getNotifications(mockAuthFor(sellerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respSell.getBody()).get("notifications")).size());
    }

    // =========================================================================
    // 3. TEST GROUP C — PROFESSIONAL ISOLATION
    // =========================================================================

    @Test
    @DisplayName("Group C: Professional A receives Professional A notification, invisible to Pro B, Customer, Contractor, Seller")
    void testGroupC_ProfessionalIsolation() {
        createTestNotification(professionalA, "PRO_A_ONLY", "Direct hire lead for Pro A", "DIRECT_HIRE_LEAD", "CSR-PRO-1");

        // Professional A can view
        ResponseEntity<?> respA = notificationController.getNotifications(mockAuthFor(professionalA));
        assertEquals(1, ((List<?>) ((Map<?, ?>) respA.getBody()).get("notifications")).size());

        // Professional B cannot view
        ResponseEntity<?> respB = notificationController.getNotifications(mockAuthFor(professionalB));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respB.getBody()).get("notifications")).size());

        // Customer cannot view
        ResponseEntity<?> respCust = notificationController.getNotifications(mockAuthFor(customerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCust.getBody()).get("notifications")).size());

        // Contractor cannot view
        ResponseEntity<?> respCont = notificationController.getNotifications(mockAuthFor(contractorA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCont.getBody()).get("notifications")).size());

        // Seller cannot view
        ResponseEntity<?> respSell = notificationController.getNotifications(mockAuthFor(sellerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respSell.getBody()).get("notifications")).size());
    }

    // =========================================================================
    // 4. TEST GROUP D — MATERIAL SELLER ISOLATION
    // =========================================================================

    @Test
    @DisplayName("Group D: Seller A receives Seller A notification, invisible to Seller B, Customer, Contractor, Pro")
    void testGroupD_MaterialSellerIsolation() {
        createTestNotification(sellerA, "SELLER_A_ONLY", "Material purchase allocation for Seller A", "ORDER_SELECTED", "ORD-SELLA-1");

        // Seller A can view
        ResponseEntity<?> respA = notificationController.getNotifications(mockAuthFor(sellerA));
        assertEquals(1, ((List<?>) ((Map<?, ?>) respA.getBody()).get("notifications")).size());

        // Seller B cannot view
        ResponseEntity<?> respB = notificationController.getNotifications(mockAuthFor(sellerB));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respB.getBody()).get("notifications")).size());

        // Customer cannot view
        ResponseEntity<?> respCust = notificationController.getNotifications(mockAuthFor(customerA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCust.getBody()).get("notifications")).size());

        // Contractor cannot view
        ResponseEntity<?> respCont = notificationController.getNotifications(mockAuthFor(contractorA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respCont.getBody()).get("notifications")).size());

        // Professional cannot view
        ResponseEntity<?> respPro = notificationController.getNotifications(mockAuthFor(professionalA));
        assertEquals(0, ((List<?>) ((Map<?, ?>) respPro.getBody()).get("notifications")).size());
    }

    // =========================================================================
    // 5. CROSS-USER TEST ACROSS 8 USERS
    // =========================================================================

    @Test
    @DisplayName("Cross-User: 8 distinct users receive uniquely tagged notifications, each sees strictly their own")
    void testCrossUser_EightDistinctUsers_ExactIsolation() {
        createTestNotification(customerA, "NOTIF_CUST_A", "Msg", "TYPE", "REF-1");
        createTestNotification(customerB, "NOTIF_CUST_B", "Msg", "TYPE", "REF-2");
        createTestNotification(contractorA, "NOTIF_CONT_A", "Msg", "TYPE", "REF-3");
        createTestNotification(contractorB, "NOTIF_CONT_B", "Msg", "TYPE", "REF-4");
        createTestNotification(professionalA, "NOTIF_PRO_A", "Msg", "TYPE", "REF-5");
        createTestNotification(professionalB, "NOTIF_PRO_B", "Msg", "TYPE", "REF-6");
        createTestNotification(sellerA, "NOTIF_SELL_A", "Msg", "TYPE", "REF-7");
        createTestNotification(sellerB, "NOTIF_SELL_B", "Msg", "TYPE", "REF-8");

        MarketplaceBackendApplication.MarketplaceUser[] users = {
                customerA, customerB, contractorA, contractorB, professionalA, professionalB, sellerA, sellerB
        };
        String[] expectedTitles = {
                "NOTIF_CUST_A", "NOTIF_CUST_B", "NOTIF_CONT_A", "NOTIF_CONT_B",
                "NOTIF_PRO_A", "NOTIF_PRO_B", "NOTIF_SELL_A", "NOTIF_SELL_B"
        };

        for (int i = 0; i < users.length; i++) {
            ResponseEntity<?> resp = notificationController.getNotifications(mockAuthFor(users[i]));
            Map<?, ?> body = (Map<?, ?>) resp.getBody();
            List<?> notifs = (List<?>) body.get("notifications");
            assertEquals(1, notifs.size(), "User " + users[i].getEmail() + " should see exactly 1 notification");
            Map<?, ?> nMap = (Map<?, ?>) notifs.get(0);
            assertEquals(expectedTitles[i], nMap.get("title"));
        }
    }

    // =========================================================================
    // 6. CROSS-ROLE TEST (PRIVILEGE DOES NOT WIDEN ACCESS)
    // =========================================================================

    @Test
    @DisplayName("Cross-Role: Knowing notification ID does not grant cross-role or cross-user access")
    void testCrossRole_PrivilegeDoesNotWidenAccess() {
        Notification custNotif = createTestNotification(customerA, "CONFIDENTIAL_CUST_DOC", "Details", "PROJECT", "PRJ-999");
        Long notifId = custNotif.getId();

        // Contractor attempts to mark Customer A's notification as read
        ResponseEntity<?> respCont = notificationController.markAsRead(notifId, mockAuthFor(contractorA));
        assertEquals(HttpStatus.FORBIDDEN, respCont.getStatusCode());

        // Seller attempts to mark Customer A's notification as read
        ResponseEntity<?> respSell = notificationController.markAsRead(notifId, mockAuthFor(sellerA));
        assertEquals(HttpStatus.FORBIDDEN, respSell.getStatusCode());

        // Professional attempts to mark Customer A's notification as read
        ResponseEntity<?> respPro = notificationController.markAsRead(notifId, mockAuthFor(professionalA));
        assertEquals(HttpStatus.FORBIDDEN, respPro.getStatusCode());

        // Verify notification is STILL unread
        assertFalse(custNotif.getIsRead());
    }

    // =========================================================================
    // 7. IDOR ATTACK TESTS
    // =========================================================================

    @Test
    @DisplayName("IDOR: Customer B cannot mark Customer A notification as read (HTTP 403 Forbidden)")
    void testIdorAttack_PutReadOnAnotherUsersNotification_FailsSafely403() {
        Notification notifA = createTestNotification(customerA, "SECRET_FOR_A", "Secret Message", "ALERT", "REF-A");
        Long notifAId = notifA.getId();

        // Customer B tries to tamper with Customer A's notification
        ResponseEntity<?> resp = notificationController.markAsRead(notifAId, mockAuthFor(customerB));
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertTrue(body.containsKey("error"));
        assertTrue(body.get("error").toString().toLowerCase().contains("access denied"));

        // Notification must remain unread
        assertFalse(notifA.getIsRead());
    }

    @Test
    @DisplayName("IDOR: Marking non-existent notification returns HTTP 404 Not Found")
    void testIdorAttack_NonExistentNotification_Returns404() {
        ResponseEntity<?> resp = notificationController.markAsRead(999999L, mockAuthFor(customerA));
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertTrue(body.containsKey("error"));
        assertTrue(body.get("error").toString().toLowerCase().contains("not found"));
    }

    @Test
    @DisplayName("IDOR Architecture: Verify that NO GET-by-ID endpoint exists on NotificationController")
    void testIdorAttack_NoGetSingleNotificationEndpointExposed() {
        Method[] methods = NotificationController.class.getDeclaredMethods();
        for (Method m : methods) {
            org.springframework.web.bind.annotation.GetMapping getMapping =
                    m.getAnnotation(org.springframework.web.bind.annotation.GetMapping.class);
            if (getMapping != null) {
                for (String path : getMapping.value()) {
                    assertFalse(path.contains("{id}"),
                            "NotificationController must NOT expose GET /{id} endpoint to eliminate direct enumeration IDOR");
                }
            }
        }
    }

    // =========================================================================
    // 8. UNREAD COUNT SECURITY
    // =========================================================================

    @Test
    @DisplayName("Unread Count: Customer A has 3 unread, Customer B has 8 unread, Customer A gets unreadCount = 3")
    void testUnreadCount_ScopedStrictlyToAuthenticatedUser() {
        for (int i = 0; i < 3; i++) {
            createTestNotification(customerA, "Title A" + i, "Msg", "TYPE", "REF");
        }
        for (int i = 0; i < 8; i++) {
            createTestNotification(customerB, "Title B" + i, "Msg", "TYPE", "REF");
        }

        ResponseEntity<?> respA = notificationController.getNotifications(mockAuthFor(customerA));
        Map<?, ?> bodyA = (Map<?, ?>) respA.getBody();
        assertEquals(3L, ((Number) bodyA.get("unreadCount")).longValue());

        ResponseEntity<?> respB = notificationController.getNotifications(mockAuthFor(customerB));
        Map<?, ?> bodyB = (Map<?, ?>) respB.getBody();
        assertEquals(8L, ((Number) bodyB.get("unreadCount")).longValue());
    }

    // =========================================================================
    // 9. PRIVATE DATA LEAKAGE AUDIT
    // =========================================================================

    @Test
    @DisplayName("Data Leakage: Response exposes only safe fields, no recipient entity, password, email, or token")
    void testPrivateDataLeakage_PayloadContainsOnlySafeFields() {
        createTestNotification(customerA, "Safe Notification", "Safe Body", "TYPE_SAFE", "REF-SAFE-1");

        ResponseEntity<?> resp = notificationController.getNotifications(mockAuthFor(customerA));
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        List<?> notifs = (List<?>) body.get("notifications");
        Map<?, ?> notifMap = (Map<?, ?>) notifs.get(0);

        // Required safe fields
        assertTrue(notifMap.containsKey("id"));
        assertTrue(notifMap.containsKey("title"));
        assertTrue(notifMap.containsKey("titleHi"));
        assertTrue(notifMap.containsKey("message"));
        assertTrue(notifMap.containsKey("messageHi"));
        assertTrue(notifMap.containsKey("type"));
        assertTrue(notifMap.containsKey("referenceId"));
        assertTrue(notifMap.containsKey("isRead"));
        assertTrue(notifMap.containsKey("createdAt"));

        // Forbidden sensitive fields
        assertFalse(notifMap.containsKey("recipient"));
        assertFalse(notifMap.containsKey("user"));
        assertFalse(notifMap.containsKey("email"));
        assertFalse(notifMap.containsKey("phone"));
        assertFalse(notifMap.containsKey("phoneNumber"));
        assertFalse(notifMap.containsKey("password"));
        assertFalse(notifMap.containsKey("token"));
        assertFalse(notifMap.containsKey("jwt"));
        assertFalse(notifMap.containsKey("credentials"));
    }

    // =========================================================================
    // 10. MARK ALL READ SECURITY
    // =========================================================================

    @Test
    @DisplayName("Mark All Read: Customer A marking all read leaves Customer B's notifications unread")
    void testMarkAllAsRead_AffectsOnlyAuthenticatedUserNotifications() {
        Notification notifA1 = createTestNotification(customerA, "A1", "Msg", "T", "R");
        Notification notifA2 = createTestNotification(customerA, "A2", "Msg", "T", "R");
        Notification notifB1 = createTestNotification(customerB, "B1", "Msg", "T", "R");
        Notification notifB2 = createTestNotification(customerB, "B2", "Msg", "T", "R");

        // Customer A marks all read
        ResponseEntity<?> resp = notificationController.markAllAsRead(mockAuthFor(customerA));
        assertEquals(HttpStatus.OK, resp.getStatusCode());

        // Verify Customer A's are now read
        assertTrue(notifA1.getIsRead());
        assertTrue(notifA2.getIsRead());

        // Verify Customer B's notifications remain UNREAD
        assertFalse(notifB1.getIsRead());
        assertFalse(notifB2.getIsRead());
    }

    // =========================================================================
    // 11. PROCUREMENT-SPECIFIC NOTIFICATION SCOPING
    // =========================================================================

    @Test
    @DisplayName("Procurement Direct Buy: Notification created for specific target seller, competing seller receives nothing")
    void testDirectBuyProcurement_NotificationRecipientIsolation() {
        // Direct buy placed by Customer A targeting Seller A
        Notification n = notificationService.createNotification(
                sellerA,
                "New Material Order",
                "नया सामग्री ऑर्डर",
                "Buyer Customer Alpha sent direct buy request",
                "सीधा खरीद अनुरोध",
                "NEW_DIRECT_BUY_ORDER",
                "DIR-101"
        );

        // Seller A sees it
        List<Map<String, Object>> sellerANotifs = notificationService.getUserNotifications(sellerA);
        assertEquals(1, sellerANotifs.size());
        assertEquals("DIR-101", sellerANotifs.get(0).get("referenceId"));

        // Seller B sees NOTHING
        List<Map<String, Object>> sellerBNotifs = notificationService.getUserNotifications(sellerB);
        assertEquals(0, sellerBNotifs.size());
    }

    @Test
    @DisplayName("Procurement Multi-Seller Selection: Selected seller receives order notification, unselected seller receives nothing")
    void testPurchaseAllocationProcurement_SellerSelectedNotificationScopedOnlyToSelectedSeller() {
        // Customer A allocates purchase to Seller A (not Seller B)
        notificationService.createNotification(
                sellerA,
                "Material Order Selected",
                "सामग्री ऑर्डर चुना गया",
                "Customer Alpha selected materials from quotation",
                "सामग्री चुनी गई",
                "ORDER_SELECTED",
                "ORD-900"
        );

        // Seller A receives order selection
        assertEquals(1, notificationService.getUserNotifications(sellerA).size());

        // Seller B receives NOTHING
        assertEquals(0, notificationService.getUserNotifications(sellerB).size());
    }

    @Test
    @DisplayName("Procurement Lifecycle: Order status update notifies buyer, unassociated parties receive nothing")
    void testMaterialOrderLifecycle_StatusUpdateNotificationScopedOnlyToBuyer() {
        notificationService.createNotification(
                customerA,
                "Order Accepted",
                "ऑर्डर स्वीकार किया गया",
                "Seller Alpha has accepted your material order",
                "ऑर्डर स्वीकार किया गया",
                "ORDER_ACCEPTED",
                "ORD-900"
        );

        // Buyer receives it
        assertEquals(1, notificationService.getUserNotifications(customerA).size());

        // Another buyer or contractor receives nothing
        assertEquals(0, notificationService.getUserNotifications(customerB).size());
        assertEquals(0, notificationService.getUserNotifications(contractorA).size());
    }

    @Test
    @DisplayName("Security: Unauthenticated request to /api/notifications returns HTTP 401 Unauthorized")
    void testUnauthenticatedAccess_Returns401() {
        ResponseEntity<?> resp = notificationController.getNotifications(null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());

        Authentication emptyAuth = mock(Authentication.class);
        when(emptyAuth.getName()).thenReturn(null);
        ResponseEntity<?> resp2 = notificationController.getNotifications(emptyAuth);
        assertEquals(HttpStatus.UNAUTHORIZED, resp2.getStatusCode());
    }
}
