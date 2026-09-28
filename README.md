# AI Customer Support Refund Agent

An enterprise-grade, autonomous Customer Support AI Agent built with Next.js App Router, TypeScript, Prisma ORM, and dual SQLite/PostgreSQL architecture. It features deterministic 12-rule refund policy enforcement, raw LLM function/tool calling orchestration (OpenAI / Gemini compatible), atomic database transaction guarantees, and an Admin Audit & Telemetry Dashboard for near-real-time observability.

---

## Live Links & Demo

- **Live Deployment:** `https://your-deployment-url.vercel.app` *(Placeholder: Add your Vercel URL upon deployment)*
- **Demo Video Walkthrough:** `https://loom.com/share/your-video-id` *(Placeholder: Add your Loom/YouTube video link)*
- **Admin Dashboard:** `/admin` *(Inspect live audit logs, CRM state, and policy telemetry)*

---

## Architecture Diagram

```text
 Customer (Browser)                       Admin (Evaluator Browser)
        |                                             |
        v                                             v
+-------------------------------+             +-------------------------------+
|  Next.js Customer Chat UI     |             |  Admin Telemetry Dashboard    |
|  - Progressive Chat Stream    |             |  - Real-Time Event Timeline   |
|  - 1-Click Demo Scenarios     |             |  - 12-Rule Policy Inspector   |
|  - INR Refund Decision Cards  |             |  - Live CRM State Explorer    |
+-------------------------------+             +-------------------------------+
                |                                             ^
                v                                             |
    POST /api/chat                                    GET /api/admin/logs
                |                                             |
                v                                             |
+-------------------------------------------------------------+---------------+
|                           Next.js Backend Server                            |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                    Raw Function-Calling Agent Loop                    |  |
|  |  - Interprets user request & selects registered tools                 |  |
|  |  - Bounded iteration loop (prevents infinite recursion)               |  |
|  |  - OpenAI GPT-4o-mini / Gemini Flash / Deterministic Fallback Mode    |  |
|  +-----------------------------------------------------------------------+  |
|               |                                             |               |
|               v                                             v               |
|   +-----------------------+                    +------------------------+   |
|   |   Backend Tool Layer  |                    | Structured Audit Logger|   |
|   |   - Zod Schema Valid. |                    | - AGENT_STARTED        |   |
|   |   - Session Auth Check|                    | - TOOL_CALL / SUCCESS  |   |
|   +-----------------------+                    | - POLICY_RULE_PASSED   |   |
|               |                                | - POLICY_RULE_FAILED   |   |
|               v                                | - REFUND_PROCESSED     |   |
|   +------------------------------------------+ | - REFUND_DENIED        |   |
|   |       Deterministic Policy Engine        | | - MANUAL_REVIEW        |   |
|   |   - 12 Strict Server Rules               | +------------------------+   |
|   |   - Rule-by-rule pass/fail audit proofs  |              |               |
|   |   - ₹10,000 Manual Review Boundary       |              |               |
|   +------------------------------------------+              |               |
|               |                                             |               |
|               v                                             v               |
|   +---------------------------------------------------------------------+   |
|   |               Prisma ORM (Dual Engine Architecture)                 |   |
|   |    Local: SQLite (`dev.db`)  |  Production: Hosted PostgreSQL       |   |
|   |        [Customer]       [Order]       [Refund]     [AgentEvent]     |   |
|   +---------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------+
```

---

## Core Security Invariant: The LLM is NEVER the Source of Truth

> [!IMPORTANT]
> **A user instruction or LLM output cannot directly authorize or release a refund.**  
>
> 1. **The LLM is responsible only for:** Natural language understanding, intent recognition, conversational empathy, and choosing tool calls.
> 2. **The Explicit Conversation State Machine is responsible for:** Tracking multi-turn progression (`intent`, `pendingAction`, `activeOrderId`, `returnReason`), isolating order contexts, and eliminating stale parameter bleed.
> 3. **The Deterministic Policy Engine is responsible for:** Server-side customer verification, 12-rule policy validation, refund ceiling calculations, and mandatory human escalation triggers (> ₹10,000).
> 4. **Independent Server-Side Validation:** `process_refund` executes inside an atomic database transaction (`prisma.$transaction`). It independently re-fetches records from the database, confirms customer ownership, checks for duplicate refunds, re-runs policy evaluation, and verifies explicit customer confirmation before executing any financial mutation.

