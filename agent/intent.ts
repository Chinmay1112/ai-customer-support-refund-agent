import {
  RefundWorkflowState,
  RefundReason,
  ConversationIntent,
  ConversationPending,
} from "@/types";

export type CustomerIntent =
  | "GREETING"
  | "COURTESY"
  | "SHOW_ORDERS"
  | "ORDER_INFORMATION"
  | "REFUND_REQUEST"
  | "REFUND_ELIGIBILITY_REQUEST"
  | "REFUND_STATUS_REQUEST"
  | "RETURN_POLICY_QUESTION"
  | "GENERAL_SUPPORT"
  | "ORDER_ID_RESPONSE"
  | "REFUND_REASON_RESPONSE"
  | "REFUND_CONFIRMATION"
  | "REFUND_CANCELLATION"
  | "WHY_DENIED"
  | "UNKNOWN";

export interface IntentAnalysisResult {
  intent: CustomerIntent;
  orderId: string | null;
  productMention: string | null;
  reason: RefundReason | null;
  confidence: number;
}

export interface ConversationContextMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ClassifyIntentOptions {
  conversationHistory?: ConversationContextMessage[];
  existingOrderIds?: string[];
  workflowState?: RefundWorkflowState;
  pending?: ConversationPending;
  currentIntent?: ConversationIntent;
  currentOrderId?: string | null;
  isPromptedForOrder?: boolean;
}

const GREETING_PATTERNS = [
  /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening|day)|greetings)(\s+there|\s+nova)?[\s!.]*$/i,
  /^howdy[\s!.]*$/i,
  /^yo[\s!.]*$/i,
];

const SHOW_ORDERS_PATTERNS = [
  /(?:show|view|list|see|check|track|get|display)\s+(?:my\s+)?(?:recent\s+|past\s+)?orders/i,
  /^(?:my\s+orders|recent\s+orders|past\s+orders|orders|all\s+orders|order\s+history)[\s!.]*$/i,
  /what\s+(?:did\s+i|have\s+i)\s+(?:buy|bought|order|ordered)/i,
  /my\s+purchases/i,
  /track\s+my\s+orders/i,
];

const RETURN_POLICY_PATTERNS = [
  /what\s+is\s+(your|the)\s+return\s+policy/i,
  /return\s+policy/i,
  /refund\s+policy/i,
  /return\s+rules/i,
  /how\s+many\s+days\s+to\s+return/i,
  /policy\s+details/i,
];

const GENERAL_SUPPORT_PATTERNS = [
  /what\s+(can|do)\s+you\s+(do|help|assist)/i,
  /how\s+(can|do)\s+you\s+(help|work)/i,
  /who\s+are\s+you/i,
  /what\s+are\s+your\s+capabilities/i,
  /tell\s+me\s+about\s+yourself/i,
  /^(help|support|assist\s+me|other\s+help)[\s!.]*$/i,
  /what\s+services\s+do\s+you\s+provide/i,
];

const COURTESY_PATTERNS = [
  /^(thanks|thank\s+you|thx|ty|great|awesome|ok|okay|cool|bye|goodbye)[\s!.]*$/i,
  /^(sure|got\s+it|understood|noted)[\s!.]*$/i,
];

const CONFIRMATION_PATTERNS = [
  /^(yes|yes\s*,?\s*please|yes\s*,?\s*proceed(\s+with\s+(the\s+)?refund)?|yep|yeah|sure|proceed(\s+with\s+(the\s+)?refund)?|do\s+it|go\s+ahead|please\s+process(\s+it)?(\s+refund)?|i\s+want\s+to\s+continue|confirm)[\s!.]*$/i,
  /^(yes|yeah|sure)\s*,?\s*(please|proceed|go\s+ahead|do\s+it|confirm|process)(.*)$/i,
];

