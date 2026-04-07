# Loyalty Management System — User Stories
**Project:** Manufacturing Company Loyalty QR Platform  
**Version:** 1.0  
**Date:** 2026-04-07  

---

## Story Format
> **As a** [role] **I want to** [action] **so that** [benefit]  
> Each story includes **Acceptance Criteria (AC)** and **Priority**

**Roles:**
- **Admin** — Company staff managing the loyalty system
- **User** — End customer who scans the QR code
- **System** — Automated backend behavior

**Priority:** `P1` = Must have (POC) · `P2` = Should have · `P3` = Nice to have

---

## EPIC 1 — Admin Authentication

---

### US-001 · Admin Login
**Priority:** P1

> As an **Admin**, I want to log in with a username and password, so that only authorized staff can access the admin panel.

**Acceptance Criteria:**
- [ ] Admin can enter username and password on the login page
- [ ] System validates credentials against the database
- [ ] On success, admin is redirected to the dashboard
- [ ] On failure, a clear error message is shown ("Invalid credentials")
- [ ] Session is maintained until admin logs out
- [ ] Logout button clears the session and redirects to login

---

## EPIC 2 — Batch Management

---

### US-002 · Create a New Batch
**Priority:** P1

> As an **Admin**, I want to create a new batch by entering a batch name and product name, so that I can generate 500 QR codes tied to a specific product.

**Acceptance Criteria:**
- [ ] Admin sees a "Create Batch" form with two fields: Batch Name and Product Name
- [ ] Both fields are mandatory — form cannot submit if either is empty
- [ ] On submit, system auto-generates a unique Batch Code (BATCH-001, BATCH-002... incremented)
- [ ] System generates exactly 500 QR codes, each with a unique UUID-based URL
- [ ] Each QR code URL follows the format: `https://domain.com/redeem/{unique-id}`
- [ ] Batch is created with status `DRAFT`
- [ ] QR codes are created with status `GENERATED` and no amount assigned
- [ ] Admin is redirected to the Batch Detail page after creation
- [ ] Success message shown: "Batch BATCH-001 created with 500 QR codes"

---

### US-003 · View All Batches
**Priority:** P1

> As an **Admin**, I want to see a list of all batches, so that I can track all the QR batches I have created.

**Acceptance Criteria:**
- [ ] Batch list page shows all batches in a table
- [ ] Each row shows: Batch Code, Batch Name, Product Name, Status, QR Count, Total Amount (or "Not Funded"), Created Date, Expiry Date (or "—")
- [ ] Status is shown as a colored badge: DRAFT (grey), FUNDED (blue), PAUSED (yellow), EXHAUSTED (green), EXPIRED (red)
- [ ] List is sorted by most recently created first
- [ ] Each row has a clickable link to the Batch Detail page
- [ ] Admin can filter batches by status
- [ ] Admin can search batches by product name or batch code

---

### US-004 · View Batch Detail
**Priority:** P1

> As an **Admin**, I want to view the detail of a specific batch, so that I can see all QR codes and their individual redemption status.

**Acceptance Criteria:**
- [ ] Page shows batch header: Batch Code, Batch Name, Product Name, Status, Created Date
- [ ] Shows funding summary if funded: Total Amount, Distribution Mode, Expiry Date, Funded Date
- [ ] Shows QR code list in a table: QR ID (short), Amount (or "—"), Status, Scanned At, Redeemed By (mobile), Action
- [ ] QR status shown as badge: GENERATED, FUNDED, SCANNING, REDEEMED, WALLET_CREDITED, PENDING_REASON, EXPIRED
- [ ] Admin can filter QR list by status
- [ ] Admin can see count summary: Total | Redeemed | Wallet Credited | Pending Reason | Unused | Expired
- [ ] "Fund this Batch" button shown if batch is in DRAFT state
- [ ] "Download QRs" button always visible

---

### US-005 · Download QR Codes
**Priority:** P1

