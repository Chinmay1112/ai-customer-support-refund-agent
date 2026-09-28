# AI Customer Support Refund Agent

An enterprise-grade, autonomous Customer Support AI Agent built with Next.js App Router, TypeScript, and Prisma SQLite. It features deterministic 12-rule refund policy enforcement, raw OpenAI function/tool calling orchestration, and an Admin Audit & Telemetry Dashboard for near-real-time observability.

---

## Architecture Diagram

```text
 Customer (Browser)                       Admin (Browser)
        |                                       |
        v                                       v
+-------------------------------+       +-------------------------------+
|  Next.js Customer Chat UI     |       |  Admin Telemetry Dashboard    |
|  - Message Bubble Stream      |       |  - Real-Time Event Timeline   |
|  - 1-Click Demo Scenarios     |       |  - 12-Rule Policy Inspector   |
|  - Decision Cards (INR)       |       |  - CRM State Explorer         |
+-------------------------------+       +-------------------------------+
                |                                       ^
                v                                       |
    POST /api/chat                      GET /api/admin/logs
                |                                       |
                v                                       |
+-------------------------------------------------------+---------------+
|                         Next.js Backend Server                        |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                Raw Function-Calling Agent Loop                  |  |
|  |  - Interprets user request & selects registered tools           |  |
|  |  - Bounded iteration loop (prevents infinite recursion)         |  |
|  |  - OpenAI GPT-4o-mini / Deterministic Fallback Mode             |  |
|  +-----------------------------------------------------------------+  |
|               |                                       |               |
|               v                                       v               |
|   +-----------------------+              +------------------------+   |
|   |   Backend Tool Layer  |              | Structured Audit Logger|   |
|   |   - Zod Schema Valid. |              | - AGENT_STARTED        |   |
|   |   - Identity Check    |              | - TOOL_CALL / SUCCESS  |   |
|   +-----------------------+              | - POLICY_RULE_PASSED   |   |
|               |                          | - POLICY_RULE_FAILED   |   |
|               v                          | - REFUND_PROCESSED     |   |
|   +------------------------------------+ | - REFUND_DENIED        |   |
|   |   Deterministic Policy Engine      | | - MANUAL_REVIEW        |   |
|   |   - 12 Strict Server Rules         | +------------------------+   |
|   |   - Rule-by-rule pass/fail audit   |              |               |
|   |   - ₹10,000 Manual Review Boundary |              |               |
|   +------------------------------------+              |               |
|               |                                       |               |
|               v                                       v               |
|   +---------------------------------------------------------------+   |
|   |              Prisma ORM & SQLite Database Engine              |   |
|   |    [Customer]        [Order]        [Refund]     [AgentEvent] |   |
|   +---------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
```

---

## Key Architectural Principle: The LLM is NOT the Source of Truth

> **Critical Safety Constraint:**  
> User instructions cannot directly authorize a refund because refund execution is independently validated by server-side authorization and deterministic policy checks.
> 
> * **The LLM is responsible for:** Natural language understanding, identifying intent, extracting structured order IDs and return reasons, selecting registered tools, and communicating empathetically with the customer.
> * **The Explicit Conversation State Machine is responsible for:** Tracking multi-turn conversational state (`intent`, `pendingAction`, `activeOrderId`, `returnReason`), isolating order contexts, and preventing stale parameter reuse.
> * **The Backend Policy Engine is responsible for:** Identity authorization, order lookup, evaluating 12 deterministic policy rules, calculating refund caps, and enforcing state transitions.
> * **Independent Validation & Atomic Transactions:** `process_refund()` executes inside an interactive database transaction (`prisma.$transaction`). It independently re-fetches records from SQLite, re-validates ownership, re-runs the 12-rule policy validator, and verifies customer confirmation before committing any financial mutation.

---

## Features

