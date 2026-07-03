// /lib/consent-version.ts
// Client-safe single source of truth for the privacy-policy consent version.
// Imported by BOTH the server consent module (lib/consent.ts) and the client
// checkout surfaces (/wizard, /acheter-planner, /expert) so the version can
// never drift between what the client sends and what the server enforces —
// a mismatch makes /api/checkout reject every purchase with consent_required.
//
// Bump whenever /confidentialite content changes in a way that affects what
// users consented to (data categories, sub-processors, retention, rights).
// Format: YYYY-MM-DD-vN.
export const CURRENT_POLICY_VERSION = "2026-07-02-v2";
