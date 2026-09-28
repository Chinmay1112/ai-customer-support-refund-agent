export type OrderStatus = "DELIVERED" | "PROCESSING" | "SHIPPED" | "CANCELLED";
export type OrderCondition = "UNOPENED" | "OPENED_UNUSED" | "USED" | "DAMAGED";
export type OrderRefundStatus = "NONE" | "PENDING_REVIEW" | "REFUNDED" | "DENIED";
export type RefundStatus = "APPROVED" | "DENIED" | "MANUAL_REVIEW";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date | string;
}

export interface Order {
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
  createdAt: Date | string;
  customer?: Customer;
  refund?: Refund | null;
}

export interface Refund {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: Date | string;
  order?: Order;
  customer?: Customer;
}

export interface AgentEventItem {
  id: string;
  sessionId: string;
  type: string;
  toolName?: string | null;
  status: string;
  input?: string | null;
  output?: string | null;
  message: string;
  metadata?: string | null;
  createdAt: Date | string;
}

export type RefundDecision = "APPROVE" | "DENY" | "MANUAL_REVIEW";

export type ConversationIntent =
  | "GREETING"
  | "GENERAL_SUPPORT"
  | "ORDER_LIST"
  | "ORDER_INFORMATION"
  | "RETURN_REQUEST"
  | "REFUND_REQUEST"
  | "REFUND_STATUS"
  | "POLICY_QUESTION"
  | "OTHER"
  | "UNCLEAR"
  | "RECENT_ORDERS"
  | "CHECK_REFUND_ELIGIBILITY"
  | "REQUEST_REFUND"
  | "RETURN_POLICY";

export type ConversationPending =
  | "NONE"
  | "ORDER_ID"
  | "RETURN_REASON"
  | "CONFIRM_REFUND"
  | "ASK_ORDER_ID"
  | "ASK_RETURN_REASON"
  | "ASK_ADDITIONAL_DETAILS"
  | "CONFIRM_RETURN";

export type ConversationPendingAction =
  | "ASK_ORDER_ID"
  | "ASK_RETURN_REASON"
  | "ASK_ADDITIONAL_DETAILS"
  | "CONFIRM_RETURN"
  | "NONE"
  | "ORDER_ID"
  | "RETURN_REASON"
  | "CONFIRM_REFUND";

export interface ConversationStateModel {
  intent: ConversationIntent;
  pending: ConversationPending;
  activeOrderId?: string | null;
  currentOrderId?: string | null;
  pendingAction?: ConversationPendingAction;
  returnReason?: RefundReason | string | null;
  returnDetails?: string | null;
  lastResolvedOrderId?: string | null;
  lastResolvedIntent?: string | null;
}

export type ConversationState =
  | "IDLE"
  | "AWAITING_ORDER_FOR_REFUND"
  | "AWAITING_REFUND_REASON"
  | "AWAITING_REFUND_CONFIRMATION"
  | "AWAITING_ORDER_FOR_STATUS"
  | "AWAITING_ORDER_FOR_INFO"
  | "AWAITING_ORDER_FOR_ELIGIBILITY"
  | "AWAITING_ORDER_SELECTION"
  | "PROCESSING"
  | "COMPLETED"
  | "DENIED"
  | "MANUAL_REVIEW";

export type RefundWorkflowState =
  | "NONE"
  | "IDLE"
  | "REFUND_INTENT"
  | "ORDER_REQUIRED"
  | "AWAITING_ORDER_FOR_REFUND"
  | "REASON_REQUIRED"
  | "AWAITING_REFUND_REASON"
  | "DETAILS_REQUIRED"
  | "ELIGIBILITY_CHECKED"
  | "AWAITING_CONFIRMATION"
  | "AWAITING_REFUND_CONFIRMATION"
  | "AWAITING_ORDER_FOR_STATUS"
  | "AWAITING_ORDER_FOR_INFO"
  | "AWAITING_ORDER_FOR_ELIGIBILITY"
  | "AWAITING_ORDER_SELECTION"
  | "PROCESSING"
  | "COMPLETED"
  | "DENIED"
  | "MANUAL_REVIEW";

export type RefundReason =
  | "DEFECTIVE"
  | "DAMAGED"
  | "WRONG_ITEM"
  | "MISSING_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CHANGED_MIND"
  | "SIZE_OR_FIT"
  | "ORDERED_BY_MISTAKE"
  | "OTHER";

export type RequiredAction =
  | "ASK_FOR_REASON"
  | "ASK_FOR_DETAILS"
  | "SHOW_ELIGIBILITY"
  | "ASK_FOR_CONFIRMATION"
  | "PROCESS_REFUND"
  | "MANUAL_REVIEW"
  | "DENY";

export type DecisionCardStatus = "ELIGIBLE" | "APPROVED" | "DENIED" | "MANUAL_REVIEW";

export interface RuleEvaluation {
  ruleId: string;
  rule: string;
  passed: boolean;
  explanation: string;
}

export interface PolicyCheckResult {
  eligible: boolean;
  decision: RefundDecision;
  refundAmount: number | null;
  passedRules: RuleEvaluation[];
  failedRules: RuleEvaluation[];
  explanation: string;
  orderId?: string;
  customerId?: string;
  productName?: string;
  reason?: RefundReason | null;
  requiredAction?: RequiredAction;
  cardStatus?: DecisionCardStatus;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status?: "pending" | "success" | "error";
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  toolCalls?: ToolCallRecord[];
  decisionCard?: PolicyCheckResult | null;
  refundId?: string | null;
  workflowState?: RefundWorkflowState;
  pendingAction?: "AWAIT_ORDER" | "AWAIT_REASON" | "AWAIT_CONFIRMATION" | null;
}

export interface ChatApiResponse {
  message: string;
  sessionId: string;
  toolCalls: ToolCallRecord[];
  decisionCard?: PolicyCheckResult | null;
  refundId?: string | null;
  workflowState?: RefundWorkflowState;
  pendingAction?: "AWAIT_ORDER" | "AWAIT_REASON" | "AWAIT_CONFIRMATION" | null;
}