> As an **Admin**, I want to download all 500 QR codes for a batch, so that I can send them for printing.

**Acceptance Criteria:**
- [ ] "Download QRs" button available on Batch Detail page for any batch (including DRAFT)
- [ ] Clicking download triggers a ZIP file download
- [ ] ZIP contains 500 PNG image files, one per QR code
- [ ] Each PNG file is named with the QR's unique ID (e.g., `a3f9b2c1.png`)
- [ ] Each QR code image encodes the full redemption URL
- [ ] QR code images are clear and scannable (minimum 300×300 px)

---

### US-006 · Fund a Batch — Auto Split
**Priority:** P1

> As an **Admin**, I want to fund a DRAFT batch using auto-split mode, so that the system automatically distributes a total budget across 500 QR codes randomly.

**Acceptance Criteria:**
- [ ] "Fund Batch" page is accessible from the Batch Detail page (DRAFT batches only)
- [ ] Admin selects distribution mode: "Auto Split" tab
- [ ] Admin enters total budget amount (e.g., ₹600)
- [ ] Admin sets an expiry date for the batch
- [ ] System validates: total amount must be between ₹500 (min ₹1 × 500) and ₹7500 (max ₹15 × 500)
- [ ] System shows a preview distribution table: how many QRs will get ₹1, ₹2, ₹3... up to ₹15
- [ ] System shows a preview bar chart of the distribution
- [ ] Admin clicks "Generate & Activate" to confirm
- [ ] All 500 QR amounts are assigned, batch status changes to `FUNDED`
- [ ] All QR statuses change from `GENERATED` to `FUNDED`
- [ ] `funded_at` timestamp is recorded on the batch
- [ ] Expiry date is copied to all 500 QR codes

---

### US-007 · Fund a Batch — Manual Tiers
**Priority:** P1

> As an **Admin**, I want to fund a batch using manual tiers, so that I can control exactly how many QRs get each specific amount.

**Acceptance Criteria:**
- [ ] Admin selects "Manual Tiers" tab on the Fund Batch page
- [ ] Admin sees a table with columns: Quantity | Amount per QR (₹) | Subtotal
- [ ] Admin can add a new tier row using an "Add Tier" button
- [ ] Admin can delete any tier row
- [ ] Subtotal auto-calculates as Quantity × Amount per QR
- [ ] Running total of all tier subtotals is shown at the bottom
- [ ] Admin enters the total budget amount separately
- [ ] System validates: sum of all tier subtotals must exactly equal the total budget
- [ ] System validates: total QR count across all tiers must not exceed 500
- [ ] System validates: each amount per QR must be between ₹1 and ₹15
- [ ] Error shown if validation fails: "Tier totals (₹620) do not match budget (₹600)"
- [ ] On confirm, amounts assigned as defined, batch activated

---

### US-008 · Pause and Reactivate a Batch
**Priority:** P2

> As an **Admin**, I want to pause or reactivate a funded batch, so that I can temporarily stop QR scanning for a batch without deleting it.

**Acceptance Criteria:**
- [ ] "Pause Batch" button visible on Batch Detail for FUNDED batches
- [ ] On pause, batch status changes to `PAUSED`
- [ ] When any QR from a paused batch is scanned, user sees: "This offer is currently paused"
- [ ] No wallet debit happens while batch is paused
- [ ] "Reactivate Batch" button visible for PAUSED batches
- [ ] On reactivate, batch status changes back to `FUNDED`
- [ ] Admin sees confirmation dialog before pausing: "Are you sure? Users will not be able to scan QRs from this batch."

---

## EPIC 3 — Admin Wallet Management

---

### US-009 · View Admin Wallet Balance
**Priority:** P1

> As an **Admin**, I want to see my wallet balance and summary, so that I know how much money is available, reserved, and spent.

