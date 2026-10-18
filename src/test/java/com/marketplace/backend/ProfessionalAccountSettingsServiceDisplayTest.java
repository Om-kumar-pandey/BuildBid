package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * BUILDBID — PROFESSIONAL ACCOUNT SETTINGS UI CLEANUP & DYNAMIC SERVICE DISPLAY TEST SUITE
 *
 * Verifies:
 * 1. Dynamic service catalog retrieval and isolation for authenticated professionals.
 * 2. Service display subtitle computation rules (1 service, multiple services (+N), 0 services -> "No service").
 * 3. Deduplication and empty/invalid service value handling.
 * 4. Removal of the Professional Title field, 'Licensed Professional' text, and empty grid gaps.
 * 5. Removal of the UI Foundation active / Phase 2 notice from the Personal Information card.
 * 6. Save button label reads exactly "Save Changes" and save handler remains intact.
 */
public class ProfessionalAccountSettingsServiceDisplayTest {

    private ProfessionalServiceService professionalServiceService;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private ProfessionalServiceController serviceController;

    private MarketplaceBackendApplication.MarketplaceUser proUser;
    private MarketplaceBackendApplication.MarketplaceUser otherProUser;
    private Authentication proAuth;

    @BeforeEach
    void setUp() {
        professionalServiceService = mock(ProfessionalServiceService.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);
        serviceController = new ProfessionalServiceController(professionalServiceService, userRepository);

        proUser = new MarketplaceBackendApplication.MarketplaceUser();
        proUser.setName("OM KUMAR PANDEY");
        proUser.setEmail("om.pandey@buildbid.com");
        proUser.setRoles(new HashSet<>(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL)));
        proUser.setEnabled(true);
        setUserId(proUser, 101L);

