import { POLICY_CONSTANTS, REFUND_RULES } from "./refundPolicy";
import {
  PolicyCheckResult,
  RuleEvaluation,
  RefundDecision,
  RefundReason,
  RequiredAction,
  DecisionCardStatus,
} from "@/types";

export interface ValidateRefundInput {
  order: {
    id: string;
    customerId: string;
    productName: string;
    productCategory: string;
    amount: number;
    purchaseDate: Date | string;
    deliveryDate?: Date | string | null;
    status: string;
    isRefundable: boolean;
    isDefective: boolean;
    condition: string;
    refundStatus: string;
  } | null | undefined;
  customer: {
    id: string;
    name?: string;
    email?: string;
  } | null | undefined;
  requestedAmount?: number;
  asOfDate?: Date; // Enables deterministic evaluation in tests and simulations
  reason?: RefundReason | null;
}

export function checkRefundEligibility(input: ValidateRefundInput): PolicyCheckResult {
  const { order, customer, requestedAmount, asOfDate = new Date() } = input;
  const passedRules: RuleEvaluation[] = [];
  const failedRules: RuleEvaluation[] = [];

  const getRuleDef = (id: string) =>
    REFUND_RULES.find((r) => r.id === id) || {
      id,
      number: 0,
      name: id,
      description: "",
    };

  // Rule 12: Data Integrity & Anti-Fabrication
  const rule12 = getRuleDef("RULE_12_DATA_INTEGRITY");
  if (!order || !customer || !order.id || !customer.id) {
    failedRules.push({
      ruleId: rule12.id,
      rule: rule12.description,
      passed: false,
      explanation:
        "Required customer or order information is missing. The system cannot fabricate refund eligibility.",
    });

    return {
      eligible: false,
      decision: "DENY",
      refundAmount: null,
      passedRules,
      failedRules,
      explanation:
        "Refund eligibility check failed: missing required customer or order data.",
      orderId: order?.id,
      customerId: customer?.id,
      productName: order?.productName,
      reason: input.reason || null,
      requiredAction: "DENY",
      cardStatus: "DENIED",
    };
  }

  passedRules.push({
    ruleId: rule12.id,
    rule: rule12.description,
    passed: true,
    explanation: "Complete verified customer and order information is available.",
  });

  // Rule 8: Customer Ownership Verification
  const rule8 = getRuleDef("RULE_8_OWNERSHIP_VERIFICATION");
  if (order.customerId !== customer.id) {
    failedRules.push({
      ruleId: rule8.id,
      rule: rule8.description,
      passed: false,
      explanation: `Order ${order.id} is not associated with your account. Security policy prohibits third-party refund claims.`,
    });
  } else {
    passedRules.push({
      ruleId: rule8.id,
      rule: rule8.description,
      passed: true,
      explanation: `Order ${order.id} is verified to belong to customer ${customer.id}.`,
    });
  }

  // Rule 11: Cancelled Orders Exclusion
  const rule11 = getRuleDef("RULE_11_NON_CANCELLED");
  if (order.status.toUpperCase() === "CANCELLED") {
    failedRules.push({
      ruleId: rule11.id,
      rule: rule11.description,
      passed: false,
      explanation: `Order ${order.id} was cancelled. Cancelled orders are handled via automatic cancellation reversal, not the return/refund workflow.`,
    });
  } else {
    passedRules.push({
      ruleId: rule11.id,
      rule: rule11.description,
      passed: true,
      explanation: `Order status is "${order.status}" (not cancelled).`,
    });
  }

  // Rule 2: Delivery Prerequisite
  const rule2 = getRuleDef("RULE_2_DELIVERY_STATUS");
  const isDelivered = order.status.toUpperCase() === "DELIVERED" && Boolean(order.deliveryDate);
  if (!isDelivered) {
    failedRules.push({
      ruleId: rule2.id,
      rule: rule2.description,
      passed: false,
      explanation: `Order has not been delivered yet (current status: ${order.status}). Items must be delivered before a return refund can be processed.`,
    });
  } else {
    passedRules.push({
      ruleId: rule2.id,
      rule: rule2.description,
      passed: true,
      explanation: `Order was successfully delivered on ${new Date(order.deliveryDate!).toLocaleDateString("en-IN")}.`,
    });
  }

  // Rule 1: 7-Day Refund Window
  const rule1 = getRuleDef("RULE_1_DELIVERY_WINDOW");
  if (isDelivered && order.deliveryDate) {
    const delivery = new Date(order.deliveryDate);
    const diffMs = asOfDate.getTime() - delivery.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > POLICY_CONSTANTS.REFUND_WINDOW_DAYS) {
      failedRules.push({
        ruleId: rule1.id,
        rule: rule1.description,
        passed: false,
        explanation: `Order was delivered ${Math.floor(diffDays)} days ago. Policy strictly limits refund requests to within 7 calendar days of delivery.`,
      });
    } else {
      passedRules.push({
        ruleId: rule1.id,
        rule: rule1.description,
        passed: true,
        explanation: `Order was delivered ${Math.max(0, Math.floor(diffDays))} day(s) ago, well within the 7-day calendar window.`,
      });
    }
  } else if (!isDelivered) {
    // Already failed Rule 2, window cannot be satisfied
    failedRules.push({
      ruleId: rule1.id,
      rule: rule1.description,
      passed: false,
      explanation: "Delivery date is unavailable because order is not delivered.",
    });
  }

  // Rule 3: Product Refundability
  const rule3 = getRuleDef("RULE_3_REFUNDABLE_PRODUCT");
  if (!order.isRefundable) {
    failedRules.push({
      ruleId: rule3.id,
      rule: rule3.description,
      passed: false,
      explanation: `Product "${order.productName}" is cataloged as non-refundable (e.g. hygiene, consumable, or clearance policy).`,
    });
  } else {
    passedRules.push({
      ruleId: rule3.id,
      rule: rule3.description,
      passed: true,
      explanation: `Product "${order.productName}" is eligible for returns and refunds.`,
    });
  }

  // Rule 4: Digital Goods Exclusion
  const rule4 = getRuleDef("RULE_4_NON_DIGITAL");
  const isDigital =
    POLICY_CONSTANTS.DIGITAL_CATEGORIES.some((cat) =>
      order.productCategory.toUpperCase().includes(cat)
    ) || order.productName.toUpperCase().includes("DIGITAL") || order.productName.toUpperCase().includes("LICENSE");

  if (isDigital) {
    failedRules.push({
      ruleId: rule4.id,
      rule: rule4.description,
      passed: false,
      explanation: `Category "${order.productCategory}" is a digital product. Digital software, licenses, and keys are strictly non-refundable once delivered.`,
    });
  } else {
    passedRules.push({
      ruleId: rule4.id,
      rule: rule4.description,
      passed: true,
      explanation: `Product is a physical good (${order.productCategory}), not an excluded digital asset.`,
    });
  }

  // Rule 7: Prevention of Duplicate Refunds
  const rule7 = getRuleDef("RULE_7_DUPLICATE_PREVENTION");
  if (order.refundStatus === "REFUNDED") {
    failedRules.push({
      ruleId: rule7.id,
      rule: rule7.description,
      passed: false,
      explanation: `Order ${order.id} has already been refunded. Duplicate refund requests cannot be processed.`,
    });
  } else if (order.refundStatus === "PENDING_REVIEW") {
    failedRules.push({
      ruleId: rule7.id,
      rule: rule7.description,
      passed: false,
      explanation: `Order ${order.id} already has a pending refund review in progress.`,
    });
  } else {
    passedRules.push({
      ruleId: rule7.id,
      rule: rule7.description,
      passed: true,
      explanation: "No prior refund or pending review exists for this order.",
    });
  }

  // Rule 5 & Rule 6: Condition & Defective Exemption
  const rule5 = getRuleDef("RULE_5_CONDITION_CHECK");
  const rule6 = getRuleDef("RULE_6_DEFECTIVE_EXCEPTION");
  const condition = (order.condition || "UNOPENED").toUpperCase();

  if (condition === "USED") {
    const rawReason = (input.reason || "").toUpperCase();
    const isDefectiveOrDamagedReason =
      rawReason === "DEFECTIVE" ||
      rawReason === "DAMAGED" ||
      rawReason.includes("DEFECT") ||
      rawReason.includes("DAMAGE") ||
      (!input.reason && order.isDefective);

    if (order.isDefective && isDefectiveOrDamagedReason) {
      passedRules.push({
        ruleId: rule5.id,
        rule: rule5.description,
        passed: true,
        explanation: "Product is used, but qualifies under the manufacturing defect exemption.",
      });
      passedRules.push({
        ruleId: rule6.id,
        rule: rule6.description,
        passed: true,
        explanation: "Defective item reported. Verified defective used products remain eligible for refund.",
      });
    } else {
      failedRules.push({
        ruleId: rule5.id,
        rule: rule5.description,
        passed: false,
        explanation:
          rawReason.includes("CHANGED_MIND") || rawReason.includes("MIND")
            ? "Item is used and customer changed mind. Policy restricts returns for used items unless defective or damaged."
            : "Item is used and non-defective. Policy restricts returns to unused or defective items.",
      });
      passedRules.push({
        ruleId: rule6.id,
        rule: rule6.description,
        passed: true,
        explanation: "No defects were reported or verified.",
      });
    }
  } else if (condition === "DAMAGED") {
    if (order.isDefective) {
      passedRules.push({
        ruleId: rule5.id,
        rule: rule5.description,
        passed: true,
        explanation: "Item arrived damaged/defective.",
      });
      passedRules.push({
        ruleId: rule6.id,
        rule: rule6.description,
        passed: true,
        explanation: "Defective / damaged product exemption verified.",
      });
    } else {
      failedRules.push({
        ruleId: rule5.id,
        rule: rule5.description,
        passed: false,
        explanation: "Item is damaged due to customer handling (not a manufacturing defect).",
      });
    }
  } else {
    // UNOPENED or OPENED_UNUSED
    passedRules.push({
      ruleId: rule5.id,
      rule: rule5.description,
      passed: true,
      explanation: `Product condition is "${order.condition}" (eligible for standard return).`,
    });
    passedRules.push({
      ruleId: rule6.id,
      rule: rule6.description,
      passed: true,
      explanation: "Standard product condition satisfied; defect exemption not required.",
    });
  }

  // Rule 9: Maximum Refund Cap
  const rule9 = getRuleDef("RULE_9_AMOUNT_LIMIT");
  const refundAmount = requestedAmount !== undefined ? requestedAmount : order.amount;
  if (refundAmount <= 0 || refundAmount > order.amount) {
    failedRules.push({
      ruleId: rule9.id,
      rule: rule9.description,
      passed: false,
      explanation: `Requested refund amount (₹${refundAmount}) exceeds the invoice amount (₹${order.amount}) or is non-positive.`,
    });
  } else {
    passedRules.push({
      ruleId: rule9.id,
      rule: rule9.description,
      passed: true,
      explanation: `Refund amount of ₹${refundAmount} is within the authorized total of ₹${order.amount}.`,
    });
  }

  // Rule 10: High-Value Manual Review Threshold
  const rule10 = getRuleDef("RULE_10_HIGH_VALUE_REVIEW");
  const isHighValue = refundAmount > POLICY_CONSTANTS.HIGH_VALUE_THRESHOLD;

  let decision: RefundDecision;
  let eligible = false;
  let explanation = "";
  let requiredAction: RequiredAction = "ASK_FOR_CONFIRMATION";
  let cardStatus: DecisionCardStatus = "ELIGIBLE";

  if (failedRules.length > 0) {
    // If any eligibility rule failed, it is denied
    decision = "DENY";
    eligible = false;
    requiredAction = "DENY";
    cardStatus = "DENIED";
    passedRules.push({
      ruleId: rule10.id,
      rule: rule10.description,
      passed: true,
      explanation: "High-value manual review not evaluated due to rule denial.",
    });

    const failedSummaries = failedRules.map((f) => f.explanation).join(" ");
    explanation = `Refund request for order ${order.id} is DENIED based on policy. Reasons: ${failedSummaries}`;
  } else if (isHighValue) {
    // Passed all baseline rules, but exceeds ₹10,000 threshold
    decision = "MANUAL_REVIEW";
    eligible = false; // Cannot be automatically processed
    requiredAction = "MANUAL_REVIEW";
    cardStatus = "MANUAL_REVIEW";

    failedRules.push({
      ruleId: rule10.id,
      rule: rule10.description,
      passed: false,
      explanation: `Order amount of ₹${refundAmount.toLocaleString("en-IN")} exceeds the automated threshold of ₹${POLICY_CONSTANTS.HIGH_VALUE_THRESHOLD.toLocaleString("en-IN")}. Policy requires senior operations manual review.`,
    });

    explanation = `Order ${order.id} meets return eligibility, but because the amount (₹${refundAmount.toLocaleString("en-IN")}) exceeds the ₹10,000 automated limit, it has been forwarded for MANUAL REVIEW.`;
  } else if (input.reason === "OTHER") {
    decision = "MANUAL_REVIEW";
    eligible = false;
    requiredAction = "MANUAL_REVIEW";
    cardStatus = "MANUAL_REVIEW";
    explanation = `Order ${order.id} return reason requires manual review because our store policy does not specify an automated refund path for this condition.`;
  } else {
    // Approved for eligibility!
    decision = "APPROVE";
    eligible = true;
    requiredAction = "ASK_FOR_CONFIRMATION";
    cardStatus = "ELIGIBLE";

    passedRules.push({
      ruleId: rule10.id,
      rule: rule10.description,
      passed: true,
      explanation: `Amount (₹${refundAmount.toLocaleString("en-IN")}) is within the automated processing threshold of ₹${POLICY_CONSTANTS.HIGH_VALUE_THRESHOLD.toLocaleString("en-IN")}.`,
    });

    explanation = `Order ${order.id} satisfies all 12 refund policy conditions. Full refund of ₹${refundAmount.toLocaleString("en-IN")} is eligible for processing.`;
  }

  return {
    eligible,
    decision,
    refundAmount: decision === "DENY" ? null : refundAmount,
    passedRules,
    failedRules,
    explanation,
    orderId: order.id,
    customerId: customer.id,
    productName: order.productName,
    reason: input.reason || null,
    requiredAction,
    cardStatus,
  };
}
