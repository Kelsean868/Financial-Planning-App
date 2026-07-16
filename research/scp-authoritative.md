# Senior Citizens' Pension — Authoritative, Scraped From Source

**Sources:** social.gov.tt (Ministry of the People, Social Development and Family Services), fetched 2026-07-16 via Firecrawl.
**Status:** 🟢 **RESOLVES the project's longest-running open question.** 🔴 **And corrects a SECOND wrong verification.**

---

## 🟢 CONFIRMED — the SCP bands, from the Ministry's own page

`https://www.social.gov.tt/senior-citizens-pension` states verbatim:

> **Senior Citizens' Monthly Pension Maximum – $3,500.00**
> - Income not exceeding **$2,500** receives **$3,500.00**
> - Income exceeding $2,500 but not exceeding **$3,500** receives **$2,500.00**
> - Income exceeding $3,500 but not exceeding **$4,500** receives **$1,500.00**
> - Income exceeding $4,500 but not exceeding **$5,500** receives **$500.00**

Plus: **Age 65+**. **Income must not exceed $5,500/month.** Residency: **20 years preceding application** (absences ≤ 5 years total), **OR 50 years in total** (not necessarily consecutive).

**The repo's bands match this exactly.**

---

## 🟢 RESOLVED — NIS pension IS assessed income

This is the question that survived three research rounds unanswered. The **official application form** settles it:

> **"6. Evidence of National Insurance Benefits / other Pension / Benefits"** — *listed among the required documents*
>
> **"31. (a) Are you a Government or other pensioner? … (b) If so, how much is your monthly pension?"**
>
> **"14. (a) Is/was wife or husband a Senior Citizens' Pensioner? … (b) What income is derived from it?"**

The form **requires evidence of National Insurance benefits** and **asks the monthly pension amount**. The Ministry's own eligibility clarification confirms the mechanism in action:

> "the Ministry established that the applicant is **in receipt of an alternative monthly income**. As a result, the applicant did not meet the programme's income eligibility requirements and was therefore not approved."

**Conclusion: NIS retirement pension counts toward the SCP means test. The founder was right; the repo was right.**

---

## 🔥 THE INTERACTION IS REAL — and now provable from two primary sources

Combining the confirmed SCP bands with the [confirmed NIBTT benefit table](nibtt-authoritative-rates.md):

| Client | NIS | Assessed income | SCP | **Total** |
|---|---|---|---|---|
| **No NIS pension** (< 750 contributions → grant instead) | $0 | $0 | **$3,500** | **$3,500** |
| **NIS minimum pension** (750+ contributions) | $3,000 | $3,000 | **$2,500** | **$5,500** |

**A $3,000 NIS pension delivers $2,000 of additional retirement income.** A third of it is offset by reduced SCP.

And recall from the NIBTT table: **every basic benefit rate, all 16 classes, is below $3,000** — so the overwhelming majority of NIS retirees land at *exactly* the $3,000 minimum, which sits *exactly* in the band that pays $2,500. **This is not an edge case. It is the modal outcome.**

### The cliff edges are real too

$2,500 / $3,500 / $4,500 / $5,500 are hard thresholds. **At $5,501 of assessed income, SCP goes to zero — one extra dollar costs $500/month.** The engine must refuse to land a client just over a cliff without flagging it.

### The genuinely counter-intuitive fact

**SCP's maximum ($3,500) exceeds the NIS minimum pension ($3,000).** A person who never qualified for an NIS pension can receive *more* from SCP alone than someone with 750 contributions receives from NIS. Combined with the "20 years of contributions just to beat the floor" finding, this is the sharpest honest fact in the whole domain.

---

## 🔴 SECOND WRONG VERIFICATION — a pattern, not an accident

[parameter-verification-2026-07.md](parameter-verification-2026-07.md) **refuted these exact bands 1–2** and reported the NIS-as-income question as unanswerable. It also caused me to downgrade the interaction in the spec to an "unverified hypothesis" and write:

> *"If NIS pension is not assessed income, there is no clawback and the insight is fiction."*

**It is not fiction. It is the Ministry's published schedule and its own application form.**

That is now **two** confidently wrong verification results, both on things the founder's repo had right:
1. **NIBTT benefit rates** — fabricated a "2016 schedule" and a 40% understatement (3–0). Repo was correct.
2. **SCP bands** — refuted the correct bands 1–2 and declared the interaction unverifiable. Repo was correct.

**Both errors ran the same direction: they overrode a practitioner's domain knowledge with search-derived speculation, and both would have degraded the product.** In each case the authoritative answer was on the issuing agency's own website the entire time.

**The rule, now proven twice:** *search-and-verify is for questions with no authoritative publisher. When an agency publishes the number, scrape the agency. A unanimous or majority vote over search results is not evidence.*

---

## ⚠️ Also found: the application form is stale

The linked **SCP application form (2020)** states:

> "3. The person's income must not exceed **$4,500.00** per month."

The Ministry's **current page says $5,500**. The form is a revision behind — *the same failure as the Ministry of Finance's TT$30,000 annuity page and NIBTT's 13.2% FAQ.* **Three government sources, three stale documents.** The parameter rule holds: source + date per parameter, and prefer the maintained page over the linked PDF.

---

## Encode

```
SCP_BANDS (source: social.gov.tt/senior-citizens-pension, retrieved 2026-07-16)
  assessed_income <= 2500            -> 3500
  2500 <  assessed_income <= 3500    -> 2500
  3500 <  assessed_income <= 4500    -> 1500
  4500 <  assessed_income <= 5500    ->  500
  assessed_income >  5500            ->    0   # hard disqualification

SCP_AGE = 65
SCP_RESIDENCY = 20 years preceding (absences <= 5 yrs) OR 50 years aggregate
ASSESSED_INCOME includes NIS retirement pension   # confirmed: form item 6 & 31
                excludes one-time NIS grant       # grant is not monthly income
```

## Still open
- **The Senior Citizens' Pension Act (Chap. 32:02) text** — `laws.gov.tt` is DNS-blocked from this environment; Firecrawl reaches it but the `/ttdll-web/revision/download/43781?type=act` endpoint returns raw PDF bytes it doesn't parse. The Ministry's published schedule is sufficient to build on; the Act would add the statutory definition of "income" and confirm whether the grant is excluded by law rather than by inference.
- Whether SCP is *reduced* pound-for-pound or steps by band only — the published table is banded, so **banded** is the implementation.
