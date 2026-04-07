# Loyalty Management System — POC Document
**Client:** Manufacturing Company  
**Date:** 2026-04-07  
**Version:** 1.5 (Draft for Review)

---

## 1. Project Overview

A QR-code-based loyalty/rewards system where the manufacturing company distributes monetary rewards to end-users (distributors, retailers, or consumers) embedded inside printed QR codes. Users scan the QR, verify themselves, and redeem cash directly to their UPI account.

---

## 2. What I Understood

### 2.1 The Core Idea

The system works in **two separate phases** — QR generation is completely decoupled from amount assignment:

**Phase 1 — Generate & Print (no money involved yet)**
- Admin creates a batch → 500 QR codes are generated with unique IDs only
- QR codes are downloaded and printed with company branding
- At this stage they are **just QR codes** — no monetary value attached

**Phase 2 — Fund the Batch (when ready to activate)**
- Admin comes back to a batch and assigns amounts (Auto Split / Manual Tiers)
- Only after this step do QR codes carry monetary value
- Expiry date is set at this point
- Admin wallet is reserved/debited when users start scanning

**Phase 3 — User Redemption**
- User scans a funded, non-expired QR → goes through OTP flow → redeems to UPI

### 2.2 Amount Distribution Logic
The admin has **3 ways** to assign amounts to 500 QRs:

| Mode | How it works | Example |
|------|-------------|---------|
| **Auto Split** | Admin enters total budget. System randomly assigns ₹1–₹15 per QR such that the total = budget | ₹600 → system figures out combos |
| **Manual Tiers** | Admin defines tiers manually | 100 QRs × ₹1 = ₹100, 200 QRs × ₹3 = ₹600... total must match |
| **Fixed Total** | Admin enters ₹600, system evenly/randomly splits across 500 QRs | Each QR gets ~₹1.20 avg |

> **Constraint:** Min per QR = ₹1, Max per QR = ₹15, Total QRs = 500

### 2.3 QR Code Expiry

- Expiry date is **NOT set during batch creation** — it is set when the admin funds the batch (Phase 2).
- When a user scans an expired QR, they see "This QR code has expired" — no redemption, no debit.
- Expiry is visible per batch in the admin panel.
- Admin can set expiry per batch (e.g., Diwali batch expires Dec 31).

### 2.4 QR Code Lifecycle

```
Phase 1 — Admin creates batch
  GENERATED (just a QR code, no amount, no expiry)
      │
      └──→ Downloaded & Printed (physical QR with unique URL only)

Phase 2 — Admin funds the batch later
  GENERATED ──(admin assigns amounts + expiry)──→ FUNDED (active, has monetary value)

Phase 3 — User scans
  FUNDED ──(scanned, check expiry)──→ EXPIRED (dead end, no debit)
     │
     └──(valid, not expired)──→ SCANNING  ← wallet debited here
                                    │
                                    ↓
                              OTP VERIFIED
                                    │
                               ┌────┴────┐
                            REDEEMED  PENDING_REASON
```

**Key rules:**
- QR scanned **before** being funded → blocked, shows "QR not yet activated"
- QR scanned **after** expiry → blocked, shows "QR has expired", no debit
- QR scanned when valid + funded → wallet debited immediately on first scan
- Amount revealed to user only **after OTP verification**, not on scan

Each QR code has a **unique ID** embedded in the URL. The amount is stored server-side and hidden until OTP is verified.

---

## 3. User Redemption Flow

When a user scans the printed QR code:

