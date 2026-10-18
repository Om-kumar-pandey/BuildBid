package com.marketplace.backend;

/**
 * Status of an asynchronous email delivery task in the transactional outbox.
 */
public enum OutboxStatus {
    /** Event is queued for initial delivery or scheduled for retry. */
    QUEUED,

    /** Event is currently leased and being processed by a worker. */
    PROCESSING,

    /** Email has been successfully accepted by the provider and cleared. */
    SENT,

    /** Terminal failure after reaching max retry attempts or permanent rejection. */
    FAILED_PERMANENT,

    /** Cancelled because a newer OTP request superseded this one, or the OTP was already verified. */
    SUPERSEDED,

    /** Cancelled because the underlying OTP expired before delivery took place. */
    EXPIRED
}