const CANCELLATION_PATTERNS = [
  /^(no|no\s*,?\s*thanks?|no\s*,?\s*cancel|cancel(\s+(the\s+)?refund)?|not\s+now|stop|nevermind|don't\s+refund|do\s+not\s+refund|please\s+cancel)[\s!.]*$/i,
  /^(no|nope)\s*,?\s*(cancel|not\s+now|stop|nevermind|thanks?)(.*)$/i,
  /^cancel\b.*$/i,
];

const REFUND_STATUS_PATTERNS = [
  /status\s+(of|for)\s+(my\s+)?refund/i,
  /check\s+(my\s+)?refund\s+status/i,
  /refund\s+status/i,
  /is\s+(my\s+)?refund\s+(processed|done|approved|pending)/i,
  /track\s+(my\s+)?refund/i,
  /where\s+is\s+my\s+refund/i,
  /has\s+my\s+refund\s+been\s+processed/i,
];

const REFUND_ELIGIBILITY_PATTERNS = [
  /is\s+.*eligible\s+(for\s+a\s+refund|to\s+return)/i,
  /can\s+i\s+return/i,
  /check\s+refund\s+eligibility/i,
  /eligibility\s+check/i,
  /check\s+eligibility/i,
  /qualif(y|ies)\s+for\s+refund/i,
  /is\s+this\s+returnable/i,
];

const REFUND_REQUEST_PATTERNS = [
  /i\s+want\s+a\s+refund/i,
  /refund\s+request/i,
  /return\s+(and\s+refund|this\s+item|order)/i,
  /i\s+want\s+to\s+(return|refund)/i,
  /refund\s+my\s+order/i,
  /process\s+(a\s+)?refund/i,
  /cancel\s+and\s+refund/i,
  /reimburse/i,
  /money\s*back/i,
  /can\s+i\s+(get|have|request)\s+(a\s+)?refund/i,
  /refund\s+(order\s+)?ORD-\d+/i,
  /refund\s+this/i,
  /please\s+refund/i,
  /request\s+(a\s+)?refund/i,
  /give\s+me\s+(a\s+)?refund/i,
  /i\s+need\s+a\s+refund/i,
];

const WHY_DENIED_PATTERNS = [
  /why\s+was\s+(my\s+)?(refund|return|request)\s+denied/i,
  /why\s+did\s+you\s+deny/i,
  /why\s+is\s+it\s+ineligible/i,
  /reason\s+for\s+denial/i,
];

/**
 * Extracts and maps natural language refund reasons to structured RefundReason enum.
 */
export function extractRefundReason(message: string): RefundReason | null {
  const lower = message.toLowerCase().trim();

  // 1. DEFECTIVE (hardware, heating, broken, quality, malfunctioning)
  if (
    /defective|not\s+working|broken|malfunctioning|stopped\s+heating|faulty|not\s+turning\s+on|isn't\s+working|aren't\s+working|doesn't\s+work|not\s+heating|item\s+is\s+defective|product\s+is\s+defective|heating\s+element\s+broke|quality\s+issue|quality\s+problem|poor\s+quality|problem\s+with\s+(?:the\s+|this\s+)?(?:product|item|it)|issue\s+with\s+(?:the\s+|this\s+)?(?:product|item|it)/i.test(
      lower
    )
  ) {
    return "DEFECTIVE";
  }

  // 2. DAMAGED (arrived damaged, cracked, shattered, transit damage)
  if (
    /damaged|scratched|dented|cracked|shattered|arrived\s+damaged|item\s+arrived\s+damaged|broken\s+box/i.test(
      lower
    )
  ) {
    return "DAMAGED";
  }

  // 3. MISSING_ITEM (missing item, missing parts, incomplete)
  if (
    /missing\s+item|missing\s+parts|parts\s+missing|didn't\s+receive\s+all|incomplete\s+package|incomplete\s+order|items?\s+missing/i.test(
      lower
    )
  ) {
    return "MISSING_ITEM";
  }

  // 4. SIZE_OR_FIT (size issue, fit issue, too big/small)
  if (
    /size\s+issue|fit\s+issue|size\s+mismatch|doesn't\s+fit|too\s+(big|small|tight|loose)|size\s+or\s+fit|wrong\s+size/i.test(
      lower
    )
  ) {
    return "SIZE_OR_FIT";
  }

  // 5. WRONG_ITEM (incorrect product, different item)
  if (
    /wrong\s+item|wrong\s+product|different\s+item|incorrect\s+item|wrong\s+color|wrong\s+item\s+received/i.test(
      lower
    )
  ) {
    return "WRONG_ITEM";
  }

  // 6. NOT_AS_DESCRIBED (doesn't match catalog, missing items/parts)
  if (
    /(?:not|isn't|is\s+not|aren't)\s+as\s+described|doesn't\s+match|different\s+from\s+description|not\s+what\s+i\s+ordered|item\s+doesn't\s+match/i.test(
      lower
    )
  ) {
    return "NOT_AS_DESCRIBED";
  }

  // 7. CHANGED_MIND (no longer needed, unwanted, change of mind)
  if (
    /changed\s+my\s+mind|changed\s+mind|don't\s+need|no\s+longer\s+need|not\s+needed|unwanted|i\s+changed\s+my\s+mind|don't\s+want|do\s+not\s+want|no\s+longer\s+want/i.test(
      lower
    )
  ) {
    return "CHANGED_MIND";
  }

  // 8. ORDERED_BY_MISTAKE (accidental order)
  if (
    /ordered\s+(?:it\s+|item\s+|product\s+)?by\s+mistake|accidental|accidentally|ordered\s+the\s+wrong\s+thing|wrong\s+order/i.test(
      lower
    )
  ) {
    return "ORDERED_BY_MISTAKE";
  }

  // 9. OTHER (ONLY if explicitly indicated as other)
  if (
    /^(other|other\s+reason|something\s+else)$/i.test(lower) ||
    /other\s+return\s+reason/i.test(lower)
  ) {
    return "OTHER";
  }

  return null;
}