**Acceptance Criteria:**
- [ ] Wallet page shows 4 key numbers: Available Balance | Total Ever Funded | Total Debited (on scans) | Total Reserved (funded batches not yet scanned)
- [ ] All figures shown in ₹ with 2 decimal places
- [ ] Wallet balance updates in real time as scans happen

---

### US-010 · Top Up Admin Wallet
**Priority:** P2

> As an **Admin**, I want to add funds to my wallet, so that I have enough balance to support QR code redemptions.

**Acceptance Criteria:**
- [ ] Admin can enter an amount and click "Add Funds"
- [ ] Top-up is recorded as a `credit` in wallet transactions
- [ ] Wallet balance increases immediately
- [ ] Top-up entry shows in transaction history with date and note

---

### US-011 · View Wallet Transaction History
**Priority:** P1

> As an **Admin**, I want to see all wallet transactions, so that I have a full audit trail of every credit and debit.

**Acceptance Criteria:**
- [ ] Transaction list shows: Date | Type (Credit/Debit) | Amount | QR ID (if debit) | Batch Code | Product Name | Note
- [ ] Credits shown in green, debits in red
- [ ] List is paginated (20 per page)
- [ ] Admin can filter by type (credit / debit) and by date range
- [ ] Total credits and total debits shown as summary at the top

---

## EPIC 4 — Admin Dashboard & Reports

---

### US-012 · Admin Dashboard Overview
**Priority:** P1

> As an **Admin**, I want to see a dashboard with key stats, so that I can get a quick overview of the entire loyalty program.

**Acceptance Criteria:**
- [ ] Dashboard shows stat cards: Total Batches | Total QR Codes | Total Users | Total Amount Distributed | Redemption Rate (%)
- [ ] Redemption rate = (Redeemed + Wallet Credited) / Total Scanned × 100
- [ ] Recent redemptions feed shows last 10 redemptions: User Mobile, Product, Amount, Action, Time
- [ ] Wallet balance shown prominently
- [ ] Quick links: "Create Batch" and "View All Users"

---

### US-013 · Product-wise Spending Report
**Priority:** P1

> As an **Admin**, I want to see spending broken down by product name, so that I know how much loyalty money I have spent on each product.

**Acceptance Criteria:**
- [ ] Report page shows a table: Product Name | Total Batches | Total QRs | Total Amount Funded | Total Redeemed | Total Wallet Credited | Total Pending
- [ ] Each product row is expandable to show all batches under that product
- [ ] Data is sortable by any column
- [ ] Report can be exported as CSV

---

### US-014 · View All Users
**Priority:** P1

> As an **Admin**, I want to see a list of all registered users, so that I can monitor user activity and earnings.

**Acceptance Criteria:**
- [ ] User list table shows: Mobile Number, Name, Total Scans, Total Redeemed (count), Total Earned (₹), Wallet Balance (₹), Registered Date, Last Scan Date
- [ ] List is sortable by any column
- [ ] Admin can search by mobile number or name
- [ ] Admin can filter by date range (registered between)
- [ ] Each row links to the User Detail page
- [ ] Export to CSV button available

---

### US-015 · View Individual User Detail
**Priority:** P1

> As an **Admin**, I want to see the full profile and history of a specific user, so that I can review their complete activity.

**Acceptance Criteria:**
- [ ] User profile card shows: Mobile, Name, Registered Date, Last Scan, Wallet Balance
- [ ] Stats section shows: Total Scans | Total Redeemed | Total Wallet Credits | Total Pending | Total ₹ Earned | Total ₹ In Wallet
- [ ] Scan history table shows every scan: Date | Batch Code | Product Name | Amount | Action (Redeemed / Wallet Credited / Pending Reason) | Reason (if Option C) | TXN ID (if Option A)
- [ ] Wallet transaction history shown separately: Date | Type | Amount | From QR / To UPI
- [ ] History sorted by most recent first
- [ ] Admin can export the user's history as CSV

---

