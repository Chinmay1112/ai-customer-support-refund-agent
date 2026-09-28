# E-Commerce Refund Policy

**Policy Version:** 2.4 (Strict Governance)  
**Effective Date:** January 1, 2026  
**Jurisdiction / Scope:** All online store orders across India (INR transactions)

---

## 1. Scope & Core Directives

This refund policy governs all refund, replacement, and return requests processed across our e-commerce platform. All automated systems and customer service representatives must adhere strictly to these non-negotiable clauses.

### Rule 1: 7-Day Refund Window
Refund requests must be initiated within **seven (7) calendar days** of verified order delivery. The timestamp of delivery as recorded by the logistics partner serves as $T=0$. Requests submitted after the 7th calendar day (at midnight local time) are strictly ineligible.

### Rule 2: Delivery Prerequisite
The order must have been marked as **DELIVERED**. Orders currently in transit (`PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`) or awaiting dispatch cannot enter the refund pipeline.

### Rule 3: Refundable Products Only
Only items cataloged as eligible for returns/refunds qualify. Certain categories—including personal hygiene items, intimate apparel, consumables, clearance items, and customized goods—are flagged as non-refundable (`isRefundable = false`) and cannot be refunded under standard returns.

### Rule 4: Digital Goods Exclusion
All digital products (software license keys, downloadable digital media, gift cards, subscriptions, and virtual codes) are strictly **non-refundable** once delivered or viewed.

### Rule 5: Used Condition Restriction
Items returned in a **USED** condition are non-refundable unless the item has a documented manufacturing defect. Unopened (`UNOPENED`) and opened-but-unused (`OPENED_UNUSED`) items remain eligible within the return window.

### Rule 6: Defective Product Exception
Products that arrive damaged or suffer from inherent manufacturing defects (`isDefective = true`) remain eligible for a refund or replacement even if unboxed or tested, subject to verification and within the permissible defect reporting timeline.

### Rule 7: Prevention of Duplicate Refunds
An order that has already been refunded (`refundStatus = REFUNDED`) cannot be refunded again under any circumstances. Duplicate refund submissions must be flagged and rejected immediately.

### Rule 8: Ownership & Identity Verification
A customer may only request and receive a refund for an order placed under their verified customer account (`customerId` match). Cross-account claims or attempts to refund another individual's order will be rejected for security and anti-fraud compliance.

### Rule 9: Maximum Refund Cap
The refund amount cannot exceed the original purchase price paid for the order (`refundAmount <= orderAmount`). Under no scenario may convenience fees, speculative damages, or amounts exceeding the invoiced total be refunded.

### Rule 10: High-Value Threshold (Manual Review Escalation)
Refund claims where the order amount exceeds **₹10,000 (INR 10,000)** cannot be processed autonomously by AI agents or automated bots. Such claims must be securely routed to the Senior Operations / Fraud Prevention Team for manual verification under a `MANUAL_REVIEW` status.

### Rule 11: Cancelled Orders Exclusion
Cancelled orders (`status = CANCELLED`) are not eligible for the refund workflow. Pre-delivery cancellations are handled through automatic payment reversal at point of cancellation, as no delivered physical merchandise exists to be returned.

### Rule 12: Anti-Fabrication & Strict Data Integrity
The automated refund agent and policy engine must never fabricate, extrapolate, or assume refund eligibility when required customer or order data is missing, ambiguous, or unverifiable. Incomplete records require explicit clarification from the customer before any decision is rendered.

---

## 2. Enforcement Architecture

1. **Deterministic Execution:** Policy checks are computed by server-side deterministic logic. The Large Language Model (LLM) is an interface layer that explains determinations; it cannot approve, deny, or modify policy results.
2. **Double Verification:** The `process_refund` backend tool runs independent validation before committing any financial state transition to the database.
3. **Audit Trail:** Every rule evaluation and policy determination is logged with an immutable audit event in the database for operational compliance.
