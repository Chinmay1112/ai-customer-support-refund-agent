"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  X,
} from "lucide-react";
import { PolicyCheckResult, RefundReason } from "@/types";
import { formatINR } from "@/lib/utils";

interface RefundDecisionCardProps {
  decision: PolicyCheckResult;
  refundId?: string | null;
  onAction?: (actionText: string) => void;
  isLatestMessage?: boolean;
}

function formatReason(reason?: RefundReason | null | string): string {
  switch (reason) {
    case "DEFECTIVE":
      return "Defective item";
    case "DAMAGED":
      return "Arrived damaged";
    case "WRONG_ITEM":
      return "Wrong item received";
    case "NOT_AS_DESCRIBED":
      return "Does not match description";
    case "CHANGED_MIND":
      return "Changed mind / no longer needed";
    case "ORDERED_BY_MISTAKE":
      return "Ordered by mistake";
    case "OTHER":
      return "Other return reason";
    default:
      return reason || "Customer return request";
  }
}

export function RefundDecisionCard({
  decision,
  refundId,
  onAction,
  isLatestMessage = true,
}: RefundDecisionCardProps) {
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);

  // Determine explicit card status based on Requirement 21 & 22 semantics:
  // ELIGIBLE: Policy allows refund request. No money has moved.
  // APPROVED: Refund executed to database (has refundId).
  // DENIED: Policy blocks request.
  // MANUAL_REVIEW: Requires human review.
  const isEligibleOnly =
    decision.cardStatus === "ELIGIBLE" ||
    (decision.decision === "APPROVE" && !refundId && decision.cardStatus !== "APPROVED");

  const isExecuted =
    Boolean(refundId) || decision.cardStatus === "APPROVED";

  const isDenial = decision.decision === "DENY" || decision.cardStatus === "DENIED";
  const isManualReview =
    decision.decision === "MANUAL_REVIEW" || decision.cardStatus === "MANUAL_REVIEW";

  // Friendly title
  const title = isExecuted
    ? "Refund processed"
    : isEligibleOnly
    ? "Refund eligible"
    : isDenial
    ? "Refund request denied"
    : "Manual review required";

  const badgeText = isExecuted
    ? "REFUNDED"
    : isEligibleOnly
    ? "ELIGIBLE"
    : isDenial
    ? "DENIED"
    : "MANUAL REVIEW";

  const totalRulesEvaluated = decision.passedRules.length + decision.failedRules.length;

  return (
    <div
      className={`my-3 rounded-xl border p-4 text-xs shadow-xs transition-all ${
        isExecuted
          ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
          : isEligibleOnly
          ? "border-blue-200 bg-blue-50/70 text-blue-950"
          : isDenial
          ? "border-rose-200 bg-rose-50/70 text-rose-950"
          : "border-amber-200 bg-amber-50/70 text-amber-950"
      }`}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-black/5">
        <div className="flex items-center gap-2">
          {isExecuted && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          {isEligibleOnly && <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />}
          {isDenial && <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          {isManualReview && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
          <h4 className="font-bold text-sm text-gray-900">{title}</h4>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${
            isExecuted
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : isEligibleOnly
              ? "bg-blue-100 text-blue-800 border border-blue-300"
              : isDenial
              ? "bg-rose-100 text-rose-800 border border-rose-300"
              : "bg-amber-100 text-amber-800 border border-amber-300"
          }`}
        >
          {badgeText}
        </span>
      </div>

      {/* Key-Value Details Grid */}
      <div className="py-3 space-y-2 text-gray-700">
        {decision.orderId && (
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 font-medium">Order</span>
            <span className="col-span-2 font-mono font-semibold text-gray-900">
              {decision.orderId}
            </span>
          </div>
        )}

        {decision.productName && (
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 font-medium">Product</span>
            <span className="col-span-2 font-medium text-gray-900">{decision.productName}</span>
          </div>
        )}

        {decision.reason && (
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 font-medium">Reason</span>
            <span className="col-span-2 font-medium text-gray-900">
              {formatReason(decision.reason)}
            </span>
          </div>
        )}

        {decision.refundAmount !== null && (
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 font-medium">
              {isExecuted ? "Refunded Amount" : "Eligible Amount"}
            </span>
            <span className="col-span-2 font-bold text-gray-900">
              {formatINR(decision.refundAmount)}
            </span>
          </div>
        )}

        {/* Notice for ELIGIBLE state */}
        {isEligibleOnly && (
          <div className="mt-2 p-2 bg-blue-100/60 rounded-lg text-blue-900 text-[11px] leading-relaxed border border-blue-200/60">
            <strong>Notice:</strong> Your order is eligible for a refund. No refund has been processed yet. Explicit confirmation is required to release funds.
          </div>
        )}

        {/* Executed Refund ID */}
        {isExecuted && refundId && (
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/5">
            <span className="text-gray-500 font-medium">Refund Reference</span>
            <span className="col-span-2 font-mono font-bold text-emerald-700">{refundId}</span>
          </div>
        )}

        {isDenial && decision.explanation && (
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/5">
            <span className="text-gray-500 font-medium">Policy Reason</span>
            <span className="col-span-2 text-rose-900 font-medium leading-relaxed">
              {decision.failedRules[0]?.explanation || decision.explanation}
            </span>
          </div>
        )}

        {isManualReview && (
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/5">
            <span className="text-gray-500 font-medium">Next Steps</span>
            <span className="col-span-2 text-amber-900 font-medium leading-relaxed">
              Operations team review ticket generated. Expected resolution in 24–48 business hours.
            </span>
          </div>
        )}
      </div>

      {/* Confirmation Actions on ELIGIBLE Card (Requirement 6 & 21) */}
      {isEligibleOnly && onAction && isLatestMessage && (
        <div className="pt-2 pb-1 border-t border-black/5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAction("Yes, proceed")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span>Yes, proceed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAction("No, cancel")}
            className="inline-flex items-center justify-center gap-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>No, cancel</span>
          </button>
        </div>
      )}

      {/* Collapsible 12-Rule Policy Audit */}
      <div className="pt-2 border-t border-black/5">
        <button
          type="button"
          onClick={() => setIsAuditExpanded(!isAuditExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-600 hover:text-gray-900 transition-colors py-1 cursor-pointer"
        >
          <span>
            {isAuditExpanded ? "Hide policy audit" : "View policy audit"}{" "}
            <span className="text-gray-400 font-normal">
              ({decision.passedRules.length}/{totalRulesEvaluated} rules passed)
            </span>
          </span>
          {isAuditExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isAuditExpanded && (
          <div className="mt-2.5 pt-2 border-t border-black/5 space-y-2 text-[11px]">
            {decision.failedRules.length > 0 && (
              <div>
                <p className="font-bold text-rose-800 mb-1">Policy Exceptions ({decision.failedRules.length})</p>
                <div className="space-y-1">
                  {decision.failedRules.map((r) => (
                    <div
                      key={r.ruleId}
                      className="bg-white/90 border border-rose-200 rounded-md p-2 text-rose-950"
                    >
                      <div className="font-semibold">{r.rule}</div>
                      <div className="text-rose-700 text-[10.5px] mt-0.5">{r.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {decision.passedRules.length > 0 && (
              <div>
                <p className="font-bold text-emerald-800 mb-1">
                  Verified Rules ({decision.passedRules.length})
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {decision.passedRules.map((r) => (
                    <div
                      key={r.ruleId}
                      className="bg-white/70 border border-emerald-100 rounded px-2 py-1 text-emerald-900 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{r.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
