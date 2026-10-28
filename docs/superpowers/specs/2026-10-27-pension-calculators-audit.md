# Audit: T&T calculator repos vs FY2027 rules (copy of the claude.ai Project doc, 27 Oct 2026)

Repos: `T-T-Financial-Insurance-Hub` (hub) and `paye-annuity-calculator-tt` (paye). Report only.

## Still current (use as parameter rows, with source and date)
PAYE $90,000 allowance, 25% / 30% above $1M; $60,000 deduction cap; 70% of NIS deductible; health surcharge
$8.25 / $4.80 a week; NIS ceiling $13,600 a month; NIS minimum pension $3,000; public-service formula (1/600 a
month, 400-month cap, ¼ commuted × 12.5, $3,500 minimum). SCP $3,750 from 1 Jan 2027; NIS + SCP capped at $5,500.
NIS contribution table changed to 16.2% total on 5 Jan 2026. Pensioner allowance $102,000 from 1 Jan 2027.

## For the fact-finder engine
- **Pension from work** (none / public service / company plan) is an income source in `needs/retirement.ts`.
- Public service: 1/600 per month of service, 400-month cap, $3,500 minimum, retirement capped at 60, 10-year
  minimum; full pension, or reduced pension plus gratuity. Values are parameter-table rows. Protective services
  (police, fire, prisons) are excluded.
- From Jan 2028 the full NIS pension age rises one year every two years, to 65 by 2036. Early-pension reduction
  rate is not published: do not invent one.

## Could not verify
The 2027 NIS class table (rate rises ~3 points from 4 Jan 2027, table unpublished), SCP income bands, NIS
early-pension reduction rate, public-service salary averaging rule, annuity conversion rates. Mark these
"unverified" in the parameter table; do not guess values.

Sources: EY FY2027 budget review; Budget Statement 12 Oct 2026 (finance.gov.tt); NIBTT contribution table
5 Jan 2026; Trinidad Guardian 17 Oct 2026; CNC3 17 Oct 2026; PSA pensions FAQ; CBTT pension reform paper 2023.
