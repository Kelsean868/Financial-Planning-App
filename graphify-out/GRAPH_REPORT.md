# Graph Report - .  (2026-07-16)

## Corpus Check
- 19 files · ~57,877 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 385 nodes · 941 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 84% EXTRACTED · 14% INFERRED · 2% AMBIGUOUS · INFERRED: 131 edges (avg confidence: 0.79)
- Token cost: 551,717 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_NIS Rates, Actuarial & Verification|NIS Rates, Actuarial & Verification]]
- [[_COMMUNITY_Spec Architecture & Design Decisions|Spec Architecture & Design Decisions]]
- [[_COMMUNITY_eMoney Platform Teardown|eMoney Platform Teardown]]
- [[_COMMUNITY_Competitive Position & Attack Surfaces|Competitive Position & Attack Surfaces]]
- [[_COMMUNITY_Tatil CI, Legacy UL & COI Rates|Tatil CI, Legacy UL & COI Rates]]
- [[_COMMUNITY_Rate Grid, Systems & Existing Assets|Rate Grid, Systems & Existing Assets]]
- [[_COMMUNITY_Annuities, Tax & Destiny|Annuities, Tax & Destiny]]
- [[_COMMUNITY_Commission, Products & the Firewall|Commission, Products & the Firewall]]
- [[_COMMUNITY_NIS Core Parameters & SCP|NIS Core Parameters & SCP]]
- [[_COMMUNITY_Regulatory Perimeter & Data Protection|Regulatory Perimeter & Data Protection]]
- [[_COMMUNITY_Group Products|Group Products]]

## God Nodes (most connected - your core abstractions)
1. `Destiny — Individual Retirement Solution` - 29 edges
2. `Cashbuilder II (1992) — retail UL` - 25 edges
3. `TT$60,000 Combined Deduction Cap` - 21 edges
4. `Whole Life 2023` - 20 edges
5. `Commission Firewall` - 20 edges
6. `NIBTT (National Insurance Board of Trinidad and Tobago)` - 19 edges
7. `TT$3,000 Minimum Retirement Pension` - 19 edges
8. `Finance Bill 2026 (House Bill 12 of 2026)` - 16 edges
9. `Cashbuilder III (1995) — corporate deferred compensation UL` - 16 edges
10. `ProductCatalog` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Policy X-ray (the wedge)` --semantically_similar_to--> `Attack surface #1 — aggregation reliability`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-07-15-insurance-planning-mvp-design.md → research/emoney-premier-research-report.md
- `Class Z Class-XVI typo corrected (220.72 → 20.72)` --references--> `Class Z (Employment-Injury-Only Contribution)`  [AMBIGUOUS]
  parameters/README.md → C:/Projects/Financial-Planning-App/research/nibtt-benefit-rates-RESOLVED.md
- `eMoney 'Confidence Age' Monte Carlo metric` --semantically_similar_to--> `NIS Asset Exhaustion Projection (2035-36)`  [INFERRED] [semantically similar]
  research/followup-open-questions-answered.md → C:/Projects/Financial-Planning-App/research/nis-sustainability-actuarial.md
- `50-70 Annuity Maturity Window` --semantically_similar_to--> `Age 60-64 cessation rule`  [INFERRED] [semantically similar]
  C:/Projects/Financial-Planning-App/research/parameter-verification-2026-07.md → research/nibtt-authoritative-rates.md
- `Robo-advice perimeter — TTSEC requires registration` --semantically_similar_to--> `Adversarial Verification Failure Pattern`  [INFERRED] [semantically similar]
  research/followup-open-questions-answered.md → C:/Projects/Financial-Planning-App/research/scp-authoritative.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **NIS Pension Calculation Chain** — whole_life_averaging, earnings_classes, pension_rates_2016_table, increments_per_25, contribution_threshold_750, min_pension_3000, insurable_ceiling_13600 [EXTRACTED 1.00]
