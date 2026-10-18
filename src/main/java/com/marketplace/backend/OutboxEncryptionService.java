package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import jakarta.annotation.PostConstruct;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BUILDBID OUTBOX ENCRYPTION SERVICE
 *
 * Implements AES-256-GCM authenticated encryption for sensitive OTP payloads persisted
 * in the transactional outbox table.
 *
 * Cryptographic Properties:
 * - Cipher: AES/GCM/NoPadding
 * - Key Size: 256 bits (32 bytes)
 * - Nonce: Fresh, cryptographically secure 12-byte (96-bit) IV generated per encryption
 * - Tag: 128-bit authentication tag protecting both ciphertext integrity and AAD
 * - AAD: Authenticated Additional Data binds ciphertext to event_id and user_id, preventing
 *   ciphertext substitution, re-attribution, or replay across records
 * - Storage: Base64-encoded [12-byte IV || ciphertext || 16-byte tag]
 * - Safety: Configuration validated at startup; production never falls back to an empty or default key.
 */
@Service
public class OutboxEncryptionService {

    private static final Logger log = LoggerFactory.getLogger(OutboxEncryptionService.class);

    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String KEY_ALGORITHM = "AES";
    private static final int GCM_IV_LENGTH_BYTES = 12; // 96 bits
    private static final int GCM_TAG_LENGTH_BITS = 128; // 16 bytes
    private static final int AES_KEY_BYTES = 32; // 256 bits

    private final SecureRandom secureRandom = new SecureRandom();
    private final Environment environment;
    private final String defaultKeyConfig;
    private final int activeKeyVersion;

    private final Map<Integer, SecretKey> keyRing = new ConcurrentHashMap<>();

    @Autowired
    public OutboxEncryptionService(
            Environment environment,
            @Value("${app.outbox.encryption-key:${APP_OUTBOX_ENCRYPTION_KEY:}}") String defaultKeyConfig,
            @Value("${app.outbox.active-key-version:1}") int activeKeyVersion
    ) {
        this.environment = environment;
        this.defaultKeyConfig = defaultKeyConfig;
        this.activeKeyVersion = activeKeyVersion;
    }

    // Direct constructor for programmatic/test usage
    public OutboxEncryptionService(String testKey, int activeKeyVersion) {
        this(null, testKey, activeKeyVersion);
        init();
    }

    @PostConstruct
    public void init() {
        boolean isProd = isProductionEnvironment();

        if (defaultKeyConfig == null || defaultKeyConfig.isBlank()) {
            if (isProd) {
                throw new IllegalStateException(
                        "FATAL: Outbox encryption key (app.outbox.encryption-key / APP_OUTBOX_ENCRYPTION_KEY) " +
                        "is required in production environment and cannot be empty.");
            } else {
                // Non-production fallback: generate a random in-memory 256-bit key for local development/testing
                byte[] ephemeralBytes = new byte[AES_KEY_BYTES];
                secureRandom.nextBytes(ephemeralBytes);
                SecretKey ephemeralKey = new SecretKeySpec(ephemeralBytes, KEY_ALGORITHM);
                keyRing.put(activeKeyVersion, ephemeralKey);
                log.warn("[OutboxEncryptionService] No outbox encryption key configured. " +
                         "Generated ephemeral in-memory 256-bit key for non-production environment (keyVersion={}).", activeKeyVersion);
                return;
            }
        }

        try {
            byte[] keyBytes = decodeKeyBytes(defaultKeyConfig);
            if (keyBytes.length != AES_KEY_BYTES) {
                throw new IllegalStateException(
                        "Outbox encryption key must decode to exactly 256 bits (32 bytes), but got " + keyBytes.length + " bytes.");
            }
            SecretKey secretKey = new SecretKeySpec(keyBytes, KEY_ALGORITHM);
            keyRing.put(activeKeyVersion, secretKey);
            log.info("[OutboxEncryptionService] Successfully initialized AES-256-GCM outbox encryption service (activeKeyVersion={}).", activeKeyVersion);
        } catch (Exception ex) {
            log.error("[OutboxEncryptionService] Failed to initialize encryption key: {}", ex.getMessage());
            throw new IllegalStateException("Failed to configure OutboxEncryptionService: " + ex.getMessage(), ex);
        }
    }

    public boolean isProductionEnvironment() {
        if (environment == null) {
            return false;
        }
        String[] profiles = environment.getActiveProfiles();
        for (String p : profiles) {
            if ("prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p)) {
                return true;
            }
        }
        String prop = System.getProperty("spring.profiles.active");
        if (prop != null && (prop.contains("prod") || prop.contains("production"))) {
            return true;
        }
        String envProfile = System.getenv("SPRING_PROFILES_ACTIVE");
        return envProfile != null && (envProfile.contains("prod") || envProfile.contains("production"));
    }

