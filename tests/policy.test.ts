import { describe, it, expect } from "vitest";
import { checkRefundEligibility } from "../policy/refundValidator";

describe("Strict Refund Policy Engine (12 Rules)", () => {
  const baseCustomer = {
    id: "CUST-001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
  };

  const fixedNow = new Date("2026-03-24T12:00:00Z");
  const daysAgo = (days: number) => {
    const d = new Date(fixedNow);
    d.setDate(d.getDate() - days);
    return d;
  };

  // TEST 1: Eligible Refund
  it("TEST 1: approves eligible order delivered within 7 days", () => {
    const order = {
      id: "ORD-1001",
      customerId: "CUST-001",
      productName: "boAt Rockerz Headphones",
      productCategory: "Electronics",
      amount: 1999.0,
      purchaseDate: daysAgo(5),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(true);
    expect(result.decision).toBe("APPROVE");
    expect(result.refundAmount).toBe(1999.0);
    expect(result.failedRules.length).toBe(0);
    expect(result.passedRules.length).toBeGreaterThan(0);
  });

  // TEST 2: Outside 7-Day Window
  it("TEST 2: denies order delivered outside the 7-day calendar window", () => {
    const order = {
      id: "ORD-1002",
      customerId: "CUST-001",
      productName: "Philips Air Fryer",
      productCategory: "Home & Kitchen",
      amount: 6499.0,
      purchaseDate: daysAgo(20),
      deliveryDate: daysAgo(14), // 14 days ago > 7 days
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    expect(result.refundAmount).toBeNull();
    const hasWindowFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_1_DELIVERY_WINDOW"
    );
    expect(hasWindowFailure).toBe(true);
  });

  // TEST 3: Digital Product Exclusion
  it("TEST 3: denies refund for digital software product", () => {
    const order = {
      id: "ORD-1004",
      customerId: "CUST-001",
      productName: "Microsoft 365 Personal Annual Subscription",
      productCategory: "DIGITAL",
      amount: 4899.0,
      purchaseDate: daysAgo(3),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasDigitalFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_4_NON_DIGITAL"
    );
    expect(hasDigitalFailure).toBe(true);
  });

  // TEST 4: Already Refunded Order
  it("TEST 4: denies duplicate refund when order is already refunded", () => {
    const order = {
      id: "ORD-1005",
      customerId: "CUST-001",
      productName: "Prestige Mixer Grinder",
      productCategory: "Kitchen",
      amount: 3299.0,
      purchaseDate: daysAgo(6),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "REFUNDED", // Already refunded
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasDuplicateFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_7_DUPLICATE_PREVENTION"
    );
    expect(hasDuplicateFailure).toBe(true);
  });

  // TEST 5: Defective Used Product Exemption
  it("TEST 5: approves used item if verified defective under Rule 6 exemption", () => {
    const order = {
      id: "ORD-1006",
      customerId: "CUST-001",
      productName: "Bajaj Microwave Oven",
      productCategory: "Kitchen",
      amount: 4199.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: true, // Defective
      condition: "USED", // Used
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(true);
    expect(result.decision).toBe("APPROVE");
    expect(result.failedRules.length).toBe(0);
  });

  // TEST 5B: Used NON-defective item must be denied
  it("TEST 5B: denies used item if non-defective", () => {
    const order = {
      id: "ORD-1007",
      customerId: "CUST-001",
      productName: "Nike Running Shoes",
      productCategory: "Footwear",
      amount: 7999.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false, // NOT defective
      condition: "USED", // Used
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasConditionFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_5_CONDITION_CHECK"
    );
    expect(hasConditionFailure).toBe(true);
  });

  // TEST 6: High-Value Refund > ₹10,000
  it("TEST 6: requires MANUAL_REVIEW for orders above ₹10,000 threshold", () => {
    const order = {
      id: "ORD-1008",
      customerId: "CUST-001",
      productName: "Sony Bravia 55-inch TV",
      productCategory: "Electronics",
      amount: 48990.0, // > ₹10,000
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "OPENED_UNUSED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false); // Cannot be automatically approved
    expect(result.decision).toBe("MANUAL_REVIEW");
    expect(result.refundAmount).toBe(48990.0);
    const hasHighValueRule = result.failedRules.some(
      (r) => r.ruleId === "RULE_10_HIGH_VALUE_REVIEW"
    );
    expect(hasHighValueRule).toBe(true);
  });

  // TEST 8: Customer / Order Ownership Mismatch
  it("TEST 8: denies refund when customer does not own the order", () => {
    const order = {
      id: "ORD-1010",
      customerId: "CUST-999", // Different customer!
      productName: "Kitchen Chimney",
      productCategory: "Appliances",
      amount: 9990.0,
      purchaseDate: daysAgo(3),
      deliveryDate: daysAgo(1),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer, // CUST-001
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasOwnershipFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_8_OWNERSHIP_VERIFICATION"
    );
    expect(hasOwnershipFailure).toBe(true);
  });

  // TEST 11: Cancelled Order
  it("TEST 11: denies refund for cancelled orders", () => {
    const order = {
      id: "ORD-1009",
      customerId: "CUST-001",
      productName: "Fastrack Smartwatch",
      productCategory: "Wearables",
      amount: 1795.0,
      purchaseDate: daysAgo(6),
      deliveryDate: null,
      status: "CANCELLED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    };

    const result = checkRefundEligibility({
      order,
      customer: baseCustomer,
      asOfDate: fixedNow,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasCancelledFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_11_NON_CANCELLED"
    );
    expect(hasCancelledFailure).toBe(true);
  });

  // TEST 12: Missing Data / Anti-Fabrication
  it("TEST 12: rejects missing order or customer without fabricating results", () => {
    const result = checkRefundEligibility({
      order: null,
      customer: baseCustomer,
    });

    expect(result.eligible).toBe(false);
    expect(result.decision).toBe("DENY");
    const hasDataFailure = result.failedRules.some(
      (r) => r.ruleId === "RULE_12_DATA_INTEGRITY"
    );
    expect(hasDataFailure).toBe(true);
  });
});