---

## Features

- **Multi-Turn Stateful Support Flow:** Explicit conversation state machine tracking `intent`, `pendingAction`, `activeOrderId`, and `returnReason` across requests without fragile regex sniffing.
- **Mandatory Return Reason Collection:** An Order ID alone never triggers refund execution. The agent always retrieves order details and requests a structured return reason before evaluating policy.
- **Strict Separation of Eligibility vs. Execution:** Policy check is strictly read-only. Refunds only execute after explicit customer confirmation (`yes, proceed`).
- **Strict Order Context Isolation:** Explicit new Order IDs immediately wipe previous order context. No stale target order or cached tool result reuse (`ORD-1001` → `ORD-1002` → `ORD-1003`).
- **Atomic Database Transactions:** `process_refund` validates and commits changes inside a single atomic `prisma.$transaction`, ensuring complete rollback on any policy or authorization failure.
- **Tamper-Proof Refund Amounts:** The refund amount is derived exclusively from the trusted database order record (`txOrder.amount`) and the deterministic policy validator. Malicious requested amounts (e.g. ₹99,999) are ignored.
- **Request ID Idempotency:** Backend request cache prevents duplicate executions or double-refund mutations from rapid double-clicks or retries.
- **Evaluator Demo Mode:** Clean customer-facing UX with internal CRM IDs hidden by default; Demo Mode toggle enables account switching and 1-click test scenarios for evaluator review.
- **Strict 12-Rule Policy Engine:** Fully deterministic TypeScript evaluation returning fine-grained rule-by-rule audit proofs (`passedRules` and `failedRules`).
- **Real-Time Admin Telemetry:** Live auto-refreshing audit timeline displaying event payloads, tool executions, and policy checks at `/admin`.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Server and Client Components, Responsive layout |
| **Styling** | Tailwind CSS v4, Lucide React | Clean enterprise e-commerce customer support aesthetic |
| **Backend** | Next.js Route Handlers (`/api/chat`, `/api/admin/logs`, `/api/admin/customers`) | REST API with rate limiting and idempotent request caching |
| **AI Orchestration** | OpenAI Official SDK (`openai`) / Deterministic Engine | Native tool calling, state-machine driven orchestration, Gemini compatible |
| **Database** | Prisma ORM 6 (Dual SQLite / PostgreSQL support) | Atomic interactive transactions, relations, indexes |
| **Validation** | Zod | Runtime schema validation for all tool inputs, payloads, and parameters |
| **Testing** | Vitest 3 | 111 automated unit & integration tests + 13 HTTP E2E scenarios (100% pass rate) |

---

## The 12-Rule Strict Refund Policy

