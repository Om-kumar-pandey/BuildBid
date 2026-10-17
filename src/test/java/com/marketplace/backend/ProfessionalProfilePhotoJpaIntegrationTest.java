package com.marketplace.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-end relational database integration test verifying schema creation,
 * BLOB persistence, transaction boundaries, and isolation in H2 MySQL-mode database.
 */
@SpringBootTest
@TestPropertySource(locations = "classpath:application.properties")
public class ProfessionalProfilePhotoJpaIntegrationTest {

    @Autowired
    private ProfessionalProfilePhotoRepository photoRepository;

    @Autowired
    private MarketplaceBackendApplication.UserRepository userRepository;

    @Autowired
    private ProfessionalProfilePhotoService photoService;

    private byte[] createSamplePng() throws Exception {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }

    private byte[] createSampleJpeg() throws Exception {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", baos);
        return baos.toByteArray();
    }

    @Test
    @Transactional
    @DisplayName("Relational DB: Professional Profile Photo full CRUD and BLOB persistence lifecycle")
    void testFullPersistenceLifecycleInDatabase() throws Exception {
        byte[] pngBytes = createSamplePng();
        byte[] jpegBytes = createSampleJpeg();

        // 1. Create and save a professional user in live DB
        MarketplaceBackendApplication.MarketplaceUser pro = new MarketplaceBackendApplication.MarketplaceUser();
        pro.setName("Test Live Pro");
        pro.setEmail("livepro" + System.currentTimeMillis() + "@test.com");
        pro.setUsername("livepro_" + System.currentTimeMillis());
        pro.setPasswordHash("hashed_secret_123");
        pro.setRoles(new HashSet<>(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL)));
        pro.setEnabled(true);
        MarketplaceBackendApplication.MarketplaceUser savedUser = userRepository.save(pro);
        assertNotNull(savedUser.getId());

        // 2. Upload initial PNG
        ProfessionalProfilePhoto savedPhoto = photoService.uploadOrUpdatePhoto(savedUser, pngBytes, "avatar.png");
        assertNotNull(savedPhoto.getId());
        assertEquals("image/png", savedPhoto.getContentType());
        assertEquals(pngBytes.length, savedPhoto.getFileSize());
        assertEquals("/api/professional/profile/photo", savedUser.getProfilePhotoUrl());

        // 3. Retrieve from database
        Optional<ProfessionalProfilePhoto> foundOpt = photoRepository.findByUser(savedUser);
        assertTrue(foundOpt.isPresent());
        ProfessionalProfilePhoto found = foundOpt.get();
        assertEquals(savedPhoto.getId(), found.getId());
        assertArrayEquals(pngBytes, found.getPhotoData());
        assertEquals(4, found.getWidth());
        assertEquals(4, found.getHeight());

        // 4. Update with JPEG (verify replacement, not duplication)
        ProfessionalProfilePhoto updatedPhoto = photoService.uploadOrUpdatePhoto(savedUser, jpegBytes, "new_photo.jpg");
        assertEquals(savedPhoto.getId(), updatedPhoto.getId(), "Should update existing record without creating orphan rows");
        assertEquals("image/jpeg", updatedPhoto.getContentType());
        assertArrayEquals(jpegBytes, updatedPhoto.getPhotoData());

        // 5. Delete photo
        boolean deleted = photoService.deletePhoto(savedUser);
        assertTrue(deleted);
        assertTrue(photoRepository.findByUser(savedUser).isEmpty());
        assertNull(savedUser.getProfilePhotoUrl());
    }

    @Test
    @Transactional
    @DisplayName("Relational DB: Two distinct professionals have strictly isolated photo records in database")
    void testDatabaseIsolationBetweenMultipleProfessionals() throws Exception {
        byte[] pngBytes = createSamplePng();
        byte[] jpegBytes = createSampleJpeg();

        long ts = System.currentTimeMillis();

        MarketplaceBackendApplication.MarketplaceUser pro1 = new MarketplaceBackendApplication.MarketplaceUser();
        pro1.setName("Pro Alpha Live");
        pro1.setEmail("pro_alpha_" + ts + "@test.com");
        pro1.setUsername("alpha_" + ts);
        pro1.setPasswordHash("hash123");
        pro1.setRoles(new HashSet<>(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL)));
        MarketplaceBackendApplication.MarketplaceUser savedPro1 = userRepository.save(pro1);

        MarketplaceBackendApplication.MarketplaceUser pro2 = new MarketplaceBackendApplication.MarketplaceUser();
        pro2.setName("Pro Beta Live");
        pro2.setEmail("pro_beta_" + ts + "@test.com");
        pro2.setUsername("beta_" + ts);
        pro2.setPasswordHash("hash456");
        pro2.setRoles(new HashSet<>(Set.of(MarketplaceBackendApplication.Role.PROFESSIONAL)));
        MarketplaceBackendApplication.MarketplaceUser savedPro2 = userRepository.save(pro2);

        ProfessionalProfilePhoto photo1 = photoService.uploadOrUpdatePhoto(savedPro1, pngBytes, "alpha.png");
        ProfessionalProfilePhoto photo2 = photoService.uploadOrUpdatePhoto(savedPro2, jpegBytes, "beta.jpg");

        assertNotEquals(photo1.getId(), photo2.getId());
        assertEquals("image/png", photoRepository.findByUser(savedPro1).get().getContentType());
        assertEquals("image/jpeg", photoRepository.findByUser(savedPro2).get().getContentType());
        assertArrayEquals(pngBytes, photoRepository.findByUser(savedPro1).get().getPhotoData());
        assertArrayEquals(jpegBytes, photoRepository.findByUser(savedPro2).get().getPhotoData());
    }
}