- **Multi-Turn Stateful Support Flow:** Explicit conversation state model tracking `intent`, `pendingAction`, `activeOrderId`, and `returnReason` across requests without fragile regex sniffing.
- **Mandatory Return Reason Collection:** An Order ID alone never triggers refund execution. The agent always retrieves order details and requests a structured return reason before evaluating policy.
- **Strict Separation of Eligibility vs. Execution:** Policy check is strictly read-only. Refunds only execute after explicit customer confirmation (`yes, proceed`).
- **Strict Order Context Isolation:** Explicit new Order IDs immediately wipe previous order context. No stale target order or cached tool result reuse (`ORD-1001` -> `ORD-1002` -> `ORD-1003`).
- **Atomic Database Transactions:** `process_refund` validates and commits changes inside a single atomic `prisma.$transaction`, ensuring complete rollback on any policy or authorization failure.
- **Request ID Idempotency:** Backend request cache prevents duplicate executions or double-refund mutations from rapid double-clicks or retries.
- **Recruiter Demo Mode:** Clean customer-facing UX with internal CRM IDs hidden by default; Demo Mode toggle enables account switching and 1-click test scenarios for evaluator review.
- **Strict 12-Rule Policy Engine:** Fully deterministic TypeScript evaluation returning fine-grained rule-by-rule audit proofs (`passedRules` and `failedRules`).
- **Real-Time Admin Telemetry:** Live auto-refreshing audit timeline displaying event payloads, tool executions, and policy checks at `/admin`.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Server and Client Components, Responsive layout |
| **Styling** | Tailwind CSS v4, Lucide React | Clean enterprise e-commerce customer support aesthetic |
| **Backend** | Next.js Route Handlers (`/api/chat`, `/api/admin/logs`) | REST API with idempotent request caching |
| **AI Orchestration** | OpenAI Official SDK (`openai`) / Deterministic Engine | Native tool calling, state-machine driven orchestration |
| **Database** | SQLite + Prisma ORM 6 | Atomic interactive transactions, relations, indexes |
| **Validation** | Zod | Runtime schema validation for all tool inputs and API payloads |
| **Testing** | Vitest 3 | 94 automated tests across 6 suites with 100% pass rate |

---

## The 12-Rule Strict Refund Policy

Enforced server-side in `policy/refundValidator.ts`:

1. **7-Day Delivery Window:** Requests must be made within 7 calendar days of delivery.
2. **Delivery Requirement:** The order must have been delivered (`status = DELIVERED`).
3. **Product Refundability:** Only refundable catalog items are eligible (`isRefundable = true`).
4. **Digital Goods Exclusion:** Software licenses, digital codes, and subscriptions are non-refundable.
5. **Condition Eligibility:** Used products are non-refundable unless verified defective.
6. **Defective Product Exemption:** Defective used products qualify under the manufacturing defect clause.
7. **Duplicate Refund Prevention:** Orders already refunded (`refundStatus = REFUNDED`) cannot be refunded again.
8. **Ownership Verification:** A customer can only request a refund for their own order (`order.customerId === customer.id`).
9. **Maximum Refund Cap:** Refund amount cannot exceed original invoiced order amount.
10. **High-Value Threshold (> ₹10,000):** Orders above ₹10,000 cannot be automatically refunded; mandatory escalation to human operations under `MANUAL_REVIEW`.
11. **Cancelled Orders Exclusion:** Cancelled orders are excluded from return refund workflows.
12. **Anti-Fabrication & Data Integrity:** System rejects requests with missing or unverifiable customer/order data.

---

## Agent Tools

All tools are validated with Zod and log events to `AgentEvent`:

| Tool | Parameters | Description |
|---|---|---|
| `get_customer` | `{ customerId }` | Fetches customer profile by ID. |
| `find_customer_by_email` | `{ email }` | Searches customer by registered email. |
| `get_order` | `{ orderId }` | Retrieves complete order details and delivery timestamp. |
| `list_customer_orders` | `{ customerId }` | Lists all order history for a verified customer. |
| `evaluate_return_request` | `{ customerId, orderId, reason, details? }` | Evaluates return against 12-rule policy using structured reason; read-only with 0 DB mutations. |
| `check_refund_eligibility` | `{ customerId, orderId, reason? }` | Runs 12-rule policy check; returns `passedRules`, `failedRules`, and decision (`APPROVE`, `DENY`, `MANUAL_REVIEW`). |
| `process_refund` | `{ customerId, orderId, reason }` | **Atomic transaction execution**. Re-validates ownership, duplicate status, and policy in `prisma.$transaction`. Updates order to `REFUNDED` and writes audit log. |
| `deny_refund` | `{ customerId, orderId, reason }` | Records policy denial and updates order state. |
| `create_manual_review` | `{ customerId, orderId, reason }` | Escalates orders > ₹10,000 to human review; generates review ticket ID (`REV-xxxxxx`). |
| `get_refund_status` | `{ orderId }` | Checks current refund or review state of an order. Strictly read-only; never calls `process_refund`. |

