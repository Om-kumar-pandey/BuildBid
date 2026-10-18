package com.marketplace.backend;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByMaterialOrderId(Long materialOrderId);

    Optional<Delivery> findByTrackingNumber(String trackingNumber);

    boolean existsByMaterialOrderId(Long materialOrderId);

    boolean existsByTrackingNumber(String trackingNumber);

    @Query("SELECT d FROM Delivery d JOIN FETCH d.materialOrder mo WHERE mo.seller.id = :sellerId ORDER BY d.createdAt DESC")
    List<Delivery> findBySellerId(@Param("sellerId") Long sellerId);

    @Query("SELECT d FROM Delivery d JOIN FETCH d.materialOrder mo WHERE mo.buyer.id = :buyerId ORDER BY d.createdAt DESC")
    List<Delivery> findByBuyerId(@Param("buyerId") Long buyerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    Optional<Delivery> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Delivery d WHERE d.materialOrder.id = :orderId")
    Optional<Delivery> findByMaterialOrderIdForUpdate(@Param("orderId") Long orderId);

    @Query("SELECT MAX(d.id) FROM Delivery d")
    Long findMaxId();
}