```
── On Scan (before anything else) ──────────────────────────────
  System instantly checks the QR:
    • Invalid QR ID           → "This QR code is not valid"       [STOP]
    • Batch still DRAFT       → "This QR is not activated yet"    [STOP]
    • QR expired              → "This QR code has expired"        [STOP]
    • QR already used         → "This QR has already been used"   [STOP]
    • Batch paused            → "This offer is currently paused"  [STOP]
    • All checks pass         → Proceed to Step 1

Step 1: Mobile Number Entry
  └─ User enters 10-digit mobile number
  └─ System sends OTP via SMS

Step 2: OTP Verification
  └─ User enters 6-digit OTP
  └─ System validates OTP (time-limited, 5 min, max 3 attempts)

Step 3: Name + Scan Confirmation
  └─ User enters their name
  └─ User re-scans the physical QR (confirms they physically have it)
  └─ Admin wallet debited here (on confirmed scan post-OTP)

Step 4: Redemption Choice
  └─ System reveals the reward amount (e.g., "You won ₹5!")
  └─ User picks ONE of three options:

    ┌─────────────────────────────────────────────────────────────┐
    │ OPTION A — Instant Redeem (UPI)                             │
    │  User enters UPI ID                                         │
    │  System triggers immediate UPI transfer                     │
    │  QR status → REDEEMED                                       │
    ├─────────────────────────────────────────────────────────────┤
    │ OPTION B — Add to My Wallet                                 │
    │  Amount credited to user's in-app wallet balance            │
    │  User can redeem wallet balance to UPI anytime later        │
    │  QR status → WALLET_CREDITED                                │
    ├─────────────────────────────────────────────────────────────┤
    │ OPTION C — Not Now (Give Reason)                            │
    │  User fills in a reason text box and submits                │
    │  Amount is NOT transferred, NOT added to wallet             │
    │  QR status → PENDING_REASON                                 │
    │  Admin can see the reason in reports                        │
    └─────────────────────────────────────────────────────────────┘

Step 5: Result Screen
  └─ Option A → "₹5 sent to your UPI!" + transaction ID
  └─ Option B → "₹5 added to your wallet! Balance: ₹23"
  └─ Option C → "Response recorded. Thank you."

── User Wallet Redemption (separate flow, anytime) ─────────────
  User opens wallet page (via app or link) → sees wallet balance
  → Enters UPI ID → Withdraws full or partial amount
  → Instant transfer triggered
```

---

## 4. Admin Panel

### 4.1 Admin Capabilities

| Feature | Description |
|---------|-------------|
| **Create Batch** | Enter batch name + product name → generates 500 QR codes — NO amounts yet |
| **Download QRs** | Export and print QR codes immediately after creation |
| **Fund a Batch** | Come back later, assign amounts (Auto/Manual), set expiry date — activates the batch |
| **View Batches** | List all batches with their current state |
| **Batch Detail** | See all 500 QRs, amounts (if funded), redemption status per QR |
| **User List** | All registered users with mobile, name, total scans, total earned, join date |
| **User Detail** | Full profile + wallet balance + complete scan history (product, batch, amount, action, date) |
| **User Wallet View** | See each user's current wallet balance and all wallet transactions |
| **Reports** | Spending by product, top earners, redemption trends, option A/B/C breakdown |
| **Dashboard Stats** | Total batches, total users, total amount distributed, redemption rate, wallet balance |

### 4.2 Batch States

```
DRAFT ──(admin funds it)──→ FUNDED/ACTIVE ──(all QRs used)──→ EXHAUSTED
                                  │
                              PAUSED (admin can pause anytime)
                                  │
                              EXPIRED (past expiry date)
```

| State | Meaning |
|-------|---------|
| `DRAFT` | QRs generated and downloadable, no amounts assigned yet |
| `FUNDED` | Amounts assigned, expiry set, QRs are live and scannable |
| `PAUSED` | Admin paused the batch — scanning blocked temporarily |
| `EXHAUSTED` | All 500 QRs have been scanned/redeemed |
| `EXPIRED` | Batch expiry date passed — no more scanning allowed |

### 4.3 QR Code States

