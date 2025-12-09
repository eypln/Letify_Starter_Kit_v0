# Rate Limiting Documentation

## Overview

Comprehensive API rate limiting system to prevent abuse, ensure fair usage, and protect server resources. The system uses in-memory storage with IP-based and user-based rate limiting.

**Version:** 2.5.0  
**Status:** Production Ready ✅

---

## Features

- ✅ **IP-based Rate Limiting** - Anonymous requests limited by IP address
- ✅ **User-based Rate Limiting** - Authenticated requests limited by user ID
- ✅ **Configurable Limits** - Different limits for different endpoint types
- ✅ **Automatic Cleanup** - Old rate limit entries automatically cleaned up
- ✅ **Standard Headers** - `X-RateLimit-*` headers in all responses
- ✅ **Retry-After** - Clear retry timing in 429 responses
- ✅ **Frontend Integration** - API client with automatic error handling

---

## Rate Limit Presets

### AUTH (Very Strict)
- **Limit:** 5 requests per minute
- **Use case:** Sign-in, sign-up, password reset
- **Reason:** Prevent brute force attacks

### STRICT
- **Limit:** 10 requests per minute
- **Use case:** Logout, payments, admin actions
- **Reason:** Sensitive operations

### MEDIUM (Default)
- **Limit:** 60 requests per minute (1 per second)
- **Use case:** CRUD operations (listings, clients, viewings, revenue)
- **Reason:** Normal user activity

### LOOSE
- **Limit:** 120 requests per minute (2 per second)
- **Use case:** Admin panels, trusted users
- **Reason:** Higher access needs

### VERY_LOOSE
- **Limit:** 300 requests per minute (5 per second)
- **Use case:** Analytics, health checks
- **Reason:** High-frequency read operations

---

## Protected Endpoints

### 🔴 AUTH Endpoints (5 req/min)
```
POST /api/auth/reset-password
POST /api/auth/send-admin-approval
```

### 🟠 STRICT Endpoints (10 req/min)
```
POST /api/auth/logout
POST /api/stripe/billing-portal
POST /api/stripe/checkout/credits
POST /api/stripe/checkout/subscription
PUT  /api/admin/approve-user
POST /api/webhooks/* (IP-based)
```

### 🟡 MEDIUM Endpoints (60 req/min)
```
GET  /api/listings/list
POST /api/listings/manual
POST /api/listings/update
POST /api/clients
GET  /api/viewings
POST /api/viewings
PUT  /api/viewings
DELETE /api/viewings
GET  /api/revenue
POST /api/revenue
PUT  /api/revenue
```

### 🟢 LOOSE Endpoints (120 req/min)
```
GET /api/admin/pending-users
GET /api/admin/blocked-users
GET /api/admin/approved-users
```

### ⚪ Unprotected Endpoints
```
POST /api/stripe/webhook (Stripe signature validation)
GET  /api/cron/backup (CRON_SECRET validation)
```

---

## Backend Implementation

