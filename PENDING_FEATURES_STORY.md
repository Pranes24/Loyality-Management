# Pending Features Story — Loyalty Management

> Four features to complete the core product loop.
> Read this before touching any code.

---

## Feature 1 — User Wallet Withdrawal Request

### The Problem
A user scans a QR, chooses "Add to Wallet", and ₹10 gets credited to their balance.
But they have no way to take that money out. The wallet is a dead end right now.

### The Flow

```
User opens /wallet (or link from SMS)
  → Sees current balance + transaction history
  → Clicks "Withdraw"
  → Enters UPI ID
  → Submits request
  → Status: "Pending"

Org Admin opens Admin Panel → Wallet → Withdrawal Requests
  → Sees pending requests (name, mobile, amount, UPI ID)
  → Manually pays via PhonePe/GPay (for now)
  → Clicks "Mark as Paid"
  → User wallet balance deducted
  → Email + SMS notification sent to user
```

### What Gets Built

**Backend:**
- `wallet_withdrawals` table: user_id, org_id, amount, upi_id, status (pending/approved/rejected), requested_at, processed_at, note
- `POST /api/user/wallet/withdraw` — user submits withdrawal request
- `GET /api/wallet/withdrawals` — org admin sees all requests (paginated, filterable by status)
- `PATCH /api/wallet/withdrawals/:id` — org admin marks paid/rejected

**Frontend (User side):**
- `/wallet/:mobile` page — balance, transaction history, Withdraw button
- Withdrawal form — UPI ID input, amount (max = balance), submit

**Frontend (Admin side):**
- New tab in WalletPage — "Withdrawal Requests"
- Table: user name, mobile, amount, UPI ID, requested time, status
- "Mark Paid" / "Reject" action buttons

### Rules
- Minimum withdrawal: ₹20 (to avoid tiny requests)
- User can only have 1 pending withdrawal at a time
- Withdrawing deducts balance immediately (hold), restores if rejected
- Org admin pays manually → marks paid → notification fires

---

## Feature 2 — Batch Expiry Cron Job

### The Problem
When an org admin sets an expiry date on a batch (e.g., 31-Dec-2024),
QR codes past that date still show as `funded` in the database.
Nobody is marking them expired. Reports are wrong. Users can still try to scan them.

### The Flow

```
Every night at midnight (or every hour):
  → Cron job runs
  → Finds all QR codes where:
      status = 'funded'
      AND expires_at < NOW()
  → Updates status to 'expired'
  → Also updates parent batch status to 'expired'
      if ALL QR codes in the batch are expired/used
```

### What Gets Built

**Backend:**
- `backend/jobs/expireBatches.js` — the cron job logic
- Uses `node-cron` package (`0 0 * * *` = midnight daily)
- Called from `server.js` on startup
- Logs how many QRs/batches were expired each run

### Rules
- Only expires `funded` QRs (not already scanned/redeemed ones)
- Batch status → `expired` only when ALL remaining funded QRs are expired
- Paused batches also get their expired QRs marked
- Safe to run multiple times (idempotent)

---

## Feature 3 — Password Reset / Forgot Password

### The Problem
If an org admin forgets their password, there is no recovery path.
They are locked out permanently. This is a critical gap for production.

### The Flow

```
Admin visits /login → clicks "Forgot password?"
  → Enters registered email
  → Receives email with reset link (valid 1 hour)
  → Clicks link → /reset-password?token=xxx
  → Enters new password (min 8 chars)
  → Confirms new password
  → Password updated → redirect to /login
  → Old token invalidated immediately
```

### What Gets Built

**Backend:**
- `password_reset_tokens` table: id, admin_id, token (hashed), expires_at, used
- `POST /api/auth/forgot-password` — validates email, generates token, sends email
- `POST /api/auth/reset-password` — validates token, updates password, marks token used
- Token: crypto.randomBytes(32) → stored as SHA256 hash (never plain)
- Expiry: 1 hour

**Frontend:**
- `/forgot-password` page — email input form
- `/reset-password` page — new password + confirm form
- Both pages in the same dark command center style as LoginPage

**Email:**
- Subject: "Reset your LoyaltyQR password"
- Body: Reset link with token
- Sent via Nodemailer (Gmail SMTP or SendGrid free tier)

### Rules
- Invalid/expired tokens show clear error (not a 500)
- Used tokens cannot be reused
- Request new reset if token expired
- Rate limit: max 3 reset requests per email per hour

---

## Feature 4 — Email Notifications

### The Problem
Right now nothing sends an email. Users don't know their reward was credited.
Admins don't know a withdrawal was requested. The app feels silent and untrustworthy.

### Events That Trigger Emails

| Event | Recipient | Subject |
|-------|-----------|---------|
| QR redeemed via UPI | User (if email exists) | "Your ₹X reward is on the way!" |
| QR credited to wallet | User (if email exists) | "₹X added to your LoyaltyQR wallet" |
| Withdrawal requested | Org Admin | "New withdrawal request — ₹X from [Name]" |
| Withdrawal approved | User | "Your ₹X withdrawal has been processed" |
| Withdrawal rejected | User | "Update on your withdrawal request" |
| Batch funded | Org Admin | "Batch [BATCH-001] is now live — 500 QRs active" |
| Password reset | Org Admin | "Reset your LoyaltyQR password" |

### What Gets Built

**Backend:**
- `backend/lib/mailer.js` — Nodemailer singleton (SMTP config from .env)
- `backend/utils/emailTemplates.js` — HTML templates for each event
- `backend/services/notificationService.js` — `sendEmail(to, templateKey, data)`
- Called from redeemService, walletService, authService at the right moments

**Email Provider:**
- Dev: Gmail SMTP (free, app password)
- Production: SendGrid free tier (100 emails/day free) or Resend (3000/month free)

### Rules
- Email failures must NOT break the main flow (fire-and-forget, try/catch)
- User email is optional — skip silently if not on file
- HTML emails with inline CSS (no external CSS)
- All emails have unsubscribe link (legal requirement)
- BCC org admin on user reward emails (audit trail)

---

## Implementation Order

```
1. Batch Expiry Cron      — 2 hours  (pure backend, low risk)
2. Email Mailer Setup     — 2 hours  (foundation for everything else)
3. Password Reset         — 3 hours  (needs mailer done first)
4. Wallet Withdrawal      — 4 hours  (backend + admin UI + user UI)
   + Email notifications  — 1 hour   (plug into existing flows once mailer ready)
```

**Total estimated: ~1.5 days of work**

---

## Dependencies Needed

```bash
# Backend
npm install node-cron nodemailer

# No new frontend dependencies needed
```

---

## Database Migrations Needed

```sql
-- wallet_withdrawals table
CREATE TABLE wallet_withdrawals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  org_id       UUID NOT NULL REFERENCES organizations(id),
  amount       NUMERIC(10,2) NOT NULL,
  upi_id       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  note         TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admin_users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
