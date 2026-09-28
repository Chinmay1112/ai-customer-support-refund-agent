import { describe, it, expect, beforeEach } from "vitest";
import { runRefundAgent } from "@/agent/agent";
import { resetSessionContext, getSessionContext } from "@/lib/sessionStore";
import { prisma } from "@/lib/db";

describe("Order Context Switching: ORD-1001 -> ORD-1002 -> ORD-1003 -> ORD-1004", () => {
  beforeEach(async () => {
    // Reset test data
    await prisma.refund.deleteMany({ where: { orderId: { in: ["ORD-1001", "ORD-1002", "ORD-1003", "ORD-1004"] } } });
    await prisma.order.updateMany({
      where: { id: { in: ["ORD-1001", "ORD-1002", "ORD-1003", "ORD-1004"] } },
      data: { refundStatus: "NONE" },
    });
  });

  it("strictly switches order context across ORD-1001 -> ORD-1002 -> ORD-1003 -> ORD-1004 with no stale context", async () => {
    const sessionId = `test_order_switch_${Date.now()}`;
    resetSessionContext(sessionId);

    // Turn 1: User mentions ORD-1001 (Aarav's order)
    const t1 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "I want to return ORD-1001",
      conversationHistory: [],
    });

    expect(t1.message).toContain("ORD-1001");
    expect(t1.message).not.toContain("ORD-1002");
    expect(t1.message).not.toContain("ORD-1003");
    expect(t1.message).not.toContain("ORD-1004");
    expect(t1.workflowState).toBe("REASON_REQUIRED");

    // Turn 2: User says ORD-1002
    const t2 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1002",
      conversationHistory: [
        { role: "user", content: "I want to return ORD-1001" },
        { role: "assistant", content: t1.message },
      ],
    });

    expect(t2.message).toContain("ORD-1002");
    expect(t2.message).not.toContain("ORD-1001");
    expect(t2.message).not.toContain("ORD-1003");
    expect(t2.message).not.toContain("ORD-1004");
    expect(t2.message).toContain("couldn't find that order in your account");

    // Turn 3: User says ORD-1003
    const t3 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1003",
      conversationHistory: [
        { role: "user", content: "I want to return ORD-1001" },
        { role: "assistant", content: t1.message },
        { role: "user", content: "ORD-1002" },
        { role: "assistant", content: t2.message },
      ],
    });

    expect(t3.message).toContain("ORD-1003");
    expect(t3.message).not.toContain("ORD-1002");
    expect(t3.message).not.toContain("ORD-1001");
    expect(t3.message).not.toContain("ORD-1004");
    expect(t3.message).toContain("couldn't find that order in your account");

    // Turn 4: User says ORD-1004
    const t4 = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "ORD-1004",
      conversationHistory: [
        { role: "user", content: "I want to return ORD-1001" },
        { role: "assistant", content: t1.message },
        { role: "user", content: "ORD-1002" },
        { role: "assistant", content: t2.message },
        { role: "user", content: "ORD-1003" },
        { role: "assistant", content: t3.message },
      ],
    });

    expect(t4.message).toContain("ORD-1004");
    expect(t4.message).not.toContain("ORD-1003");
    expect(t4.message).not.toContain("ORD-1002");
    expect(t4.message).not.toContain("ORD-1001");
    expect(t4.message).toContain("couldn't find that order in your account");

    // Ensure session context does not latch onto ORD-1002
    const finalSession = getSessionContext(sessionId);
    expect(finalSession.currentOrderId).not.toBe("ORD-1002");
  });

  it("correctly switches when orders belong to their respective authenticating customers", async () => {
    // Testing CUST-011 who owns both ORD-1011 and ORD-1012
    const sessionId = `test_cust11_switch_${Date.now()}`;
    resetSessionContext(sessionId);

    // Turn 1: ORD-1011 (delivered 2 days ago)
    const t1 = await runRefundAgent({
      sessionId,
      customerId: "CUST-011",
      message: "ORD-1011",
    });

    expect(t1.message).toContain("ORD-1011");
    expect(t1.message).not.toContain("ORD-1012");

    // Turn 2: Switches to ORD-1012 (delivered 24 days ago)
    const t2 = await runRefundAgent({
      sessionId,
      customerId: "CUST-011",
      message: "ORD-1012",
      conversationHistory: [
        { role: "user", content: "ORD-1011" },
        { role: "assistant", content: t1.message },
      ],
    });

    expect(t2.message).toContain("ORD-1012");
    expect(t2.message).not.toContain("ORD-1011");
  });
});