- **Authoritative-Source Discipline (the methodology the project learned the hard way)** — parameter_drift, verification_failure, scrape_the_issuer_rule, provenance_per_parameter, practitioner_as_evidence, structural_vs_projected_facts [EXTRACTED 1.00]
- **T&T Retirement Income Floor Stack (NIS + SCP interaction)** — min_pension_3000, scp_means_test_bands, nis_is_scp_assessed_income, nis_scp_interaction, scp_cliff_edges, retirement_grant [EXTRACTED 1.00]
- **Silent collapse mechanic of legacy universal life** — premium_vacation, minimum_monthly_premium_mmp, illustration_risk_smoking_gun, option_a_vs_option_b_gap, cashbuilder_iii, research_tatil_lifespan_and_cashbuilder_policy_xray [INFERRED 0.85]
- **Female breast-cancer CI recommendation and the definition risk that undermines it** — lifespan, lifespan_lite, female_benefit_25pct, breast_cancer, cancer_definition_gap [EXTRACTED 1.00]
- **Competing tax-relief limits for corporate deferred compensation** — section_134_6a, one_third_income_rule, deduction_cap_60000, cashbuilder_iii, research_tatil_lifespan_and_cashbuilder_envelope_optimizer [INFERRED 0.75]
- **The Commission Firewall Separation** — research_tatil_product_catalog_and_commission_commission_firewall, specs_2026_07_15_insurance_planning_mvp_design_recommendation_engine, specs_2026_07_15_insurance_planning_mvp_design_commission_calculator, specs_2026_07_15_insurance_planning_mvp_design_suitability_record, market_conduct_guideline, research_product_knowledge_base_suitability_principle [EXTRACTED 1.00]
- **Guarantee/Commission Inversion Across Destiny Options** — research_tatil_product_specifications_destiny_option_1, research_tatil_product_specifications_destiny_option_2, research_tatil_product_specifications_destiny_option_3, destiny_commission_conflict, commission_firewall [EXTRACTED 1.00]
- **Destiny → SPIA Retirement Arc** — destiny_annuity, maturity_window_50_70, research_tatil_product_specifications_tax_free_lump_sum_25, research_tatil_product_specifications_guaranteed_annuity_rates, spia [EXTRACTED 1.00]
- **Guaranteed Rate vs Tax Treatment Trade-off** — platinum_edge, research_tatil_product_specifications_platinum_edge_floor, destiny_annuity, deduction_cap_60000, s_8_1_ta [EXTRACTED 1.00]
- **The Deterministic Core Pipeline (AI at the edges)** — specs_2026_07_15_insurance_planning_mvp_design_ai_ingestion_service, specs_2026_07_15_insurance_planning_mvp_design_policy_ledger, specs_2026_07_15_insurance_planning_mvp_design_needs_engine, specs_2026_07_15_insurance_planning_mvp_design_gap_calculator, specs_2026_07_15_insurance_planning_mvp_design_recommendation_engine, specs_2026_07_15_insurance_planning_mvp_design_suitability_record, specs_2026_07_15_insurance_planning_mvp_design_ai_explanation_service, specs_2026_07_15_insurance_planning_mvp_design_deterministic_core [EXTRACTED 1.00]
- **The Two-Meeting Discovery → Decision Flow** — research_factfinder_analysis_triage_checklist, research_factfinder_analysis_five_questions, specs_2026_07_15_insurance_planning_mvp_design_policy_xray_wedge, specs_2026_07_15_insurance_planning_mvp_design_client_portal, research_factfinder_analysis_two_meetings, research_factfinder_analysis_three_options, specs_2026_07_15_insurance_planning_mvp_design_agent_recommender_of_record [EXTRACTED 1.00]
- **The grid turns the anti-mis-selling rule into real numbers** — tatil_rate_grid, term_vs_wholelife_price_gap, commission_firewall, whole_life_2023 [EXTRACTED 1.00]
- **Three existing systems, one platform, one design system** — general_raters_portal, agencytrack, tatil_design_system, design_system_convergence, federate_not_merge [EXTRACTED 0.95]
- **Need-first information architecture, independently converged** — principal_concept_marketing, feldman_method, savage_high_touch_selling, ai_explanation_service, persuasion_firewall [INFERRED 0.85]
- **NIBTT's unreconciled two-table benefit-rate contradiction** — pension_rates_2008_table, pension_rates_2016_table, nibtt [EXTRACTED 1.00]
- **The NIS-SCP clawback, provable from two primary sources** — nis_scp_interaction, nis_is_scp_assessed_income, scp_means_test_bands [EXTRACTED 1.00]
- **The verification-failure correction arc** — verification_failure, scrape_the_issuer_rule, practitioner_as_evidence [EXTRACTED 1.00]
- **The two quantified conflicts that make the firewall non-optional** — destiny_commission_conflict, term_vs_wholelife_price_gap, commission_firewall [EXTRACTED 0.95]
- **The three ingredients of silent Cashbuilder collapse** — coi_rate_table, illustration_risk_smoking_gun, premium_vacation [INFERRED 0.95]
- **GoldSpoon Gift closes the maternity-benefit loop and the COI-table gap** — goldspoon, maternity_benefit, coi_rate_table [EXTRACTED 0.95]
- **The firewall family — admit the information, bar it from the decision** — commission_firewall, persuasion_firewall, deterministic_core [INFERRED 0.85]
- **Three existing systems — the platform story** — tt_financial_hub_repo, general_raters_portal, agencytrack [EXTRACTED 1.00]
- **Practitioner knowledge settled what inference and voting got wrong** — licence_perimeter_general, annuities_in_scope, founder_derisks_risk [INFERRED 0.85]
- **The three traps that make the corpus unusable verbatim in T&T** — estate_tax_framing_trap, gendered_framing_trap, coercive_phrases_excluded [EXTRACTED 1.00]
- **Phrase #45 opens the X-ray, the gap calculator answers it** — phrase_45_what_formula, policy_xray_wedge, gap_calculator [EXTRACTED 1.00]
- **Phrase #125 surfaces CLICO, AM Best answers it** — phrase_125_industry_problem, am_best_rating, objection_taxonomy_37 [INFERRED 0.85]
- **Assisted and unassisted modes are one fact-find behind a mode flag** — mode_assisted, mode_unassisted, one_factfind_two_modes [EXTRACTED 1.00]
- **The two defences against the self-serve risk: correct parameters and the human gate** — self_serve_risk, two_defences, validation_gate [EXTRACTED 1.00]
- **One parameter module serves the unassisted mode and the ungated public calculators** — parameters_module, mode_unassisted, public_calculators_separate [EXTRACTED 1.00]

