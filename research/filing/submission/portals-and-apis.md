# Filing Submission: Portals & APIs

> **Purpose**: Document where filings are submitted and API availability
> **Last Updated**: 2026-02-01

---

## Summary: API Availability

| Authority | Portal | API Available? | API Type |
|-----------|--------|----------------|----------|
| **HMRC** | Government Gateway | Yes | REST (MTD), XML (legacy) |
| **Companies House** | WebFiling | Yes | REST |
| **Charity Commission** | CC Online | Limited | No public API |
| **FCA Mutuals** | FCA Connect | No | Portal only |
| **TRS** | Government Gateway | Yes | Via HMRC APIs |

---

## HMRC

### Submission Portals

| Portal | URL | Used For |
|--------|-----|----------|
| **Government Gateway** | gov.uk/log-in-register-hmrc-online-services | All HMRC services |
| **HMRC Online Services** | tax.service.gov.uk | SA, PAYE, VAT |
| **Commercial Software** | Via APIs | MTD, CT600, SA |

### APIs Available

#### Making Tax Digital (MTD) APIs

| API | Purpose | Status |
|-----|---------|--------|
| **VAT (MTD)** | Submit VAT returns | Live |
| **Income Tax (MTD)** | Quarterly updates, EOPS, Final Declaration | Live (pilot) |
| **Business Details** | Retrieve business information | Live |
| **Obligations** | Check filing obligations | Live |
| **Individual Calculations** | Tax calculations | Live |

**MTD API Documentation**: https://developer.service.hmrc.gov.uk/api-documentation

#### Other HMRC APIs

| API | Purpose | Status |
|-----|---------|--------|
| **Self Assessment (SA)** | Submit SA100 and supplements | Live (XML) |
| **Corporation Tax** | Submit CT600 | Live (via iXBRL) |
| **PAYE RTI** | Submit FPS, EPS | Live |
| **CIS** | Construction Industry Scheme | Live |

### HMRC Developer Hub

**URL**: https://developer.service.hmrc.gov.uk/

| Resource | Description |
|----------|-------------|
| **API Documentation** | Full specs for all APIs |
| **Sandbox** | Test environment |
| **Production** | Live submission |
| **OAuth 2.0** | Authentication method |

### Authentication

| Method | Used For |
|--------|----------|
| **OAuth 2.0** | MTD APIs (user grants access) |
| **Government Gateway credentials** | Portal access |
| **Agent services account** | Agents filing for clients |

### Becoming a Software Provider

| Step | Requirement |
|------|-------------|
| **1. Register** | Create developer account |
| **2. Sandbox testing** | Test in sandbox environment |
| **3. Apply for production** | Submit application |
| **4. Production credentials** | Receive OAuth credentials |
| **5. Recognition** | Listed on HMRC software list |

---

## Companies House

### Submission Portal

| Portal | URL | Used For |
|--------|-----|----------|
| **WebFiling** | beta.companieshouse.gov.uk | Most filings |
| **Software Filing** | Via API | Accounts, CS01, changes |
| **XMLGW** | XML Gateway (legacy) | Bulk filing |

### Companies House API

**URL**: https://developer.company-information.service.gov.uk/

| API | Purpose | Auth Required |
|-----|---------|---------------|
| **Company Search** | Look up company data | API key |
| **Filing History** | View past filings | API key |
| **Officers** | Director information | API key |
| **PSC** | Persons with Significant Control | API key |
| **Charges** | Company charges | API key |
| **Insolvency** | Insolvency data | API key |

### Filing API (Transactional)

| Endpoint | Purpose |
|----------|---------|
| **Accounts submission** | File annual accounts |
| **Confirmation statement** | File CS01 |
| **Change of details** | Director/address changes |
| **Incorporation** | New company formation |

**Note**: Filing API requires separate application and approval.

### Authentication

| Method | Used For |
|--------|----------|
| **API Key** | Read-only access (search, data) |
| **OAuth 2.0** | Transactional filing |
| **Company authentication code** | Verify authority to file |

### Software Filing Requirements

| Requirement | Detail |
|-------------|--------|
| **iXBRL** | Accounts must be tagged |
| **Taxonomies** | UK GAAP, FRS 101/102/105 |
| **Testing** | Sandbox environment available |
| **Approval** | Must be approved by CH |

---

## Charity Commission

### Submission Portal

| Portal | URL | Used For |
|--------|-----|----------|
| **Charity Commission Online** | ccni.charitycommission.gov.uk | Annual Return |
| **Update charity details** | Same portal | In-year changes |

### API Availability

| API | Status |
|-----|--------|
| **Charity Search** | Public (read-only) |
| **Filing API** | Not available |
| **Bulk data** | Download available |

**Charity Search API**: https://register-of-charities.charitycommission.gov.uk/

