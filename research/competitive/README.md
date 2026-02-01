# Competitive Analysis: What EXISTS in the Market?

> **PP Dimension**: CREATIVITY
> **Core Question**: Who are we competing against and how do we differentiate?

---

## UK Tax Software Market Map

```
                         ┌─────────────────────────────────────┐
                         │           MARKET SEGMENTS           │
                         └─────────────────────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
    ┌─────▼─────┐                  ┌──────▼──────┐                 ┌──────▼──────┐
    │ CONSUMER  │                  │    SMB      │                 │ ENTERPRISE  │
    │ (Simple)  │                  │ (Business)  │                 │ (Complex)   │
    └─────┬─────┘                  └──────┬──────┘                 └──────┬──────┘
          │                               │                               │
    ┌─────┴─────┐              ┌──────────┼──────────┐             ┌──────┴──────┐
    │           │              │          │          │             │             │
  HMRC      SimpleTax      FreeAgent  Xero     QuickBooks     Sage        SAP
  (Free)    GoSimple       Crunch     Kashflow  FreshBooks   Oracle    Workday
```

---

## Competitor Matrix

### Direct Competitors (Self Assessment Focus)

| Product | Target | Pricing | Key Features | Weaknesses |
|---------|--------|---------|--------------|------------|
| **HMRC Online** | Everyone | Free | Official, direct | Poor UX, no guidance |
| **GoSimpleTax** | Individuals | £40-90/yr | Simple SA, guidance | Limited business |
| **SimpleTax** | Individuals | £45/yr | Clean UI | Basic features |
| **TaxScouts** | Individuals | £169+ | Accountant review | Expensive |
| **Untied** | Gig workers | £36-60/yr | Bank feeds, MTD | Niche focus |

### Accounting Software (SA as Feature)

| Product | Target | Pricing | SA Support | Notes |
|---------|--------|---------|------------|-------|
| **FreeAgent** | Freelancers | £14-40/mo | Yes | Strong SA, NatWest free |
| **Xero** | SMBs | £15-50/mo | Via partners | Market leader |
| **QuickBooks** | SMBs | £12-35/mo | Yes | Good integration |
| **Sage** | SMBs | £12-30/mo | Yes | Legacy player |
| **Crunch** | Contractors | £100+/mo | Yes | Accountant included |

### Accountancy Firms

| Type | Typical Cost | What They Offer |
|------|--------------|-----------------|
| High street accountant | £300-800/yr | Full service |
| Online accountant | £50-150/mo | Remote service |
| Tax agent | £100-300/return | Filing only |

---

## Competitive Deep Dives

### 1. HMRC Online (Free Baseline)
```
Strengths:
✓ Free
✓ Official
✓ Direct submission

Weaknesses:
✗ Terrible UX
✗ No guidance
✗ No calculations help
✗ No reminders
✗ No support

→ OPPORTUNITY: Better UX, guidance, reminders
```

### 2. GoSimpleTax
```
Website: gosimpletax.com
Pricing: £45-90/year

Strengths:
✓ UK-focused
✓ Step-by-step guidance
✓ Reasonable price
✓ Good reviews

Weaknesses:
✗ Dated interface
✗ Limited automation
✗ No bank feeds
✗ Basic reporting

→ OPPORTUNITY: Modern UX, automation, bank integration
```

### 3. FreeAgent
```
Website: freeagent.com
Pricing: £14-40/month (Free with NatWest)

Strengths:
✓ Beautiful UI
✓ Full accounting
✓ Bank feeds
✓ MTD compliant
✓ Strong SA support

Weaknesses:
✗ Monthly subscription adds up
✗ Overkill for simple SA
✗ Complex for beginners

→ OPPORTUNITY: Simple SA focus, lower price point
```

### 4. Untied
```
Website: untied.io
Pricing: £36-60/year

Strengths:
✓ Clean mobile-first design
✓ Bank feed automation
✓ MTD ready
✓ Good for gig workers

Weaknesses:
✗ Narrow focus (gig/side income)
✗ Limited for businesses
✗ Young company

→ OPPORTUNITY: Broader entity support
```

### 5. TaxScouts
```
Website: taxscouts.com
Pricing: £169+ per return

Strengths:
✓ Human accountant review
✓ Peace of mind
✓ Simple process

Weaknesses:
✗ Expensive
✗ Not real-time
✗ Limited control

→ OPPORTUNITY: AI-powered review at lower cost
```

---

## Market Gaps & Opportunities

### 1. UX Gap
Most tax software has poor UX compared to modern fintech (Monzo, Starling)
→ **TaxSorted opportunity**: Fintech-grade experience

### 2. Price/Value Gap
| Segment | Current Options | Gap |
|---------|-----------------|-----|
| Simple SA | Free (HMRC) or £40+ | Middle ground with better UX |
| Sole traders | £150-500/yr (accounting) | £50-100 focused tool |
| Side hustlers | Untied (niche) or complex apps | Mainstream simple option |

### 3. Guidance Gap
HMRC is confusing, software assumes knowledge
→ **TaxSorted opportunity**: Plain English, contextual help

### 4. Automation Gap
Manual data entry still common
→ **TaxSorted opportunity**: Bank feeds, OCR receipts, auto-categorization

### 5. Mobile Gap
Most competitors are desktop-first
→ **TaxSorted opportunity**: Mobile-first design

---

## Research Tasks

### Competitor Product Review
- [ ] Sign up for free trials of each competitor
- [ ] Document complete user flows
- [ ] Screenshot key screens
- [ ] Note pain points experienced
- [ ] Review pricing pages in detail

### Market Positioning
- [ ] Identify underserved segments
- [ ] Define unique value proposition
- [ ] Map feature priorities vs competition
- [ ] Develop positioning statement

### User Research (via competitors)
- [ ] Review Trustpilot/App Store ratings
- [ ] Analyze common complaints
- [ ] Identify most-requested features
- [ ] Understand switching triggers

### Pricing Research
- [ ] Detailed competitor pricing comparison
- [ ] Willingness-to-pay research
- [ ] Pricing model options (subscription vs per-return)
- [ ] Freemium vs paid-only analysis

---

## Files to Create

```
competitive/
├── README.md (this file)
├── uk-tax-software/
│   ├── gosimpletax.md
│   ├── freeagent.md
│   ├── untied.md
│   ├── taxscouts.md
│   └── others.md
├── hmrc-tools/
│   ├── online-service.md
│   └── mtd-compatible.md
├── accountancy-firms/
│   ├── online-accountants.md
│   └── traditional.md
├── feature-comparison/
│   ├── feature-matrix.md
│   └── ux-comparison.md
└── pricing-analysis/
    ├── pricing-models.md
    └── market-rates.md
```

---

## TaxSorted Positioning (Draft)

```
FOR:        UK sole traders and individuals with Self Assessment
WHO:        Find tax confusing and time-consuming
TAXSORTED:  Is a tax filing app
THAT:       Makes Self Assessment simple and stress-free
UNLIKE:     HMRC's confusing interface or expensive accountants
WE:         Provide guided, automated tax filing with plain English
```

---

## Sources

- [Trustpilot Reviews](https://uk.trustpilot.com)
- [App Store Reviews](https://apps.apple.com)
- [Capterra UK](https://www.capterra.co.uk/directory/30005/tax/software)
- [G2 Crowd](https://www.g2.com/categories/tax)
- Competitor websites (pricing pages, feature lists)