---

## Mock CRM Data (15 Indian Customer Profiles)

The database includes 15 realistic Indian customer profiles in `prisma/seed.ts`:

| Customer ID | Name | Order ID | Product & Amount | Test Scenario | Expected Outcome |
|---|---|---|---|---|---|
| **CUST-001** | Aarav Sharma | `ORD-1001` | boAt Headphones (₹1,999) | Unopened, delivered 3 days ago | **APPROVE** (Refund created) |
| **CUST-002** | Priya Patel | `ORD-1002` | Philips Air Fryer (₹6,499) | Delivered 14 days ago (> 7 days) | **DENY** (Outside window) |
| **CUST-003** | Rohan Verma | `ORD-1003` | Gillette Blades (₹1,850) | Hygiene product (`isRefundable: false`) | **DENY** (Non-refundable) |
| **CUST-004** | Ananya Iyer | `ORD-1004` | Microsoft 365 Code (₹4,899) | Digital Software License | **DENY** (Digital goods) |
| **CUST-005** | Vikram Singhania | `ORD-1005` | Prestige Mixer (₹3,299) | Pre-refunded order (`REF-8001`) | **DENY** (Duplicate prevention) |
| **CUST-006** | Neha Kulkarni | `ORD-1006` | Bajaj OTG (₹4,199) | Used but heating defective | **APPROVE** (Rule 6 defect exemption) |
| **CUST-007** | Aditya Deshmukh | `ORD-1007` | Nike Pegasus Shoes (₹7,999) | Used non-defective item | **DENY** (Rule 5 condition failure) |
| **CUST-008** | Sunita Rao | `ORD-1008` | Sony 55" 4K TV (₹48,990) | Amount > ₹10,000 threshold | **MANUAL_REVIEW** (Senior review) |
| **CUST-009** | Rajesh Nair | `ORD-1009` | Fastrack Smartwatch (₹1,795) | Cancelled order | **DENY** (Rule 11 cancelled order) |
| **CUST-010** | Kavita Banerjee | `ORD-1010` | Faber Chimney (₹9,990) | Cross-account test (Aarav requesting) | **DENY** (Rule 8 ownership violation) |
| **CUST-011** | Arjun Mehta | `ORD-1011` / `1012` | Logitech MX Master / Keyboard | Multi-order history evaluation | Clean Context Switching |
| **CUST-012** | Sneha Gupta | `ORD-1013` | OnePlus Pad Go (₹19,999) | High-value tablet | **MANUAL_REVIEW** |
| **CUST-013** | Manish Joshi | `ORD-1014` | Havells Geyser (₹3,499) | Eligible delivered order | **APPROVE** |
| **CUST-014** | Divya Chawla | `ORD-1015` / `1016` | Norton Antivirus / Type-C Cable | Mixed digital and physical cart | Variable |
| **CUST-015** | Karthik Subramanian | `ORD-1017` | Samsonite Backpack (₹4,500) | In-transit order (`status: SHIPPED`) | **DENY** (Not yet delivered) |

---

## Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional: Add your `OPENAI_API_KEY` to test with live GPT-4o-mini. If left blank, the app runs in deterministic simulation mode.)*

