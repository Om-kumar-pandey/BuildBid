package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVerificationRepository extends JpaRepository<UserVerification, Long> {

    List<UserVerification> findByUserIdAndVerificationTypeAndUsedFalse(
            Long userId,
            UserVerification.VerificationType verificationType
    );

    Optional<UserVerification> findTopByUserIdAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
            Long userId,
            UserVerification.VerificationType verificationType
    );

    Optional<UserVerification> findTopByTargetValueAndVerificationTypeAndUsedFalseOrderByCreatedAtDesc(
            String targetValue,
            UserVerification.VerificationType verificationType
    );

    List<UserVerification> findByTargetValueAndVerificationTypeAndUsedFalse(
            String targetValue,
            UserVerification.VerificationType verificationType
    );

    void deleteByUserId(Long userId);

    void deleteByUserIdAndVerificationType(Long userId, UserVerification.VerificationType verificationType);
}
