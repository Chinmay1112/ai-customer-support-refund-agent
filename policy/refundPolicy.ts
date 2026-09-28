export const POLICY_CONSTANTS = {
  REFUND_WINDOW_DAYS: 7,
  HIGH_VALUE_THRESHOLD: 10000, // INR 10,000
  DIGITAL_CATEGORIES: ["DIGITAL", "SOFTWARE", "EBOOK", "GIFT_CARD", "SUBSCRIPTION"],
};

export interface PolicyRuleDefinition {
  id: string;
  number: number;
  name: string;
  description: string;
}

export const REFUND_RULES: PolicyRuleDefinition[] = [
  {
    id: "RULE_1_DELIVERY_WINDOW",
    number: 1,
    name: "7-Day Delivery Window",
    description: "Refund requests must be made within 7 calendar days of delivery.",
  },
  {
    id: "RULE_2_DELIVERY_STATUS",
    number: 2,
    name: "Order Delivery Requirement",
    description: "The order must have been delivered.",
  },
  {
    id: "RULE_3_REFUNDABLE_PRODUCT",
    number: 3,
    name: "Product Refundability",
    description: "Only refundable products are eligible.",
  },
  {
    id: "RULE_4_NON_DIGITAL",
    number: 4,
    name: "Digital Products Exclusion",
    description: "Digital products are strictly non-refundable.",
  },
  {
    id: "RULE_5_CONDITION_CHECK",
    number: 5,
    name: "Product Condition Eligibility",
    description: "Used products are non-refundable unless the item is defective.",
  },
  {
    id: "RULE_6_DEFECTIVE_EXCEPTION",
    number: 6,
    name: "Defective Product Exemption",
    description: "Defective products may be eligible for a refund even if used, subject to verification.",
  },
  {
    id: "RULE_7_DUPLICATE_PREVENTION",
    number: 7,
    name: "Duplicate Refund Prevention",
    description: "Orders that have already been refunded cannot be refunded again.",
  },
  {
    id: "RULE_8_OWNERSHIP_VERIFICATION",
    number: 8,
    name: "Customer Ownership Verification",
    description: "A customer can only request a refund for their own order.",
  },
  {
    id: "RULE_9_AMOUNT_LIMIT",
    number: 9,
    name: "Maximum Refund Cap",
    description: "The refund amount cannot exceed the original order amount.",
  },
  {
    id: "RULE_10_HIGH_VALUE_REVIEW",
    number: 10,
    name: "High-Value Manual Review Threshold",
    description: "Refunds above ₹10,000 cannot be automatically processed and must be sent for manual review.",
  },
  {
    id: "RULE_11_NON_CANCELLED",
    number: 11,
    name: "Cancelled Orders Exclusion",
    description: "Cancelled orders are not eligible for the refund workflow because no delivered item exists.",
  },
  {
    id: "RULE_12_DATA_INTEGRITY",
    number: 12,
    name: "Data Integrity & Anti-Fabrication",
    description: "The system must never fabricate refund eligibility when required order/customer information is unavailable.",
  },
];