### Basic Usage

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Add rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;

  // Your endpoint logic here
  return NextResponse.json({ success: true });
}
```

### IP-based Rate Limiting

```typescript
import { rateLimitByIP, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // IP-based (for anonymous/webhook endpoints)
  const rateLimitResult = await rateLimitByIP(request, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;

  // Your logic
}
```

### Custom Configuration

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Custom rate limit
  const rateLimitResult = await rateLimit(request, {
    limit: 30,
    window: 60, // 30 requests per minute
    message: 'Çok fazla istek gönderdiniz. 1 dakika bekleyin.',
  });
  if (rateLimitResult) return rateLimitResult;

  // Your logic
}
```

---

## Frontend Implementation

### Using API Client (Recommended)

```typescript
import { apiFetch, apiFetchWithRetry } from '@/lib/api-client';

// Basic usage with error handling
try {
  const data = await apiFetch('/api/viewings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* your data */ }),
  });
  
  toast.success('Viewing created successfully');
} catch (error) {
  // Rate limit errors are automatically handled with toast
  console.error('API error:', error);
}

// With automatic retry
const data = await apiFetchWithRetry('/api/listings/list', {
  method: 'GET',
}, 1); // Will retry once after rate limit delay
```

### Manual Fetch with Error Handling

```typescript
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(clientData),
});

if (response.status === 429) {
  const data = await response.json();
  const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
  
  toast.error(data.error || 'Rate limit exceeded', {
    description: `Please wait ${retryAfter} seconds.`,
  });
  return;
}

if (!response.ok) {
  throw new Error('Request failed');
}
```

---

## Response Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Limit: 60           # Maximum requests allowed
X-RateLimit-Remaining: 45       # Requests remaining in window
X-RateLimit-Reset: 1704067200   # Unix timestamp when limit resets
```

On rate limit exceeded (429):
```
Retry-After: 60                 # Seconds to wait before retrying
```

---

## Error Response Format

### 429 Too Many Requests

```json
{
  "error": "Çok fazla istek. Lütfen biraz bekleyin.",
  "retryAfter": 60
}
```

---

## Testing Rate Limits

### Manual Testing

1. **Test AUTH endpoint (5 req/min):**
```bash
# Send 6 requests quickly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/reset-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}'
done
```

2. **Check response:**
- First 5 requests: 200 OK
- 6th request: 429 Too Many Requests

3. **Verify headers:**
```bash
curl -i http://localhost:3000/api/listings/list
```

Look for:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1704067200
```

### Automated Testing

```typescript
// Test rate limit exceeded
it('should return 429 after exceeding rate limit', async () => {
  const requests = Array(6).fill(null).map(() =>
    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    })
  );

  const responses = await Promise.all(requests);
  const statuses = responses.map(r => r.status);

  expect(statuses.filter(s => s === 200).length).toBe(5);
  expect(statuses.filter(s => s === 429).length).toBe(1);
});
```

---

## Monitoring & Logging

### Check Rate Limit Status (Debug)

```typescript
import { getRateLimitStatus } from '@/lib/rate-limit';

// Get current status
const status = getRateLimitStatus('user-id-123', '/api/viewings');
console.log('Rate limit status:', status);
// { count: 45, resetTime: 1704067200000 }
```

### Clear Rate Limit (Testing Only)

```typescript
import { clearRateLimit, clearAllRateLimits } from '@/lib/rate-limit';

// Clear specific user's limit
clearRateLimit('user-id-123', '/api/viewings');

// Clear all (use with caution)
clearAllRateLimits();
```

### Production Monitoring

Rate limit violations should be logged:

```typescript
// In rate-limit.ts
if (!allowed) {
  console.warn(`Rate limit exceeded: ${identifier} on ${pathname}`);
  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
}
```

---

## Scaling Considerations

### Current Implementation (In-Memory)

✅ **Pros:**
- Simple, no external dependencies
- Fast (no network latency)
- Perfect for single-server deployments

❌ **Cons:**
- Not shared across multiple servers
- Lost on server restart
- Memory usage grows with traffic

### Future: Redis/Upstash Integration

For multi-server deployments:

```typescript
// lib/rate-limit-redis.ts (future implementation)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(key: string, limit: number, window: number) {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
```

**When to upgrade:**
- Multiple server instances (horizontal scaling)
- Serverless deployments (Vercel Edge Functions)
- User count > 1000 concurrent users

---

## Security Best Practices

1. **Don't rely solely on rate limiting for security**
   - Use authentication (JWT, session)
   - Validate all inputs
   - Implement RBAC (Role-Based Access Control)

2. **Combine with Supabase rate limits**
   - Supabase already protects auth endpoints
   - Your middleware adds additional layer

3. **Monitor for patterns**
   - Sudden spikes in 429 errors
   - Specific IPs hitting limits repeatedly
   - Consider IP blocking for persistent abusers

4. **Adjust limits based on usage**
   - Start conservative
   - Monitor real user behavior
   - Gradually increase if needed

---

## Troubleshooting

### Issue: False Positives (Legitimate Users Blocked)

**Solution:** Increase limit for that endpoint type
```typescript
// Change from STRICT (10/min) to MEDIUM (60/min)
const rateLimitResult = await rateLimit(request, RateLimitPresets.MEDIUM);
```

### Issue: Rate Limits Reset Too Quickly

**Solution:** Increase time window
```typescript
const rateLimitResult = await rateLimit(request, {
  limit: 60,
  window: 300, // 5 minutes instead of 1 minute
  message: 'Too many requests. Wait 5 minutes.',
});
```

### Issue: Memory Usage Too High

**Solution:** Reduce cleanup interval or upgrade to Redis
```typescript
// In rate-limit.ts
// Change from 5 minutes to 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 1 * 60 * 1000); // 1 minute
```

---

## Configuration Summary

| Endpoint Type | Preset | Limit | Window | Use Case |
|--------------|--------|-------|--------|----------|
| Auth | AUTH | 5 | 60s | Sign-in, sign-up, password reset |
| Payment | STRICT | 10 | 60s | Stripe checkout, billing portal |
| Admin | LOOSE | 120 | 60s | Admin panel operations |
| CRUD | MEDIUM | 60 | 60s | Listings, clients, viewings, revenue |
| Webhooks | STRICT (IP) | 10 | 60s | External webhooks |
| Analytics | VERY_LOOSE | 300 | 60s | Analytics tracking |
| Cron | None | - | - | Protected by CRON_SECRET |

---

## Related Documentation

- [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) - Database backup system
- [RBAC_SECURITY.md](./RBAC_SECURITY.md) - Role-based access control
- [PERFORMANCE.md](./PERFORMANCE.md) - Performance optimization

---

## Changelog

### v2.5.0 (Current)
- ✅ Initial rate limiting implementation
- ✅ 25+ endpoints protected
- ✅ IP-based and user-based rate limiting
- ✅ Frontend API client with error handling
- ✅ 5 configurable presets (AUTH, STRICT, MEDIUM, LOOSE, VERY_LOOSE)
- ✅ Standard rate limit headers
- ✅ In-memory storage with auto-cleanup

### Future Enhancements
- [ ] Redis/Upstash integration for distributed rate limiting
- [ ] Rate limit analytics dashboard
- [ ] Per-user custom rate limits (premium users)
- [ ] Geographic-based rate limits
- [ ] Endpoint-specific error messages
- [ ] Rate limit warming (gradual increase for new users)

---

## Support

For rate limiting issues:
1. Check browser console for 429 errors
2. Verify rate limit headers in Network tab
3. Test with curl to isolate frontend vs backend issues
4. Check server logs for rate limit violations
5. Contact support if legitimate usage is blocked

---

**Last Updated:** 2025-01-08  
**Maintained By:** Letify Development Team