```
GENERATED ──(batch not funded / invalid / paused)──→ BLOCKED (shown on scan, no debit)
     │
     └──(batch funded)──→ FUNDED
                              │
                         ──(expired on scan)──→ EXPIRED (shown on scan, no debit)
                              │
                         ──(valid scan + OTP done)──→ SCANNING
                                                          │  [Admin wallet debited here]
                                                          ↓
                                                    OTP VERIFIED
                                                          │
                                        ┌─────────────────┼──────────────────┐
                                        ▼                 ▼                  ▼
                                   REDEEMED        WALLET_CREDITED    PENDING_REASON
                               (UPI transfer     (amount added to    (reason stored,
                                  done)           user wallet)        no transfer)
```

### 4.4 Admin Wallet

- Admin has a **wallet balance** in the system.
- Wallet is **NOT touched** during batch creation (Phase 1 — just QR generation).
- Wallet is **NOT touched** during batch funding either — amounts are only reserved on paper.
- Wallet is **debited only when a user scans** a funded, valid QR (one QR = one debit).
- If QRs are never scanned (unfunded batches, expired QRs), wallet is never touched.
- Admin dashboard shows: Total Funded | Total Reserved | Total Debited | Current Balance

---

## 5. Android App

- Embeds the same web redemption flow inside a **WebView**
- Key difference: **UPI ID is saved** after first redemption — user doesn't re-enter it every time
- UPI ID stored locally on device (or linked to mobile number in backend)
- No separate native UI needed for the redemption flow — reuses the web page

---

## 6. Technical Architecture

