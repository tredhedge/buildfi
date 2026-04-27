# Loi 25 / LPRPDE — Breach Runbook

**Owner:** support@buildfi.ca
**Last reviewed:** 2026-04-26
**Status:** Document only — no automated alerting yet (Sprint 7 deferral).

---

## What constitutes a breach

A "confidentiality incident" under Quebec's Loi 25 is **any unauthorized
access, use, communication, loss, or disclosure** of personal information.
Under PIPEDA (federal), the equivalent is a "breach of security safeguards."

Examples that trigger this runbook:
- Vercel KV (Upstash) credential leak
- Stripe webhook secret leak
- Anthropic API key compromise that results in prompt + response retention
  beyond the documented 30-day window
- A successful injection attack against `/api/checkout` or `/api/refund`
  that exposes another user's data
- A bug that emails a report to the wrong user
- Lost / stolen developer laptop with production credentials

NOT a breach (no notification required, but log internally):
- Failed login attempts on the magic-link endpoints (rate-limited)
- Stripe declining a card (payment data never reaches our system)
- A user requesting their own data via `/api/data/export`

---

## 72-hour clock

Both Loi 25 (Article 3.5 of the Quebec Privacy Act) and PIPEDA (PIPEDA
breach reporting regulations) require notification **without unreasonable
delay** when the incident **presents a real risk of significant harm**.

In practice: assume 72 hours from the moment a person at BuildFi knew
or ought to have known about the incident.

---

## Step 1 — Contain (within 1 hour)

1. Rotate the affected credential. If unsure, rotate ALL of:
   - `STRIPE_SECRET_KEY` (Stripe Dashboard → Developers → API keys)
   - `STRIPE_WEBHOOK_SECRET` (Webhooks settings)
   - `ANTHROPIC_API_KEY` (console.anthropic.com → API keys)
   - `KV_REST_API_TOKEN` (Upstash console)
   - `RESEND_API_KEY` (Resend dashboard)
2. Revoke the old key. Confirm the rotation by hitting `/api/health` (or
   any endpoint) — must succeed with the NEW key, fail with the old.
3. If the leak is in code (e.g. accidentally committed), force-push a
   sanitizing commit AND scrub git history (`git filter-repo` or
   BFG Repo-Cleaner), then rotate keys regardless.

## Step 2 — Assess scope (within 4 hours)

Pull from observability:
- Vercel function logs for the leaked endpoint, last 30 days
- Stripe events for the leaked key window
- Upstash query log for the leaked KV token
- Anthropic API usage panel for leaked-key window

Estimate:
- How many users had data accessed/exposed?
- What categories of personal information (email, financial inputs,
  generated report content)?
- Time window of the exposure?

## Step 3 — User notification (within 72h if material risk)

Use the **user notification template** below. Required fields per Loi 25
Article 3.5:
- Description of the personal information involved
- Nature of the incident
- Date or estimated date
- Causes (if known)
- Measures taken to mitigate
- Measures the user can take to reduce risk
- BuildFi contact for follow-up

Send via Resend from `support@buildfi.ca`. Subject prefix: `[Important
— Loi 25 notification]`.

## Step 4 — CAI (Quebec) notification (within 72h if material risk)

The Commission d'accès à l'information du Québec accepts breach reports
via:
- Online form: https://www.cai.gouv.qc.ca/declaration-incident-confidentialite
- Email: incident.confidentialite@cai.gouv.qc.ca
- Mail (slow): 575, rue Saint-Amable, Bureau 1.10, Québec (QC) G1R 2G4

Use the **CAI notification template** below.

## Step 5 — OPC (federal) notification (PIPEDA, within 72h if material risk)

If the incident creates a real risk of significant harm AND PIPEDA
applies (federal jurisdiction or out-of-Quebec users), file with the
Office of the Privacy Commissioner:
- Online form: https://www.priv.gc.ca/en/report-a-concern/report-a-privacy-breach-at-your-organization/

## Step 6 — Internal record (always)

Log in `incidents/YYYY-MM-DD-{slug}.md` (private repo):
- Timeline of detection, containment, notification
- Affected user count
- Root cause
- Remediation steps taken
- Process changes adopted

---

## User notification template (FR)

```
Sujet : [Important — Notification Loi 25] Incident de confidentialité

Bonjour,

Cette communication vous est envoyée conformément à la Loi 25 du
Québec sur la protection des renseignements personnels.

Un incident de confidentialité s'est produit le [date] et a pu
toucher vos renseignements personnels chez BuildFi.

Renseignements concernés : [liste précise — courriel, données de quiz,
contenu du rapport]

Nature de l'incident : [description courte sans jargon technique]

Mesures que nous avons prises :
- [contenance]
- [rotation des clés]
- [analyse de l'étendue]

Mesures que vous pouvez prendre pour réduire le risque :
- Surveiller votre compte Stripe pour des transactions inhabituelles
- Modifier votre adresse courriel BuildFi en nous écrivant à support@buildfi.ca
- En cas de doute, déposer une plainte à la Commission d'accès à
  l'information : https://www.cai.gouv.qc.ca

Pour toute question : support@buildfi.ca

L'équipe BuildFi
BuildFi Technologies inc.
```

## User notification template (EN)

```
Subject: [Important — Privacy notification] Confidentiality incident

Hello,

This message is sent in accordance with Quebec's Law 25 (Loi 25) on the
protection of personal information.

A confidentiality incident occurred on [date] that may have affected your
personal information at BuildFi.

Information involved: [precise list — email, quiz data, report content]

Nature of the incident: [short non-technical description]

What we have done:
- [containment]
- [key rotation]
- [scope analysis]

What you can do to reduce risk:
- Monitor your Stripe account for unusual transactions
- Change your BuildFi email by writing to support@buildfi.ca
- If concerned, file a complaint with the Quebec Commission d'accès à
  l'information: https://www.cai.gouv.qc.ca

For any question: support@buildfi.ca

The BuildFi team
BuildFi Technologies inc.
```

## CAI notification template

```
Organization: BuildFi Technologies inc.
Contact: support@buildfi.ca
Date of incident: [YYYY-MM-DD]
Date of detection: [YYYY-MM-DD]
Number of affected individuals: [count]
Categories of personal information: [list]
Nature of the incident: [description]
Cause (if known): [credential leak / injection / lost device / etc.]
Containment measures: [credential rotation / patch / etc.]
Notification status: [users notified on YYYY-MM-DD via email]
Risk of significant harm: [yes / no — with rationale]
```

---

## Escalation paths

| Vendor | Contact | When |
|---|---|---|
| Vercel | https://vercel.com/help — Premium ticket | KV/Blob incident, function exposure |
| Upstash | support@upstash.com | KV credential rotation issue |
| Stripe | https://support.stripe.com — Premium ticket | Webhook secret leak, fraudulent refund |
| Resend | support@resend.com | Email logs leak, account takeover |
| Anthropic | https://support.anthropic.com | API key compromise, prompt retention question |

---

## What's NOT in this runbook (next iteration)

- Automated alerting on credential leak detection (e.g. GitHub secret
  scanning, gitleaks pre-commit)
- Disaster recovery / backup restoration procedure
- Penetration test cadence
- Annual breach drill
