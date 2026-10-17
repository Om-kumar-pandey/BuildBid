package com.marketplace.backend;

/**
 * BUILDBID — PHASE 10: PROFESSIONAL ACCOUNT DEACTIVATION & DELETION
 * Safe event payload dispatched upon permanent account deletion.
 * Dispatched to trigger post-commit transactional event handling so that external email
 * transmission does not hold open or risk rolling back the committed database transaction.
 *
 * Security considerations:
 * - Contains only non-sensitive recipient email and name for delivery.
 * - Does not include passwords, OTPs, deletion tickets, or unnecessary personal data.
 */
public record ProfessionalPermanentDeletionCompletedEvent(
        String recipientEmail,
        String recipientName
) {}