### 3. Initialize & Seed SQLite Database
```bash
npx prisma db push
npm run db:reset-demo
```
> **Safe Reset Any Time:** Run `npm run db:reset-demo` to cleanly wipe and reseed all 15 Indian customers, 17 realistic e-commerce orders, and reset all event logs to a pristine state.

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** for Customer Support Chat and **[http://localhost:3000/admin](http://localhost:3000/admin)** for Admin Telemetry.

---

## Testing

### Run Unit & Integration Tests (Vitest)
```bash
npm test
```
Runs **94 automated tests** with **100% pass rate** across 6 test suites:
- **`tests/invariants.test.ts` (10 tests):** Hard invariant safety assertions (Invariants 1 through 10: reason required, approval required, confirmation required, ownership verified, duplicate prevented, status read-only, order ID non-authorizing, context isolation, nonsense rejection, UI bypass defense).
- **`tests/mandatory_matrix.test.ts` (17 tests):** Comprehensive test matrix covering scenarios A through Q.
- **`tests/mandatory_20.test.ts` (26 tests):** Complete edge cases and multi-turn conversational transitions.
- **`tests/intent.test.ts` (19 tests):** Intent classification for greetings, courtesy, capabilities, and deterministic order ID extraction.
- **`tests/tools.test.ts` (12 tests):** Atomic interactive transactions, duplicate prevention, cross-account authorization rejection, high-value manual review thresholding.
- **`tests/policy.test.ts` (10 tests):** All 12 deterministic refund policy rules and boundaries.

### Run End-to-End Scenario Suite
```bash
npx tsx scripts/test-e2e.ts
```
Exercises **13 comprehensive scenarios (A through M)** against the live HTTP API including multi-turn conversational flows, edge cases, and safety assertions.

### Run Linter & Production Build
```bash
npm run lint
npm run build
```

---

## Demo Walkthrough (7–10 Minutes)

1. **Step 1: Eligible Refund (1 min)**
   - Select **Aarav Sharma (CUST-001)**.
   - Click the prompt chip **"Eligible Refund (ORD-1001)"**.
   - Observe tool executions (`get_customer` -> `get_order` -> `check_refund_eligibility` -> `process_refund`).
   - Note the green **APPROVE** decision card with ₹1,999.00 and Refund ID (`REF-1001-xxxx`).
2. **Step 2: Outside 7-Day Window (1 min)**
   - Switch persona to **Priya Patel (CUST-002)**.
   - Click **"Outside Window (ORD-1002)"**.
   - Observe policy denial: Delivered 14 days ago (> 7-day limit).
3. **Step 3: High-Value Manual Review (1 min)**
   - Switch persona to **Sunita Rao (CUST-008)**.
   - Click **"High-Value Review (ORD-1008)"**.
   - Observe that the TV (₹48,990) meets physical criteria but triggers **MANUAL_REVIEW** (ticket `REV-xxxxxx`).
4. **Step 4: Edge Cases (2 min)**
   - Test **Digital Product (ORD-1004)** -> Denied under Rule 4.
   - Test **Already Refunded (ORD-1005)** -> Duplicate prevention enforced under Rule 7.
   - Test **Defective Product (ORD-1006)** -> Approved under Rule 6 exemption.
5. **Step 5: Admin Audit Dashboard (2 min)**
   - Open `/admin`.
   - Inspect live metric counters (Total Sessions, Approved, Denied, Manual Reviews).
   - View chronological event timeline (`POLICY_CHECK`, `POLICY_RULE_PASSED`, `REFUND_PROCESSED`).
   - Switch to the **Mock CRM** tab to inspect all 15 customer databases and orders.

---

## Security Best Practices

- **Zero Client-Side Secrets:** `OPENAI_API_KEY` is loaded strictly on the server and never exposed to client bundles.
- **Log Sanitization:** Sensitive authorization strings and API keys are redacted before writing to `AgentEvent`.
- **Zod Parameter Guards:** Tool calls validate schemas before execution; malformed inputs produce graceful error objects rather than crashing the process.
- **No Arbitrary Execution:** Only tools explicitly registered in `AGENT_TOOLS_DEFINITIONS` are executed.

---

## Future Improvements

- Real CRM integrations (Salesforce, Zendesk, Freshdesk).
- Payment gateway webhook integration (Stripe, Razorpay, Cashfree) for automated refund reversal webhooks.
- Multi-channel voice support via OpenAI Realtime API.
- Customer authentication via NextAuth / Clerk.