### US-016 · Top Users Report
**Priority:** P2

> As an **Admin**, I want to see a top users report, so that I can identify my most active loyalty program participants.

**Acceptance Criteria:**
- [ ] Shows top 20 users ranked by Total Earned
- [ ] Toggle to rank by Total Scans instead
- [ ] Each entry shows: Rank, Mobile (masked), Name, Total Scans, Total Earned, Wallet Balance

---

## EPIC 5 — QR Code Scanning & Validation

---

### US-017 · Scan a Valid QR Code
**Priority:** P1

> As a **User**, I want to scan a QR code and be taken to the redemption page instantly, so that I can start the reward claim process.

**Acceptance Criteria:**
- [ ] Scanning the QR opens the redemption URL in the phone browser
- [ ] Page loads within 3 seconds
- [ ] System immediately validates the QR ID from the URL
- [ ] If QR is valid and funded, the page moves to Step 1 (Mobile Number entry)

---

### US-018 · Block Scan — QR Not Activated
**Priority:** P1

> As a **User**, if I scan a QR that belongs to a DRAFT (unfunded) batch, I want to see a clear message, so that I understand the QR is not yet active.

**Acceptance Criteria:**
- [ ] User sees full-screen error page: "This QR code is not activated yet"
- [ ] Sub-message: "Please check back later"
- [ ] No OTP flow is triggered
- [ ] No wallet debit occurs
- [ ] Page shows company branding

---

### US-019 · Block Scan — QR Expired
**Priority:** P1

> As a **User**, if I scan a QR that has passed its expiry date, I want to see a clear expiry message, so that I know the offer has ended.

**Acceptance Criteria:**
- [ ] User sees full-screen error: "This QR code has expired"
- [ ] Expiry date is shown: "This offer was valid until DD/MM/YYYY"
- [ ] No OTP flow is triggered
- [ ] No wallet debit occurs

---

### US-020 · Block Scan — QR Already Used
**Priority:** P1

> As a **User**, if I scan a QR that has already been redeemed or is in progress, I want to see a clear message, so that I know it cannot be used again.

**Acceptance Criteria:**
- [ ] User sees full-screen error: "This QR code has already been used"
- [ ] No personal details of the previous user are shown
- [ ] No OTP flow is triggered
- [ ] No wallet debit occurs

---

### US-021 · Block Scan — Batch Paused
**Priority:** P1

> As a **User**, if I scan a QR from a paused batch, I want to see a message, so that I know the offer is temporarily unavailable.

**Acceptance Criteria:**
- [ ] User sees: "This offer is currently paused. Please try again later."
- [ ] No OTP flow is triggered
- [ ] No wallet debit occurs

---

### US-022 · Block Scan — Invalid QR
**Priority:** P1

> As a **User**, if I scan a QR with an ID that doesn't exist in the system, I want to see an error, so that I know it is not a valid loyalty QR.

**Acceptance Criteria:**
- [ ] User sees: "This QR code is not valid"
- [ ] No OTP flow is triggered

---

## EPIC 6 — OTP Verification

---

### US-023 · Enter Mobile Number
**Priority:** P1

> As a **User**, I want to enter my mobile number on the redemption page, so that the system can verify my identity via OTP.

**Acceptance Criteria:**
- [ ] Step 1 of redemption flow shows a mobile number input field
- [ ] Input accepts only 10-digit numbers
- [ ] "Send OTP" button is disabled until 10 digits are entered
- [ ] On submit, OTP is sent to the entered mobile number via SMS
- [ ] Loading state shown while OTP is being sent
- [ ] Page automatically moves to OTP entry step on success
- [ ] Error shown if SMS fails to send

---

### US-024 · Verify OTP
**Priority:** P1

> As a **User**, I want to enter the OTP I received, so that I can prove I own the mobile number.

