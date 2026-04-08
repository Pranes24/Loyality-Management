# Multi-Org Loyalty Platform — Application Flow Story

---

## The Actors

| Role | Person | Responsibility |
|------|--------|---------------|
| Super Admin | Rahul | Owns the platform, creates orgs, tops up wallets |
| Org Admin | Vikram | Manages Ramco Cements' loyalty program |
| Consumer | Raju | Scans QR codes, claims rewards |

---

## Act 1: The Platform Owner (Super Admin)

Rahul is the **platform owner**. He runs the loyalty management SaaS. He logs into the **Super Admin portal** with his master credentials.

From his dashboard, he can see all organizations registered on the platform — their names, org codes, wallet balances, and active batch counts.

A new client — **Ramco Cements** — wants to onboard. Rahul creates a new organization:

- **Name**: Ramco Cements
- **Org Code**: `RAMCO` (auto-generated, unique, used for QR routing)
- **Initial wallet top-up**: ₹50,000

The system generates a unique org code and sends login credentials to the org admin's email. Rahul's job is done.

---

## Act 2: The Organization Admin (Org Admin)

Vikram is the **regional marketing manager** at Ramco Cements. He receives his login credentials and signs into the **Org Admin portal** — the same app, but scoped entirely to Ramco Cements.

He sees only **his** data: his wallet balance, his batches, his users.

Vikram launches a Diwali campaign:

1. He creates a new batch — *"Diwali Q4 Campaign"* for *"Cement 50kg Bag"*
2. 500 blank QR codes are generated, each unique to Ramco's org
3. He funds the batch — ₹15,000 total across 500 QRs, expiry Dec 31
4. He downloads the QR ZIP and hands it to the print vendor
5. QR stickers go on 500 cement bags leaving the warehouse

> The QR URL encodes both the **QR token** and the **org code**, so when scanned, the system knows exactly which organization this redemption belongs to.

---

## Act 3: The Consumer (End User)

Raju is a **mason in Pune**. He buys a Ramco Cement bag, peels the sticker, and scans the QR with his phone camera.

The scan URL opens directly in the browser — no app download needed.

### The Redemption Journey

**Step 1 — Verify QR**
The system validates the QR against Ramco's batch.
Shows: *"Ramco Cements Loyalty Reward — Scan valid!"*

**Step 2 — Confirm**
Raju sees the product name and confirms he wants to claim the reward.

**Step 3 — Your Name**
Raju enters his mobile number → receives OTP → verified.
First time scanning a Ramco QR, so a new **consumer account is created scoped to Ramco Cements**.

**Step 4 — Reward Reveal**
The system reveals his reward — **₹8!** (his QR was in the ₹8 tier).

**Step 5 — Choose Your Reward**

| Option | What Happens |
|--------|-------------|
| UPI Transfer | Raju enters his UPI ID. Ramco's org wallet is debited ₹8. Transfer initiated. |
| Loyalty Wallet | ₹8 added to his Ramco wallet. He can accumulate and withdraw later. |
| Not Now | Skipped. QR marked as pending for later redemption. |

---

## Act 4: Isolation & Boundaries

Meanwhile, **Gujarat Ambuja** has also onboarded as a separate org. Their admin creates their own batches, has their own wallet, their own consumers.

If Raju happens to scan a **Gujarat Ambuja** QR too, he gets a *separate consumer account* in that org — his mobile number is shared across orgs, but his wallet balance, scan history, and rewards are **completely isolated per org**.

### The Isolation Rules

- A consumer at Ramco **cannot see** anything from Gujarat Ambuja
- An org admin at Ramco **cannot see** another org's data
- Only the Super Admin sees the **full cross-org picture**

---

## The Full Hierarchy

```
Super Admin (Rahul)
├── Platform-wide dashboard
├── Creates / manages Organizations
├── Tops up org wallets
└── Views cross-org analytics

  Org Admin (Vikram @ Ramco Cements)
  ├── Scoped to Ramco only
  ├── Creates & funds batches
  ├── Manages Ramco wallet
  └── Views Ramco consumers & redemptions

    Consumer (Raju — belongs to Ramco Cements)
    ├── Scans QR → OTP verification → Reward reveal
    ├── Ramco wallet balance (Ramco-scoped)
    └── Redemption history (Ramco-scoped)
```

---

## Data Ownership Summary

Every entity in the system carries an `org_id` and never crosses org boundaries.

| Entity | Belongs To |
|--------|-----------|
| Org Admin (Vikram) | Ramco Cements |
| Batches | Ramco Cements |
| QR Codes | Ramco Cements (via batch) |
| Consumer (Raju) | Ramco Cements |
| Wallet Balance | Ramco Cements org wallet |
| Scan History | Ramco Cements |

---

*This document describes the intended multi-tenant architecture for the Loyalty Management platform.*
