package com.marketplace.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    List<UserVerification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<UserVerification> findByUserIdAndVerificationTypeOrderByCreatedAtAsc(
            Long userId,
            UserVerification.VerificationType verificationType
    );

    List<UserVerification> findByUserIdAndVerificationTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
            Long userId,
            UserVerification.VerificationType verificationType,
            LocalDateTime cutoff
    );

    void deleteByUserId(Long userId);

    void deleteByUserIdAndVerificationType(Long userId, UserVerification.VerificationType verificationType);
}