### 6.1 System Components

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│                                                  │
│  ┌──────────────────┐   ┌──────────────────────┐│
│  │   Admin Panel    │   │  User Redemption Page ││
│  │  (React + Vite)  │   │  (React, mobile-first)││
│  └──────────────────┘   └──────────────────────┘│
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                  BACKEND API                     │
│              (Node.js + Express)                 │
│                                                  │
│  /api/batch/*    → Batch management              │
│  /api/redeem/*   → Redemption flow               │
│  /api/otp/*      → OTP send/verify               │
│  /api/upi/*      → UPI payout trigger            │
└─────────────────────────────────────────────────┘
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
      ┌─────────┐ ┌────────┐ ┌────────────┐
      │Database │ │  SMS   │ │  UPI/Pay   │
      │(SQLite/ │ │Gateway │ │  Gateway   │
      │Postgres)│ │(Twilio)│ │(Razorpay)  │
      └─────────┘ └────────┘ └────────────┘
```

### 6.2 Tech Stack (Recommended)

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| QR Generation | `qrcode` npm library |
| SMS OTP | Twilio / MSG91 / 2Factor |
| UPI Payout | Razorpay Payouts API / Cashfree / PayU |
| Hosting | Any VPS / Vercel + Railway |
| Android App | Android WebView (wraps existing web URL) |

---

## 7. Database Schema

### 7.1 Tables

```sql
-- Admin Wallet
admin_wallet (
  id           INTEGER PRIMARY KEY DEFAULT 1,  -- single row
  balance      REAL DEFAULT 0,    -- current available balance
  total_funded REAL DEFAULT 0,    -- total ever added
  total_debited REAL DEFAULT 0,   -- total debited on QR scans
  updated_at   DATETIME
)

-- Wallet Transactions (audit trail)
wallet_transactions (
  id           TEXT PRIMARY KEY,
  type         TEXT,              -- 'credit' | 'debit'
  amount       REAL,
  qr_id        TEXT,             -- which QR triggered debit (nullable for credits)
  batch_id     TEXT,
  note         TEXT,
  created_at   DATETIME
)

-- Batches
batches (
  id           TEXT PRIMARY KEY,   -- UUID (auto-generated, e.g. BATCH-2024-001)
  batch_code   TEXT UNIQUE,        -- Human-readable ID: "BATCH-001", "BATCH-002" (auto-incremented)
  name         TEXT,               -- Batch label: "Diwali Campaign Q4"
  product_name TEXT,               -- Product this batch belongs to: "Cement 50kg Bag", "Steel Rod"
  total_amount REAL,               -- NULL when in DRAFT, set when funded
  qr_count     INTEGER DEFAULT 500,
  dist_mode    TEXT,               -- NULL when in DRAFT: 'auto' | 'manual'
  status       TEXT DEFAULT 'draft', -- 'draft' | 'funded' | 'paused' | 'exhausted' | 'expired'
  expires_at   DATE,               -- NULL when in DRAFT, set when admin funds the batch
  funded_at    DATETIME,           -- timestamp when admin assigned amounts
  created_at   DATETIME
)

-- Individual QR Codes
qr_codes (
  id           TEXT PRIMARY KEY,   -- UUID (this goes inside the QR)
  batch_id     TEXT REFERENCES batches(id),
  amount       REAL,               -- NULL until batch is funded
  status       TEXT DEFAULT 'generated', -- 'generated' | 'funded' | 'scanning' | 'redeemed' | 'wallet_credited' | 'pending_reason' | 'expired'
  expires_at   DATE,               -- NULL until funded; copied from batch when admin funds
  scanned_at   DATETIME,           -- when QR was first scanned (wallet debit happens here)
  user_name    TEXT,
  user_mobile  TEXT,
  upi_id       TEXT,
  reason       TEXT,               -- if user chose "not now"
  redeemed_at  DATETIME,
  txn_id       TEXT                -- UPI transaction reference
)

-- Users (auto-created on first OTP verification)
users (
  id              TEXT PRIMARY KEY,   -- UUID
  mobile          TEXT UNIQUE,        -- 10-digit mobile (primary identifier)
  name            TEXT,               -- entered during first redemption flow
  upi_id          TEXT,               -- saved UPI ID (Android: pre-filled next time)
  wallet_balance  REAL DEFAULT 0,     -- current in-app wallet balance (Option B amounts)
  total_scans     INTEGER DEFAULT 0,  -- total QR codes scanned (all options)
  total_redeemed  INTEGER DEFAULT 0,  -- QRs where user chose Option A (instant UPI)
  total_wallet_credits INTEGER DEFAULT 0, -- QRs where user chose Option B (add to wallet)
  total_pending   INTEGER DEFAULT 0,  -- QRs where user chose Option C (not now)
  total_earned    REAL DEFAULT 0,     -- total ₹ sent to UPI (Option A only)
  total_wallet_in REAL DEFAULT 0,     -- total ₹ ever added to wallet (Option B)
  total_wallet_out REAL DEFAULT 0,    -- total ₹ withdrawn from wallet to UPI
  registered_at   DATETIME,           -- first time user appeared in system (first OTP verify)
  last_scan_at    DATETIME            -- most recent scan timestamp
)

-- User Wallet Transactions
user_wallet_transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id),
  type         TEXT,              -- 'credit' (from QR scan) | 'withdrawal' (user withdrew to UPI)
  amount       REAL,
  qr_id        TEXT,             -- which QR credited this (nullable for withdrawals)
  batch_code   TEXT,             -- for easy reporting
  product_name TEXT,
  upi_id       TEXT,             -- which UPI received the withdrawal
  txn_id       TEXT,             -- payment gateway transaction ID
  note         TEXT,
  created_at   DATETIME
)

-- User Scan History (every scan logged)
scan_history (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id),
  qr_id        TEXT REFERENCES qr_codes(id),
  batch_id     TEXT REFERENCES batches(id),
  batch_code   TEXT,                  -- denormalized for fast reports
  product_name TEXT,                  -- denormalized for fast reports
  amount       REAL,                  -- amount of this QR
  action       TEXT,                  -- 'redeemed' | 'wallet_credited' | 'pending_reason'
  upi_id       TEXT,                  -- UPI used (Option A only)
  reason       TEXT,                  -- reason text (Option C only)
  txn_id       TEXT,                  -- UPI transaction reference (Option A only)
  scanned_at   DATETIME
)

-- OTP Sessions
otp_sessions (
  id           TEXT PRIMARY KEY,
  mobile       TEXT,
  otp          TEXT,
  qr_id        TEXT,
  expires_at   DATETIME,
  verified     INTEGER DEFAULT 0,
  attempts     INTEGER DEFAULT 0
)
```

---

## 8. API Endpoints

### Batch APIs (Admin)
```
-- Phase 1: Generate QR codes only (no amounts)
POST   /api/batch/create           → Body: { name, product_name }
                                     → Auto-generates batch_code (BATCH-001, BATCH-002...)
                                     → Generates 500 blank QR codes (status: draft)
GET    /api/batch/:id/export       → Download all 500 QR codes as ZIP (available in draft state)

-- Phase 2: Fund the batch (assign amounts later)
POST   /api/batch/:id/fund         → Assign amounts + set expiry → activates batch (status: funded)
                                     Body: { dist_mode, total_amount, tiers[]?, expires_at }

-- General
GET    /api/batch/list             → List all batches with status (draft/funded/expired etc.)
GET    /api/batch/:id              → Get batch details + funding info
GET    /api/batch/:id/qrcodes      → Get all QR codes with amounts + redemption status
PATCH  /api/batch/:id/status       → Pause / reactivate a funded batch
```

### Wallet APIs (Admin)
```
GET    /api/wallet/balance         → Get current wallet balance + summary
POST   /api/wallet/topup           → Add funds to admin wallet
GET    /api/wallet/transactions    → Transaction history (credits + debits)
```

### Redemption APIs (User)
```
GET    /api/redeem/:qrId/check     → Instant QR validation on scan — returns one of:
                                     • ERROR: "QR not valid"
                                     • ERROR: "QR not activated yet"
                                     • ERROR: "QR has expired"
                                     • ERROR: "QR already used"
                                     • ERROR: "Offer paused"
                                     • OK: QR is valid, proceed to OTP

POST   /api/otp/send               → Send OTP to mobile number
POST   /api/otp/verify             → Verify OTP, return session token

POST   /api/redeem/submit          → Submit redemption choice:
                                     Option A: { action: 'upi',    upi_id }  → instant transfer
                                     Option B: { action: 'wallet'           }  → add to user wallet
                                     Option C: { action: 'reason', reason  }  → store reason only

GET    /api/user/wallet            → Get user wallet balance + transaction history (by mobile)
POST   /api/user/wallet/withdraw   → Withdraw from user wallet to UPI
                                     Body: { mobile, upi_id, amount }

GET    /api/user/saved-upi         → Get saved UPI ID for mobile (Android pre-fill)
POST   /api/user/save-upi          → Save UPI ID after first use (Android)
```

### User APIs (Admin — Reports)
```
GET    /api/users/list             → All registered users with summary stats
                                     (mobile, name, total_scans, total_earned, registered_at)
GET    /api/users/:id              → Single user full profile
GET    /api/users/:id/history      → Full scan history for a user
                                     (which QR, which batch, which product, amount, action, date)
GET    /api/users/search?q=mobile  → Search user by mobile number
```

### Dashboard APIs (Admin)
```
GET    /api/stats/summary          → Total batches, QRs, total users, amounts, redemption %
GET    /api/stats/recent           → Recent redemptions feed
GET    /api/stats/by-product       → Spending breakdown per product
                                     e.g. "Cement 50kg" → ₹6,200 across 3 batches, 480 users
GET    /api/stats/top-users        → Top users by total earned / total scans
```

---

## 9. QR Code URL Format

Each QR code, when scanned, opens:

```
https://yourdomain.com/redeem/{qr_unique_id}
```

Example:
```
https://loyaltyqr.com/redeem/a3f9b2c1-8e4d-4f7a-b1c2-d3e4f5a6b7c8
```

- The **amount is NEVER in the URL** — it's only revealed server-side after OTP verification
- This prevents users from finding high-value QRs by inspecting URLs

---

## 10. Security Considerations

| Risk | Mitigation |
|------|-----------|
| QR reuse / sharing | Each QR marked `scanning` on first scan — no second scan allowed |
| Expired QR scanning | Expiry checked server-side on `/check` call before any debit |
| OTP brute force | Max 3 attempts, 5 min expiry, lock after failures |
| URL scraping for amounts | Amount stored server-side, revealed only post-OTP |
| Fake UPI IDs | UPI ID validated via payment gateway before transfer |
| Scan again fraud | Re-scan step confirms user physically has QR |
| Double wallet debit | Debit only happens if QR status = `unused`; atomic DB transaction |

---

## 11. Open Questions (Need Clarification)

| # | Question | Why it matters |
|---|----------|----------------|
| 1 | **"Scan Again" step** — should this literally open the phone camera, or just a button confirmation? | Camera API is complex in browser; button confirm is simpler |
| 2 | **UPI Payout** — real-time API transfer or manual batch payout later? | Real-time needs Razorpay Payouts with KYC; manual is simpler |
| 3 | **"Not Now" QRs** — wallet was already debited on scan. Can user come back later to redeem? If yes, within what window? | Determines if we need a pending-redemption queue |
| 4 | **QR Branding** — will you provide the design template, or should the system generate branded QRs? | System-generated needs logo/template assets |
| 5 | **SMS OTP provider** — do you have a preferred SMS gateway? | Twilio, MSG91, 2Factor all work |
| 6 | **Who is the end-user?** — retailer, distributor, or end consumer? | Changes UX tone/complexity |
| 7 | **Multiple QR scans per user** — can same mobile redeem multiple QRs from same batch? | Need to define per-user limits per batch |
| 8 | **Admin authentication** — is a simple password login enough, or need roles? | Single admin vs. multi-user company setup |
| 9 | **Expiry date** — set per batch (e.g., all 500 QRs in this batch expire Dec 31), or per individual QR? | Batch-level expiry is simpler |
| 10 | **Wallet top-up** — admin manually credits the wallet via UPI from their bank, or auto-linked bank account? | Determines if we need a payment gateway on the admin side too |

---

## 12. POC Scope (What Will Be Built First)

For the POC, we will build a **working prototype** with:

### In Scope
- [x] Admin panel — Create batch (name + product), fund batch, view QRs, user reports
- [x] QR code generation with unique URLs, batch code, product name
- [x] Instant QR validation on scan (expired / not activated / already used)
- [x] User redemption flow — Mobile → OTP → Name → Scan Again → 3-option choice
- [x] Option A — Instant UPI redeem (simulated for POC)
- [x] Option B — Add to user in-app wallet
- [x] Option C — Not now with reason input
- [x] User wallet — balance view + withdraw to UPI anytime
- [x] User profile — scan history, total earned, wallet balance
- [x] Backend API with PostgreSQL database
- [x] Mobile-first redemption page
- [x] Saved UPI ID flow (Android mode flag)

### Out of Scope for POC
- [ ] Real SMS OTP (use static OTP `123456` for demo)
- [ ] Real UPI transfer (simulated/logged only)
- [ ] QR branding/print layout customization
- [ ] Admin authentication / login
- [ ] Analytics dashboard

---

## 13. Folder Structure (Planned)

```
loyality-management/
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── routes/
│   │   ├── batch.js
│   │   ├── redeem.js
│   │   ├── users.js       ← user list, user detail, scan history
│   │   ├── wallet.js
│   │   └── stats.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.jsx       ← stats + recent activity
│   │   │   │   ├── CreateBatch.jsx     ← batch name + product name form
│   │   │   │   ├── BatchDetail.jsx     ← QR list + fund batch
│   │   │   │   ├── UserList.jsx        ← all users table
│   │   │   │   └── UserDetail.jsx      ← user profile + full scan history
│   │   │   └── user/
│   │   │       └── RedeemFlow.jsx      ← mobile-first redemption steps
│   │   └── components/
│   │       ├── admin/Sidebar.jsx
│   │       ├── admin/StatCard.jsx
│   │       └── user/StepIndicator.jsx
│   └── package.json
└── POC_Document.md
```

---

*Read this document, raise any corrections or clarifications, and give approval to proceed with the POC implementation.*
