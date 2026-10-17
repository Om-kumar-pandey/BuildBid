package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Optional;

/**
 * Service managing profile photo validation, persistence, retrieval, and removal
 * for authenticated Professional accounts.
 */
@Service
public class ProfessionalProfilePhotoService {

    public static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    public static final int MAX_DIMENSION_PX = 8192;
    public static final long MAX_TOTAL_PIXELS = 40_000_000L; // 40 MP

    private final ProfessionalProfilePhotoRepository photoRepository;
    private final MarketplaceBackendApplication.UserRepository userRepository;

    public record ImageValidationResult(
            String contentType,
            int width,
            int height
    ) {}

    public record Dimension(int width, int height) {}

    @Autowired
    public ProfessionalProfilePhotoService(
            ProfessionalProfilePhotoRepository photoRepository,
            MarketplaceBackendApplication.UserRepository userRepository
    ) {
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves the saved photo entity for the given user, if any.
     */
    @Transactional(readOnly = true)
    public Optional<ProfessionalProfilePhoto> getPhotoByUser(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            return Optional.empty();
        }
        return photoRepository.findByUser(user);
    }

    /**
     * Validates image binary data, saves or updates the photo record,
     * and updates the user's profilePhotoUrl pointer.
     */
    @Transactional
    public ProfessionalProfilePhoto uploadOrUpdatePhoto(
            MarketplaceBackendApplication.MarketplaceUser user,
            byte[] rawBytes,
            String clientFileName
    ) {
        if (user == null) {
            throw new IllegalArgumentException("Authenticated user cannot be null.");
        }

        ImageValidationResult validation = validateImageBytes(rawBytes);
        String safeFileName = sanitizeFileName(clientFileName);

        ProfessionalProfilePhoto photo = photoRepository.findByUser(user)
                .orElseGet(() -> {
                    ProfessionalProfilePhoto newPhoto = new ProfessionalProfilePhoto();
                    newPhoto.setUser(user);
                    return newPhoto;
                });

        photo.setPhotoData(rawBytes);
        photo.setContentType(validation.contentType());
        photo.setFileName(safeFileName);
        photo.setFileSize(rawBytes.length);
        photo.setWidth(validation.width());
        photo.setHeight(validation.height());

        ProfessionalProfilePhoto saved = photoRepository.save(photo);

        // Synchronize canonical retrieval endpoint URL on MarketplaceUser
        user.setProfilePhotoUrl("/api/professional/profile/photo");
        userRepository.save(user);

        return saved;
    }

    /**
     * Removes the photo record and clears user.profilePhotoUrl.
     */
    @Transactional
    public boolean deletePhoto(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null) {
            return false;
        }

        Optional<ProfessionalProfilePhoto> existing = photoRepository.findByUser(user);
        boolean existed = existing.isPresent();
        if (existed) {
            photoRepository.delete(existing.get());
        }

        if (user.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(null);
            userRepository.save(user);
        }

