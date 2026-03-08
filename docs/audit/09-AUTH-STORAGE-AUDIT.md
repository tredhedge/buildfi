# 09 — Auth & Storage Audit

## Storage Systems

### Vercel KV (Upstash Redis) — `lib/kv.ts` (~492 lines)

Primary state store for Expert tier, referrals, feedback, and idempotency.

**Key patterns**:

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `expert:{email}` | Expert profile (quiz data, saved state, export credits, expiry) | 1 year (renewed) |
| `token:{uuid}` | Magic link token → email mapping | 24 hours |
| `processed:{stripe_session_id}` | Webhook idempotency | 7 days |
| `feedback:{uuid}` | Feedback record (tier, email, purchase date, responses) | 90 days |
| `referral:{code}` | Referral tracking (referrer email, conversions, clicks) | Permanent |
| `ratelimit:{ip}:{endpoint}` | Sliding-window rate limit counters | 15 min - 24 hours |

**Key functions**:

| Function | Purpose |
|----------|---------|
| `createExpertProfile(email, quizData)` | Initialize Expert profile with 5 export credits |
| `getExpertProfileByToken(token)` | Auth: token → profile lookup |
| `updateExpertProfile(email, updates)` | Save simulator state, decrement credits |
| `createFeedbackRecord(email, tier, reportUrl)` | Create J+3/J+7/J+14 feedback tracking |
| `getReferral(code)` | Fetch referral stats |
| `incrementReferralConversion(code)` | Track referral purchase conversion |
| `incrementExportCredit(email, delta)` | Add/remove AI export credits |
| `markSessionProcessed(sessionId)` | Webhook idempotency guard |

**FeedbackRecord tier union**: `'essentiel' | 'intermediaire' | 'decaissement' | 'expert'`

---

### Vercel Blob — Report Storage

- **Purpose**: Store generated report HTML files
- **Access**: Public (reports accessed via direct URL)
- **Naming**: `addRandomSuffix: true` (URL is unguessable)
- **Retention**: Permanent (no auto-delete)
- **Token**: `BLOB_READ_WRITE_TOKEN` env var

---

## Authentication — `lib/auth.ts` (~56 lines)

**Flow** (Expert tier only):

```
1. User purchases Expert → webhook creates profile + token in KV
2. Magic link email sent with ?token={uuid}
3. User clicks link → GET /api/auth/verify?token={uuid}
4. Server validates: token exists in KV, not expired, maps to email
5. Returns profile summary → client stores token in sessionStorage
6. Subsequent API calls: Authorization: Bearer {token}
7. Each API route calls verifyToken(req) before processing
```

**Token properties**:
- Format: UUID v4
- TTL: 24 hours
- Single-use: No (can be reused within TTL)
- Storage: KV `token:{uuid}` → `{email, createdAt}`

**`verifyToken(req)` returns**:
```typescript
type AuthResult = {
  valid: boolean;
  email?: string;
  error?: string;
}
```

**Token sources** (checked in order):
1. Query parameter: `?token={uuid}`
2. Authorization header: `Bearer {uuid}`

---

## Rate Limiting — `lib/rate-limit.ts` (~82 lines)

Sliding-window implementation using KV sorted sets.

| Endpoint | Limit | Window |
|----------|-------|--------|
| Checkout | 10 requests | 15 minutes |
| Magic link | 3 requests | 1 hour |
| Simulate (Expert) | 100 recalcs | 24 hours |
| Export (Expert) | 20 exports | 24 hours |

**Mechanism**: KV sorted set with timestamp scores. On each request, remove entries older than window, count remaining, reject if over limit.

---

## Environment Variables

| Variable | Purpose | Used by |
|----------|---------|---------|
| `KV_REST_API_URL` | Upstash Redis connection URL | lib/kv.ts |
| `KV_REST_API_TOKEN` | Upstash Redis auth token | lib/kv.ts |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access | webhook, export routes |

## Audit Checklist

- [ ] Magic link tokens expire after 24 hours
- [ ] Webhook idempotency prevents duplicate processing
- [ ] Rate limits enforced on all user-facing endpoints
- [ ] Expert export credits correctly decremented (never negative)
- [ ] KV keys use consistent naming patterns
- [ ] Feedback records include correct tier identifier
- [ ] GDPR delete route purges all KV keys for a user
- [ ] Blob URLs are unguessable (random suffix)
- [ ] Token validation rejects malformed UUIDs
- [ ] No KV credentials in client-side code