/**
 * Extract and normalize order references into canonical "ORD-XXXX" format.
 */
export function extractAndNormalizeOrderId(
  message: string,
  options?: { isPromptedForOrder?: boolean; isPromptedForReason?: boolean; existingOrderIds?: string[] }
): string | null {
  const trimmed = message.trim();

  // Pattern 1: Explicit ORD prefix (e.g., ORD-1001, ord1001, ord 1001, ORD:1001)
  const ordMatch = trimmed.match(/\bORD[- :#/]?(\d+)\b/i);
  if (ordMatch) {
    return `ORD-${ordMatch[1]}`;
  }

  // Pattern 2: "order 1001", "order #1001", "order id 1001", "order number 1001"
  const orderWordMatch = trimmed.match(/\b(?:order|ord)\s*(?:id|no|num|number)?\s*[:#]?\s*(\d+)\b/i);
  if (orderWordMatch) {
    return `ORD-${orderWordMatch[1]}`;
  }

  // Pattern 3: "my order is 1001", "my order id is 1001", "it is 1001", "id is 1001"
  const phraseMatch = trimmed.match(/\b(?:my\s+order\s+(?:id\s+)?is|it\s+is|id\s+is)\s*[:#]?\s*(\d+)\b/i);
  if (phraseMatch) {
    return `ORD-${phraseMatch[1]}`;
  }

  // Pattern 4: Bare digits (e.g. "1001" or "#1001")
  const bareMatch = trimmed.match(/^#?(\d{3,6})$/);
  if (bareMatch) {
    const candidateId = `ORD-${bareMatch[1]}`;
    if (options?.existingOrderIds && options.existingOrderIds.length > 0) {
      if (options.existingOrderIds.includes(candidateId)) {
        return candidateId;
      }
      return null;
    }
    if (options?.isPromptedForOrder || options?.isPromptedForReason) {
      return candidateId;
    }
  }

  return null;
}

/**
 * High-accuracy, state-machine-aware customer intent classification.
 */
export function classifyCustomerIntent(
  message: string,
  options?: ClassifyIntentOptions
): IntentAnalysisResult {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const pending = options?.pending;
  const state = options?.workflowState || "NONE";
  const currentIntent = options?.currentIntent;

  const wasPromptedForConfirmation =
    pending === "CONFIRM_REFUND" ||
    state === "AWAITING_CONFIRMATION" ||
    state === "AWAITING_REFUND_CONFIRMATION";

  const wasPromptedForReason =
    pending === "RETURN_REASON" ||
    state === "REASON_REQUIRED" ||
    state === "AWAITING_REFUND_REASON";

  const wasPromptedForOrder =
    options?.isPromptedForOrder ||
    pending === "ORDER_ID" ||
    state === "ORDER_REQUIRED" ||
    state === "AWAITING_ORDER_FOR_REFUND";

  // 1. Extract Order ID deterministically FIRST
  const orderId = extractAndNormalizeOrderId(trimmed, {
    isPromptedForOrder: wasPromptedForOrder,
    isPromptedForReason: wasPromptedForReason,
    existingOrderIds: options?.existingOrderIds,
  });

  // 2. Extract reason if present
  const reason = extractRefundReason(trimmed);

  // 3. Product mentions
  let productMention: string | null = null;
  if (/headphone/i.test(lower)) productMention = "headphones";
  else if (/air\s*fryer/i.test(lower)) productMention = "air fryer";
  else if (/razor|blade/i.test(lower)) productMention = "razor blades";
  else if (/software|license|office|365|microsoft/i.test(lower)) productMention = "software license";
  else if (/mixer|grinder/i.test(lower)) productMention = "mixer grinder";
  else if (/oven|microwave|otg/i.test(lower)) productMention = "oven";
  else if (/shoe|sneaker|pegasus|nike/i.test(lower)) productMention = "shoes";
  else if (/tv|television|bravia|sony/i.test(lower)) productMention = "television";
  else if (/watch|smartwatch/i.test(lower)) productMention = "smartwatch";
  else if (/chimney/i.test(lower)) productMention = "chimney";

  // =========================================================================
  // PRIORITY 1: EXPLICIT CONFIRMATION / CANCELLATION (When awaiting confirmation)
  // =========================================================================
  if (wasPromptedForConfirmation && !orderId) {
    if (
      CONFIRMATION_PATTERNS.some((p) => p.test(trimmed)) ||
      /^(yes|proceed|confirm|go\s+ahead|do\s+it|process)/i.test(trimmed)
    ) {
      return {
        intent: "REFUND_CONFIRMATION",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.98,
      };
    }
    if (
      CANCELLATION_PATTERNS.some((p) => p.test(trimmed)) ||
      /^(no|cancel|not\s+now|stop|nevermind|don't\s+refund|do\s+not\s+refund|please\s+cancel|i\s+changed\s+my\s+mind)/i.test(
        trimmed
      )
    ) {
      return {
        intent: "REFUND_CANCELLATION",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.98,
      };
    }
  }

  // =========================================================================
  // PRIORITY 2: EXPLICIT ORDER ID PRECEDENCE (Current Turn Override)
  // Every newly extracted valid Order ID must be treated as the user's current target!
  // =========================================================================
  if (orderId) {
    // 2a. Status request with order ID
    if (REFUND_STATUS_PATTERNS.some((p) => p.test(lower)) || currentIntent === "REFUND_STATUS") {
      return {
        intent: "REFUND_STATUS_REQUEST",
        orderId,
        productMention,
        reason,
        confidence: 0.95,
      };
    }

    // 2b. Eligibility request with order ID
    if (
      REFUND_ELIGIBILITY_PATTERNS.some((p) => p.test(lower)) ||
      (currentIntent === "CHECK_REFUND_ELIGIBILITY" && wasPromptedForOrder)
    ) {
      return {
        intent: "REFUND_ELIGIBILITY_REQUEST",
        orderId,
        productMention,
        reason,
        confidence: 0.95,
      };
    }

    // 2c. Explicit refund request with order ID AND reason
    if (
      reason !== null ||
      (REFUND_REQUEST_PATTERNS.some((p) => p.test(lower)) &&
        /(because|reason|defective|damaged|broken|wrong|mind|mistake)/i.test(lower))
    ) {
      return {
        intent: "REFUND_REQUEST",
        orderId,
        productMention,
        reason,
        confidence: 0.95,
      };
    }

    // 2d. Explicit refund keyword with order ID but no reason
    if (REFUND_REQUEST_PATTERNS.some((p) => p.test(lower))) {
      return {
        intent: "REFUND_REQUEST",
        orderId,
        productMention,
        reason: null,
        confidence: 0.95,
      };
    }

    // 2e. If in an active workflow awaiting order or reason, this is an order ID response!
    if (wasPromptedForOrder || wasPromptedForReason || wasPromptedForConfirmation) {
      return {
        intent: "ORDER_ID_RESPONSE",
        orderId,
        productMention,
        reason: null, // Order ID is NEVER a reason!
        confidence: 0.98,
      };
    }

    // 2f. Isolated Order ID in fresh session -> ORDER_INFORMATION
    return {
      intent: "ORDER_INFORMATION",
      orderId,
      productMention,
      reason,
      confidence: 0.9,
    };
  }

  // =========================================================================
  // PRIORITY 3: EXPLICIT NON-ORDER INTENTS (SHOW ORDERS, STATUS, POLICY, ELIGIBILITY, REQUEST)
  // =========================================================================
  if (SHOW_ORDERS_PATTERNS.some((p) => p.test(lower))) {
    return { intent: "SHOW_ORDERS", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  if (RETURN_POLICY_PATTERNS.some((p) => p.test(lower))) {
    return { intent: "RETURN_POLICY_QUESTION", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  if (REFUND_STATUS_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "REFUND_STATUS_REQUEST",
      orderId: null,
      productMention,
      reason,
      confidence: 0.95,
    };
  }

  if (REFUND_ELIGIBILITY_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "REFUND_ELIGIBILITY_REQUEST",
      orderId: null,
      productMention,
      reason,
      confidence: 0.95,
    };
  }

  if (REFUND_REQUEST_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "REFUND_REQUEST",
      orderId: null,
      productMention,
      reason,
      confidence: 0.95,
    };
  }

  if (WHY_DENIED_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "WHY_DENIED",
      orderId: null,
      productMention,
      reason: null,
      confidence: 0.95,
    };
  }

  // =========================================================================
  // PRIORITY 4: PENDING REFUND REASON STATE (When user was asked for reason)
  // =========================================================================
  if (wasPromptedForReason) {
    if (CANCELLATION_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "REFUND_CANCELLATION",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.98,
      };
    }

    if (GREETING_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "GREETING",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.9,
      };
    }

    if (GENERAL_SUPPORT_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "GENERAL_SUPPORT",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.9,
      };
    }

    // Check for obvious gibberish
    const isGibberish =
      /^[bcdfghjklmnpqrstvwxyz]{3,}$/i.test(trimmed) ||
      /^[a-z]{1,4}$/i.test(trimmed) ||
      /^[^a-zA-Z0-9]+$/.test(trimmed);

    if (isGibberish && reason === null) {
      return { intent: "UNKNOWN", orderId: null, productMention: null, reason: null, confidence: 0.95 };
    }

    // Only return REFUND_REASON_RESPONSE when a structured reason was detected or user explicitly stated 'other'
    if (reason !== null) {
      return {
        intent: "REFUND_REASON_RESPONSE",
        orderId: null,
        productMention,
        reason,
        confidence: 0.98,
      };
    }

    // Reason was not recognized as one of the structured categories
    return {
      intent: "UNKNOWN",
      orderId: null,
      productMention: null,
      reason: null,
      confidence: 0.9,
    };
  }

  // =========================================================================
  // PRIORITY 5: PENDING ORDER ID STATE (When user was asked for order ID)
  // =========================================================================
  if (wasPromptedForOrder) {
    if (CANCELLATION_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "REFUND_CANCELLATION",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.98,
      };
    }

    if (GREETING_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "GREETING",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.9,
      };
    }

    if (GENERAL_SUPPORT_PATTERNS.some((p) => p.test(trimmed))) {
      return {
        intent: "GENERAL_SUPPORT",
        orderId: null,
        productMention: null,
        reason: null,
        confidence: 0.9,
      };
    }

    return {
      intent: "UNKNOWN",
      orderId: null,
      productMention: null,
      reason: null,
      confidence: 0.9,
    };
  }

  // Check if user repeats confirmation when completed
  if (
    state === "COMPLETED" &&
    (CONFIRMATION_PATTERNS.some((p) => p.test(trimmed)) || /^(yes|proceed)/i.test(trimmed))
  ) {
    return {
      intent: "REFUND_CONFIRMATION",
      orderId: null,
      productMention: null,
      reason: null,
      confidence: 0.98,
    };
  }

  // Courtesy
  if (COURTESY_PATTERNS.some((p) => p.test(trimmed))) {
    return { intent: "COURTESY", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  // Gibberish
  const isGibberish =
    /^[bcdfghjklmnpqrstvwxyz]{3,}$/i.test(trimmed) ||
    /^[a-z]{1,4}$/i.test(trimmed) ||
    /^[^a-zA-Z0-9]+$/.test(trimmed);

  if (isGibberish) {
    return { intent: "UNKNOWN", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  // Greetings and General Support
  if (GREETING_PATTERNS.some((p) => p.test(trimmed))) {
    return { intent: "GREETING", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  if (GENERAL_SUPPORT_PATTERNS.some((p) => p.test(lower))) {
    return { intent: "GENERAL_SUPPORT", orderId: null, productMention: null, reason: null, confidence: 0.95 };
  }

  return { intent: "UNKNOWN", orderId: null, productMention: null, reason: null, confidence: 0.5 };
}
