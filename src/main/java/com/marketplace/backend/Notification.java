package com.marketplace.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * BUILDBID - NOTIFICATION ENTITY
 * 
 * Supports secure, scoped bilingual notifications for buyers and suppliers:
 * - Order Selected / सामग्री ऑर्डर चुना गया
 * - Order Accepted / ऑर्डर स्वीकार किया गया
 * - Status Updates / स्थिति अपडेट
 * - Delivery Date Updates / डिलीवरी की तारीख अपडेट
 */
@Entity
@Table(name = "notifications")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @JsonIgnore
    private MarketplaceBackendApplication.MarketplaceUser recipient;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "title_hi", length = 200)
    private String titleHi;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "message_hi", columnDefinition = "TEXT")
    private String messageHi;

    @Column(name = "notification_type", nullable = false, length = 50)
    private String notificationType; // ORDER_SELECTED, ORDER_ACCEPTED, STATUS_UPDATE, DELIVERY_DATE, DIRECT_BUY

    @Column(name = "reference_id", length = 100)
    private String referenceId; // orderCode or requestId

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Notification() {}

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isRead == null) {
            this.isRead = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MarketplaceBackendApplication.MarketplaceUser getRecipient() {
        return recipient;
    }

    public void setRecipient(MarketplaceBackendApplication.MarketplaceUser recipient) {
        this.recipient = recipient;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTitleHi() {
        return titleHi;
    }

    public void setTitleHi(String titleHi) {
        this.titleHi = titleHi;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getMessageHi() {
        return messageHi;
    }

    public void setMessageHi(String messageHi) {
        this.messageHi = messageHi;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