**Acceptance Criteria:**
- [ ] OTP entry screen shows 6 individual input boxes (one digit each)
- [ ] Focus auto-moves to next box after each digit is entered
- [ ] Backspace moves focus to previous box
- [ ] "Verify" button submits all 6 digits
- [ ] OTP is valid for 5 minutes from time of sending
- [ ] Max 3 incorrect attempts allowed before OTP is invalidated
- [ ] On failure: "Incorrect OTP. X attempts remaining"
- [ ] On success: proceeds to Step 3
- [ ] "Resend OTP" link appears after 30-second countdown
- [ ] Resend resets the 5-minute timer and attempt count

---

### US-025 · OTP for POC (Static OTP)
**Priority:** P1

> As a **Developer**, I want to use a static OTP (123456) during the POC, so that I can test the flow without a real SMS gateway.

**Acceptance Criteria:**
- [ ] Any mobile number accepts OTP `123456` during POC
- [ ] A visible note on the OTP screen during POC: "Demo OTP: 123456"
- [ ] This behavior is controlled by an environment variable `USE_STATIC_OTP=true`

---

## EPIC 7 — User Details & Scan Confirmation

---

### US-026 · Enter Name
**Priority:** P1

> As a **User**, I want to enter my name during the redemption flow, so that my identity is registered in the system.

**Acceptance Criteria:**
- [ ] Step 3 shows a name input field
- [ ] Name field is mandatory (minimum 2 characters)
- [ ] If user has scanned before, their saved name is pre-filled
- [ ] User can edit the pre-filled name

---

### US-027 · Scan Again Confirmation
**Priority:** P1

> As a **User**, I want to confirm I still have the physical QR code by scanning it again, so that the system is sure I physically possess the QR.

**Acceptance Criteria:**
- [ ] After name entry, user sees "Scan Again" instruction screen
- [ ] Screen shows a QR icon and the instruction: "Please scan the QR code again to confirm"
- [ ] In POC: a "Confirm Scan" button acts as the scan confirmation
- [ ] In production: camera opens to scan the same QR
- [ ] On confirmation, system proceeds to the redemption choice step
- [ ] Admin wallet is debited at this point (not earlier)

---

## EPIC 8 — Redemption Flow

---

### US-028 · View Reward Amount
**Priority:** P1

> As a **User**, after confirming my scan, I want to see how much money I have won, so that I can decide how to redeem it.

**Acceptance Criteria:**
- [ ] Reward amount is revealed only after OTP verification and scan confirmation
- [ ] Amount is displayed prominently: "You won ₹5!"
- [ ] Below the amount, three options are shown: Redeem Now | Add to Wallet | Not Now
- [ ] Amount is never visible in the URL or before OTP verification

---

### US-029 · Option A — Instant UPI Redemption
**Priority:** P1

> As a **User**, I want to enter my UPI ID and redeem the reward immediately, so that money is transferred to my bank right away.

**Acceptance Criteria:**
- [ ] User selects "Redeem Now" option
- [ ] UPI ID input field appears
- [ ] If user has a saved UPI ID (from Android app), it is pre-filled
- [ ] User can edit the pre-filled UPI ID
- [ ] "Redeem ₹5" button submits the request
- [ ] System triggers UPI transfer (simulated in POC)
- [ ] On success: moves to Step 5 success screen
- [ ] QR status updated to `REDEEMED`
- [ ] User's `total_earned` and `total_redeemed` counts updated
- [ ] Scan history record created with action `redeemed`

---

### US-030 · Option B — Add to User Wallet
**Priority:** P1

> As a **User**, I want to add the reward amount to my in-app wallet, so that I can accumulate multiple rewards and withdraw later at once.

