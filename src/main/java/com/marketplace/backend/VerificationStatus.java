package com.marketplace.backend;

/**
 * Verification status for Professional Services in BuildBid.
 * 
 * - NOT_REQUIRED: Basic trade / labour services where professional degree/license is not mandatory.
 * - PENDING: Credential-based services awaiting administrative verification.
 * - VERIFIED: Service credentials approved by BuildBid administration.
 * - REJECTED: Service credentials reviewed and rejected by BuildBid administration.
 */
public enum VerificationStatus {
    NOT_REQUIRED,
    PENDING,
    VERIFIED,
    REJECTED
}