        return existed;
    }

    /**
     * Validates image content, enforces format whitelist (JPEG, PNG, WebP),
     * checks dimensions and safeguards against decompression bombs and script injection.
     */
    public ImageValidationResult validateImageBytes(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Image file cannot be empty.");
        }

        if (bytes.length > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Image size exceeds maximum allowed limit (5MB).");
        }

        // Active script / tag injection safeguard
        scanForDisallowedScriptContent(bytes);

        // Magic byte validation & format determination
        String detectedFormat = detectFormatFromMagicBytes(bytes);
        if (detectedFormat == null) {
            throw new IllegalArgumentException("Unsupported image format. Only JPEG, PNG, and WebP are allowed.");
        }

        int width;
        int height;

        if ("image/webp".equals(detectedFormat)) {
            Dimension dim = parseWebPDimensions(bytes);
            width = dim.width();
            height = dim.height();
        } else {
            // JPEG or PNG via ImageIO
            try {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
                if (image == null) {
                    throw new IllegalArgumentException("Malformed or corrupt image content.");
                }
                width = image.getWidth();
                height = image.getHeight();
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to decode image: " + e.getMessage());
            }
        }

        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Image dimensions must be positive integers.");
        }

        if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            throw new IllegalArgumentException("Image dimensions exceed maximum allowed limit (" + MAX_DIMENSION_PX + "x" + MAX_DIMENSION_PX + ").");
        }

        if ((long) width * height > MAX_TOTAL_PIXELS) {
            throw new IllegalArgumentException("Image resolution exceeds maximum allowable pixel count (40MP).");
        }

        return new ImageValidationResult(detectedFormat, width, height);
    }

    /**
     * Inspects magic bytes (file signature) to detect format.
     * Returns MIME type string if valid JPEG, PNG, or WebP; otherwise null.
     */
    public String detectFormatFromMagicBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return null;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8 &&
                (bytes[0] & 0xFF) == 0x89 &&
                bytes[1] == 0x50 && // 'P'
                bytes[2] == 0x4E && // 'N'
                bytes[3] == 0x47 && // 'G'
                bytes[4] == 0x0D && // '\r'
                bytes[5] == 0x0A && // '\n'
                bytes[6] == 0x1A &&
                bytes[7] == 0x0A) {
            return "image/png";
        }

        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF &&
                (bytes[1] & 0xFF) == 0xD8 &&
                (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        // WebP: RIFF .... WEBP
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
                bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }

        return null;
    }

    /**
     * Parses width and height from standard WebP container chunks (VP8, VP8L, VP8X).
     */
    public Dimension parseWebPDimensions(byte[] data) {
        if (data.length < 30) {
            throw new IllegalArgumentException("WebP data stream is too short.");
        }

        if (data[0] != 'R' || data[1] != 'I' || data[2] != 'F' || data[3] != 'F' ||
                data[8] != 'W' || data[9] != 'E' || data[10] != 'B' || data[11] != 'P') {
            throw new IllegalArgumentException("Invalid WebP container header.");
        }

        String chunkType = new String(data, 12, 4, StandardCharsets.US_ASCII);

        if ("VP8 ".equals(chunkType)) {
            // Lossy VP8 frame
            if (data.length < 30) {
                throw new IllegalArgumentException("Truncated VP8 bitstream.");
            }
            // Keyframe sync code at 23..25: 0x9D 0x01 0x2A
            if ((data[23] & 0xFF) != 0x9D || (data[24] & 0xFF) != 0x01 || (data[25] & 0xFF) != 0x2A) {
                throw new IllegalArgumentException("Invalid VP8 keyframe sync code.");
            }
            int width = (data[26] & 0xFF) | ((data[27] & 0x3F) << 8);
            int height = (data[28] & 0xFF) | ((data[29] & 0x3F) << 8);
            return new Dimension(width, height);
        } else if ("VP8L".equals(chunkType)) {
            // Lossless VP8L frame
            if (data.length < 25) {
                throw new IllegalArgumentException("Truncated VP8L bitstream.");
            }
            if ((data[20] & 0xFF) != 0x2F) {
                throw new IllegalArgumentException("Invalid VP8L signature byte.");
            }
            int b0 = data[21] & 0xFF;
            int b1 = data[22] & 0xFF;
            int b2 = data[23] & 0xFF;
            int b3 = data[24] & 0xFF;
            int width = 1 + (((b1 & 0x3F) << 8) | b0);
            int height = 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
            return new Dimension(width, height);
        } else if ("VP8X".equals(chunkType)) {
            // Extended VP8X frame
            if (data.length < 30) {
                throw new IllegalArgumentException("Truncated VP8X bitstream.");
            }
            int width = 1 + ((data[24] & 0xFF) | ((data[25] & 0xFF) << 8) | ((data[26] & 0xFF) << 16));
            int height = 1 + ((data[27] & 0xFF) | ((data[28] & 0xFF) << 8) | ((data[29] & 0xFF) << 16));
            return new Dimension(width, height);
        } else {
            throw new IllegalArgumentException("Unsupported or corrupt WebP chunk: " + chunkType);
        }
    }

    /**
     * Scans byte content for active HTML/script/SVG payloads.
     */
    private void scanForDisallowedScriptContent(byte[] bytes) {
        int scanLength = Math.min(bytes.length, 8192);
        String headerContent = new String(bytes, 0, scanLength, StandardCharsets.ISO_8859_1).toLowerCase(Locale.ROOT);

        if (headerContent.contains("<script") ||
                headerContent.contains("javascript:") ||
                headerContent.contains("<svg") ||
                headerContent.contains("onload=") ||
                headerContent.contains("onerror=") ||
                headerContent.contains("<?xml") ||
                headerContent.contains("<!doctype html")) {
            throw new IllegalArgumentException("File contains disallowed active content or scripting.");
        }
    }

    /**
     * Sanitizes client-provided filename to prevent path traversal and unsafe character injection.
     */
    public String sanitizeFileName(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "profile-photo";
        }
        String fileNameOnly = Paths.get(originalFilename).getFileName().toString();
        String cleaned = fileNameOnly.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (cleaned.length() > 100) {
            cleaned = cleaned.substring(0, 100);
        }
        return cleaned.isBlank() ? "profile-photo" : cleaned;
    }
}
