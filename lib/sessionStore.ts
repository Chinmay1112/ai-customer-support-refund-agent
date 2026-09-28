import {
  RefundWorkflowState,
  RefundReason,
  ConversationIntent,
  ConversationPending,
  ConversationPendingAction,
} from "@/types";

export interface RefundSessionContext {
  sessionId: string;
  customerId: string;
  intent: ConversationIntent;
  pending: ConversationPending;
  state: RefundWorkflowState;
  orderId: string | null;
  currentOrderId: string | null;
  activeOrderId?: string | null;
  productName: string | null;
  reason: RefundReason | null;
  returnReason: RefundReason | null;
  reasonText: string | null;
  returnDetails?: string | null;
  pendingAction?: ConversationPendingAction;
  lastResolvedOrderId?: string | null;
  lastResolvedIntent?: string | null;
  eligibilityChecked: boolean;
  eligibilityDecision: "APPROVE" | "DENY" | "MANUAL_REVIEW" | null;
  refundAmount: number | null;
  customerConfirmed: boolean;
  refundId: string | null;
  lastDenialExplanation?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory persistent server-side session state store
const sessionStore = new Map<string, RefundSessionContext>();

export function getSessionContext(
  sessionId: string,
  customerId: string = "CUST-001"
): RefundSessionContext {
  let context = sessionStore.get(sessionId);
  if (!context) {
    context = {
      sessionId,
      customerId,
      intent: "GENERAL_SUPPORT",
      pending: "NONE",
      state: "NONE",
      orderId: null,
      currentOrderId: null,
      activeOrderId: null,
      productName: null,
      reason: null,
      returnReason: null,
      reasonText: null,
      returnDetails: null,
      pendingAction: "NONE",
      lastResolvedOrderId: null,
      lastResolvedIntent: null,
      eligibilityChecked: false,
      eligibilityDecision: null,
      refundAmount: null,
      customerConfirmed: false,
      refundId: null,
      lastDenialExplanation: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sessionStore.set(sessionId, context);
  }
  return context;
}

export interface ConversationContext {
  state: RefundWorkflowState;
  customerId: string;
  pendingOrderId?: string | null;
  refundReason?: RefundReason | null;
  eligibilityDecision?: "APPROVE" | "DENY" | "MANUAL_REVIEW" | null;
  awaitingConfirmation?: boolean;
  lastIntent?: string | null;
  sessionId: string;
}

export function updateSessionContext(
  sessionId: string,
  updates: Partial<RefundSessionContext>
): RefundSessionContext {
  const current = getSessionContext(sessionId, updates.customerId);

  // Normalize orderId and currentOrderId
  // Normalize orderId, currentOrderId, and activeOrderId
  const targetOrderId =
    updates.activeOrderId !== undefined
      ? updates.activeOrderId
      : updates.currentOrderId !== undefined
      ? updates.currentOrderId
      : updates.orderId !== undefined
      ? updates.orderId
      : undefined;

  const currentEffectiveOrder = current.activeOrderId || current.currentOrderId || current.orderId;

  // STALE ORDER PREVENTION:
  // If orderId changes or is set to a different order:
  // Wipe all stale policy, product, reason, and confirmation state unless explicitly provided.
  const isChangingOrder = Boolean(
    targetOrderId !== undefined &&
      currentEffectiveOrder &&
      targetOrderId !== currentEffectiveOrder
  );

  const sanitizedUpdates: Partial<RefundSessionContext> = { ...updates };

  if (targetOrderId !== undefined) {
    sanitizedUpdates.orderId = targetOrderId;
    sanitizedUpdates.currentOrderId = targetOrderId;
    sanitizedUpdates.activeOrderId = targetOrderId;
    if (targetOrderId) {
      sanitizedUpdates.lastResolvedOrderId = targetOrderId;
    }
  }

  if (updates.intent) {
    sanitizedUpdates.lastResolvedIntent = updates.intent;
  }

  // Synchronize reason and returnReason
  if (updates.returnReason !== undefined) {
    sanitizedUpdates.reason = updates.returnReason;
  } else if (updates.reason !== undefined) {
    sanitizedUpdates.returnReason = updates.reason;
  }

  if (isChangingOrder) {
    if (updates.reason === undefined && updates.returnReason === undefined) {
      sanitizedUpdates.reason = null;
      sanitizedUpdates.returnReason = null;
    }
    if (updates.reasonText === undefined) sanitizedUpdates.reasonText = null;
    if (updates.returnDetails === undefined) sanitizedUpdates.returnDetails = null;
    if (updates.productName === undefined) sanitizedUpdates.productName = null;
    if (updates.eligibilityChecked === undefined) sanitizedUpdates.eligibilityChecked = false;
    if (updates.eligibilityDecision === undefined) sanitizedUpdates.eligibilityDecision = null;
    if (updates.refundAmount === undefined) sanitizedUpdates.refundAmount = null;
    if (updates.customerConfirmed === undefined) sanitizedUpdates.customerConfirmed = false;
    if (updates.refundId === undefined) sanitizedUpdates.refundId = null;
    if (updates.lastDenialExplanation === undefined) sanitizedUpdates.lastDenialExplanation = null;
    if (updates.pending === undefined && updates.pendingAction === undefined) {
      sanitizedUpdates.pending = "NONE";
      sanitizedUpdates.pendingAction = "NONE";
    }
    if (updates.state === undefined) {
      sanitizedUpdates.state = "NONE";
    }
  }

  // Synchronize state and pending / pendingAction bidirectionally
  const pendingInput = updates.pendingAction || updates.pending;
  if (pendingInput !== undefined) {
    if (pendingInput === "ORDER_ID" || pendingInput === "ASK_ORDER_ID") {
      sanitizedUpdates.pending = "ORDER_ID";
      sanitizedUpdates.pendingAction = "ASK_ORDER_ID";
      if (sanitizedUpdates.state === undefined) sanitizedUpdates.state = "ORDER_REQUIRED";
    } else if (pendingInput === "RETURN_REASON" || pendingInput === "ASK_RETURN_REASON") {
      sanitizedUpdates.pending = "RETURN_REASON";
      sanitizedUpdates.pendingAction = "ASK_RETURN_REASON";
      if (sanitizedUpdates.state === undefined) sanitizedUpdates.state = "REASON_REQUIRED";
    } else if (pendingInput === "CONFIRM_REFUND" || pendingInput === "CONFIRM_RETURN") {
      sanitizedUpdates.pending = "CONFIRM_REFUND";
      sanitizedUpdates.pendingAction = "CONFIRM_RETURN";
      if (sanitizedUpdates.state === undefined) sanitizedUpdates.state = "AWAITING_CONFIRMATION";
    } else if (pendingInput === "NONE") {
      sanitizedUpdates.pending = "NONE";
      sanitizedUpdates.pendingAction = "NONE";
      if (sanitizedUpdates.state === undefined) sanitizedUpdates.state = "NONE";
    }
  } else if (sanitizedUpdates.state !== undefined) {
    if (sanitizedUpdates.state === "ORDER_REQUIRED") {
      sanitizedUpdates.pending = "ORDER_ID";
      sanitizedUpdates.pendingAction = "ASK_ORDER_ID";
    } else if (sanitizedUpdates.state === "REASON_REQUIRED") {
      sanitizedUpdates.pending = "RETURN_REASON";
      sanitizedUpdates.pendingAction = "ASK_RETURN_REASON";
    } else if (sanitizedUpdates.state === "AWAITING_CONFIRMATION") {
      sanitizedUpdates.pending = "CONFIRM_REFUND";
      sanitizedUpdates.pendingAction = "CONFIRM_RETURN";
    } else if (
      sanitizedUpdates.state === "NONE" ||
      sanitizedUpdates.state === "COMPLETED" ||
      sanitizedUpdates.state === "DENIED" ||
      sanitizedUpdates.state === "MANUAL_REVIEW"
    ) {
      sanitizedUpdates.pending = "NONE";
      sanitizedUpdates.pendingAction = "NONE";
    }
  }

  const updated: RefundSessionContext = {
    ...current,
    ...sanitizedUpdates,
    updatedAt: new Date(),
  };
  sessionStore.set(sessionId, updated);
  return updated;
}

export function resetSessionContext(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * Server-side authorization check before executing money-moving refund.
 * Ensures the session satisfies all prerequisites.
 */
export function canProcessRefund(
  sessionId: string,
  orderId: string,
  customerId: string
): { allowed: boolean; reason?: string } {
  const context = sessionStore.get(sessionId);

  if (!context) {
    return {
      allowed: false,
      reason: "No active session context found for this refund request.",
    };
  }

  if (!customerId || customerId.trim() === "" || !context.customerId) {
    return {
      allowed: false,
      reason: "Authenticated customer ID is required.",
    };
  }

  if (context.customerId !== customerId) {
    return {
      allowed: false,
      reason: "Session customer does not match the verified caller.",
    };
  }

  const effectiveOrderId = context.currentOrderId || context.orderId;
  if (!effectiveOrderId || effectiveOrderId !== orderId) {
    return {
      allowed: false,
      reason: `Context order (${effectiveOrderId || "none"}) does not match requested order ${orderId}.`,
    };
  }

  const hasReturnWorkflow =
    Boolean(
      context.intent &&
        (context.intent === "REQUEST_REFUND" ||
          context.intent === "REFUND_REQUEST" ||
          context.intent === "RETURN_REQUEST" ||
          context.intent === "CHECK_REFUND_ELIGIBILITY")
    ) ||
    Boolean(context.returnReason || context.reason) ||
    Boolean(context.eligibilityChecked) ||
    context.state === "AWAITING_CONFIRMATION" ||
    context.state === "PROCESSING" ||
    context.pending === "CONFIRM_REFUND";

  if (!hasReturnWorkflow) {
    return {
      allowed: false,
      reason: "No active return or refund request workflow in progress for this order.",
    };
  }

  const effectiveReason = context.returnReason || context.reason;
  if (!effectiveReason) {
    return {
      allowed: false,
      reason: "Refund reason is missing. A structured reason is required before processing.",
    };
  }

  if (!context.eligibilityChecked) {
    return {
      allowed: false,
      reason: "Refund eligibility has not been verified by the policy engine for this order.",
    };
  }

  if (context.eligibilityDecision !== "APPROVE") {
    return {
      allowed: false,
      reason: `Order is not approved for automatic processing (decision: ${context.eligibilityDecision || "none"}).`,
    };
  }

  if (!context.customerConfirmed) {
    return {
      allowed: false,
      reason: "Explicit customer confirmation is required before funds can be released.",
    };
  }

  if (context.refundId) {
    return {
      allowed: false,
      reason: `Order has already been processed with Refund ID ${context.refundId}.`,
    };
  }

  return { allowed: true };
}
