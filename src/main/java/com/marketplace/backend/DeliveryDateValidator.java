package com.marketplace.backend;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.format.SignStyle;
import java.time.format.TextStyle;
import java.time.temporal.ChronoField;
import java.util.Locale;

/**
 * Strict validator and normalizer for Expected Delivery Dates in BuildBid.
 * Enforces:
 * 1. Explicit canonical formats: "dd MMM uuuu" (e.g. "28 Oct 2026", "08 Oct 2026") and "dd/MM/uuuu" (e.g. "28/10/2026")
 * 2. Strict calendar validity (rejects impossible dates like 31/02/2026, 29/02 in non-leap years, 31/04, etc.)
 * 3. Business timezone date bounds using Asia/Kolkata (rejects past dates)
 * 4. Non-blank values
 */
public final class DeliveryDateValidator {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Authoritative canonical storage and API display format: "dd MMM uuuu" (e.g. "28 Oct 2026")
     */
    public static final DateTimeFormatter CANONICAL_FORMATTER = new DateTimeFormatterBuilder()
            .appendValue(ChronoField.DAY_OF_MONTH, 2)
            .appendLiteral(' ')
            .appendText(ChronoField.MONTH_OF_YEAR, TextStyle.SHORT)
            .appendLiteral(' ')
            .appendValue(ChronoField.YEAR, 4)
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    /**
     * Strict parser for textual month format: "[d][dd] MMM uuuu" (e.g. "28 Oct 2026", "8 Oct 2026", "08 Oct 2026")
     */
    private static final DateTimeFormatter TEXT_MONTH_FORMATTER = new DateTimeFormatterBuilder()
            .parseCaseInsensitive()
            .appendValue(ChronoField.DAY_OF_MONTH, 1, 2, SignStyle.NOT_NEGATIVE)
            .appendLiteral(' ')
            .appendText(ChronoField.MONTH_OF_YEAR, TextStyle.SHORT)
            .appendLiteral(' ')
            .appendValue(ChronoField.YEAR, 4, 4, SignStyle.NOT_NEGATIVE)
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    /**
     * Strict parser for slash format: "[d][dd]/[M][MM]/uuuu" (e.g. "28/10/2026", "08/10/2026", "8/10/2026")
     */
    private static final DateTimeFormatter SLASH_FORMATTER = new DateTimeFormatterBuilder()
            .appendValue(ChronoField.DAY_OF_MONTH, 1, 2, SignStyle.NOT_NEGATIVE)
            .appendLiteral('/')
            .appendValue(ChronoField.MONTH_OF_YEAR, 1, 2, SignStyle.NOT_NEGATIVE)
            .appendLiteral('/')
            .appendValue(ChronoField.YEAR, 4, 4, SignStyle.NOT_NEGATIVE)
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    private DeliveryDateValidator() {}

    /**
     * Validates and normalizes raw delivery date into canonical "dd MMM uuuu" format.
     *
     * @param rawDate raw string from request
     * @return normalized canonical string (e.g. "28 Oct 2026")
     * @throws IllegalArgumentException on empty, invalid, impossible, or past date
     */
    public static String validateAndNormalize(String rawDate) {
        LocalDate parsed = validateAndParse(rawDate);
        return parsed.format(CANONICAL_FORMATTER);
    }

    /**
     * Parses and strictly validates delivery date against calendar rules and Asia/Kolkata business date.
     *
     * @param rawDate raw string from request
     * @return validated LocalDate
     * @throws IllegalArgumentException on empty, invalid, impossible, or past date
     */
    public static LocalDate validateAndParse(String rawDate) {
        if (rawDate == null || rawDate.trim().isEmpty()) {
            throw new IllegalArgumentException("Expected delivery date is required.");
        }

        String trimmed = rawDate.trim();
        LocalDate parsed = parseStrictDate(trimmed);

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        if (parsed.isBefore(today)) {
            throw new IllegalArgumentException("Expected delivery date cannot be in the past (" + BUSINESS_ZONE.getId() + ").");
        }

        return parsed;
    }

    /**
     * Performs strict parsing without timezone boundary check.
     */
    public static LocalDate parseStrictDate(String trimmed) {
        // 1. Try textual month format (e.g. "28 Oct 2026" / "08 Oct 2026")
        try {
            return LocalDate.parse(trimmed, TEXT_MONTH_FORMATTER);
        } catch (DateTimeParseException ignored) {}

        // 2. Try slash format (e.g. "28/10/2026" / "08/10/2026")
        try {
            return LocalDate.parse(trimmed, SLASH_FORMATTER);
        } catch (DateTimeParseException ignored) {}

        throw new IllegalArgumentException("Invalid expected delivery date '" + trimmed + "'. Accepted format is 'dd MMM yyyy' (e.g. 28 Oct 2026) or 'DD/MM/YYYY'.");
    }

    /**
     * Formats a LocalDate into UI display format "dd/MM/yyyy".
     */
    public static String toDisplayFormat(LocalDate date) {
        if (date == null) return "";
        return String.format(Locale.ROOT, "%02d/%02d/%04d", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
    }
}