    /**
     * Supports registering additional historical key versions for key rotation lookup.
     */
    public void registerKeyVersion(int version, String keyString) {
        byte[] bytes = decodeKeyBytes(keyString);
        if (bytes.length != AES_KEY_BYTES) {
            throw new IllegalArgumentException("Key version " + version + " must be 256 bits (32 bytes).");
        }
        keyRing.put(version, new SecretKeySpec(bytes, KEY_ALGORITHM));
        log.info("[OutboxEncryptionService] Registered encryption key for version={}", version);
    }

    public int getActiveKeyVersion() {
        return activeKeyVersion;
    }

    public SecretKey getKeyForVersion(int version) {
        SecretKey key = keyRing.get(version);
        if (key == null) {
            throw new SecurityException("No encryption key found for version: " + version);
        }
        return key;
    }

    /**
     * Encrypts plaintext OTP using the active key version, binding ciphertext to eventId and userId.
     */
    public String encrypt(String plaintext, String eventId, Long userId) {
        return encrypt(plaintext, eventId, userId, activeKeyVersion);
    }

    /**
     * Encrypts plaintext payload using AES-256-GCM with a fresh 12-byte IV and AAD binding.
     */
    public String encrypt(String plaintext, String eventId, Long userId, int keyVersion) {
        if (plaintext == null || plaintext.isBlank()) {
            throw new IllegalArgumentException("Plaintext payload cannot be null or empty.");
        }
        if (eventId == null || eventId.isBlank() || userId == null) {
            throw new IllegalArgumentException("eventId and userId are required to bind ciphertext AAD.");
        }

        SecretKey key = getKeyForVersion(keyVersion);

        try {
            byte[] nonce = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(nonce);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce);
            cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec);

            byte[] aad = buildAad(eventId, userId);
            cipher.updateAAD(aad);

            byte[] ciphertextWithTag = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            ByteBuffer buffer = ByteBuffer.allocate(GCM_IV_LENGTH_BYTES + ciphertextWithTag.length);
            buffer.put(nonce);
            buffer.put(ciphertextWithTag);

            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            log.error("[OutboxEncryptionService] Encryption failure for eventId={}", eventId);
            throw new SecurityException("Failed to encrypt outbox payload.", e);
        }
    }

    /**
     * Decrypts ciphertext payload, authenticating against the provided eventId and userId.
     * Rejects tampered ciphertext, bad authentication tags, or mismatched AAD.
     */
    public String decrypt(String encryptedPayload, String eventId, Long userId, int keyVersion) {
        if (encryptedPayload == null || encryptedPayload.isBlank()) {
            throw new IllegalArgumentException("Encrypted payload cannot be null or empty.");
        }
        if (eventId == null || eventId.isBlank() || userId == null) {
            throw new IllegalArgumentException("eventId and userId are required to verify ciphertext AAD.");
        }

        SecretKey key = getKeyForVersion(keyVersion);

        try {
            byte[] combined;
            try {
                combined = Base64.getDecoder().decode(encryptedPayload.trim());
            } catch (IllegalArgumentException e) {
                throw new SecurityException("Malformed Base64 ciphertext payload.", e);
            }

            int minLength = GCM_IV_LENGTH_BYTES + (GCM_TAG_LENGTH_BITS / 8);
            if (combined.length < minLength) {
                throw new SecurityException("Ciphertext payload is truncated or invalid length.");
            }

            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] nonce = new byte[GCM_IV_LENGTH_BYTES];
            buffer.get(nonce);

            byte[] ciphertextWithTag = new byte[buffer.remaining()];
            buffer.get(ciphertextWithTag);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce);
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);

            byte[] aad = buildAad(eventId, userId);
            cipher.updateAAD(aad);

            byte[] decrypted = cipher.doFinal(ciphertextWithTag);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[OutboxEncryptionService] Decryption failed or authentication tag mismatch for eventId={}", eventId);
            throw new SecurityException("Ciphertext decryption or authentication failed: " + e.getMessage(), e);
        }
    }

    private byte[] buildAad(String eventId, Long userId) {
        return ("event:" + eventId.trim() + "|user:" + userId).getBytes(StandardCharsets.UTF_8);
    }

    public static byte[] decodeKeyBytes(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new IllegalArgumentException("Encryption key string cannot be empty.");
        }
        String clean = rawKey.trim();

        // 1. Hex format: 64 hex characters -> 32 bytes
        if (clean.length() == 64 && clean.matches("^[0-9a-fA-F]{64}$")) {
            byte[] bytes = new byte[32];
            for (int i = 0; i < 32; i++) {
                bytes[i] = (byte) Integer.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
            }
            return bytes;
        }

        // 2. Base64 format: 44 characters (with =) or 43 without
        try {
            byte[] b64 = Base64.getDecoder().decode(clean);
            if (b64.length == AES_KEY_BYTES) {
                return b64;
            }
        } catch (IllegalArgumentException ignored) {
        }

        // 3. Raw ASCII string of 32 characters
        byte[] rawBytes = clean.getBytes(StandardCharsets.UTF_8);
        if (rawBytes.length == AES_KEY_BYTES) {
            return rawBytes;
        }

        throw new IllegalArgumentException("Key must be 32 bytes (256 bits). Provided string has " + rawBytes.length + " bytes.");
    }
}
