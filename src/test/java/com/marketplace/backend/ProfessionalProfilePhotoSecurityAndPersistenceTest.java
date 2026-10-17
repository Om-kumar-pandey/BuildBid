package com.marketplace.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive Security, IDOR Protection, Format Whitelisting, and Persistence Test Suite
 * for Professional Profile Picture Upload, Retrieval, and Removal.
 */
public class ProfessionalProfilePhotoSecurityAndPersistenceTest {

    private ProfessionalProfilePhotoRepository photoRepository;
    private MarketplaceBackendApplication.UserRepository userRepository;
    private ProfessionalProfilePhotoService photoService;
    private ProfessionalProfileController photoController;

    private MarketplaceBackendApplication.MarketplaceUser proUserA;
    private MarketplaceBackendApplication.MarketplaceUser proUserB;
    private MarketplaceBackendApplication.MarketplaceUser legacyServiceProvider;
    private MarketplaceBackendApplication.MarketplaceUser customerUser;
    private MarketplaceBackendApplication.MarketplaceUser contractorUser;
    private MarketplaceBackendApplication.MarketplaceUser sellerUser;

    private byte[] validPngBytes;
    private byte[] validJpegBytes;
    private byte[] validWebpBytes;

    private MarketplaceBackendApplication.MarketplaceUser createTestUser(
            Long id, String email, String name, String username, MarketplaceBackendApplication.Role role) {
        MarketplaceBackendApplication.MarketplaceUser user = new MarketplaceBackendApplication.MarketplaceUser();
        user.setName(name);
        user.setEmail(email);
        user.setUsername(username);
        user.setRoles(new HashSet<>(Set.of(role)));
        user.setEnabled(true);
        user.setLocation("Mumbai");
        user.setPhone("9876543210");
        try {
            java.lang.reflect.Field idField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);

            java.lang.reflect.Field dateField = MarketplaceBackendApplication.MarketplaceUser.class.getDeclaredField("createdAt");
            dateField.setAccessible(true);
            dateField.set(user, LocalDateTime.now().minusMonths(1));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private Authentication createMockAuth(String principalEmail, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(principalEmail);
        doReturn(List.of(new SimpleGrantedAuthority(role))).when(auth).getAuthorities();
        return auth;
    }

    /**
     * Helper to construct a valid 1x1 WebP extended container byte array
     */
    private byte[] createMinimalWebPBytes(int width, int height) {
        byte[] vp8xChunk = new byte[18];
        vp8xChunk[0] = 'V';
        vp8xChunk[1] = 'P';
        vp8xChunk[2] = '8';
        vp8xChunk[3] = 'X';
        // chunk size 10 (little endian)
        vp8xChunk[4] = 10;
        vp8xChunk[5] = 0;
        vp8xChunk[6] = 0;
        vp8xChunk[7] = 0;
        // flags
        vp8xChunk[8] = 0;
        vp8xChunk[9] = 0;
        vp8xChunk[10] = 0;
        vp8xChunk[11] = 0;
        // canvas width - 1 (24-bit little endian)
        int wMinus1 = width - 1;
        vp8xChunk[12] = (byte) (wMinus1 & 0xFF);
        vp8xChunk[13] = (byte) ((wMinus1 >> 8) & 0xFF);
        vp8xChunk[14] = (byte) ((wMinus1 >> 16) & 0xFF);
        // canvas height - 1 (24-bit little endian)
        int hMinus1 = height - 1;
        vp8xChunk[15] = (byte) (hMinus1 & 0xFF);
        vp8xChunk[16] = (byte) ((hMinus1 >> 8) & 0xFF);
        vp8xChunk[17] = (byte) ((hMinus1 >> 16) & 0xFF);

        int totalFileSize = 4 + 4 + 4 + vp8xChunk.length; // RIFF + size + WEBP + chunk
        byte[] riff = new byte[totalFileSize];
        riff[0] = 'R'; riff[1] = 'I'; riff[2] = 'F'; riff[3] = 'F';
        int riffSize = totalFileSize - 8;
        riff[4] = (byte) (riffSize & 0xFF);
        riff[5] = (byte) ((riffSize >> 8) & 0xFF);
        riff[6] = (byte) ((riffSize >> 16) & 0xFF);
        riff[7] = (byte) ((riffSize >> 24) & 0xFF);
        riff[8] = 'W'; riff[9] = 'E'; riff[10] = 'B'; riff[11] = 'P';
        System.arraycopy(vp8xChunk, 0, riff, 12, vp8xChunk.length);
        return riff;
    }

    @BeforeEach
    void setUp() throws Exception {
        photoRepository = mock(ProfessionalProfilePhotoRepository.class);
        userRepository = mock(MarketplaceBackendApplication.UserRepository.class);

        photoService = new ProfessionalProfilePhotoService(photoRepository, userRepository);
        photoController = new ProfessionalProfileController(photoService, userRepository);

        proUserA = createTestUser(301L, "proA@buildbid.com", "Pro User Alpha", "pro_alpha", MarketplaceBackendApplication.Role.PROFESSIONAL);
        proUserB = createTestUser(302L, "proB@buildbid.com", "Pro User Beta", "pro_beta", MarketplaceBackendApplication.Role.PROFESSIONAL);
        legacyServiceProvider = createTestUser(303L, "legacypro@buildbid.com", "Legacy Pro", "legacy_pro", MarketplaceBackendApplication.Role.SERVICE_PROVIDER);
        customerUser = createTestUser(101L, "customer@buildbid.com", "Customer One", "cust_one", MarketplaceBackendApplication.Role.CUSTOMER);
        contractorUser = createTestUser(201L, "contractor@buildbid.com", "Contractor One", "cont_one", MarketplaceBackendApplication.Role.CONTRACTOR);
        sellerUser = createTestUser(401L, "seller@buildbid.com", "Seller One", "seller_one", MarketplaceBackendApplication.Role.MATERIAL_SELLER);

        when(userRepository.findByEmail("proA@buildbid.com")).thenReturn(Optional.of(proUserA));
        when(userRepository.findByUsername("proA@buildbid.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("proB@buildbid.com")).thenReturn(Optional.of(proUserB));
        when(userRepository.findByUsername("proB@buildbid.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("legacypro@buildbid.com")).thenReturn(Optional.of(legacyServiceProvider));
        when(userRepository.findByUsername("legacypro@buildbid.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("customer@buildbid.com")).thenReturn(Optional.of(customerUser));
        when(userRepository.findByEmail("contractor@buildbid.com")).thenReturn(Optional.of(contractorUser));
        when(userRepository.findByEmail("seller@buildbid.com")).thenReturn(Optional.of(sellerUser));

        when(photoRepository.save(any(ProfessionalProfilePhoto.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Generate valid 2x2 PNG
        BufferedImage pngImage = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream pngOut = new ByteArrayOutputStream();
        ImageIO.write(pngImage, "png", pngOut);
        validPngBytes = pngOut.toByteArray();

        // Generate valid 2x2 JPEG
        BufferedImage jpegImage = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream jpegOut = new ByteArrayOutputStream();
        ImageIO.write(jpegImage, "jpg", jpegOut);
        validJpegBytes = jpegOut.toByteArray();

        // Generate valid 2x2 WebP
        validWebpBytes = createMinimalWebPBytes(2, 2);
    }

    // =========================================================================
    // 1. AUTHENTICATION & ACCESS CONTROL TESTS
    // =========================================================================

    @Test
    @DisplayName("Unauthenticated upload, retrieve, and remove must return 401 UNAUTHORIZED")
    void testUnauthenticatedRequestsRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", validPngBytes);

        // Upload
        ResponseEntity<?> uploadRes = photoController.uploadPhoto(file, null, null);
        assertEquals(HttpStatus.UNAUTHORIZED, uploadRes.getStatusCode());

        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        assertEquals(HttpStatus.UNAUTHORIZED, photoController.uploadPhoto(file, null, unauth).getStatusCode());

        // Retrieve
        ResponseEntity<?> getRes = photoController.getPhoto(null);
        assertEquals(HttpStatus.UNAUTHORIZED, getRes.getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, photoController.getPhoto(unauth).getStatusCode());

        // Remove
        ResponseEntity<?> delRes = photoController.removePhoto(null);
        assertEquals(HttpStatus.UNAUTHORIZED, delRes.getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, photoController.removePhoto(unauth).getStatusCode());
    }

    @Test
    @DisplayName("Non-Professional roles (CUSTOMER, CONTRACTOR, MATERIAL_SELLER) must return 403 FORBIDDEN")
    void testNonProfessionalRolesForbidden() {
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", validPngBytes);

        // Customer
        Authentication customerAuth = createMockAuth("customer@buildbid.com", "ROLE_CUSTOMER");
        assertEquals(HttpStatus.FORBIDDEN, photoController.uploadPhoto(file, null, customerAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.getPhoto(customerAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.removePhoto(customerAuth).getStatusCode());

        // Contractor
        Authentication contractorAuth = createMockAuth("contractor@buildbid.com", "ROLE_CONTRACTOR");
        assertEquals(HttpStatus.FORBIDDEN, photoController.uploadPhoto(file, null, contractorAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.getPhoto(contractorAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.removePhoto(contractorAuth).getStatusCode());

        // Material Seller
        Authentication sellerAuth = createMockAuth("seller@buildbid.com", "ROLE_MATERIAL_SELLER");
        assertEquals(HttpStatus.FORBIDDEN, photoController.uploadPhoto(file, null, sellerAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.getPhoto(sellerAuth).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, photoController.removePhoto(sellerAuth).getStatusCode());
    }

    @Test
    @DisplayName("Explicitly supported legacy role (SERVICE_PROVIDER) must be permitted")
    void testLegacyServiceProviderRolePermitted() {
        Authentication legacyAuth = createMockAuth("legacypro@buildbid.com", "ROLE_SERVICE_PROVIDER");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", validPngBytes);

        ResponseEntity<?> response = photoController.uploadPhoto(file, null, legacyAuth);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("/api/professional/profile/photo", legacyServiceProvider.getProfilePhotoUrl());
    }

    // =========================================================================
    // 2. SUCCESSFUL UPLOAD, RETRIEVAL, AND PERSISTENCE (PNG, JPEG, WEBP)
    // =========================================================================

    @Test
    @DisplayName("Professional can upload valid PNG and retrieve image bytes with correct content type")
    void testSuccessfulUploadAndRetrievalPng() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        MockMultipartFile file = new MockMultipartFile("file", "headshot.png", "image/png", validPngBytes);

        ResponseEntity<?> uploadRes = photoController.uploadPhoto(file, null, authA);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) uploadRes.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals("/api/professional/profile/photo", body.get("photoUrl"));
        assertEquals("image/png", body.get("contentType"));
        assertEquals("/api/professional/profile/photo", proUserA.getProfilePhotoUrl());

        // Mock repository returning saved entity on subsequent retrieval
        ProfessionalProfilePhoto savedEntity = new ProfessionalProfilePhoto(
                proUserA, validPngBytes, "image/png", "headshot.png", validPngBytes.length, 2, 2
        );
        savedEntity.setId(10L);
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(savedEntity));

        // Retrieve
        ResponseEntity<?> getRes = photoController.getPhoto(authA);
        assertEquals(HttpStatus.OK, getRes.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, getRes.getHeaders().getContentType());
        assertNotNull(getRes.getHeaders().getCacheControl());
        assertNotNull(getRes.getHeaders().getETag());
        assertArrayEquals(validPngBytes, (byte[]) getRes.getBody());
    }

    @Test
    @DisplayName("Professional can upload valid JPEG and retrieve image bytes with image/jpeg header")
    void testSuccessfulUploadAndRetrievalJpeg() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        MockMultipartFile file = new MockMultipartFile("file", "portrait.jpg", "image/jpeg", validJpegBytes);

        ResponseEntity<?> uploadRes = photoController.uploadPhoto(file, null, authA);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) uploadRes.getBody();
        assertEquals("image/jpeg", body.get("contentType"));

        ProfessionalProfilePhoto savedEntity = new ProfessionalProfilePhoto(
                proUserA, validJpegBytes, "image/jpeg", "portrait.jpg", validJpegBytes.length, 2, 2
        );
        savedEntity.setId(11L);
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(savedEntity));

        ResponseEntity<?> getRes = photoController.getPhoto(authA);
        assertEquals(HttpStatus.OK, getRes.getStatusCode());
        assertEquals(MediaType.IMAGE_JPEG, getRes.getHeaders().getContentType());
        assertArrayEquals(validJpegBytes, (byte[]) getRes.getBody());
    }

    @Test
    @DisplayName("Professional can upload valid WebP and retrieve image bytes with image/webp header")
    void testSuccessfulUploadAndRetrievalWebp() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        MockMultipartFile file = new MockMultipartFile("file", "photo.webp", "image/webp", validWebpBytes);

        ResponseEntity<?> uploadRes = photoController.uploadPhoto(file, null, authA);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) uploadRes.getBody();
        assertEquals("image/webp", body.get("contentType"));

        ProfessionalProfilePhoto savedEntity = new ProfessionalProfilePhoto(
                proUserA, validWebpBytes, "image/webp", "photo.webp", validWebpBytes.length, 2, 2
        );
        savedEntity.setId(12L);
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(savedEntity));

        ResponseEntity<?> getRes = photoController.getPhoto(authA);
        assertEquals(HttpStatus.OK, getRes.getStatusCode());
        assertEquals("image/webp", getRes.getHeaders().getContentType().toString());
        assertArrayEquals(validWebpBytes, (byte[]) getRes.getBody());
    }

    // =========================================================================
    // 3. REPLACEMENT, REMOVAL, AND ABSENCE BEHAVIOR
    // =========================================================================

    @Test
    @DisplayName("Updating the picture replaces the prior picture for the same account without orphaned records")
    void testUpdatingPhotoReplacesPrior() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");

        ProfessionalProfilePhoto existingRecord = new ProfessionalProfilePhoto(
                proUserA, validPngBytes, "image/png", "old.png", validPngBytes.length, 2, 2
        );
        existingRecord.setId(1L);
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(existingRecord));

        MockMultipartFile newFile = new MockMultipartFile("file", "new.jpg", "image/jpeg", validJpegBytes);
        ResponseEntity<?> response = photoController.uploadPhoto(newFile, null, authA);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("image/jpeg", existingRecord.getContentType());
        assertEquals("new.jpg", existingRecord.getFileName());
        assertArrayEquals(validJpegBytes, existingRecord.getPhotoData());
        verify(photoRepository, times(1)).save(existingRecord);
    }

    @Test
    @DisplayName("Removing picture clears persistence and MarketplaceUser.profilePhotoUrl pointer")
    void testRemovePhotoSuccess() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        proUserA.setProfilePhotoUrl("/api/professional/profile/photo");

        ProfessionalProfilePhoto existingRecord = new ProfessionalProfilePhoto(
                proUserA, validPngBytes, "image/png", "photo.png", validPngBytes.length, 2, 2
        );
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(existingRecord));

        ResponseEntity<?> delRes = photoController.removePhoto(authA);
        assertEquals(HttpStatus.OK, delRes.getStatusCode());

        verify(photoRepository).delete(existingRecord);
        assertNull(proUserA.getProfilePhotoUrl());
    }

    @Test
    @DisplayName("Retrieval when no picture exists returns deliberate 404 NOT FOUND rather than fake placeholder")
    void testRetrieveWhenNoPhotoExistsReturns404() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.empty());

