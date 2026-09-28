import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { executeBackendTool } from "../agent/tools";
import { prisma } from "../lib/db";
import { updateSessionContext } from "../lib/sessionStore";

describe("Backend Tools & Independent Validation Suite", () => {
  const sessionId = "test_sess_tools_suite";

  beforeAll(async () => {
    // Ensure clean test order state for ORD-1001 if needed
    await prisma.refund.deleteMany({
      where: { orderId: { in: ["ORD-1001", "ORD-1006"] } },
    });
    await prisma.order.updateMany({
      where: { id: { in: ["ORD-1001", "ORD-1006"] } },
      data: { refundStatus: "NONE" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Tool 1: get_customer
  it("get_customer returns profile for valid ID", async () => {
    const res = await executeBackendTool(
      "get_customer",
      { customerId: "CUST-001" },
      { sessionId, verifiedCustomerId: "CUST-001" }
    );

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect((res.data as { name: string }).name).toBe("Aarav Sharma");
  });

  // Tool 2: find_customer_by_email
  it("find_customer_by_email returns customer matching email", async () => {
    const res = await executeBackendTool(
      "find_customer_by_email",
      { email: "aarav.sharma@example.com" },
      { sessionId }
    );

    expect(res.success).toBe(true);
    expect((res.data as { id: string }).id).toBe("CUST-001");
  });

  // Tool 3: get_order
  it("get_order returns order details", async () => {
    const res = await executeBackendTool(
      "get_order",
      { orderId: "ORD-1001" },
      { sessionId }
    );

    expect(res.success).toBe(true);
    expect((res.data as { id: string }).id).toBe("ORD-1001");
    expect((res.data as { amount: number }).amount).toBe(1999.0);
  });

  // Tool 3B: Non-existent order
  it("get_order gracefully handles non-existent order ID", async () => {
    const res = await executeBackendTool(
      "get_order",
      { orderId: "ORD-9999" },
      { sessionId }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("not found");
  });

  // Tool 4: list_customer_orders
  it("list_customer_orders returns orders for customer", async () => {
    const res = await executeBackendTool(
      "list_customer_orders",
      { customerId: "CUST-001" },
      { sessionId }
    );

    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBeGreaterThan(0);
  });

  // Tool 5: check_refund_eligibility
  it("check_refund_eligibility evaluates order with structured rule results", async () => {
    const res = await executeBackendTool(
      "check_refund_eligibility",
      { customerId: "CUST-001", orderId: "ORD-1001" },
      { sessionId }
    );

    expect(res.success).toBe(true);
    expect(res.policyResult).toBeDefined();
    expect(res.policyResult?.decision).toBe("APPROVE");
    expect(res.policyResult?.passedRules.length).toBeGreaterThan(0);
  });

  // Tool 6: CRITICAL INDEPENDENT VERIFICATION IN process_refund
  it("process_refund REJECTS execution without server confirmation prerequisites", async () => {
    // Calling process_refund without confirmation or eligibility in session must be blocked
    const res = await executeBackendTool(
      "process_refund",
      {
        customerId: "CUST-002",
        orderId: "ORD-1002",
        reason: "Customer demanded refund",
      },
      { sessionId }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("Refund execution blocked");
  });

  it("process_refund REJECTS execution on ineligible order even with confirmation", async () => {
    // ORD-1002 is delivered 14 days ago (> 7 days limit)
    const testSession = `test_sess_ineligible_${Date.now()}`;
    updateSessionContext(testSession, {
      customerId: "CUST-002",
      orderId: "ORD-1002",
      reason: "DEFECTIVE",
      eligibilityChecked: true,
      eligibilityDecision: "APPROVE", // Even if session was spoofed to APPROVE!
      customerConfirmed: true,
    });

    const res = await executeBackendTool(
      "process_refund",
      {
        customerId: "CUST-002",
        orderId: "ORD-1002",
        reason: "Customer demanded refund",
      },
      { sessionId: testSession }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("Backend policy validation failed");
    expect(res.policyResult?.decision).toBe("DENY");

    // Verify database record was NOT created
    const refundInDb = await prisma.refund.findUnique({
      where: { orderId: "ORD-1002" },
    });
    expect(refundInDb).toBeNull();
  });

  it("process_refund commits refund record for eligible order when confirmed", async () => {
    const testSession = `test_sess_eligible_${Date.now()}`;
    updateSessionContext(testSession, {
      customerId: "CUST-001",
      orderId: "ORD-1001",
      reason: "DEFECTIVE",
      eligibilityChecked: true,
      eligibilityDecision: "APPROVE",
      customerConfirmed: true,
    });

    const res = await executeBackendTool(
      "process_refund",
      {
        customerId: "CUST-001",
        orderId: "ORD-1001",
        reason: "DEFECTIVE",
      },
      { sessionId: testSession }
    );

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    const refundData = res.data as { refundId: string; amount: number; status: string };
    expect(refundData.status).toBe("APPROVED");
    expect(refundData.amount).toBe(1999.0);

    // Verify database record exists
    const dbRefund = await prisma.refund.findUnique({
      where: { orderId: "ORD-1001" },
    });
    expect(dbRefund).not.toBeNull();
    expect(dbRefund?.amount).toBe(1999.0);
  });

  // Tool 7: deny_refund
  it("deny_refund updates order status and records event", async () => {
    const res = await executeBackendTool(
      "deny_refund",
      {
        customerId: "CUST-002",
        orderId: "ORD-1002",
        reason: "Delivered 14 days ago exceeds 7-day window",
      },
      { sessionId }
    );

    expect(res.success).toBe(true);
    const dbOrder = await prisma.order.findUnique({
      where: { id: "ORD-1002" },
    });
    expect(dbOrder?.refundStatus).toBe("DENIED");
  });

  // Tool 8: create_manual_review
  it("create_manual_review updates order to PENDING_REVIEW and returns ticket", async () => {
    const res = await executeBackendTool(
      "create_manual_review",
      {
        customerId: "CUST-008",
        orderId: "ORD-1008",
        reason: "Order amount ₹48,990 exceeds ₹10,000 threshold",
      },
      { sessionId }
    );

    expect(res.success).toBe(true);
    expect((res.data as { reviewId: string }).reviewId).toBeDefined();

    const dbOrder = await prisma.order.findUnique({
      where: { id: "ORD-1008" },
    });
    expect(dbOrder?.refundStatus).toBe("PENDING_REVIEW");
  });

  // Tool 9: Malformed arguments handling
  it("handles malformed tool arguments gracefully with Zod validation error", async () => {
    const res = await executeBackendTool(
      "get_customer",
      {}, // Missing customerId
      { sessionId }
    );

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