**Acceptance Criteria:**
- [ ] User selects "Add to My Wallet" option
- [ ] A single confirmation button: "Add ₹5 to Wallet"
- [ ] On confirm, ₹5 is credited to the user's wallet balance
- [ ] Moves to Step 5 success screen: "₹5 added to your wallet! Your wallet balance is ₹23"
- [ ] QR status updated to `WALLET_CREDITED`
- [ ] User's `wallet_balance` and `total_wallet_credits` count updated
- [ ] Wallet transaction record created (type: `credit`)
- [ ] Scan history record created with action `wallet_credited`

---

### US-031 · Option C — Not Now (Give Reason)
**Priority:** P1

> As a **User**, I want to choose "Not Now" and give a reason, so that I can inform the company why I am not redeeming right now.

**Acceptance Criteria:**
- [ ] User selects "Not Now" option
- [ ] A text area appears: "Please tell us why (required)"
- [ ] Reason field is mandatory — minimum 5 characters
- [ ] "Submit" button submits the reason
- [ ] On submit: moves to Step 5 acknowledgement screen
- [ ] QR status updated to `PENDING_REASON`
- [ ] Reason text stored against the QR record
- [ ] User's `total_pending` count updated
- [ ] Scan history record created with action `pending_reason`
- [ ] Amount is NOT transferred to user, NOT added to wallet
- [ ] Admin wallet was already debited on scan — that debit stands

---

### US-032 · Step 5 — Success Screen (Option A)
**Priority:** P1

> As a **User**, after a successful UPI redemption, I want to see a success screen, so that I know the money has been sent.

**Acceptance Criteria:**
- [ ] Screen shows: "Payment Successful!" with a success animation
- [ ] Shows: Amount sent (₹5), UPI ID used, Transaction ID
- [ ] "Done" button closes the flow
- [ ] Screen is shareable (optional P3)

---

### US-033 · Step 5 — Wallet Credit Screen (Option B)
**Priority:** P1

> As a **User**, after adding to wallet, I want to see a confirmation screen, so that I know the amount is in my wallet.

**Acceptance Criteria:**
- [ ] Screen shows: "Added to Wallet!" with a wallet animation
- [ ] Shows: Amount added (₹5), New wallet balance (₹23)
- [ ] A "Withdraw Now" button navigates to the wallet withdrawal page
- [ ] A "Done" button closes the flow

---

### US-034 · Step 5 — Pending Reason Acknowledgement (Option C)
**Priority:** P1

> As a **User**, after submitting a reason, I want to see an acknowledgement screen, so that I know my response was recorded.

**Acceptance Criteria:**
- [ ] Screen shows: "Response Recorded. Thank you."
- [ ] Shows a brief message: "Your feedback has been noted."
- [ ] "Done" button closes the flow

---

## EPIC 9 — User Wallet

---

### US-035 · View User Wallet Balance
**Priority:** P1

> As a **User**, I want to view my wallet balance and transaction history, so that I know how much I have accumulated.

**Acceptance Criteria:**
- [ ] Wallet page accessible via a link after scan or from the app
- [ ] User authenticates via mobile + OTP to view wallet
- [ ] Shows: Current Wallet Balance prominently
- [ ] Shows wallet transaction history: Date | Type (Credit / Withdrawal) | Amount | Source (QR / UPI) | Product Name
- [ ] Credits shown in green, withdrawals in red

---

### US-036 · Withdraw from User Wallet
**Priority:** P1

> As a **User**, I want to withdraw my wallet balance to my UPI account, so that I can get cash from accumulated rewards.

**Acceptance Criteria:**
- [ ] "Withdraw" button on wallet page
- [ ] User enters UPI ID (pre-filled if saved)
- [ ] User enters amount to withdraw (default: full balance)
- [ ] System validates: withdrawal amount ≤ wallet balance
- [ ] System validates: minimum withdrawal ₹1
- [ ] On confirm: UPI transfer triggered (simulated in POC)
- [ ] Wallet balance reduced by withdrawal amount
- [ ] Wallet transaction created (type: `withdrawal`)
- [ ] Success screen shown with transaction ID

---

## EPIC 10 — System & Backend

---

