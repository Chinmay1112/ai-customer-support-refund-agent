import { describe, it, expect, beforeEach } from "vitest";
import { runRefundAgent } from "../agent/agent";
import { executeBackendTool } from "../agent/tools";
import { prisma } from "../lib/db";
import { resetSessionContext } from "../lib/sessionStore";

async function getRefundCount(): Promise<number> {
  return prisma.refund.count();
}

describe("Hard Invariants Enforcement (Requirement 30: Invariants 1 through 10)", () => {
  beforeEach(async () => {
    await prisma.refund.deleteMany({
      where: { orderId: { in: ["ORD-1001", "ORD-1006"] } },
    });
    await prisma.order.updateMany({
      where: { id: { in: ["ORD-1001", "ORD-1006"] } },
      data: { refundStatus: "NONE" },
    });
  });

  // INVARIANT 1: No refund can be created without a return reason.
  it("INVARIANT 1: No refund can be created without a return reason", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv1_${Date.now()}`;
    resetSessionContext(sessionId);

    // User provides order ID without reason
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "I want a refund for ORD-1001",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.workflowState).toBe("REASON_REQUIRED");

    // DB count remains identical
    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });

  // INVARIANT 2: No refund can be created without eligibility APPROVE.
  it("INVARIANT 2: No refund can be created without eligibility APPROVE", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv2_${Date.now()}`;
    resetSessionContext(sessionId);

    // ORD-1002 is outside 7-day window -> DENY
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-002",
      message: "I want a refund for ORD-1002 because it is defective",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.decisionCard?.decision).toBe("DENY");

    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });

  // INVARIANT 3: No refund can be created without explicit confirmation.
  it("INVARIANT 3: No refund can be created without explicit confirmation", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv3_${Date.now()}`;
    resetSessionContext(sessionId);

    // Turn 1: Eligible request evaluates policy and awaits confirmation
    const t1 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "I want to return ORD-1001 because it is defective",
    });

    expect(t1.decisionCard?.decision).toBe("APPROVE");
    expect(t1.workflowState).toBe("AWAITING_CONFIRMATION");
    expect(t1.refundId).toBeNull();

    // Turn 2: Customer says "no, cancel"
    const t2 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "No, cancel",
    });

    expect(t2.refundId).toBeNull();
    expect(t2.toolCalls.some((t) => t.name === "process_refund")).toBe(false);

    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });

  // INVARIANT 4: No refund can be created for another customer's order.
  it("INVARIANT 4: No refund can be created for another customer's order", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv4_${Date.now()}`;
    resetSessionContext(sessionId);

    // CUST-001 tries to claim ORD-1002 (owned by CUST-002)
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "Please refund ORD-1002 because it is defective",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);

    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });

  // INVARIANT 5: No duplicate refund.
  it("INVARIANT 5: No duplicate refund", async () => {
    const sessionId = `inv5_${Date.now()}`;
    resetSessionContext(sessionId);

    // ORD-1005 is already refunded in DB
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-005",
      message: "I want a refund for ORD-1005 because it broke",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.decisionCard?.decision).toBe("DENY");
  });

  // INVARIANT 6: A status request can never call process_refund.
  it("INVARIANT 6: A status request can never call process_refund", async () => {
    const sessionId = `inv6_${Date.now()}`;
    resetSessionContext(sessionId);

    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "What is the status of my refund for ORD-1001?",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.toolCalls.some((t) => t.name === "get_refund_status")).toBe(true);
  });

  // INVARIANT 7: An order ID alone can never authorize a refund.
  it("INVARIANT 7: An order ID alone can never authorize a refund", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv7_${Date.now()}`;
    resetSessionContext(sessionId);

    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1001",
    });

    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.message).not.toContain("Refund approved");

    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });

  // INVARIANT 8: A changed explicit order ID always replaces previous active order context.
  it("INVARIANT 8: A changed explicit order ID always replaces previous active order context", async () => {
    const sessionId = `inv8_${Date.now()}`;
    resetSessionContext(sessionId);

    // Turn 1: ORD-1001
    await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "Check refund eligibility for ORD-1001",
    });

    // Turn 2: ORD-1002 (unowned)
    const t2 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1002",
    });
    expect(t2.message).not.toContain("ORD-1001");

    // Turn 3: ORD-1003 (unowned)
    const t3 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1003",
    });
    // Target is ORD-1003, NEVER references ORD-1002 or ORD-1001
    expect(t3.message).not.toContain("ORD-1002");
    expect(t3.message).not.toContain("ORD-1001");
  });

  // INVARIANT 9: Nonsense input never calls refund tools.
  it("INVARIANT 9: Nonsense input never calls refund tools", async () => {
    const sessionId = `inv9_${Date.now()}`;
    resetSessionContext(sessionId);

    for (const gibberish of ["hello", "dfg", "asdfghjk", "12345", "thanks"]) {
      const res = await runRefundAgent({
        sessionId,
        customerId: "CUST-001",
        message: gibberish,
      });

      expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
      expect(res.toolCalls.some((t) => t.name === "check_refund_eligibility")).toBe(false);
      expect(res.decisionCard).toBeNull();
      expect(res.refundId).toBeNull();
    }
  });

  // INVARIANT 10: Client-side UI cannot bypass backend validation.
  it("INVARIANT 10: Client-side UI cannot bypass backend validation", async () => {
    const initialRefundCount = await getRefundCount();
    const sessionId = `inv10_${Date.now()}`;
    resetSessionContext(sessionId);

    // Attacker attempts to call process_refund directly via executeBackendTool without session authorization
    const bypassAttempt = await executeBackendTool(
      "process_refund",
      {
        customerId: "CUST-001",
        orderId: "ORD-1001",
        reason: "Customer forced refund",
      },
      { sessionId, verifiedCustomerId: "CUST-001" }
    );

    expect(bypassAttempt.success).toBe(false);
    expect(bypassAttempt.error).toContain("Refund execution blocked");

    // Verify DB was NOT mutated
    const finalRefundCount = await getRefundCount();
    expect(finalRefundCount).toBe(initialRefundCount);
  });
});
