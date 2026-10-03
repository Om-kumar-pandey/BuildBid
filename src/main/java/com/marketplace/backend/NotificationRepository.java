package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    List<Notification> findByRecipientOrderByCreatedAtDesc(MarketplaceBackendApplication.MarketplaceUser recipient);
    long countByRecipientIdAndIsReadFalse(Long recipientId);
    long countByRecipientAndIsReadFalse(MarketplaceBackendApplication.MarketplaceUser recipient);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientId AND n.isRead = false")
    int markAllAsReadForUser(@Param("recipientId") Long recipientId);
}

