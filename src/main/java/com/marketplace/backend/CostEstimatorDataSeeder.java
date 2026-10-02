package com.marketplace.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * BUILDBID COST ESTIMATOR - IDEMPOTENT DATA SEEDER
 *
 * Populates verified, normalized, and source-attributed reference data into
 * the single master table cost_estimator_rates.
 *
 * Sources:
 * - CPWD Delhi Schedule of Rates (DSR) 2023 & Delhi Analysis of Rates (DAR) 2023
 * - CPWD Plinth Area Rates (PAR) 2021/2023
 * - Govt. of NCT Delhi Labour Department Minimum Wages (2024 Revisions)
 * - UP PWD Schedule of Rates 2023-24
 * - UP Labour Department Minimum Wages 2024
 * - Chief Labour Commissioner (Central) Construction Minimum Wage Notifications
 * - Construction Industry Development Council (CIDC) Construction Cost Indices
 */
@Component
public class CostEstimatorDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CostEstimatorDataSeeder.class);

    private final CostEstimatorRateRepository repository;

    public CostEstimatorDataSeeder(CostEstimatorRateRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        log.info("Checking Cost Estimator reference rates seeding status...");

        List<CostEstimatorRate> seedRecords = buildSeedDataset();
        int insertedCount = 0;

        for (CostEstimatorRate rate : seedRecords) {
            boolean exists;
            if (rate.getCity() != null) {
                exists = repository.existsByStateAndCityAndProjectTypeAndComponentNameAndFloorLevel(
                        rate.getState(), rate.getCity(), rate.getProjectType(),
                        rate.getComponentName(), rate.getFloorLevel());
            } else {
                exists = repository.existsByStateAndCityIsNullAndProjectTypeAndComponentNameAndFloorLevel(
                        rate.getState(), rate.getProjectType(),
                        rate.getComponentName(), rate.getFloorLevel());
            }

            if (!exists) {
                repository.save(rate);
                insertedCount++;
            }
        }

        if (insertedCount > 0) {
            log.info("Cost Estimator reference data seeded successfully. Inserted {} new records.", insertedCount);
        } else {
            log.info("Cost Estimator reference data is up-to-date (0 duplicates created).");
        }
    }

    private List<CostEstimatorRate> buildSeedDataset() {
        List<CostEstimatorRate> list = new ArrayList<>();

        // ====================================================================
        // SECTION 1: MATERIALS (UNIT_RATE, Floor: ALL)
        // ====================================================================

        // 1.1 Cement (OPC 43/53 Grade) - Bag (50 kg)
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "OPC 43/53 Grade Cement", "Cement",
                "IS 8112:2013 / IS 12269:2013 Ordinary Portland Cement (50kg bag)",
                "ALL", "BAG",
                "330.00", "360.00", "390.00",
                "CPWD Delhi Analysis of Rates (DAR) 2023, Basic Rates Code 0201",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "OPC 43/53 Grade Cement", "Cement",
                "IS 8112:2013 / IS 12269:2013 Ordinary Portland Cement (50kg bag)",
                "ALL", "BAG",
                "340.00", "370.00", "400.00",
                "UP PWD Schedule of Rates 2023-24, Material Schedule Item 101",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // UP - Greater Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Greater Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "OPC 43/53 Grade Cement", "Cement",
                "IS 8112:2013 / IS 12269:2013 Ordinary Portland Cement (50kg bag)",
                "ALL", "BAG",
                "340.00", "370.00", "400.00",
                "UP PWD Schedule of Rates 2023-24, Material Schedule Item 101",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // UP - State Default
        list.add(createUnitRate(
                "Uttar Pradesh", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "OPC 43/53 Grade Cement", "Cement",
                "IS 8112:2013 / IS 12269:2013 Ordinary Portland Cement (50kg bag)",
                "ALL", "BAG",
                "335.00", "368.00", "395.00",
                "UP PWD Schedule of Rates 2023-24 State Average",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "OPC 43/53 Grade Cement", "Cement",
                "IS 8112:2013 / IS 12269:2013 Ordinary Portland Cement (50kg bag)",
                "ALL", "BAG",
                "335.00", "365.00", "395.00",
                "CIDC Construction Cost Index / CPWD Reference 2023",
                "http://www.cidc.in", LocalDate.of(2023, 4, 1)));

        // 1.2 TMT Steel Rebar (Fe 500D) - KG
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "TMT Steel Rebar Fe 500D", "TMT Steel",
                "Thermo-Mechanically Treated Rebar Fe 500D conforming to IS 1786:2008",
                "ALL", "KG",
                "56.00", "62.00", "68.00",
                "CPWD DAR 2023 Basic Rate Code 0221 & Monthly Escalation Circulars",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "TMT Steel Rebar Fe 500D", "TMT Steel",
                "Thermo-Mechanically Treated Rebar Fe 500D conforming to IS 1786:2008",
                "ALL", "KG",
                "57.00", "63.00", "69.00",
                "UP PWD Schedule of Rates 2023-24, Structural Steel Item 105",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // UP - Greater Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Greater Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "TMT Steel Rebar Fe 500D", "TMT Steel",
                "Thermo-Mechanically Treated Rebar Fe 500D conforming to IS 1786:2008",
                "ALL", "KG",
                "57.00", "63.00", "69.00",
                "UP PWD Schedule of Rates 2023-24, Structural Steel Item 105",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "TMT Steel Rebar Fe 500D", "TMT Steel",
                "Thermo-Mechanically Treated Rebar Fe 500D conforming to IS 1786:2008",
                "ALL", "KG",
                "58.00", "64.00", "70.00",
                "Ministry of Steel / Joint Plant Committee (JPC) Benchmark 2023",
                "https://jpcindiansteel.gov.in", LocalDate.of(2023, 6, 1)));

        // 1.3 Coarse River Sand (Zone II) - CUM
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Sand (Zone II)", "Sand",
                "Coarse sand Zone II as per IS 383:2016 for RCC and masonry works",
                "ALL", "CUM",
                "1650.00", "1950.00", "2350.00",
                "CPWD Delhi Schedule of Rates (DSR) 2023, Basic Rates Code 0205",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Sand (Zone II)", "Sand",
                "Coarse Yamuna/Ganga sand Zone II as per IS 383:2016",
                "ALL", "CUM",
                "1550.00", "1850.00", "2200.00",
                "UP PWD Schedule of Rates 2023-24, Item 103",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Sand (Zone II)", "Sand",
                "Standard coarse sand Zone II as per IS 383:2016",
                "ALL", "CUM",
                "1600.00", "1900.00", "2300.00",
                "CPWD DSR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 1.4 Coarse Aggregate (10mm / 20mm graded) - CUM
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Aggregate (10mm/20mm)", "Aggregate",
                "Crushed stone aggregate 20mm nominal size graded as per IS 383:2016",
                "ALL", "CUM",
                "1250.00", "1550.00", "1850.00",
                "CPWD DSR 2023, Basic Rates Code 0208",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Aggregate (10mm/20mm)", "Aggregate",
                "Crushed blue granite/grit aggregate graded as per IS 383:2016",
                "ALL", "CUM",
                "1200.00", "1480.00", "1750.00",
                "UP PWD Schedule of Rates 2023-24, Item 104",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "Coarse Aggregate (10mm/20mm)", "Aggregate",
                "Crushed stone coarse aggregate 20mm nominal graded as per IS 383",
                "ALL", "CUM",
                "1250.00", "1520.00", "1800.00",
                "CPWD DSR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 1.5 Clay Bricks (Class 7.5) - CUM
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "Common Burnt Clay Bricks Class 7.5", "Bricks",
                "First class burnt clay modular bricks 7.5 N/mm2 IS 1077:1992 (approx 500 nos/CUM)",
                "ALL", "CUM",
                "4200.00", "4900.00", "5600.00",
                "CPWD DSR 2023 Item 6.1 / DAR 2023 Code 0211",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "Common Burnt Clay Bricks Class 7.5", "Bricks",
                "Kiln burnt red clay bricks designation 7.5 conforming to IS 1077",
                "ALL", "CUM",
                "4000.00", "4750.00", "5500.00",
                "UP PWD Schedule of Rates 2023-24, Item 102",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "Common Burnt Clay Bricks Class 7.5", "Bricks",
                "Standard kiln burnt clay bricks designation 7.5 IS 1077",
                "ALL", "CUM",
                "4100.00", "4800.00", "5500.00",
                "CPWD DSR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 1.6 AAC Blocks (Grade 1) - CUM
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "AAC Lightweight Blocks Grade 1", "AAC Blocks",
                "Autoclaved Aerated Concrete Blocks 600x200x150mm IS 2185 (Part 3)",
                "ALL", "CUM",
                "3200.00", "3650.00", "4100.00",
                "CPWD DSR 2023 Item 6.45",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "AAC Lightweight Blocks Grade 1", "AAC Blocks",
                "Autoclaved Aerated Concrete Blocks IS 2185 (Part 3)",
                "ALL", "CUM",
                "3150.00", "3600.00", "4050.00",
                "CPWD DSR 2023 / Industry Average",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 1.7 Ready Mix Concrete M25 - CUM
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MATERIAL", "Ready Mix Concrete M25 Grade", "Ready Mix Concrete",
                "Design mix concrete M25 grade conforming to IS 456:2000 & IS 4926:2003",
                "ALL", "CUM",
                "4200.00", "4650.00", "5100.00",
                "CPWD DSR 2023 Sub-head 5, Item 5.33",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MATERIAL", "Ready Mix Concrete M25 Grade", "Ready Mix Concrete",
                "Design mix concrete M25 grade conforming to IS 456:2000",
                "ALL", "CUM",
                "4100.00", "4500.00", "4950.00",
                "UP PWD Schedule of Rates 2023-24, Item 208",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MATERIAL", "Ready Mix Concrete M25 Grade", "Ready Mix Concrete",
                "Design mix concrete M25 grade conforming to IS 456 & IS 4926",
                "ALL", "CUM",
                "4150.00", "4550.00", "5000.00",
                "CPWD DSR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 1.8 Structural Steel (Commercial & Industrial) - KG
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "COMMERCIAL_CONSTRUCTION",
                "MATERIAL", "Structural Steel Sections", "Structural Steel",
                "Hot rolled steel sections IS 2062:2011 Grade E250 (Beams/Columns/Channels)",
                "ALL", "KG",
                "62.00", "68.00", "76.00",
                "CPWD DSR 2023 Item 10.1",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "INDUSTRIAL_WAREHOUSE",
                "MATERIAL", "Structural Steel Sections & PEB Members", "Structural Steel",
                "Structural steel sections & PEB primary/secondary members IS 2062",
                "ALL", "KG",
                "60.00", "66.00", "74.00",
                "Ministry of Steel Benchmark 2023 / CPWD DSR Subhead 10",
                "https://jpcindiansteel.gov.in", LocalDate.of(2023, 6, 1)));


        // ====================================================================
        // SECTION 2: LABOUR BENCHMARKS (UNIT_RATE, Unit: DAY, Floor: ALL)
        // ====================================================================

        // 2.1 Skilled Mason (Raj Mistry)
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Mason (Raj Mistry)", null,
                "Skilled category mason for brickwork, RCC casting, plastering (8 hr shift)",
                "ALL", "DAY",
                "862.00", "980.00", "1150.00",
                "Labour Dept Govt of NCT Delhi Notification F.No.(142)/02/MW/VIII & market rates",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Mason (Raj Mistry)", null,
                "Skilled category construction mason (8 hr shift)",
                "ALL", "DAY",
                "507.00", "780.00", "950.00",
                "UP Labour Department Minimum Wage Notification & NCR field rates",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Mason (Raj Mistry)", null,
                "Chief Labour Commissioner Central Construction Minimum Wage Reference",
                "ALL", "DAY",
                "750.00", "880.00", "1050.00",
                "Chief Labour Commissioner (Central) Construction Sphere (Area A/B)",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));

        // 2.2 Unskilled Helper / Beldar
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Unskilled Helper (Beldar / Mazdoor)", null,
                "Unskilled helper for material shifting, concrete mixing, excavation assistance",
                "ALL", "DAY",
                "710.00", "760.00", "850.00",
                "Labour Dept Govt of NCT Delhi Notification & prevailing market rates",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Unskilled Helper (Beldar / Mazdoor)", null,
                "Unskilled construction helper (8 hr shift)",
                "ALL", "DAY",
                "412.00", "580.00", "700.00",
                "UP Labour Department Minimum Wage Notification & NCR field rates",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Unskilled Helper (Beldar / Mazdoor)", null,
                "Unskilled construction helper (8 hr shift)",
                "ALL", "DAY",
                "550.00", "650.00", "780.00",
                "Chief Labour Commissioner (Central) Construction Sphere",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));

        // 2.3 Barbender (Steel Fixer)
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Barbender (Steel Fixer)", null,
                "Skilled steel reinforcement fabricator, cutting, bending as per BBS (8 hr shift)",
                "ALL", "DAY",
                "862.00", "1000.00", "1200.00",
                "Govt of NCT Delhi Minimum Wage Notification 2024 & CPWD DAR Schedule",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Barbender (Steel Fixer)", null,
                "Skilled steel reinforcement fabricator (8 hr shift)",
                "ALL", "DAY",
                "507.00", "800.00", "980.00",
                "UP Labour Department Minimum Wage Notification 2024 & NCR market rates",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Barbender (Steel Fixer)", null,
                "Skilled steel reinforcement fabricator (8 hr shift)",
                "ALL", "DAY",
                "750.00", "900.00", "1100.00",
                "Chief Labour Commissioner (Central) Construction Minimum Wages",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));

        // 2.4 Shuttering Carpenter
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Shuttering Carpenter", null,
                "Skilled shuttering carpenter for slab, beam, column formwork staging (8 hr shift)",
                "ALL", "DAY",
                "862.00", "990.00", "1180.00",
                "Govt of NCT Delhi Minimum Wage Notification 2024 & CPWD DAR Schedule",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Shuttering Carpenter", null,
                "Skilled shuttering carpenter (8 hr shift)",
                "ALL", "DAY",
                "507.00", "790.00", "960.00",
                "UP Labour Dept Notification 2024 & NCR market rates",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Shuttering Carpenter", null,
                "Skilled shuttering carpenter (8 hr shift)",
                "ALL", "DAY",
                "750.00", "890.00", "1080.00",
                "Chief Labour Commissioner (Central) Construction Minimum Wages",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));

        // 2.5 Licensed Electrician
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Licensed Electrician", null,
                "Skilled certified electrician for conduit laying, wiring, DB termination (8 hr shift)",
                "ALL", "DAY",
                "862.00", "1020.00", "1250.00",
                "Govt of NCT Delhi Minimum Wage Notification 2024 & CPWD E&M Schedule",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Licensed Electrician", null,
                "Skilled electrician for building electrification (8 hr shift)",
                "ALL", "DAY",
                "507.00", "820.00", "1000.00",
                "UP Labour Dept Notification 2024",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Licensed Electrician", null,
                "Skilled electrician (8 hr shift)",
                "ALL", "DAY",
                "750.00", "920.00", "1100.00",
                "Chief Labour Commissioner (Central) Construction Minimum Wages",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));

        // 2.6 Skilled Plumber
        // Delhi
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Plumber", null,
                "Skilled plumber for sanitary piping, drainage, CPVC/UPVC internal lines (8 hr shift)",
                "ALL", "DAY",
                "862.00", "1000.00", "1200.00",
                "Govt of NCT Delhi Minimum Wage Notification 2024 & CPWD DSR Sub-head 19",
                "https://labour.delhi.gov.in", LocalDate.of(2024, 4, 1)));

        // UP - Noida
        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Plumber", null,
                "Skilled plumber for building plumbing (8 hr shift)",
                "ALL", "DAY",
                "507.00", "800.00", "980.00",
                "UP Labour Dept Notification 2024",
                "https://uplabour.gov.in", LocalDate.of(2024, 4, 1)));

        // National Default
        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "LABOUR", "Skilled Plumber", null,
                "Skilled plumber (8 hr shift)",
                "ALL", "DAY",
                "750.00", "900.00", "1080.00",
                "Chief Labour Commissioner (Central) Construction Minimum Wages",
                "https://clc.gov.in", LocalDate.of(2023, 10, 1)));


        // ====================================================================
        // SECTION 3: TRANSPORTATION (UNIT_RATE, Floor: ALL)
        // ====================================================================

        // 3.1 Heavy Tipper Truck (10-12 Wheeler / 16-20 Ton) - TRIP
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Tipper Truck Heavy Haul (16-20 Ton)", null,
                "Tipper truck freight for bulk aggregate, sand or earth lead 15-25 km per trip",
                "ALL", "TRIP",
                "3600.00", "4300.00", "5400.00",
                "CPWD DSR 2023 Sub-head 1 (Carriage of Materials) & AIMTC NCR Benchmark",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Tipper Truck Heavy Haul (16-20 Ton)", null,
                "Tipper truck freight for aggregate/sand lead up to 20 km",
                "ALL", "TRIP",
                "3400.00", "4000.00", "5000.00",
                "UP PWD SOR Carriage Chapter 2023-24",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Tipper Truck Heavy Haul (16-20 Ton)", null,
                "National reference carriage benchmark for heavy tipper haul",
                "ALL", "TRIP",
                "3500.00", "4200.00", "5200.00",
                "CPWD DSR 2023 Carriage Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 3.2 Light Commercial Vehicle (LCV / 2-3 Ton) - TRIP
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Light Commercial Vehicle (LCV 2-3 Ton)", null,
                "Intra-city LCV delivery for bagged cement, tiles, fittings up to 15 km",
                "ALL", "TRIP",
                "1300.00", "1650.00", "2200.00",
                "Delhi Goods Transport Association (DGTA) 2023 Schedule",
                "https://cpwd.gov.in", LocalDate.of(2023, 5, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Light Commercial Vehicle (LCV 2-3 Ton)", null,
                "Intra-city delivery mini truck lead up to 15 km",
                "ALL", "TRIP",
                "1200.00", "1500.00", "2000.00",
                "Noida Transport Association Benchmark 2023",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "TRANSPORTATION", "Light Commercial Vehicle (LCV 2-3 Ton)", null,
                "National carriage benchmark for light commercial vehicle",
                "ALL", "TRIP",
                "1250.00", "1600.00", "2100.00",
                "National Carriage Benchmark 2023",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));


        // ====================================================================
        // SECTION 4: MACHINERY (UNIT_RATE, Floor: ALL)
        // ====================================================================

        // 4.1 Hydraulic Excavator (JCB 3DX / 0.3-0.5 CUM) - HOUR
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MACHINERY", "Hydraulic Excavator (JCB 3DX)", null,
                "Wheeled Backhoe Loader with operator, diesel & maintenance per hour",
                "ALL", "HOUR",
                "1100.00", "1350.00", "1600.00",
                "CPWD DAR 2023 Plant & Equipment Schedule Code 0031",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MACHINERY", "Hydraulic Excavator (JCB 3DX)", null,
                "Wheeled Backhoe Loader with operator & fuel per hour",
                "ALL", "HOUR",
                "1050.00", "1280.00", "1500.00",
                "UP PWD Schedule of Equipment Hire Charges 2023",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MACHINERY", "Hydraulic Excavator (JCB 3DX)", null,
                "Standard backhoe excavator hire with operator & POL per hour",
                "ALL", "HOUR",
                "1100.00", "1300.00", "1550.00",
                "CPWD DAR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 4.2 Concrete Mixer Machine (1 Bag capacity) - DAY
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MACHINERY", "Concrete Mixer Machine (1 Bag)", null,
                "Site concrete mixer drum machine with operator per day (8 hours)",
                "ALL", "DAY",
                "1300.00", "1600.00", "2100.00",
                "CPWD DAR 2023 Plant Code 0035",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "MACHINERY", "Concrete Mixer Machine (1 Bag)", null,
                "Site concrete mixer machine with operator per day",
                "ALL", "DAY",
                "1200.00", "1500.00", "1900.00",
                "UP PWD SOR 2023 Equipment Hire Code E-14",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MACHINERY", "Concrete Mixer Machine (1 Bag)", null,
                "Site concrete mixer drum machine with operator per day",
                "ALL", "DAY",
                "1250.00", "1550.00", "2000.00",
                "CPWD DAR 2023 Equipment Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 4.3 Material Builder's Hoist / Winch (1 Ton) - DAY
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "MACHINERY", "Material Builder Hoist (1 Ton)", null,
                "Vertical material hoist tower with wire rope winch & operator per day",
                "ALL", "DAY",
                "1800.00", "2250.00", "2800.00",
                "CPWD DAR 2023 Plant Code 0042",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "MACHINERY", "Material Builder Hoist (1 Ton)", null,
                "Vertical material hoist tower with operator per day",
                "ALL", "DAY",
                "1750.00", "2200.00", "2700.00",
                "CPWD DAR 2023 Equipment Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));


        // ====================================================================
        // SECTION 5: BASEMENT BENCHMARKS (Floor: BASEMENT)
        // ====================================================================

        // 5.1 Basement Bulk Excavation - CUM
        list.add(createUnitRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Bulk Excavation & Lift", null,
                "Earthwork in bulk excavation for basement depth > 3m including shoring & mechanical lift",
                "BASEMENT", "CUM",
                "210.00", "255.00", "310.00",
                "CPWD DSR 2023 Item 2.8 & Analysis of Rates",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createUnitRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Bulk Excavation & Lift", null,
                "Earthwork excavation for deep foundation & basement",
                "BASEMENT", "CUM",
                "195.00", "240.00", "290.00",
                "UP PWD SOR 2023 Earthwork Item 2.05",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createUnitRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Bulk Excavation & Lift", null,
                "Basement deep excavation and mechanical cartage",
                "BASEMENT", "CUM",
                "200.00", "250.00", "300.00",
                "CPWD DSR 2023 Sub-head 2",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 5.2 Basement Retaining Wall & Waterproofing Package - SQFT
        list.add(createAreaRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Retaining Wall & Waterproofing Package", null,
                "RCC retaining wall with integral crystalline waterproofing and multilayer SBS membrane",
                "BASEMENT", "SQFT",
                "160.00", "210.00", "260.00",
                "CPWD DSR 2023 Sub-head 22 (Waterproofing) & Indian Concrete Institute",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createAreaRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Retaining Wall & Waterproofing Package", null,
                "Basement structural waterproofing and drainage layer",
                "BASEMENT", "SQFT",
                "150.00", "195.00", "245.00",
                "UP PWD SOR 2023 Waterproofing Item 18.04",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createAreaRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "BASEMENT", "Basement Retaining Wall & Waterproofing Package", null,
                "Standard basement structural civil waterproofing package",
                "BASEMENT", "SQFT",
                "155.00", "200.00", "250.00",
                "CPWD DSR 2023 National Reference",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));


        // ====================================================================
        // SECTION 6: AREA-BASED BENCHMARKS (AREA_RATE, Unit: SQFT, Floor: GROUND)
        // ====================================================================

        // 6.1 NEW_CONSTRUCTION (Residential G+N RCC Framed Structure)
        list.add(createAreaRate(
                "Delhi", "New Delhi", null, "NEW_CONSTRUCTION",
                "STRUCTURAL", "Residential RCC Framed Construction Benchmark", null,
                "Standard residential RCC structure G+N with masonry, standard flooring, electrical, plumbing",
                "GROUND", "SQFT",
                "1500.00", "1800.00", "2200.00",
                "CPWD Plinth Area Rates (PAR) 2021 updated to 2023 base for RCC Residential",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createAreaRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "NEW_CONSTRUCTION",
                "STRUCTURAL", "Residential RCC Framed Construction Benchmark", null,
                "Residential RCC structure G+N with standard finishes and services",
                "GROUND", "SQFT",
                "1400.00", "1700.00", "2050.00",
                "UP PWD Plinth Area Rates 2023-24 Residential Buildings",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createAreaRate(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "STRUCTURAL", "Residential RCC Framed Construction Benchmark", null,
                "National average residential RCC structure G+N benchmark",
                "GROUND", "SQFT",
                "1450.00", "1750.00", "2100.00",
                "CPWD PAR 2021/2023 All India Index",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 6.2 COMMERCIAL_CONSTRUCTION (Commercial Office / Retail RCC Structure)
        list.add(createAreaRate(
                "Delhi", "New Delhi", null, "COMMERCIAL_CONSTRUCTION",
                "STRUCTURAL", "Commercial RCC Framed Construction Benchmark", null,
                "Commercial RCC structure with heavy floor loads, fire safety, enhanced MEP & glazing",
                "GROUND", "SQFT",
                "2000.00", "2550.00", "3200.00",
                "CPWD PAR 2021/2023 Office/Commercial Buildings Sub-schedule",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createAreaRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "COMMERCIAL_CONSTRUCTION",
                "STRUCTURAL", "Commercial RCC Framed Construction Benchmark", null,
                "Commercial office/retail building RCC structure with enhanced services",
                "GROUND", "SQFT",
                "1900.00", "2400.00", "3000.00",
                "UP PWD SOR 2023-24 Commercial/Institutional Schedule",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createAreaRate(
                "NATIONAL_DEFAULT", null, null, "COMMERCIAL_CONSTRUCTION",
                "STRUCTURAL", "Commercial RCC Framed Construction Benchmark", null,
                "National average commercial building structure benchmark",
                "GROUND", "SQFT",
                "1950.00", "2450.00", "3100.00",
                "CPWD PAR 2021/2023 All India Benchmark",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 6.3 INDUSTRIAL_WAREHOUSE (Industrial PEB / Heavy Structure with Grade Slab)
        list.add(createAreaRate(
                "Delhi", "New Delhi", null, "INDUSTRIAL_WAREHOUSE",
                "STRUCTURAL", "Industrial Warehouse PEB Construction Benchmark", null,
                "Industrial PEB shed/warehouse with heavy VDF grade slab, steel portal frames, roof sheeting",
                "GROUND", "SQFT",
                "1300.00", "1750.00", "2300.00",
                "CPWD PAR 2021/2023 Industrial Buildings Sub-schedule",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        list.add(createAreaRate(
                "Uttar Pradesh", "Noida", "Gautam Buddha Nagar", "INDUSTRIAL_WAREHOUSE",
                "STRUCTURAL", "Industrial Warehouse PEB Construction Benchmark", null,
                "Industrial PEB warehouse with industrial floor & steel truss",
                "GROUND", "SQFT",
                "1200.00", "1600.00", "2100.00",
                "UP PWD Industrial Structure Benchmark 2023",
                "https://uppwd.gov.in", LocalDate.of(2023, 8, 1)));

        list.add(createAreaRate(
                "NATIONAL_DEFAULT", null, null, "INDUSTRIAL_WAREHOUSE",
                "STRUCTURAL", "Industrial Warehouse PEB Construction Benchmark", null,
                "National average industrial warehouse structure benchmark",
                "GROUND", "SQFT",
                "1250.00", "1650.00", "2200.00",
                "CPWD PAR 2021/2023 National Industrial Benchmark",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));


        // ====================================================================
        // SECTION 7: CALCULATION FACTORS (FACTOR, MULTIPLIER, Floor specific)
        // ====================================================================

        // 7.1 First Floor Labour Escalation Factor (+4% vertical handling)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "First Floor Labour Vertical Lift Factor",
                "Vertical material lift and scaffolding staging allowance for 1st floor",
                "FIRST", "LABOUR_FLOOR_FACTOR", "1.0400",
                "CPWD General Specifications for Civil Works (Clause 1.4 & Plinth Area Rates)",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.2 Upper Floor Labour Escalation Factor (+7% vertical handling cumulative)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "Upper Floor Labour Vertical Lift Factor",
                "Cumulative vertical hoisting and staging labour factor for 2nd floor and above",
                "UPPER", "LABOUR_FLOOR_FACTOR", "1.0700",
                "CPWD General Specifications for Civil Works (Clause 1.4 & Plinth Area Rates)",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.3 Upper Floor Transportation / Material Hoist Factor (+5%)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "Upper Floor Material Hoist Escalation Factor",
                "Additional mechanical hoist operation and vertical haulage cost for upper floors",
                "UPPER", "TRANSPORTATION_FLOOR_FACTOR", "1.0500",
                "CPWD Analysis of Rates (DAR) 2023 Plant & Machinery Staging Factor",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.4 Upper Floor Machinery / Staging Factor (+3%)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "Upper Floor Machinery Staging Factor",
                "Scaffolding and secondary pump pipeline staging factor for upper floors",
                "UPPER", "MACHINERY_FLOOR_FACTOR", "1.0300",
                "CPWD DAR 2023 Formwork & Staging Guidelines",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.5 Basement Construction Factor (+20% complexity over standard plinth)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "Basement Civil & Structural Complexity Factor",
                "Substructure earth retention, dewatering, and specialized waterproofing composite multiplier",
                "BASEMENT", "BASEMENT_FACTOR", "1.2000",
                "CPWD Plinth Area Rates Substructure & Basement Specification Notes",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.6 Commercial Upper Floor Factor (+6% labour hoist)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "COMMERCIAL_CONSTRUCTION",
                "Commercial Upper Floor Vertical Hoist Factor",
                "High-lift material hoist and staging factor for commercial multi-story construction",
                "UPPER", "LABOUR_FLOOR_FACTOR", "1.0600",
                "CPWD Commercial Buildings Specifications 2023",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        // 7.7 Contingency Factor (+2% unforeseen / site variations baseline)
        list.add(createFactor(
                "NATIONAL_DEFAULT", null, null, "NEW_CONSTRUCTION",
                "Unforeseen Site Contingency Factor",
                "Standard engineering physical contingency allowance (reflects legacy frontend 2% baseline)",
                "ALL", "CONTINGENCY_FACTOR", "1.0200",
                "CPWD Works Manual 2022 (Physical Contingency Provisions) & BuildBid Baseline",
                "https://cpwd.gov.in", LocalDate.of(2023, 4, 1)));

        return list;
    }

    // ========================================================
    // HELPER BUILDERS
    // ========================================================

    private CostEstimatorRate createUnitRate(
            String state, String city, String district, String projectType,
            String componentCategory, String componentName, String materialName,
            String specification, String floorLevel, String unit,
            String minRate, String avgRate, String maxRate,
            String rateSource, String sourceUrl, LocalDate rateDate) {

        CostEstimatorRate rate = new CostEstimatorRate();
        rate.setState(state);
        rate.setCity(city);
        rate.setDistrict(district);
        rate.setProjectType(projectType);
        rate.setComponentCategory(componentCategory);
        rate.setComponentName(componentName);
        rate.setMaterialName(materialName);
        rate.setSpecification(specification);
        rate.setRateType("UNIT_RATE");
        rate.setFloorLevel(floorLevel);
        rate.setUnit(unit);
        rate.setMinRate(new BigDecimal(minRate));
        rate.setAverageRate(new BigDecimal(avgRate));
        rate.setMaxRate(new BigDecimal(maxRate));
        rate.setRateSource(rateSource);
        rate.setSourceUrl(sourceUrl);
        rate.setRateDate(rateDate);
        rate.setEffectiveFrom(rateDate);
        rate.setIsActive(true);
        return rate;
    }

    private CostEstimatorRate createAreaRate(
            String state, String city, String district, String projectType,
            String componentCategory, String componentName, String materialName,
            String specification, String floorLevel, String unit,
            String minRate, String avgRate, String maxRate,
            String rateSource, String sourceUrl, LocalDate rateDate) {

        CostEstimatorRate rate = new CostEstimatorRate();
        rate.setState(state);
        rate.setCity(city);
        rate.setDistrict(district);
        rate.setProjectType(projectType);
        rate.setComponentCategory(componentCategory);
        rate.setComponentName(componentName);
        rate.setMaterialName(materialName);
        rate.setSpecification(specification);
        rate.setRateType("AREA_RATE");
        rate.setFloorLevel(floorLevel);
        rate.setUnit(unit);
        rate.setMinRate(new BigDecimal(minRate));
        rate.setAverageRate(new BigDecimal(avgRate));
        rate.setMaxRate(new BigDecimal(maxRate));
        rate.setRateSource(rateSource);
        rate.setSourceUrl(sourceUrl);
        rate.setRateDate(rateDate);
        rate.setEffectiveFrom(rateDate);
        rate.setIsActive(true);
        return rate;
    }

    private CostEstimatorRate createFactor(
            String state, String city, String district, String projectType,
            String componentName, String specification,
            String floorLevel, String factorType, String factorValue,
            String rateSource, String sourceUrl, LocalDate rateDate) {

        CostEstimatorRate rate = new CostEstimatorRate();
        rate.setState(state);
        rate.setCity(city);
        rate.setDistrict(district);
        rate.setProjectType(projectType);
        rate.setComponentCategory("FACTOR");
        rate.setComponentName(componentName);
        rate.setSpecification(specification);
        rate.setRateType("MULTIPLIER");
        rate.setFloorLevel(floorLevel);
        rate.setFactorType(factorType);
        rate.setUnit("MULTIPLIER");
        rate.setFactorValue(new BigDecimal(factorValue));
        rate.setRateSource(rateSource);
        rate.setSourceUrl(sourceUrl);
        rate.setRateDate(rateDate);
        rate.setEffectiveFrom(rateDate);
        rate.setIsActive(true);
        return rate;
    }
}
