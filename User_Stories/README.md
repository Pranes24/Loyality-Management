# User Stories Index
**Project:** Loyalty Management System  
**Total Stories:** 46  
**Last Updated:** 2026-04-07

---

## Epic 1 — Admin Authentication
| Story | Title | Priority |
|-------|-------|----------|
| [US-001](./US-001.md) | Admin Login | P1 |

## Epic 2 — Batch Management
| Story | Title | Priority |
|-------|-------|----------|
| [US-002](./US-002.md) | Create a New Batch | P1 |
| [US-003](./US-003.md) | View All Batches | P1 |
| [US-004](./US-004.md) | View Batch Detail | P1 |
| [US-005](./US-005.md) | Download QR Codes | P1 |
| [US-006](./US-006.md) | Fund a Batch — Auto Split | P1 |
| [US-007](./US-007.md) | Fund a Batch — Manual Tiers | P1 |
| [US-008](./US-008.md) | Pause and Reactivate a Batch | P2 |

## Epic 3 — Admin Wallet Management
| Story | Title | Priority |
|-------|-------|----------|
| [US-009](./US-009.md) | View Admin Wallet Balance | P1 |
| [US-010](./US-010.md) | Top Up Admin Wallet | P2 |
| [US-011](./US-011.md) | View Wallet Transaction History | P1 |

## Epic 4 — Admin Dashboard & Reports
| Story | Title | Priority |
|-------|-------|----------|
| [US-012](./US-012.md) | Admin Dashboard Overview | P1 |
| [US-013](./US-013.md) | Product-wise Spending Report | P1 |
| [US-014](./US-014.md) | View All Users | P1 |
| [US-015](./US-015.md) | View Individual User Detail | P1 |
| [US-016](./US-016.md) | Top Users Report | P2 |

## Epic 5 — QR Code Scanning & Validation
| Story | Title | Priority |
|-------|-------|----------|
| [US-017](./US-017.md) | Scan a Valid QR Code | P1 |
| [US-018](./US-018.md) | Block Scan — QR Not Activated | P1 |
| [US-019](./US-019.md) | Block Scan — QR Expired | P1 |
| [US-020](./US-020.md) | Block Scan — QR Already Used | P1 |
| [US-021](./US-021.md) | Block Scan — Batch Paused | P1 |
| [US-022](./US-022.md) | Block Scan — Invalid QR | P1 |

## Epic 6 — OTP Verification
| Story | Title | Priority |
|-------|-------|----------|
| [US-023](./US-023.md) | Enter Mobile Number | P1 |
| [US-024](./US-024.md) | Verify OTP | P1 |
| [US-025](./US-025.md) | OTP for POC (Static OTP) | P1 |

## Epic 7 — User Details & Scan Confirmation
| Story | Title | Priority |
|-------|-------|----------|
| [US-026](./US-026.md) | Enter Name | P1 |
| [US-027](./US-027.md) | Scan Again Confirmation | P1 |

## Epic 8 — Redemption Flow
| Story | Title | Priority |
|-------|-------|----------|
| [US-028](./US-028.md) | View Reward Amount | P1 |
| [US-029](./US-029.md) | Option A — Instant UPI Redemption | P1 |
| [US-030](./US-030.md) | Option B — Add to User Wallet | P1 |
| [US-031](./US-031.md) | Option C — Not Now (Give Reason) | P1 |
| [US-032](./US-032.md) | Step 5 — Success Screen (Option A) | P1 |
| [US-033](./US-033.md) | Step 5 — Wallet Credit Screen (Option B) | P1 |
| [US-034](./US-034.md) | Step 5 — Pending Reason Acknowledgement (Option C) | P1 |

## Epic 9 — User Wallet
| Story | Title | Priority |
|-------|-------|----------|
| [US-035](./US-035.md) | View User Wallet Balance | P1 |
| [US-036](./US-036.md) | Withdraw from User Wallet | P1 |

## Epic 10 — System & Backend
| Story | Title | Priority |
|-------|-------|----------|
| [US-037](./US-037.md) | Auto-generate Batch Code | P1 |
| [US-038](./US-038.md) | Admin Wallet Debit on Scan | P1 |
| [US-039](./US-039.md) | Auto-expire QR Codes | P2 |
| [US-040](./US-040.md) | Auto-create User Profile on First Scan | P1 |
| [US-041](./US-041.md) | Update User Stats After Each Scan | P1 |
| [US-042](./US-042.md) | Save Scan History Record | P1 |
| [US-043](./US-043.md) | Android UPI ID Pre-fill | P2 |

## Epic 11 — Frontend & UX
| Story | Title | Priority |
|-------|-------|----------|
| [US-044](./US-044.md) | Mobile-first Redemption Page | P1 |
| [US-045](./US-045.md) | Admin Panel Responsive Layout | P2 |
| [US-046](./US-046.md) | QR Validation Error Pages | P1 |

---

## Summary
| Priority | Count |
|----------|-------|
| P1 — Must Have | 41 |
| P2 — Should Have | 5 |
| **Total** | **46** |

## Suggested Developer Split
| Developer | Stories |
|-----------|---------|
| Dev 1 — Backend Core | US-037, US-038, US-039, US-040, US-041, US-042, US-043 |
| Dev 2 — Backend Redemption | US-017 to US-025, US-031 to US-034 |
| Dev 3 — Admin Frontend | US-001 to US-008 |
| Dev 4 — Admin Reports | US-009 to US-016 |
| Dev 5 — User Frontend | US-026 to US-030, US-035, US-036, US-044 to US-046 |
