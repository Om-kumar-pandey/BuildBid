package com.marketplace.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

public class DeliveryDateValidatorTest {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    @Test
    @DisplayName("1. Valid future date in canonical text format 'dd MMM uuuu' is accepted and normalized")
    public void testValidFutureDateText() {
        String input = "28 Oct 2026";
        String normalized = DeliveryDateValidator.validateAndNormalize(input);
        assertEquals("28 Oct 2026", normalized);
    }

    @Test
    @DisplayName("1b. Valid future date in slash format 'DD/MM/YYYY' is accepted and normalized to canonical format")
    public void testValidFutureDateSlash() {
        String input = "28/10/2026";
        String normalized = DeliveryDateValidator.validateAndNormalize(input);
        assertEquals("28 Oct 2026", normalized);
    }

    @Test
    @DisplayName("2. Valid current date (today in Asia/Kolkata) is accepted")
    public void testTodayDateAccepted() {
        LocalDate today = LocalDate.now(IST);
        String textToday = today.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));
        String normalized = DeliveryDateValidator.validateAndNormalize(textToday);
        assertEquals(textToday, normalized);

        String slashToday = String.format(Locale.ROOT, "%02d/%02d/%04d", today.getDayOfMonth(), today.getMonthValue(), today.getYear());
        String normalizedFromSlash = DeliveryDateValidator.validateAndNormalize(slashToday);
        assertEquals(textToday, normalizedFromSlash);
    }

    @Test
    @DisplayName("3. Impossible calendar dates (e.g. 31/02/2026, 29/02 in non-leap year, 31/04) are rejected")
    public void testImpossibleCalendarDatesRejected() {
        // 31st of February
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("31/02/2026"));
        assertTrue(ex1.getMessage().contains("Invalid expected delivery date"));

        IllegalArgumentException ex1Text = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("31 Feb 2026"));
        assertTrue(ex1Text.getMessage().contains("Invalid expected delivery date"));

        // 29th of February in non-leap year 2025
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("29/02/2025"));
        assertTrue(ex2.getMessage().contains("Invalid expected delivery date"));

        // 31st of April (April has 30 days)
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("31/04/2026"));
        assertTrue(ex3.getMessage().contains("Invalid expected delivery date"));
    }

    @Test
    @DisplayName("4. Malformed and arbitrary non-date strings (e.g. 2026-13-45, not-a-valid-date) are rejected")
    public void testMalformedStringsRejected() {
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("not-a-valid-date"));
        assertTrue(ex1.getMessage().contains("Invalid expected delivery date"));

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("2026-13-45"));
        assertTrue(ex2.getMessage().contains("Invalid expected delivery date"));

        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("99/99/9999"));
        assertTrue(ex3.getMessage().contains("Invalid expected delivery date"));
    }

    @Test
    @DisplayName("5. Blank or null dates are rejected")
    public void testBlankDatesRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize(""));
        assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("   "));
        assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize(null));
    }

    @Test
    @DisplayName("6. Past dates in Asia/Kolkata timezone are rejected")
    public void testPastDatesRejectedInIST() {
        LocalDate yesterday = LocalDate.now(IST).minusDays(1);
        String textYesterday = yesterday.format(DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH));
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize(textYesterday));
        assertTrue(ex1.getMessage().contains("cannot be in the past"));

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("10/10/2020"));
        assertTrue(ex2.getMessage().contains("cannot be in the past"));

        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class,
                () -> DeliveryDateValidator.validateAndNormalize("10 Oct 2020"));
        assertTrue(ex3.getMessage().contains("cannot be in the past"));
    }

    @Test
    @DisplayName("10. Saved dates retain their calendar day when formatted to display format")
    public void testCalendarDayPreserved() {
        LocalDate date = DeliveryDateValidator.validateAndParse("28 Oct 2026");
        assertEquals(28, date.getDayOfMonth());
        assertEquals(10, date.getMonthValue());
        assertEquals(2026, date.getYear());

        String display = DeliveryDateValidator.toDisplayFormat(date);
        assertEquals("28/10/2026", display);
    }
}