### Filing Method

| Filing | Method |
|--------|--------|
| **Annual Return** | Online portal only |
| **Accounts** | PDF upload via portal |
| **Trustee changes** | Online portal |
| **Serious incidents** | Online portal |

**No programmatic submission** - must use portal.

---

## FCA (Mutuals)

### Submission Portal

| Portal | URL | Used For |
|--------|-----|----------|
| **FCA Connect** | connect.fca.org.uk | All FCA filings |

### API Availability

| API | Status |
|-----|--------|
| **Filing API** | Not available |
| **Data API** | Limited |

### Filing Method

| Filing | Method |
|--------|--------|
| **Annual Return** | FCA Connect portal |
| **Accounts** | Upload via portal |
| **Rule changes** | Portal submission |

**No programmatic submission** - must use FCA Connect.

---

## Trust Registration Service (TRS)

### Submission Portal

| Portal | URL | Used For |
|--------|-----|----------|
| **TRS** | tax.service.gov.uk/trusts | Trust registration |
| **Agent portal** | Via agent services | Agent registration |

### API Availability

| API | Status |
|-----|--------|
| **TRS API** | Available (via HMRC) |
| **Trust details** | Submit/update trust info |
| **Beneficial owners** | Manage BO information |

**Documentation**: Part of HMRC Developer Hub

### Authentication

Same as HMRC - OAuth 2.0 via Government Gateway.

---

## iXBRL Requirements

### What Requires iXBRL

| Filing | iXBRL Required? |
|--------|-----------------|
| **CT600** | Yes (with accounts) |
| **CH Accounts** | Yes (online filing) |
| **SA100** | No |
| **VAT100** | No |

### iXBRL Taxonomies

| Taxonomy | Used For |
|----------|----------|
| **UK GAAP** | FRS 102 accounts |
| **FRS 101** | Reduced disclosure |
| **FRS 105** | Micro-entities |
| **IFRS** | Listed companies |
| **Charities SORP** | Charity accounts |

### iXBRL Software

| Type | Examples |
|------|----------|
| **Integrated** | Sage, Xero, QuickBooks |
| **Standalone tagging** | IRIS, Caseware, Silverfin |
| **Conversion services** | DataTracks, ParsePort |

---

## API Integration Summary for TaxSorted.io

### High Priority (APIs Available)

| Filing | API | Integration Complexity |
|--------|-----|------------------------|
| **VAT (MTD)** | HMRC MTD | Medium |
| **SA100** | HMRC SA API | Medium-High |
| **CT600** | HMRC + iXBRL | High |
| **PAYE/RTI** | HMRC RTI | Medium |
| **CH Accounts** | CH Filing API | High (iXBRL) |
| **CS01** | CH Filing API | Low-Medium |
| **TRS** | HMRC TRS API | Medium |

### Portal-Only (No API)

| Filing | Workaround |
|--------|------------|
| **CC Annual Return** | Remind users, provide data export |
| **FCA Annual Return** | Remind users, provide data export |
| **CIC Report** | Filed with CH accounts |

---

## Developer Registration Process

### HMRC

| Step | Action | Timeline |
|------|--------|----------|
| **1** | Register on Developer Hub | Immediate |
| **2** | Create sandbox application | Immediate |
| **3** | Build and test | Variable |
| **4** | Apply for production | 2-4 weeks review |
| **5** | Production access | After approval |

**URL**: https://developer.service.hmrc.gov.uk/developer/registration

### Companies House

| Step | Action | Timeline |
|------|--------|----------|
| **1** | Register for API key | Immediate |
| **2** | Test read-only APIs | Immediate |
| **3** | Apply for filing API | Longer process |
| **4** | Integration testing | Required |
| **5** | Production approval | After testing |

**URL**: https://developer.company-information.service.gov.uk/

---

## Rate Limits & Quotas

### HMRC

| Limit | Value |
|-------|-------|
| **Per application** | Varies by API |
| **Sandbox** | Higher limits for testing |
| **Production** | Contact for high volume |

### Companies House

| Limit | Value |
|-------|-------|
| **Search API** | 600 requests per 5 minutes |
| **Filing API** | Subject to approval |

---

## Sources

### HMRC
- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/)
- [MTD API Documentation](https://developer.service.hmrc.gov.uk/api-documentation)
- [Recognised software list](https://www.gov.uk/guidance/software-for-sending-income-tax-updates)

### Companies House
- [CH API](https://developer.company-information.service.gov.uk/)
- [CH Filing API](https://developer-specs.company-information.service.gov.uk/)

### Others
- [Charity Commission Data](https://register-of-charities.charitycommission.gov.uk/)
- [FCA Connect](https://www.fca.org.uk/firms/fca-connect)

---

*Submission methods compiled: 2026-02-01*