Enforced server-side in [`policy/refundValidator.ts`](file:///d:/Assignment/policy/refundValidator.ts):

1. **7-Day Delivery Window:** Requests must be made within 7 calendar days of delivery.
2. **Delivery Requirement:** The order must have been delivered (`status = DELIVERED`).
3. **Product Refundability:** Only refundable catalog items are eligible (`isRefundable = true`).
4. **Digital Goods Exclusion:** Software licenses, digital codes, and subscriptions are strictly non-refundable.
5. **Condition Eligibility:** Used products are non-refundable unless verified defective.
6. **Defective Product Exemption:** Defective used products qualify under the manufacturing defect clause.
7. **Duplicate Refund Prevention:** Orders already refunded (`refundStatus = REFUNDED`) cannot be refunded again.
8. **Ownership Verification:** A customer can only request a refund for their own order (`order.customerId === customer.id`).
9. **Maximum Refund Cap:** Refund amount cannot exceed original invoiced order amount.
10. **High-Value Threshold (> ₹10,000):** Orders above ₹10,000 cannot be automatically refunded; mandatory escalation to human operations under `MANUAL_REVIEW`.
11. **Cancelled Orders Exclusion:** Cancelled orders are excluded from return refund workflows.
12. **Anti-Fabrication & Data Integrity:** System rejects requests with missing or unverifiable customer/order data.

---

## Agent Backend Tools

All tools are validated with Zod schemas and log structured records to `AgentEvent`:

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

## Mock CRM Data (15 Customer Profiles)

The database includes 15 realistic customer profiles initialized in [`prisma/seed.ts`](file:///d:/Assignment/prisma/seed.ts):

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

## Database Architecture: Dual SQLite & PostgreSQL Support

To support both **zero-friction local development** and **serverless public cloud deployments**, the application uses an automated provider synchronization script ([`scripts/prepare-prisma.js`](file:///d:/Assignment/scripts/prepare-prisma.js)):

1. **Local Development (Default):**
   - Uses zero-setup SQLite (`DATABASE_URL="file:./dev.db"`).
   - Allows anyone cloning the repository to run `npm test` or `npm run dev` immediately without provisioning a local database server.
2. **Production Deployment (Vercel / Cloud):**
   - Serverless functions (AWS Lambda/Vercel) have ephemeral, read-only filesystems where local SQLite files cannot persist writes.
   - When deploying to Vercel, attach a hosted PostgreSQL database (such as Neon, Supabase, Vercel Postgres, or Railway).
   - `scripts/prepare-prisma.js` detects when `DATABASE_URL` starts with `postgres://` or `postgresql://`, automatically synchronizes `prisma/schema.prisma` to `provider = "postgresql"`, and generates the matching Prisma client during `npm run build` and `postinstall`.

> [!CAUTION]
> **Demo Data Initialization Safety:**
> `npm run db:reset-demo` (`prisma/seed.ts`) drops and recreates the deterministic demo dataset. **It is never executed automatically in production startup or build scripts**, ensuring production records are never accidentally wiped.

---

## Getting Started Locally

### 1. Clone & Install
```bash
git clone https://github.com/Chinmay1112/ai-customer-support-refund-agent.git
cd ai-customer-support-refund-agent
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional: Add your `OPENAI_API_KEY` or `GEMINI_API_KEY`. If left blank, the agent runs in deterministic simulation mode where all 9 tools, policies, and database mutations work seamlessly.)*

### 3. Initialize Local SQLite Database
```bash
npm run db:push
npm run db:reset-demo
```

### 4. Start Development Server
```bash
npm run dev
```
- Customer Chat: **[http://localhost:3000](http://localhost:3000)**
- Admin Audit Dashboard: **[http://localhost:3000/admin](http://localhost:3000/admin)**

---

## Automated Test Suite

### Run All Unit & Integration Tests (111 Tests)
```bash
npm test
```
Runs **111 automated tests** with **100% pass rate** across 8 test suites:
- **`tests/security_audit.test.ts` (15 tests):** Penetration tests covering prompt injection, SQLi, XSS, payload limits (>4000 chars), malformed input, direct refund attempts without session authorization, missing return reason, missing confirmation, cross-customer spoofing, wrong order access, fake amount tampering, duplicate refund rejection, and admin endpoint security.
- **`tests/invariants.test.ts` (10 tests):** Hard invariant assertions (Invariants 1 through 10: reason required, approval required, confirmation required, ownership verified, duplicate prevented, status read-only, order ID non-authorizing, context isolation, nonsense rejection, UI bypass defense).
- **`tests/mandatory_matrix.test.ts` (17 tests):** Comprehensive test matrix covering scenarios A through Q.
- **`tests/mandatory_20.test.ts` (26 tests):** Edge cases and multi-turn conversational transitions.
- **`tests/intent.test.ts` (19 tests):** Intent classification for greetings, courtesy, capabilities, and deterministic order ID extraction.
- **`tests/tools.test.ts` (12 tests):** Atomic interactive transactions, duplicate prevention, cross-account authorization rejection, high-value manual review thresholding.
- **`tests/order_switching.test.ts` (2 tests):** Context switching across `ORD-1001` → `ORD-1002` → `ORD-1003` → `ORD-1004` without stale data leakage.
- **`tests/policy.test.ts` (10 tests):** All 12 deterministic refund policy rules and boundaries.

### Run End-to-End HTTP Scenario Suite
```bash
npx tsx scripts/test-e2e.ts
```
Exercises **13 comprehensive scenarios (A through M)** against the running HTTP server, verifying full multi-turn dialogs, policy evaluations, and refund database mutations.

### Run Linter & Production Build
```bash
npm run lint
npm run build
```

---

## Deployment to Vercel (Public Production)

### 1. Create a Free Hosted PostgreSQL Database
Sign up for a free PostgreSQL database on **[Neon](https://neon.tech)**, **[Supabase](https://supabase.com)**, or **Vercel Postgres**.
Copy the direct connection string:
```
postgresql://user:password@ep-sample.region.neon.tech/neondb?sslmode=require
```

### 2. Push Schema & Seed Initial Demo Data
From your local terminal, apply the database schema and populate the demo dataset into your cloud PostgreSQL database:
```bash
DATABASE_URL="postgresql://user:password@ep-sample.region.neon.tech/neondb?sslmode=require" npm run db:push
DATABASE_URL="postgresql://user:password@ep-sample.region.neon.tech/neondb?sslmode=require" npm run db:reset-demo
```

### 3. Deploy on Vercel
1. Push your repository to GitHub.
2. In the **[Vercel Dashboard](https://vercel.com)**, click **"Add New Project"** and import this repository.
3. In **Environment Variables**, configure:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `OPENAI_API_KEY`: *(Optional)* Your OpenAI API key or Gemini API key.
   - `OPENAI_MODEL`: `gemini-flash-latest` or `gpt-4o-mini` *(Optional)*.
   - `OPENAI_BASE_URL`: `https://generativelanguage.googleapis.com/v1beta/openai/` *(If using Gemini)*.
4. Click **Deploy**.
   - During build, `scripts/prepare-prisma.js` detects the PostgreSQL connection URL, automatically configures Prisma for PostgreSQL, generates the client, and builds the production Next.js bundle.

---

## Security Audit & Known Take-Home Limitations

### Security Safeguards Implemented
- **Server-Side Authorization Authority:** Refunds cannot be triggered by LLM hallucination or modified client payloads. All 9 prerequisite checks are enforced in backend code and database transactions.
- **Amount Tamper Protection:** The refund amount is taken directly from the database order invoice, ignoring any client or LLM suggested amount.
- **Idempotency & Double-Click Guard:** In-memory request caching and database transaction checks prevent duplicate refund execution.
- **Sanitized Audit Events:** Sensitive auth tokens and keys are never persisted in the `agent_events` table.
- **Zero Committed Secrets:** `.env`, `.env*.local`, SQLite databases (`*.db`), `.next/`, and `node_modules` are excluded in `.gitignore`.

### Known Take-Home Simplifications
1. **Unauthenticated Admin Dashboard:** `/admin`, `/api/admin/logs`, and `/api/admin/customers` do not require credentials so evaluators can inspect telemetry and CRM state without friction. Production would require OAuth/SSO and role-based access control (RBAC).
2. **In-Memory Rate Limiting:** The rate limiter uses a process-local memory store. Production multi-node clusters would use a distributed Redis or Upstash cache.
3. **In-Memory Conversational Session Context:** Session state is maintained in server memory. Production multi-region deployments would back session state with Redis.
4. **Header-Based Client IP:** Client IP extraction relies on `x-forwarded-for` and `x-real-ip`. In the absence of a trusted upstream reverse proxy, headers could be spoofed.