## Communities (11 total, 1 thin omitted)

### Community 0 - "NIS Rates, Actuarial & Verification"
Cohesion: 0.06
Nodes (73): NIS Asset Exhaustion Projection (2035-36), NIBTT Benefit-Rate Revision History (2012 / 2013 / 2014 / 2016), CARICOM reciprocal social security agreement, Claim-Date-Keyed Benefit Rates, Class Z (Employment-Injury-Only Contribution), Class Z Class XVI Site Typo (220.72 vs 20.72), 750-Contribution Threshold, Dated parameter-tables discipline (+65 more)

### Community 1 - "Spec Architecture & Design Decisions"
Cohesion: 0.06
Nodes (68): TRAP: Coercive Phrases (#19, #24, #43) -- Excluded, Market Conduct Guideline (July 2023), Account Aggregation, Attack Surface: Aggregation Reliability, 25% Approved-Annuity Early Surrender Tax, eMoney Client Portal (two-tier), Attack Surface: Ready-Made Differentiation Backlog, Attack Surface: Learning Curve & Silent Modeling Errors (+60 more)

### Community 2 - "eMoney Platform Teardown"
Cohesion: 0.08
Nodes (52): AI at the edges, AIExplanationService, AIIngestionService, AM Best Affirmation of Tatil's Credit Ratings, Analogy Device, Banhelyi 125 Action Statements & Power Phrases, T&T benchmark allocation (market-standard), Business market gap (+44 more)

### Community 3 - "Competitive Position & Attack Surfaces"
Cohesion: 0.08
Nodes (39): AgencyTrack, Agent is recommender of record, Annuities are IN SCOPE, Annuities: Insurance Act vs Securities Act Scope Gap, Budget as percentage-of-income band, Central Bank of Trinidad & Tobago (CBTT), Central Bank of Trinidad and Tobago (CBTT), CommissionCalculator (+31 more)

### Community 4 - "Tatil CI, Legacy UL & COI Rates"
Cohesion: 0.11
Nodes (36): Board of Inland Revenue / Inland Revenue Division (BIR/IRD), Destiny — Individual Retirement Solution, Finance Bill 2026 (House Bill 12 of 2026), Graded Death Benefit (yr1 ROP / yr2 25% / yr3 100%), Health Surcharge, Income Tax Act Chap. 75:01, 50-70 Annuity Maturity Window, 70% NIS Deductibility (+28 more)

### Community 5 - "Rate Grid, Systems & Existing Assets"
Cohesion: 0.13
Nodes (34): Breast Cancer, Cancer Definition Gap (carcinoma in situ / DCIS), Cashbuilder II (1992) — retail UL, Cashbuilder III (1995) — corporate deferred compensation UL, Cashbuilder IV, CI / Disability / Income Protection Riders, Critical Illness Rider on Whole Life 2023, Cashbuilder COI Rate Table (Annual Premium Rates per $1,000 Sum Assured) (+26 more)

### Community 6 - "Annuities, Tax & Destiny"
Cohesion: 0.14
Nodes (31): Agency Overrides (12% manager first-year), Budget-first (#-prefixed) reverse quotes, Cash surrender value tables, Commission Firewall, Convertibility (future insurability lever), Convertible Level Term / Level Convertible Term to Age, Destiny Commission Conflict of Interest, Endowment 2024 (ENDXX6) (+23 more)

### Community 7 - "Commission, Products & the Firewall"
Cohesion: 0.22
Nodes (16): Assisted-first sequencing, auditParameters(), Class Z Class-XVI typo corrected (220.72 → 20.72), 2026 contribution table incomplete (Classes II–XV missing), Conversation drives, canvas reflects, NIS increments — BLOCKING_UNRESOLVED, Mode A — ASSISTED (face-to-face), Mode B — UNASSISTED (client link) (+8 more)

### Community 8 - "NIS Core Parameters & SCP"
Cohesion: 0.15
Nodes (15): Account aggregation (held-away assets), Advanced Planning (eMoney), Attack surface #1 — aggregation reliability, Caribbean Bank Aggregation Coverage Gap, Decision Center (eMoney), eMoney Client Portal (two-tier), eMoney 'Confidence Age' Metric, eMoney Premier (+7 more)

### Community 9 - "Regulatory Perimeter & Data Protection"
Cohesion: 0.19
Nodes (13): Advanced Planning, Monte Carlo Engine Specifics (unverified), Decision Center, eMoney Advisor, eMoney Premier, Foundational Planning, Goal Planner, MoneyGuidePro (+5 more)

## Ambiguous Edges - Review These
- `Data Protection Act 2011 (Chap. 22:04)` → `TTSEC Review of Algorithms and Methodologies`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/followup-open-questions-answered.md · relation: conceptually_related_to
- `Caribbean Bank Aggregation Coverage Gap` → `Finerio Connect / Ozone API / Visa Open-Banking Toolkit`  [AMBIGUOUS]
  research/emoney-premier-research-report.md · relation: conceptually_related_to
- `Class Z (Employment-Injury-Only Contribution)` → `Class Z Class-XVI typo corrected (220.72 → 20.72)`  [AMBIGUOUS]
  parameters/README.md · relation: references
- `Class Z Class XVI Site Typo (220.72 vs 20.72)` → `Parameter Drift`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/nibtt-benefit-rates-RESOLVED.md · relation: conceptually_related_to
- `750-Contribution Threshold` → `CARICOM reciprocal social security agreement`  [AMBIGUOUS]
  research/nis-training-findings.md · relation: conceptually_related_to
- `TT$60,000 Combined Deduction Cap` → `Premium banding non-linearity`  [AMBIGUOUS]
  research/quotations-rate-grid.md · relation: conceptually_related_to
- `Universal Life` → `Annuities are IN SCOPE`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-15-insurance-planning-mvp-design.md · relation: conceptually_related_to
- `Cashbuilder II (1992) — retail UL` → `Cashbuilder I (CBI)`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/tatil-lifespan-and-cashbuilder.md · relation: conceptually_related_to
- `Cashbuilder III (1995) — corporate deferred compensation UL` → `Cashbuilder IV`  [AMBIGUOUS]
  research/ocr-extracted-corpus.md · relation: conceptually_related_to
- `Cashbuilder III (1995) — corporate deferred compensation UL` → `Option A vs Option B Gap (level vs increasing death benefit)`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/tatil-lifespan-and-cashbuilder.md · relation: conceptually_related_to
- `One-Third of Income Rule (s.134(6A))` → `Tax Envelope Optimizer`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/tatil-lifespan-and-cashbuilder.md · relation: conceptually_related_to
- `Option A vs Option B Gap (level vs increasing death benefit)` → `GoldSpoon / GoldSpoon Gift`  [AMBIGUOUS]
  research/ocr-extracted-corpus.md · relation: references
- `Platinum Edge` → `Publicsaver Life / Publicsaver DA`  [AMBIGUOUS]
  research/product-knowledge-base.md · relation: conceptually_related_to
- `Platinum Edge` → `Term vs Whole Life price gap (3.2x)`  [AMBIGUOUS]
  research/quotations-rate-grid.md · relation: conceptually_related_to
- `Rest Assured 2024 (Final Expense)` → `Cash surrender value tables`  [AMBIGUOUS]
  research/quotations-rate-grid.md · relation: conceptually_related_to
- `GoldSpoon / GoldSpoon Gift` → `Policy X-ray`  [AMBIGUOUS]
  C:/Projects/Financial-Planning-App/research/tatil-product-specifications.md · relation: conceptually_related_to
- `Budget-first (#-prefixed) reverse quotes` → `Tatil design system (teal + gold)`  [AMBIGUOUS]
  research/quotations-rate-grid.md · relation: conceptually_related_to

## Knowledge Gaps
- **29 isolated node(s):** `Foundational Planning`, `Needs Analysis (eMoney tier)`, `Monte Carlo Engine Specifics (unverified)`, `Finerio Connect / Ozone API / Visa Open-Banking Toolkit`, `Income Tax Act s.18D Deduction` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Data Protection Act 2011 (Chap. 22:04)` and `TTSEC Review of Algorithms and Methodologies`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Caribbean Bank Aggregation Coverage Gap` and `Finerio Connect / Ozone API / Visa Open-Banking Toolkit`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Class Z (Employment-Injury-Only Contribution)` and `Class Z Class-XVI typo corrected (220.72 → 20.72)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Class Z Class XVI Site Typo (220.72 vs 20.72)` and `Parameter Drift`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `750-Contribution Threshold` and `CARICOM reciprocal social security agreement`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `TT$60,000 Combined Deduction Cap` and `Premium banding non-linearity`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Universal Life` and `Annuities are IN SCOPE`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._