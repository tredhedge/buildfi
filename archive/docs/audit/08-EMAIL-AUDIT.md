# 08 — Email Audit

## Provider

- **Service**: Resend (buildfi.ca domain, VERIFIED)
- **From**: Configured via `RESEND_FROM` env var
- **Format**: Table-based HTML (maximum email client compatibility)
- **Language**: Bilingual FR/EN (determined by `lang` parameter)

## Email Types

### Report Delivery — `lib/email.ts`

4 tier-specific livraison templates:

| Tier | Subject (FR) | Content |
|------|-------------|---------|
| Essentiel | Votre Bilan est prêt | Report link, Guide PDF CTA, debt tool CTA |
| Intermédiaire | Votre Bilan 360 est prêt | Report link, Guide PDF, allocator tool, debt tool |
| Décaissement | Votre Horizon est prêt | Report link, simulator CTA, debt tool CTA |
| Expert | (separate file) | Magic link, portal access |

**Key function**: `sendReportEmail(email, tier, reportUrl, lang, feedbackToken)`

All templates include:
- Branded header (BuildFi logo)
- Report download link (Blob URL)
- Tier-specific bonus resources
- Feedback link (5-star survey via token)
- AMF disclaimer footer
- Unsubscribe placeholder

---

### Expert Emails — `lib/email-expert.ts` (~1,152 lines)

| Email | Trigger | Content |
|-------|---------|---------|
| Magic link | Expert purchase or login request | Token-based URL, 24h expiry, portal access |
| Report delivery | AI export generated | Report link, remaining credits count |
| Admin alert | New Expert signup | Profile summary, segment, email |
| Referral upgrade | Referral converts | Credit notification, stats |

---

### Feedback Pipeline — `lib/email-feedback.ts` (~296 lines)

| Email | Timing | Content |
|-------|--------|---------|
| J+3 survey | 3 days post-purchase | 5-star rating, comment box, referral link |
| J+7 reminder | 7 days post-purchase | Gentle nudge if no J+3 response |
| J+14 final | 14 days post-purchase | Last ask, bonus tool reminder |
| Referral conversion | When referred user purchases | Notification to referrer |

---

### Cron-Triggered Emails

| Email | Trigger | File |
|-------|---------|------|
| Renewal J-30 | 30 days before Expert expiry | `api/cron/renewal` |
| Renewal J-7 | 7 days before expiry | `api/cron/renewal` |
| Renewal J-0 | Expiry day | `api/cron/renewal` |
| Renewal J+3 | 3 days past expiry (grace) | `api/cron/renewal` |
| Anniversary 6-month | 6 months after purchase | `api/cron/anniversary` |

## Template Standards

- **Table-based layout** (no CSS grid/flexbox — email client compatibility)
- **Inline styles** (no `<style>` block — Gmail strips it)
- **Max width**: 600px
- **Brand colors**: Navy (#1a2744), Gold (#b8860b), Cream (#faf8f4)
- **Font stack**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **AMF disclaimer**: Present in every email footer
- **No tracking pixels** (privacy-first)

## Audit Checklist

- [ ] All 4 livraison templates send correctly for each tier
- [ ] Magic link URL uses www.buildfi.ca (not bare domain)
- [ ] Feedback token is unique per purchase (UUID)
- [ ] J+3/J+7/J+14 emails respect "no response" logic (don't send J+7 if J+3 was answered)
- [ ] Renewal sequence stops if user renews before expiry
- [ ] All emails render in Gmail, Outlook, Apple Mail (table-based)
- [ ] AMF disclaimer present in every email
- [ ] No PII in email subject lines
- [ ] Resend API key only in server-side env vars
- [ ] Domain warmup completed (gradual send volume increase)
