import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runRefundAgent } from "../agent/agent";
import { prisma } from "../lib/db";
import { resetSessionContext } from "../lib/sessionStore";

describe("Mandatory Test Matrix (Items A through Q)", () => {
  beforeEach(async () => {
    // Clean test orders and refunds before each test
    await prisma.refund.deleteMany({
      where: { orderId: { in: ["ORD-1001", "ORD-1002", "ORD-1006", "ORD-1007", "ORD-1008", "ORD-1011", "ORD-1012"] } },
    });
    await prisma.order.updateMany({
      where: { id: { in: ["ORD-1001", "ORD-1002", "ORD-1006", "ORD-1007", "ORD-1008", "ORD-1011", "ORD-1012"] } },
      data: { refundStatus: "NONE" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function getRefundCount(): Promise<number> {
    return await prisma.refund.count();
  }

  // A. General
  it("A. General: 'hello', 'thanks', 'dfg' trigger zero refund tools", async () => {
    const s1 = `matrix_a1_${Date.now()}`;
    const s2 = `matrix_a2_${Date.now()}`;
    const s3 = `matrix_a3_${Date.now()}`;

    const r1 = await runRefundAgent({ sessionId: s1, customerId: "CUST-001", message: "hello" });
    expect(r1.toolCalls.length).toBe(0);
    expect(r1.decisionCard).toBeNull();
    expect(r1.refundId).toBeNull();

    const r2 = await runRefundAgent({ sessionId: s2, customerId: "CUST-001", message: "thanks" });
    expect(r2.toolCalls.length).toBe(0);
    expect(r2.decisionCard).toBeNull();
    expect(r2.refundId).toBeNull();

    const r3 = await runRefundAgent({ sessionId: s3, customerId: "CUST-001", message: "dfg" });
    expect(r3.toolCalls.length).toBe(0);
    expect(r3.decisionCard).toBeNull();
    expect(r3.refundId).toBeNull();
  });

  // B. Recent orders
  it("B. Recent orders: 'Show my recent orders' invokes list_customer_orders only and does NOT ask for Order ID", async () => {
    const s = `matrix_b_${Date.now()}`;
    const res = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "Show my recent orders" });

    const tools = res.toolCalls.map((t) => t.name);
    expect(tools).toContain("list_customer_orders");
    expect(tools).not.toContain("process_refund");
    expect(tools).not.toContain("check_refund_eligibility");
    expect(res.refundId).toBeNull();
    expect(res.message).toContain("ORD-1001");
  });

  // C. Order information
  it("C. Order information: 'ORD-1001' provides order info and does NOT process refund", async () => {
    const s = `matrix_c_${Date.now()}`;
    const res = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "ORD-1001" });

    const tools = res.toolCalls.map((t) => t.name);
    expect(tools).toContain("get_order");
    expect(tools).not.toContain("process_refund");
    expect(tools).not.toContain("check_refund_eligibility");
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("ord-1001");
  });

  // D. Refund request without order
  it("D. Refund request without order: 'I want a refund' asks for Order ID", async () => {
    const s = `matrix_d_${Date.now()}`;
    const res = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "I want a refund" });

    expect(res.workflowState).toBe("ORDER_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_ORDER");
    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("order id");
  });

  // E. Refund request with order but no reason
  it("E. Refund request with order but no reason: 'I want a refund for ORD-1001' asks for reason, NO refund", async () => {
    const s = `matrix_e_${Date.now()}`;
    const res = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "I want a refund for ORD-1001" });

    expect(res.workflowState).toBe("REASON_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_REASON");
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("reason");
  });

  // F. Refund request with reason
  it("F. Refund request with reason: 'I want a refund for ORD-1001 because the product is defective' evaluates policy and awaits confirmation", async () => {
    const initialCount = await getRefundCount();
    const s = `matrix_f_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "I want a refund for ORD-1001 because the product is defective",
    });

    expect(res.workflowState).toBe("AWAITING_CONFIRMATION");
    expect(res.pendingAction).toBe("AWAIT_CONFIRMATION");
    expect(res.decisionCard).toBeDefined();
    expect(res.decisionCard?.cardStatus).toBe("ELIGIBLE");
    expect(res.decisionCard?.decision).toBe("APPROVE");
    expect(res.refundId).toBeNull();

    // Confirm that no refund was created without explicit customer confirmation
    const midCount = await getRefundCount();
    expect(midCount).toBe(initialCount);

    // Customer confirms
    const resConfirm = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "Yes, proceed with refund",
    });

    expect(resConfirm.workflowState).toBe("COMPLETED");
    expect(resConfirm.refundId).toBeDefined();
    expect(resConfirm.decisionCard?.cardStatus).toBe("APPROVED");

    const finalCount = await getRefundCount();
    expect(finalCount).toBe(initialCount + 1);
  });

  // G. Eligibility check
  it("G. Eligibility check: 'Check refund eligibility for ORD-1001' evaluates policy without mutating database", async () => {
    const initialCount = await getRefundCount();
    const s = `matrix_g_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "Check refund eligibility for ORD-1001",
    });

    expect(res.decisionCard).toBeDefined();
    expect(res.decisionCard?.cardStatus).toBe("ELIGIBLE");
    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);

    // NO refund mutation in database
    const finalCount = await getRefundCount();
    expect(finalCount).toBe(initialCount);
  });

  // H. Status
  it("H. Status: 'Track my refund for ORD-1001' calls get_refund_status and never process_refund", async () => {
    const s = `matrix_h_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "Track my refund for ORD-1001",
    });

    const tools = res.toolCalls.map((t) => t.name);
    expect(tools).toContain("get_refund_status");
    expect(tools).not.toContain("process_refund");
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
  });

  // I. Sequential order switching:
  // "Check refund eligibility" -> "ORD-1001" -> "changed my mind" -> "ORD-1002" -> "ORD-1003"
  it("I. Sequential order switching: every order reference resolved correctly, final turn never references ORD-1002", async () => {
    const s = `matrix_i_${Date.now()}`;
    resetSessionContext(s);

    // Turn 1: Check refund eligibility
    const t1 = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "Check refund eligibility" });
    expect(t1.workflowState).toBe("ORDER_REQUIRED");

    // Turn 2: ORD-1001
    const t2 = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "ORD-1001" });
    expect(t2.message.toLowerCase()).toContain("reason");

    // Turn 3: changed my mind
    const t3 = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "changed my mind" });
    expect(t3.decisionCard).toBeDefined();
    expect(t3.decisionCard?.cardStatus).toBe("ELIGIBLE");
    expect(t3.decisionCard?.orderId).toBe("ORD-1001");
    expect(t3.refundId).toBeNull();

    // Turn 4: User provides ORD-1002 (unowned by CUST-001)
    const t4 = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "ORD-1002" });
    expect(t4.message).toContain("couldn't find that order in your account");
    expect(t4.refundId).toBeNull();

    // Turn 5: User provides ORD-1003 (unowned by CUST-001)
    const t5 = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "ORD-1003" });
    expect(t5.message).toContain("couldn't find that order in your account");
    // MUST NEVER refer to ORD-1002 or ORD-1001!
    expect(t5.message).not.toContain("ORD-1002");
    expect(t5.message).not.toContain("ORD-1001");
  });

  // J. Different order after denial
  it("J. Different order after denial: switches to new order context cleanly", async () => {
    // CUST-011 owns BOTH ORD-1011 and ORD-1012
    const s = `matrix_j_${Date.now()}`;
    resetSessionContext(s);

    // Turn 1: Check refund eligibility
    await runRefundAgent({ sessionId: s, customerId: "CUST-011", message: "Check refund eligibility" });

    // Turn 2: ORD-1012 (delivered 24 days ago -> outside window, denied immediately)
    const t2 = await runRefundAgent({ sessionId: s, customerId: "CUST-011", message: "ORD-1012" });
    expect(t2.decisionCard?.decision).toBe("DENY");
    expect(t2.decisionCard?.orderId).toBe("ORD-1012");

    // Turn 3: Switches to ORD-1011 (delivered 2 days ago -> eligible!)
    const t3 = await runRefundAgent({ sessionId: s, customerId: "CUST-011", message: "ORD-1011" });
    expect(t3.message).not.toContain("ORD-1012");
    expect(t3.message).toContain("ORD-1011");
  });

  // K. Ownership: CUST-001 + ORD-1002
  it("K. Ownership: CUST-001 asking for ORD-1002 prevents refund mutation and does not leak private details", async () => {
    const initialCount = await getRefundCount();
    const s = `matrix_k_${Date.now()}`;

    const res = await runRefundAgent({ sessionId: s, customerId: "CUST-001", message: "ORD-1002" });
    expect(res.message).toContain("couldn't find that order in your account");
    expect(res.refundId).toBeNull();
    // Must NOT reveal Philips Air Fryer or customer details
    expect(res.message).not.toContain("Philips");
    expect(res.message).not.toContain("Air Fryer");

    const finalCount = await getRefundCount();
    expect(finalCount).toBe(initialCount);
  });

  // L. Duplicate refund: ORD-1005
  it("L. Duplicate refund: ORD-1005 denies duplicate refund", async () => {
    const s = `matrix_l_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-005",
      message: "I want a refund for ORD-1005",
    });

    expect(res.decisionCard?.decision).toBe("DENY");
    const failed = res.decisionCard?.failedRules.map((r) => r.ruleId);
    expect(failed).toContain("RULE_7_DUPLICATE_PREVENTION");
    expect(res.refundId).toBeNull();
  });

  // M. High-value: ORD-1008
  it("M. High-value: ORD-1008 routes to MANUAL_REVIEW without auto-processing", async () => {
    const s = `matrix_m_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-008",
      message: "I want to refund ORD-1008 because it arrived damaged",
    });

    expect(res.decisionCard?.decision).toBe("MANUAL_REVIEW");
    expect(res.decisionCard?.cardStatus).toBe("MANUAL_REVIEW");
    expect(res.toolCalls.some((t) => t.name === "create_manual_review")).toBe(true);
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.refundId).toBeNull();
  });

  // N. Digital product: ORD-1004
  it("N. Digital product: ORD-1004 is DENIED per policy", async () => {
    const s = `matrix_n_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-004",
      message: "I want a refund for ORD-1004",
    });

    expect(res.decisionCard?.decision).toBe("DENY");
    const failed = res.decisionCard?.failedRules.map((r) => r.ruleId);
    expect(failed).toContain("RULE_4_NON_DIGITAL");
    expect(res.refundId).toBeNull();
  });

  // O. Outside window: ORD-1002 accessed by its owner CUST-002
  it("O. Outside window: ORD-1002 accessed by owner CUST-002 is DENIED (outside 7-day limit)", async () => {
    const s = `matrix_o_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-002",
      message: "Please refund order ORD-1002. The product is defective.",
    });

    expect(res.decisionCard?.decision).toBe("DENY");
    const failed = res.decisionCard?.failedRules.map((r) => r.ruleId);
    expect(failed).toContain("RULE_1_DELIVERY_WINDOW");
    expect(res.refundId).toBeNull();
  });

  // P. Defective product: ORD-1006
  it("P. Defective product: ORD-1006 (used item) qualifies under defective exemption", async () => {
    const s = `matrix_p_${Date.now()}`;
    const res = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-006",
      message: "My OTG ORD-1006 is defective and heating element broke",
    });

    expect(res.decisionCard?.decision).toBe("APPROVE");
    expect(res.decisionCard?.cardStatus).toBe("ELIGIBLE");
    expect(res.workflowState).toBe("AWAITING_CONFIRMATION");
    expect(res.refundId).toBeNull();
  });

  // Q. Tool-result consistency & anti-bug assertion: ORD-1002 result followed by ORD-1003 input
  it("Q. Tool-result consistency: ORD-1002 followed by ORD-1003 input always reflects current turn target", async () => {
    const s = `matrix_q_${Date.now()}`;
    resetSessionContext(s);

    // Step 1: User asks for ORD-1002
    const r1 = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "Check refund eligibility for ORD-1002",
    });
    expect(r1.message).toContain("couldn't find that order in your account");

    // Step 2: User provides ORD-1003
    const r2 = await runRefundAgent({
      sessionId: s,
      customerId: "CUST-001",
      message: "ORD-1003",
    });

    // CRITICAL ASSERTION: The response MUST NOT refer to ORD-1002!
    expect(r2.message).not.toContain("ORD-1002");
    expect(r2.decisionCard?.orderId).not.toBe("ORD-1002");
    expect(r2.refundId).toBeNull();
  });
});
