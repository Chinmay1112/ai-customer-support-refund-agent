import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runRefundAgent } from "../agent/agent";
import { prisma } from "../lib/db";

describe("Customer Intent & Non-Refund Input Handling", () => {
  const sessionId = "test_sess_intent_suite";
  const customerId = "CUST-001";

  beforeEach(async () => {
    // Reset test orders to clean state before each test
    await prisma.refund.deleteMany({
      where: { orderId: { in: ["ORD-1001", "ORD-1006", "ORD-1008"] } },
    });
    await prisma.order.updateMany({
      where: { id: { in: ["ORD-1001", "ORD-1006", "ORD-1008"] } },
      data: { refundStatus: "NONE" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: "hello" does not call refund tools
  it("TEST 1: 'hello' responds with greeting and invokes zero tools or policy cards", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId,
      message: "hello",
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("hello");
  });

  // TEST 2: "dfg" does not call refund tools
  it("TEST 2: 'dfg' responds with clarification and invokes zero tools or policy cards", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId,
      message: "dfg",
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
    expect(res.message).toBe("I can help with orders and refunds. Could you tell me what you'd like help with?");
  });

  // TEST 3: "what can you do?" does not call refund tools
  it("TEST 3: 'what can you do?' explains capabilities without calling refund tools", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId,
      message: "what can you do?",
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.message.toLowerCase()).toContain("help");
    expect(res.message.toLowerCase()).toContain("orders");
  });

  // TEST 4: "I want a refund" asks for an order if none is identified
  it("TEST 4: 'I want a refund' asks for an order number instead of guessing one", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId,
      message: "I want a refund",
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.message.toLowerCase()).toContain("order id");
  });

  // TEST 5: "I want a refund for ORD-1001" identifies order and asks for reason
  it("TEST 5: 'I want a refund for ORD-1001' identifies order and asks for reason (does NOT process refund)", async () => {
    const res = await runRefundAgent({
      sessionId: `test_t5_${Date.now()}`,
      customerId,
      message: "I want a refund for ORD-1001",
    });

    expect(res.workflowState).toBe("REASON_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_REASON");
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("reason");
  });

  // TEST 6: "What is my refund status for ORD-1001?" uses status workflow
  it("TEST 6: 'What is my refund status for ORD-1001?' calls get_refund_status and NOT process_refund", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId,
      message: "What is my refund status for ORD-1001?",
    });

    const toolNames = res.toolCalls.map((t) => t.name);
    expect(toolNames).toContain("get_refund_status");
    expect(toolNames).not.toContain("process_refund");
    expect(res.decisionCard).toBeNull();
  });

  // TEST 7: Selected ORD-1001 does NOT automatically imply a refund request
  it("TEST 7: sending greeting while customer has orders does not trigger refund", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001", // Has ORD-1001
      message: "good morning",
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
  });

  // TEST 8: Cross-customer refund remains denied
  it("TEST 8: cross-customer refund attempt remains strictly denied", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-001",
      message: "Please refund order ORD-1010", // Belongs to CUST-010 Kavita
    });

    expect(res.decisionCard?.decision).toBe("DENY");
    const failedRules = res.decisionCard?.failedRules.map((r) => r.ruleId);
    expect(failedRules).toContain("RULE_8_OWNERSHIP_VERIFICATION");
  });

  // TEST 9: Already-refunded order remains denied
  it("TEST 9: already-refunded order remains denied under duplicate prevention", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-005",
      message: "Can I get a refund for ORD-1005?",
    });

    expect(res.decisionCard?.decision).toBe("DENY");
    const failedRules = res.decisionCard?.failedRules.map((r) => r.ruleId);
    expect(failedRules).toContain("RULE_7_DUPLICATE_PREVENTION");
  });

  // TEST 10: High-value order remains manual review
  it("TEST 10: high-value order (> ₹10k) routes to manual review ticket", async () => {
    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-008",
      message: "I want to refund order ORD-1008",
    });

    expect(res.decisionCard?.decision).toBe("MANUAL_REVIEW");
    const toolNames = res.toolCalls.map((t) => t.name);
    expect(toolNames).toContain("create_manual_review");
    expect(toolNames).not.toContain("process_refund");
  });

  // TEST 11: Defective product exception remains supported
  it("TEST 11: defective product exception allows refund on used item", async () => {
    // Reset ORD-1006
    await prisma.refund.deleteMany({ where: { orderId: "ORD-1006" } });
    await prisma.order.update({ where: { id: "ORD-1006" }, data: { refundStatus: "NONE" } });

    const res = await runRefundAgent({
      sessionId,
      customerId: "CUST-006",
      message: "My oven ORD-1006 is defective and not heating",
    });

    expect(res.decisionCard?.decision).toBe("APPROVE");
    expect(res.refundId).toBeDefined();
  });

  // MULTI-TURN TEST 12: refund request -> order ID -> asks for reason
  it("TEST 12 (MULTI-TURN): 'I want a refund' followed by 'ORD-1001' asks for return reason", async () => {
    const history = [
      { role: "user" as const, content: "I want a refund" },
      {
        role: "assistant" as const,
        content:
          "I would be glad to help you with your refund request. Could you please provide your **Order ID** (for example, ORD-1001) so I can verify its details and check eligibility against our store policy?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_turn_1",
      customerId: "CUST-001",
      message: "ORD-1001",
      conversationHistory: history,
    });

    expect(res.workflowState).toBe("REASON_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_REASON");
    expect(res.refundId).toBeNull();
    expect(res.toolCalls.some((t) => t.name === "process_refund")).toBe(false);
    expect(res.message.toLowerCase()).toContain("reason");
  });

  // MULTI-TURN TEST 13: refund status -> order ID -> status workflow (NOT refund)
  it("TEST 13 (MULTI-TURN): 'What is the status of my refund?' followed by 'ORD-1001' checks status without processing refund", async () => {
    const history = [
      { role: "user" as const, content: "What is the status of my refund?" },
      {
        role: "assistant" as const,
        content:
          "Hello Aarav Sharma! I would be happy to check your refund status. Could you please share the Order ID (for example, ORD-1001)?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_turn_2",
      customerId: "CUST-001",
      message: "ORD-1001",
      conversationHistory: history,
    });

    const toolNames = res.toolCalls.map((t) => t.name);
    expect(toolNames).toContain("get_refund_status");
    expect(toolNames).not.toContain("process_refund");
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
  });

  // MULTI-TURN TEST 14: refund request -> "my order id is 1001" normalizes and asks for reason
  it("TEST 14 (MULTI-TURN): 'my order id is 1001' resolves canonical ORD-1001 and asks for reason", async () => {
    const history = [
      { role: "user" as const, content: "I want a refund" },
      {
        role: "assistant" as const,
        content: "Could you please provide your Order ID?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_turn_3",
      customerId: "CUST-001",
      message: "my order id is 1001",
      conversationHistory: history,
    });

    expect(res.workflowState).toBe("REASON_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_REASON");
    expect(res.refundId).toBeNull();
  });

  // MULTI-TURN TEST 15: refund request -> bare "1001" resolves safely to existing ORD-1001 and asks for reason
  it("TEST 15 (MULTI-TURN): bare '1001' safely resolves to ORD-1001 and asks for reason", async () => {
    const history = [
      { role: "user" as const, content: "I want a refund" },
      {
        role: "assistant" as const,
        content: "Could you please provide your Order ID?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_turn_4",
      customerId: "CUST-001",
      message: "1001",
      conversationHistory: history,
    });

    expect(res.workflowState).toBe("REASON_REQUIRED");
    expect(res.pendingAction).toBe("AWAIT_REASON");
    expect(res.refundId).toBeNull();
  });

  // TEST 16: Isolated "ORD-1001" without preceding context produces clarification, NOT refund
  it("TEST 16: isolated 'ORD-1001' without context provides clarification and does NOT process refund", async () => {
    const res = await runRefundAgent({
      sessionId: "test_isolated_ord",
      customerId: "CUST-001",
      message: "ORD-1001",
      conversationHistory: [],
    });

    const toolNames = res.toolCalls.map((t) => t.name);
    expect(toolNames).not.toContain("process_refund");
    expect(toolNames).not.toContain("check_refund_eligibility");
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
    expect(res.message.toLowerCase()).toContain("ord-1001");
  });

  // TEST 17: Arbitrary number without matching order is not treated as order ID
  it("TEST 17: arbitrary number '42' is not treated as order ID and triggers zero tools", async () => {
    const res = await runRefundAgent({
      sessionId: "test_arbitrary_num",
      customerId: "CUST-001",
      message: "42",
      conversationHistory: [],
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.refundId).toBeNull();
  });

  // MULTI-TURN TEST 18: Prompted for Order ID but user says "hello" -> returns greeting, no tools
  it("TEST 18 (MULTI-TURN): user replying 'hello' after prompt for Order ID returns greeting without tools", async () => {
    const history = [
      { role: "user" as const, content: "I want a refund" },
      {
        role: "assistant" as const,
        content: "Could you please provide your Order ID?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_hello",
      customerId: "CUST-001",
      message: "hello",
      conversationHistory: history,
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.message.toLowerCase()).toContain("hello");
  });

  // MULTI-TURN TEST 19: Prompted for Order ID but user says "dfg" -> returns clarification, no tools
  it("TEST 19 (MULTI-TURN): user replying 'dfg' after prompt for Order ID returns clarification without tools", async () => {
    const history = [
      { role: "user" as const, content: "I want a refund" },
      {
        role: "assistant" as const,
        content: "Could you please provide your Order ID?",
      },
    ];

    const res = await runRefundAgent({
      sessionId: "test_multi_dfg",
      customerId: "CUST-001",
      message: "dfg",
      conversationHistory: history,
    });

    expect(res.toolCalls.length).toBe(0);
    expect(res.decisionCard).toBeNull();
    expect(res.message).toBe("I can help with orders and refunds. Could you tell me what you'd like help with?");
  });
});

