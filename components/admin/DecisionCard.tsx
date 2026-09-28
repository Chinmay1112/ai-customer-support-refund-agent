"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Code } from "lucide-react";
import { AgentEventItem } from "@/types";
import { formatINR } from "@/lib/utils";

interface DecisionCardProps {
  event: AgentEventItem;
}

export function DecisionCard({ event }: DecisionCardProps) {
  const [showJson, setShowJson] = useState(false);

  const isProcessed = event.type === "REFUND_PROCESSED";
  const isDenied = event.type === "REFUND_DENIED";
  const isManual = event.type === "MANUAL_REVIEW_CREATED";

  const parseSafe = (str?: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const parsedOutput = parseSafe(event.output);

  return (
    <div
      className={`border rounded-xl p-4 text-xs shadow-xs transition-all ${
        isProcessed
          ? "bg-gradient-to-r from-emerald-50 to-white border-emerald-300"
          : isDenied
          ? "bg-gradient-to-r from-rose-50 to-white border-rose-300"
          : "bg-gradient-to-r from-amber-50 to-white border-amber-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isProcessed
                ? "bg-emerald-600 text-white"
                : isDenied
                ? "bg-rose-600 text-white"
                : "bg-amber-600 text-white"
            }`}
          >
            {isProcessed && <CheckCircle2 className="w-5 h-5" />}
            {isDenied && <XCircle className="w-5 h-5" />}
            {isManual && <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {isProcessed
                  ? "Refund Successfully Processed"
                  : isDenied
                  ? "Refund Officially Denied"
                  : "Escalated to Manual Operations Review"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(event.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-700 text-xs mt-0.5">{event.message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-gray-400 hover:text-gray-700 p-1 flex items-center gap-0.5 text-[11px]"
        >
          <Code className="w-3.5 h-3.5" />
          {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {parsedOutput && typeof parsedOutput === "object" && (
        <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex flex-wrap gap-4 text-xs font-mono">
          {"refundId" in parsedOutput && (
            <div className="text-emerald-800">
              <span className="text-gray-400">Refund ID: </span>
              <strong className="font-bold">{(parsedOutput as { refundId: string }).refundId}</strong>
            </div>
          )}
          {"orderId" in parsedOutput && (
            <div className="text-gray-800">
              <span className="text-gray-400">Order ID: </span>
              <strong>{(parsedOutput as { orderId: string }).orderId}</strong>
            </div>
          )}
          {"amount" in parsedOutput && (
            <div className="text-emerald-800">
              <span className="text-gray-400">Amount: </span>
              <strong>{formatINR(Number((parsedOutput as { amount: number }).amount))}</strong>
            </div>
          )}
          {"reviewId" in parsedOutput && (
            <div className="text-amber-800">
              <span className="text-gray-400">Review Ticket: </span>
              <strong>{(parsedOutput as { reviewId: string }).reviewId}</strong>
            </div>
          )}
        </div>
      )}

      {showJson && parsedOutput && (
        <div className="mt-2.5 pt-2 border-t border-gray-200">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-2.5 text-[11px] font-mono overflow-x-auto">
            {JSON.stringify(parsedOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