        ResponseEntity<?> getRes = photoController.getPhoto(authA);
        assertEquals(HttpStatus.NOT_FOUND, getRes.getStatusCode());
        assertTrue(getRes.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) getRes.getBody();
        assertEquals("No profile picture found.", body.get("error"));
    }

    // =========================================================================
    // 4. IDOR PROTECTION & STRICT ISOLATION BETWEEN PROFESSIONALS
    // =========================================================================

    @Test
    @DisplayName("IDOR Protection: Professional A and Professional B have strictly isolated picture storage and retrieval")
    void testStrictIsolationBetweenProfessionals() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        Authentication authB = createMockAuth("proB@buildbid.com", "ROLE_PROFESSIONAL");

        ProfessionalProfilePhoto photoA = new ProfessionalProfilePhoto(
                proUserA, validPngBytes, "image/png", "alpha.png", validPngBytes.length, 2, 2
        );
        photoA.setId(101L);

        ProfessionalProfilePhoto photoB = new ProfessionalProfilePhoto(
                proUserB, validJpegBytes, "image/jpeg", "beta.jpg", validJpegBytes.length, 2, 2
        );
        photoB.setId(102L);

        when(photoRepository.findByUser(proUserA)).thenReturn(Optional.of(photoA));
        when(photoRepository.findByUser(proUserB)).thenReturn(Optional.of(photoB));

        // Professional A gets photo A
        ResponseEntity<?> resA = photoController.getPhoto(authA);
        assertEquals(HttpStatus.OK, resA.getStatusCode());
        assertArrayEquals(validPngBytes, (byte[]) resA.getBody());

        // Professional B gets photo B
        ResponseEntity<?> resB = photoController.getPhoto(authB);
        assertEquals(HttpStatus.OK, resB.getStatusCode());
        assertArrayEquals(validJpegBytes, (byte[]) resB.getBody());

        // Neither can affect the other
        assertNotEquals(photoA.getUser().getId(), photoB.getUser().getId());
        assertNotEquals(resA.getHeaders().getContentType(), resB.getHeaders().getContentType());
    }

    @Test
    @DisplayName("Submitted user ID, email, or role in request body or parameters are strictly ignored")
    void testSubmittedUserIdentifiersIgnored() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");

        // Attempting to inject proB's details in JSON payload
        Map<String, String> spoofedJson = new HashMap<>();
        spoofedJson.put("userId", "302"); // target proB!
        spoofedJson.put("email", "proB@buildbid.com");
        spoofedJson.put("photo", "data:image/png;base64," + Base64.getEncoder().encodeToString(validPngBytes));

        ResponseEntity<?> response = photoController.uploadPhoto(null, spoofedJson, authA);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Verified: The updated user is proA, NOT proB!
        assertEquals("/api/professional/profile/photo", proUserA.getProfilePhotoUrl());
        assertNull(proUserB.getProfilePhotoUrl());
    }

    // =========================================================================
    // 5. FILE VALIDATION & SECURITY DEFENSES
    // =========================================================================

    @Test
    @DisplayName("Empty file (0 bytes) is rejected with 400 BAD REQUEST")
    void testRejectsEmptyFile() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        ResponseEntity<?> response = photoController.uploadPhoto(emptyFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Oversized file (> 5MB) is rejected with 400 BAD REQUEST")
    void testRejectsOversizedFile() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");

        byte[] bigBytes = new byte[5 * 1024 * 1024 + 10]; // 5MB + 10 bytes
        // prefix with valid png signature
        System.arraycopy(validPngBytes, 0, bigBytes, 0, validPngBytes.length);

        MockMultipartFile bigFile = new MockMultipartFile("file", "oversized.png", "image/png", bigBytes);
        ResponseEntity<?> response = photoController.uploadPhoto(bigFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("5MB"));
    }

    @Test
    @DisplayName("SVG format is strictly rejected to prevent XSS and active XML injection")
    void testRejectsSvgFormat() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        String svgContent = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>";
        MockMultipartFile svgFile = new MockMultipartFile("file", "logo.svg", "image/svg+xml", svgContent.getBytes(StandardCharsets.UTF_8));

        ResponseEntity<?> response = photoController.uploadPhoto(svgFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Spoofed MIME type (HTML/Text renamed as .jpg with image/jpeg header) is rejected by byte sniffing")
    void testRejectsSpoofedMimeType() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        String fakeJpgContent = "<html><body><h1>Not an image!</h1></body></html>";
        MockMultipartFile spoofedFile = new MockMultipartFile("file", "spoofed.jpg", "image/jpeg", fakeJpgContent.getBytes(StandardCharsets.UTF_8));

        ResponseEntity<?> response = photoController.uploadPhoto(spoofedFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Active scripting tags embedded in file header are rejected")
    void testRejectsScriptInjection() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        String polyglot = "<script>alert('xss')</script>";
        MockMultipartFile badFile = new MockMultipartFile("file", "exploit.png", "image/png", polyglot.getBytes(StandardCharsets.UTF_8));

        ResponseEntity<?> response = photoController.uploadPhoto(badFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Corrupt or malformed image content is rejected")
    void testRejectsCorruptImageData() {
        Authentication authA = createMockAuth("proA@buildbid.com", "ROLE_PROFESSIONAL");
        // Starts with PNG magic bytes but followed by truncated garbage
        byte[] corruptBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02, 0x03};
        MockMultipartFile corruptFile = new MockMultipartFile("file", "corrupt.png", "image/png", corruptBytes);

        ResponseEntity<?> response = photoController.uploadPhoto(corruptFile, null, authA);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Path traversal sequences in filename are safely sanitized")
    void testSanitizesPathTraversalInFilename() {
        String sanitized1 = photoService.sanitizeFileName("../../etc/passwd");
        assertFalse(sanitized1.contains("/"));
        assertFalse(sanitized1.contains(".."));
        assertEquals("passwd", sanitized1);

        String sanitized2 = photoService.sanitizeFileName("C:\\Windows\\System32\\cmd.exe");
        assertFalse(sanitized2.contains("\\"));
        assertFalse(sanitized2.contains(":"));
        assertEquals("cmd.exe", sanitized2);
    }
}