### US-037 · Auto-generate Batch Code
**Priority:** P1

> As the **System**, I want to auto-generate sequential batch codes (BATCH-001, BATCH-002), so that every batch has a unique human-readable identifier.

**Acceptance Criteria:**
- [ ] First batch created gets BATCH-001
- [ ] Each subsequent batch gets the next number
- [ ] Batch code is padded to 3 digits (BATCH-001 not BATCH-1)
- [ ] Batch code is unique and never reused even if a batch is deleted

---

### US-038 · Admin Wallet Debit on Scan
**Priority:** P1

> As the **System**, I want to debit the admin wallet when a valid QR is scanned and confirmed, so that the company's balance accurately reflects money in use.

**Acceptance Criteria:**
- [ ] Debit happens only when QR status is `FUNDED` and scan passes all validation checks
- [ ] Debit amount = the QR's assigned amount
- [ ] Debit is recorded in `wallet_transactions` table
- [ ] QR status updated to `SCANNING` atomically with the debit (single DB transaction)
- [ ] If wallet balance is insufficient — scan is blocked: "Insufficient wallet balance"
- [ ] No double debit — if QR is already in `SCANNING` or beyond, no debit occurs

---

### US-039 · Auto-expire QR Codes
**Priority:** P2

> As the **System**, I want to automatically mark QR codes as expired when the batch expiry date passes, so that users cannot scan expired QRs.

**Acceptance Criteria:**
- [ ] A scheduled job runs daily at midnight
- [ ] Any `FUNDED` QR whose `expires_at` < today is marked `EXPIRED`
- [ ] The parent batch status is also updated to `EXPIRED` if all QRs are expired
- [ ] Expired QRs cannot be reactivated

---

### US-040 · Auto-create User Profile on First Scan
**Priority:** P1

> As the **System**, I want to auto-create a user profile when a mobile number is verified for the first time, so that I can start tracking their activity.

**Acceptance Criteria:**
- [ ] When OTP is verified for a mobile number not in the `users` table, a new user is created
- [ ] `registered_at` is set to the current timestamp
- [ ] When OTP is verified for an existing mobile number, the existing user profile is returned
- [ ] Name is updated when user enters it in Step 3

---

### US-041 · Update User Stats After Each Scan
**Priority:** P1

> As the **System**, I want to update the user's aggregated stats after every scan, so that the admin reports always show accurate totals.

**Acceptance Criteria:**
- [ ] `total_scans` incremented after every confirmed scan
- [ ] `total_redeemed` incremented when Option A is chosen
- [ ] `total_wallet_credits` incremented when Option B is chosen
- [ ] `total_pending` incremented when Option C is chosen
- [ ] `total_earned` increased by QR amount when Option A is chosen
- [ ] `wallet_balance` increased by QR amount when Option B is chosen
- [ ] `wallet_balance` decreased by withdrawal amount when user withdraws
- [ ] `last_scan_at` updated on every scan
- [ ] All updates happen in a single DB transaction with the scan history record

---

### US-042 · Save Scan History Record
**Priority:** P1

> As the **System**, I want to save a record in scan_history for every completed scan, so that there is a permanent audit trail.

**Acceptance Criteria:**
- [ ] A `scan_history` record is created when user completes Step 4 (Option A, B, or C)
- [ ] Record stores: user_id, qr_id, batch_id, batch_code, product_name, amount, action, upi_id (if A), reason (if C), txn_id (if A), scanned_at
- [ ] Records are never deleted or modified — append only

---

### US-043 · Android UPI ID Pre-fill
**Priority:** P2

> As the **System**, I want to save the user's UPI ID after first use and pre-fill it on next redemption, so that Android app users don't have to re-enter it every time.

**Acceptance Criteria:**
- [ ] After a successful Option A redemption, the used UPI ID is saved against the user's mobile number
- [ ] On subsequent redemptions, if a saved UPI ID exists, it is pre-filled in the UPI input field
- [ ] User can still edit or change the pre-filled UPI ID
- [ ] Pre-fill applies in both browser and Android WebView contexts