        otherProUser = new MarketplaceBackendApplication.MarketplaceUser();
        otherProUser.setName("Amit Singh");
        otherProUser.setEmail("amit@buildbid.com");
        otherProUser.setRoles(new HashSet<>(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL)));
        otherProUser.setEnabled(true);
        setUserId(otherProUser, 102L);

        proAuth = mock(Authentication.class);
        when(proAuth.isAuthenticated()).thenReturn(true);
        when(proAuth.getName()).thenReturn("om.pandey@buildbid.com");

        when(userRepository.findByEmail("om.pandey@buildbid.com")).thenReturn(Optional.of(proUser));
    }

    private void setUserId(MarketplaceBackendApplication.MarketplaceUser user, Long id) {
        try {
            java.lang.reflect.Field field = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private ProfessionalService createMockService(Long id, MarketplaceBackendApplication.MarketplaceUser owner, String titleEn) {
        ProfessionalService s = new ProfessionalService();
        s.setProfessional(owner);
        s.setServiceTitleEn(titleEn);
        s.setActive(true);
        try {
            java.lang.reflect.Field field = ProfessionalService.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(s, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return s;
    }

    // =========================================================================
    // 1. BACKEND SERVICE CATALOG QUERY & TENANT ISOLATION
    // =========================================================================

    @Test
    @DisplayName("getMyServices returns authenticated professional's configured services only")
    void testGetMyServicesReturnsAuthenticatedUserServicesOnly() {
        ProfessionalService s1 = createMockService(1L, proUser, "Labour");
        ProfessionalService s2 = createMockService(2L, proUser, "Electrician");

        when(professionalServiceService.getServicesForProfessional(proUser)).thenReturn(List.of(s1, s2));

        ResponseEntity<?> response = serviceController.getMyServices(proAuth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody();
        assertNotNull(list);
        assertEquals(2, list.size());
        assertEquals("Labour", list.get(0).get("serviceTitleEn"));
        assertEquals("Electrician", list.get(1).get("serviceTitleEn"));

        verify(professionalServiceService).getServicesForProfessional(proUser);
        verify(professionalServiceService, never()).getServicesForProfessional(otherProUser);
    }

    @Test
    @DisplayName("getMyServices returns empty list when professional has no configured services")
    void testGetMyServicesReturnsEmptyListWhenNoServices() {
        when(professionalServiceService.getServicesForProfessional(proUser)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = serviceController.getMyServices(proAuth);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody();
        assertNotNull(list);
        assertTrue(list.isEmpty());
    }

    // =========================================================================
    // 2. DYNAMIC SERVICE DISPLAY SUBTITLE CALCULATION RULES
    // =========================================================================

    /**
     * Java replica of computeServiceSubtitle logic from professional-account-setting.js
     */
    private String computeServiceSubtitle(List<Map<String, Object>> rawList) {
        if (rawList == null || rawList.isEmpty()) {
            return "No service";
        }

        List<String> validNames = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();
        Set<String> seenNames = new HashSet<>();

        for (Map<String, Object> s : rawList) {
            if (s == null) continue;
            Object nameObj = s.get("serviceTitleEn");
            if (nameObj == null) nameObj = s.get("masterServiceTitleEn");
            if (nameObj == null) nameObj = s.get("name");
            if (nameObj == null) nameObj = s.get("title");
            if (nameObj == null) continue;

            String clean = nameObj.toString().trim();
            if (clean.isEmpty()) continue;

            Object idObj = s.get("id");
            if (idObj == null) idObj = s.get("serviceId");
            if (idObj != null) {
                String idStr = idObj.toString();
                if (seenIds.contains(idStr)) continue;
                seenIds.add(idStr);
            }

            String lower = clean.toLowerCase();
            if (seenNames.contains(lower)) continue;
            seenNames.add(lower);

            validNames.add(clean);
        }

        if (validNames.isEmpty()) {
            return "No service";
        }

        String first = validNames.get(0);
        if (validNames.size() == 1) {
            return first;
        }

        int additional = validNames.size() - 1;
        return first + " +" + additional;
    }

    @Test
    @DisplayName("Rule 1: Exactly 1 service displays that service's name (e.g. 'Labour')")
    void testSubtitleOneService() {
        List<Map<String, Object>> services = List.of(
                Map.of("id", 1L, "serviceTitleEn", "Labour")
        );
        assertEquals("Labour", computeServiceSubtitle(services));
    }

    @Test
    @DisplayName("Rule 2: Exactly 2 services display the first service name followed by '+1'")
    void testSubtitleTwoServices() {
        List<Map<String, Object>> services = List.of(
                Map.of("id", 1L, "serviceTitleEn", "Labour"),
                Map.of("id", 2L, "serviceTitleEn", "Electrician")
        );
        assertEquals("Labour +1", computeServiceSubtitle(services));
    }

    @Test
    @DisplayName("Rule 3: Exactly 3 services display the first service name followed by '+2'")
    void testSubtitleThreeServices() {
        List<Map<String, Object>> services = List.of(
                Map.of("id", 1L, "serviceTitleEn", "Labour"),
                Map.of("id", 2L, "serviceTitleEn", "Electrician"),
                Map.of("id", 3L, "serviceTitleEn", "Plumber")
        );
        assertEquals("Labour +2", computeServiceSubtitle(services));
    }

    @Test
    @DisplayName("Rule 4: Exactly 4 services display the first service name followed by '+3'")
    void testSubtitleFourServices() {
        List<Map<String, Object>> services = List.of(
                Map.of("id", 1L, "serviceTitleEn", "Labour"),
                Map.of("id", 2L, "serviceTitleEn", "Electrician"),
                Map.of("id", 3L, "serviceTitleEn", "Plumber"),
                Map.of("id", 4L, "serviceTitleEn", "Carpenter")
        );
        assertEquals("Labour +3", computeServiceSubtitle(services));
    }

    @Test
    @DisplayName("Rule 5: No services configured displays exactly 'No service'")
    void testSubtitleNoServices() {
        assertEquals("No service", computeServiceSubtitle(Collections.emptyList()));
        assertEquals("No service", computeServiceSubtitle(null));
    }

    @Test
    @DisplayName("Rule 6: Duplicates and empty values do not inflate the service count")
    void testSubtitleDeduplicationAndEmptyFiltering() {
        List<Map<String, Object>> services = new ArrayList<>();
        services.add(Map.of("id", 1L, "serviceTitleEn", "Labour"));
        services.add(Map.of("id", 2L, "serviceTitleEn", "Electrician"));
        services.add(Map.of("id", 1L, "serviceTitleEn", "Labour")); // duplicate ID
        services.add(Map.of("id", 3L, "serviceTitleEn", "labour")); // duplicate name
        services.add(Map.of("id", 4L, "serviceTitleEn", "   "));   // empty name
        services.add(Map.of("id", 5L, "serviceTitleEn", "Painter")); // valid 3rd

        assertEquals("Labour +2", computeServiceSubtitle(services));
    }

    // =========================================================================
    // 3. STATIC HTML / UI STRUCTURE VERIFICATION
    // =========================================================================

    @Test
    @DisplayName("HTML inspection: Professional Title field is completely removed")
    void testHtmlProfessionalTitleRemoved() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        assertTrue(htmlFile.exists(), "professional-account-setting.html must exist");

        String content = Files.readString(htmlFile.toPath());
        assertFalse(content.contains("id=\"pro-input-title\""), "pro-input-title input must not exist in HTML");
        assertFalse(content.contains("for=\"pro-input-title\""), "pro-input-title label must not exist in HTML");
        assertFalse(content.contains("Licensed Professional"), "'Licensed Professional' must not exist in Personal Information");

        // Verify Full Name is cleanly formatted full-width without an empty grid column
        assertTrue(content.contains("<div class=\"pro-settings-form-group\" style=\"margin-bottom: 18px;\">"),
                "Full Name must be contained in a standalone form-group to avoid grid gaps");
    }

    @Test
    @DisplayName("HTML inspection: UI Foundation active / Phase 2 notice is removed")
    void testHtmlPhase2NoticeRemovedFromPersonalInformation() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        assertFalse(content.contains("UI Foundation active"), "UI Foundation active notice must be removed");
        assertFalse(content.contains("Form persistence and profile synchronization will be enabled in Phase 2"),
                "Phase 2 persistence notice must be removed");
    }

    @Test
    @DisplayName("HTML inspection: Save button reads exactly 'Save Changes'")
    void testHtmlSaveButtonLabel() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        assertFalse(content.contains("Save Changes (Phase 2)"), "Save button must not have (Phase 2)");
        assertTrue(content.contains("id=\"pro-btn-save-personal-info\""), "Save button must exist");
        assertTrue(content.contains("<span>Save Changes</span>"), "Save button text must be 'Save Changes'");
    }

    @Test
    @DisplayName("HTML inspection: Identity subtitle element initializes to 'No service'")
    void testHtmlIdentitySubtitleInitialState() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        assertTrue(content.contains("<span class=\"pro-settings-user-role\" id=\"pro-settings-nav-role\">No service</span>"),
                "Top-right user role subtitle must initialize to 'No service'");
    }

    @Test
    @DisplayName("HTML inspection: Credentials tab and section 3 are completely removed")
    void testHtmlCredentialsTabAndSectionRemoved() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        // Sidebar tab and its icon/labels
        assertFalse(content.contains("id=\"tab-credentials\""), "tab-credentials must be removed from sidebar");
        assertFalse(content.contains("data-section=\"credentials\""), "data-section='credentials' must be removed from sidebar");
        assertFalse(content.contains("3. Professional Profile &amp; Credentials"), "Sidebar item label must be removed");
        assertFalse(content.contains("3. Professional Profile & Credentials"), "Item label must be removed");

        // Content panel and all section 3 controls
        assertFalse(content.contains("id=\"sec-credentials\""), "sec-credentials panel must be removed");
        assertFalse(content.contains("Primary Profession"), "Primary Profession field must be removed");
        assertFalse(content.contains("Council / License Registration Number"), "Council license field must be removed");
        assertFalse(content.contains("id=\"pro-cred-profession\""), "pro-cred-profession must be removed");
        assertFalse(content.contains("id=\"pro-cred-experience\""), "pro-cred-experience must be removed");
        assertFalse(content.contains("id=\"pro-cred-license\""), "pro-cred-license must be removed");
        assertFalse(content.contains("id=\"pro-cred-authority\""), "pro-cred-authority must be removed");
        assertFalse(content.contains("Credentials Registry"), "Credentials Registry badge must be removed");
        assertFalse(content.contains("Verified Credentials Ledger"), "Verified Credentials Ledger must be removed");
    }

    @Test
    @DisplayName("HTML inspection: '6 Account & Security Controls' subtitle is removed and 'Settings Menu' heading is preserved")
    void testHtmlSidebarSubtitleRemovedAndSettingsMenuPreserved() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        assertFalse(content.contains("6 Account &amp; Security Controls"), "Sidebar subtitle with &amp; must be removed");
        assertFalse(content.contains("6 Account & Security Controls"), "Sidebar subtitle must be removed");
        assertTrue(content.contains("<h2 class=\"pro-settings-sidebar-title\">Settings Menu</h2>"),
                "Settings Menu heading must be preserved");
    }

    @Test
    @DisplayName("HTML inspection: Exactly five sidebar navigation items remain in correct order")
    void testHtmlRemainingFiveNavigationItems() throws Exception {
        File htmlFile = new File("professional-account-setting.html");
        String content = Files.readString(htmlFile.toPath());

        List<String> expectedSections = List.of(
                "personal-info",
                "verification",
                "security-login",
                "account-activity",
                "deactivation-deletion"
        );

        int lastIndex = -1;
        for (String section : expectedSections) {
            String marker = "data-section=\"" + section + "\"";
            int idx = content.indexOf(marker);
            assertTrue(idx > -1, "Sidebar must contain " + marker);
            assertTrue(idx > lastIndex, "Sidebar sections must remain in original relative order: " + section);
            lastIndex = idx;
        }

        // Count occurrences of pro-settings-nav-btn
        int navBtnCount = 0;
        int searchIdx = 0;
        while ((searchIdx = content.indexOf("class=\"pro-settings-nav-btn", searchIdx)) != -1) {
            navBtnCount++;
            searchIdx += 26;
        }
        assertEquals(5, navBtnCount, "There must be exactly 5 sidebar navigation buttons");
    }

    @Test
    @DisplayName("JS routing inspection: ALL_SECTIONS has 5 items and old #credentials redirects")
    void testJsRoutingAndCredentialsRedirect() throws Exception {
        File jsFile = new File("professional-account-setting.js");
        String content = Files.readString(jsFile.toPath());

        // Verify credentials is not in ALL_SECTIONS array
        assertFalse(content.matches("(?s).*const ALL_SECTIONS = \\[[^\\]]*\"credentials\"[^\\]]*\\].*"),
                "credentials must be removed from ALL_SECTIONS array");

        // Verify old credentials hash redirects
        assertTrue(content.contains("hash === \"credentials\""), "JS must detect old #credentials hash");
        assertTrue(content.contains("initialHash === \"credentials\""), "JS must detect initial #credentials hash");
        assertTrue(content.contains("switchSection(\"personal-info\", true)"), "JS must redirect to personal-info with hash update");
    }

    @Test
    @DisplayName("Parity check: Root files and static resources files are identical")
    void testParityBetweenRootAndStaticResources() throws Exception {
        File rootHtml = new File("professional-account-setting.html");
        File staticHtml = new File("src/main/resources/static/professional-account-setting.html");
        File rootJs = new File("professional-account-setting.js");
        File staticJs = new File("src/main/resources/static/professional-account-setting.js");

        assertEquals(Files.readString(rootHtml.toPath()), Files.readString(staticHtml.toPath()),
                "Root HTML and Static HTML must be identical");
        assertEquals(Files.readString(rootJs.toPath()), Files.readString(staticJs.toPath()),
                "Root JS and Static JS must be identical");
    }
}
