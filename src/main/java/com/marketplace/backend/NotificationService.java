package com.marketplace.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public Notification createNotification(
            MarketplaceBackendApplication.MarketplaceUser recipient,
            String title,
            String titleHi,
            String message,
            String messageHi,
            String type,
            String referenceId
    ) {
        if (recipient == null) return null;

        Notification notif = new Notification();
        notif.setRecipient(recipient);
        notif.setTitle(title != null ? title : "Notification");
        notif.setTitleHi(titleHi != null ? titleHi : "सूचना");
        notif.setMessage(message != null ? message : "");
        notif.setMessageHi(messageHi != null ? messageHi : "");
        notif.setNotificationType(type != null ? type : "GENERAL");
        notif.setReferenceId(referenceId);
        notif.setIsRead(false);
        notif.setCreatedAt(LocalDateTime.now());

        return notificationRepository.save(notif);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUserNotifications(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getId() == null) return Collections.emptyList();
        List<Notification> list = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Notification n : list) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", n.getId());
            map.put("title", n.getTitle());
            map.put("titleHi", n.getTitleHi());
            map.put("message", n.getMessage());
            map.put("messageHi", n.getMessageHi());
            map.put("type", n.getNotificationType());
            map.put("referenceId", n.getReferenceId());
            map.put("isRead", n.getIsRead());
            map.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
            result.add(map);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getId() == null) return 0;
        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public boolean markAsRead(Long id, MarketplaceBackendApplication.MarketplaceUser user) {
        if (id == null || user == null) {
            throw new IllegalArgumentException("Notification id and user are required");
        }
        Optional<Notification> opt = notificationRepository.findById(id);
        if (opt.isEmpty()) {
            throw new NoSuchElementException("Notification not found");
        }
        Notification n = opt.get();
        if (n.getRecipient() == null || !n.getRecipient().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: You do not have permission to modify this notification");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
        return true;
    }

    @Transactional
    public void markAllAsRead(MarketplaceBackendApplication.MarketplaceUser user) {
        if (user == null || user.getId() == null) return;
        notificationRepository.markAllAsReadForUser(user.getId());
    }
}
