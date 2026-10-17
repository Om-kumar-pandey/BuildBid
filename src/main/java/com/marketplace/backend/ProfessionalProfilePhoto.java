package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity representing persistent profile photo storage for authenticated professionals.
 * Stores validated image binary data (BLOB) alongside content metadata.
 */
@Entity
@Table(name = "professional_profile_photos")
public class ProfessionalProfilePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser user;

    @Lob
    @Column(name = "photo_data", columnDefinition = "LONGBLOB")
    private byte[] photoData;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ProfessionalProfilePhoto() {}

    public ProfessionalProfilePhoto(
            MarketplaceBackendApplication.MarketplaceUser user,
            byte[] photoData,
            String contentType,
            String fileName,
            long fileSize,
            Integer width,
            Integer height
    ) {
        this.user = user;
        this.photoData = photoData;
        this.contentType = contentType;
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.width = width;
        this.height = height;
    }

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MarketplaceBackendApplication.MarketplaceUser getUser() {
        return user;
    }

    public void setUser(MarketplaceBackendApplication.MarketplaceUser user) {
        this.user = user;
    }

    public byte[] getPhotoData() {
        return photoData;
    }

    public void setPhotoData(byte[] photoData) {
        this.photoData = photoData;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