---

## EPIC 11 — Frontend & UX

---

### US-044 · Mobile-first Redemption Page
**Priority:** P1

> As a **User**, I want the redemption page to work perfectly on my mobile phone, so that I can complete the flow easily after scanning.

**Acceptance Criteria:**
- [ ] All redemption steps are fully responsive on screen widths from 320px to 428px
- [ ] Touch targets (buttons, inputs) are minimum 44×44px
- [ ] No horizontal scrolling on any step
- [ ] Font size is readable without zooming (minimum 16px for inputs)
- [ ] Progress indicator shows current step (1 of 5)
- [ ] Step transitions are smooth (slide animation)

---

### US-045 · Admin Panel Responsive Layout
**Priority:** P2

> As an **Admin**, I want the admin panel to work on both desktop and tablet, so that I can manage batches from any device.

**Acceptance Criteria:**
- [ ] Admin panel layout uses a sidebar on desktop (≥1024px)
- [ ] Sidebar collapses to a hamburger menu on tablet (768px–1023px)
- [ ] Tables are horizontally scrollable on smaller screens
- [ ] All forms are usable on tablet

---

### US-046 · QR Validation Error Pages
**Priority:** P1

> As a **User**, I want clear, well-designed error pages when my QR scan fails, so that I understand what went wrong without confusion.

**Acceptance Criteria:**
- [ ] Each error type has a distinct message (see US-018 to US-022)
- [ ] Error pages show company branding
- [ ] Error pages show a relevant icon (expired clock, invalid QR, already used checkmark)
- [ ] No technical error messages or stack traces shown to users

---

## Summary Table

| Epic | Stories | Priority P1 | Priority P2 | Priority P3 |
|------|---------|-------------|-------------|-------------|
| 1 — Auth | US-001 | 1 | 0 | 0 |
| 2 — Batch Management | US-002 to US-008 | 6 | 1 | 0 |
| 3 — Admin Wallet | US-009 to US-011 | 2 | 1 | 0 |
| 4 — Dashboard & Reports | US-012 to US-016 | 4 | 1 | 0 |
| 5 — QR Validation | US-017 to US-022 | 6 | 0 | 0 |
| 6 — OTP | US-023 to US-025 | 3 | 0 | 0 |
| 7 — User Details | US-026 to US-027 | 2 | 0 | 0 |
| 8 — Redemption Flow | US-028 to US-034 | 7 | 0 | 0 |
| 9 — User Wallet | US-035 to US-036 | 2 | 0 | 0 |
| 10 — System/Backend | US-037 to US-043 | 6 | 1 | 0 |
| 11 — Frontend/UX | US-044 to US-046 | 2 | 1 | 0 |
| **Total** | **46 stories** | **41** | **5** | **0** |

---

## Suggested Developer Split

| Developer | Assigned Stories | Area |
|-----------|-----------------|------|
| **Dev 1 — Backend Core** | US-037, US-038, US-039, US-040, US-041, US-042, US-043 | DB schema, batch APIs, QR generation, wallet debit logic |
| **Dev 2 — Backend Redemption** | US-017 to US-025, US-031, US-032, US-033, US-034 | QR validation, OTP APIs, redemption submit API |
| **Dev 3 — Admin Frontend** | US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008 | Admin auth, batch list, batch detail, fund batch |
| **Dev 4 — Admin Reports** | US-009, US-010, US-011, US-012, US-013, US-014, US-015, US-016 | Wallet UI, dashboard, user list, user detail |
| **Dev 5 — User Frontend** | US-044, US-045, US-046, US-026, US-027, US-028, US-029, US-030, US-035, US-036 | Redemption flow UI, wallet page, error pages |

---

*All stories approved → proceed to development sprint planning.*
