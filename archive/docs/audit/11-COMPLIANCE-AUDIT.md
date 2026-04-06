# 11 — Compliance Audit

## Regulatory Framework

BuildFi operates as an **educational financial tool** in Canada. It is NOT a financial advisor, tax advisor, or legal advisor. This distinction drives all compliance requirements.

## 1. AMF/OSFI Compliance (Financial Language)

**Authority**: Autorité des marchés financiers (Quebec), OSFI (federal)
**Requirement**: Financial projections must not constitute advice or recommendations.

### Forbidden Terms (48 terms — `lib/ai-constants.ts`)

**French**:
devriez, recommandons, conseillons, il faut, devez, assurez-vous, considérez, optimisez, priorisez, plan d'action, recommandation(s), il est essentiel, vous avez intérêt, la meilleure option, stratégie optimale

**English**:
should, recommend, must, need to, have to, make sure, consider, optimize, prioritize, action plan, recommendation(s), it is essential, your best option, optimal strategy

### Required Language

| Context | Requirement | Example |
|---------|-------------|---------|
| Projections | Conditional tense | "Votre patrimoine pourrait atteindre..." / "Your wealth could reach..." |
| Facts from data | Present tense OK | "Votre taux de réussite est 72 %" |
| Observations | Observational only | "Les données indiquent..." / "The data indicates..." |
| Suggestions | Soft framing | "Il serait parfois pertinent de..." / "It could be relevant to..." |

### Enforcement

1. **AI prompt system messages** include explicit forbidden terms list
2. **Sanitizer functions** (`sanitizeAISlots*`) regex-replace violations post-generation
3. **Pre-commit grep** catches violations in static text:
   ```bash
   grep -rn "devriez\|recommandons\|vous devez\|il faut que" lib/ public/
   ```
4. **Report static text** uses conditional tense throughout

### Disclaimers (present in every report + email + landing page)

> BuildFi n'est pas un conseiller financier, fiscal ou juridique. Les projections sont des estimations statistiques basées sur la méthode Monte Carlo et ne constituent pas des garanties de rendement futur. Consultez un professionnel certifié avant de prendre des décisions financières.

---

## 2. Law 25 (Quebec Privacy — Loi 25)

**Authority**: Commission d'accès à l'information du Québec
**Effective**: September 2023 (full enforcement)

### Requirements & Implementation

| Requirement | Implementation | File |
|-------------|---------------|------|
| Privacy policy | Published at `/confidentialite.html` | `public/confidentialite.html` |
| Cookie consent | Consent bar on all pages (accept/decline) | All quiz + landing HTML files |
| Consent gate | Analytics (PostHog) only fires after explicit consent | `localStorage.getItem('buildfi_consent') === 'yes'` |
| Privacy officer | "Le dirigeant de BuildFi Technologies inc." designated | Privacy policy |
| Data minimization | Only collect data needed for report generation | Quiz fields = MC input parameters |
| Right to deletion | GDPR delete endpoint exists | `POST /api/data/delete` |
| Breach notification | Process documented (not yet tested) | Internal |

### Cookie Consent Implementation

```javascript
// Present on every page with analytics
if (!localStorage.getItem('buildfi_consent')) {
  // Show consent bar (Accept / Decline)
}
// PostHog only fires if consent === 'yes'
if (localStorage.getItem('buildfi_consent') === 'yes' && window.posthog) {
  posthog.capture(event, props);
}
```

---

## 3. CPA Compliance (Consumer Protection)

**Authority**: Office de la protection du consommateur (Quebec)

| Requirement | Implementation |
|-------------|---------------|
| Terms acceptance before purchase | Checkbox on all quiz pages + server validation in checkout API |
| Clear pricing | Prices displayed with original + discounted amount |
| No hidden fees | "Paiement unique" stated everywhere |
| Refund policy | Clearly stated: digital product, no refund, technical issues corrected |
| Business identification | "BuildFi Technologies inc." in footer + legal pages |

---

## 4. PCI DSS (Payment Security)

| Requirement | Implementation |
|-------------|---------------|
| Card data handling | BuildFi NEVER sees card numbers — Stripe hosted checkout |
| Stripe certification | PCI DSS Level 1 (highest) |
| API keys | Server-side only (Vercel env vars) |
| Publishable key | Client-side OK (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) |
| Webhook verification | Stripe signature verified before processing |

---

## 5. Data Security

| Measure | Implementation |
|---------|---------------|
| API keys | Vercel env vars only, never client-side |
| Anthropic API | Server-side only, never exposed to browser |
| MC engine | Server-side only, never runs in browser |
| Report URLs | Random suffix (unguessable), public access |
| KV data | Upstash Redis with TLS, token-authenticated |
| Email | Resend with verified domain, no tracking pixels |

---

## 6. Accessibility

| Standard | Status |
|----------|--------|
| Skip navigation link | Present on all pages |
| Semantic HTML | Headers, landmarks, ARIA labels |
| Keyboard navigation | Focus-visible outlines |
| Color contrast | Navy/cream meets WCAG AA |
| Screen reader | ARIA labels on interactive elements |
| Reduced motion | `prefers-reduced-motion` media query respected |

---

## Legal Pages

| Page | URL | Content |
|------|-----|---------|
| Privacy Policy | `/confidentialite.html` | Data collection, retention, rights, privacy officer |
| Terms of Service | `/conditions.html` | Usage terms, liability limits, refund policy |
| Legal Disclaimer | `/avis-legal.html` | Not financial advice, MC methodology limits, disclaimers |

## Audit Checklist

- [ ] AMF grep returns 0 violations across all lib/ and public/ files
- [ ] AI sanitizer catches all 48 forbidden terms
- [ ] Cookie consent bar present on all pages with analytics
- [ ] PostHog only fires after explicit consent
- [ ] Terms checkbox required before checkout (all quiz pages)
- [ ] Server-side terms validation in checkout API
- [ ] Privacy policy accessible and up-to-date
- [ ] Disclaimer present in every report, email, and landing page
- [ ] No API keys in client-side code (grep for ANTHROPIC, STRIPE_SECRET, RESEND)
- [ ] GDPR delete endpoint purges all user data
- [ ] Card numbers never touch BuildFi servers (Stripe hosted checkout)
- [ ] All legal pages bilingual (FR/EN)
