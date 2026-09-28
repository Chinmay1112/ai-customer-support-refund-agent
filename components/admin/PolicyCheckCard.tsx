"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AgentEventItem } from "@/types";

interface PolicyCheckCardProps {
  event: AgentEventItem;
}

export function PolicyCheckCard({ event }: PolicyCheckCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isRulePassed = event.type === "POLICY_RULE_PASSED";
  const isRuleFailed = event.type === "POLICY_RULE_FAILED";

  const parseSafe = (str?: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const parsedOutput = parseSafe(event.output);

  if (isRulePassed) {
    return (
      <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-emerald-950 font-medium">{event.message}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-700/80 uppercase tracking-wider font-semibold">
          PASSED
        </span>
      </div>
    );
  }

  if (isRuleFailed) {
    return (
      <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="text-rose-950 font-medium">{event.message}</span>
        </div>
        <span className="text-[10px] font-mono text-rose-700 uppercase tracking-wider font-bold">
          RULE VIOLATION
        </span>
      </div>
    );
  }

  // Overall POLICY_CHECK evaluation summary
  const decision =
    parsedOutput && typeof parsedOutput === "object" && "decision" in parsedOutput
      ? String((parsedOutput as { decision: string }).decision)
      : event.status;

  const isApprove = decision === "APPROVE" || event.status === "SUCCESS";
  const isManual = decision === "MANUAL_REVIEW" || event.status === "WARNING";

  return (
    <div
      className={`border rounded-xl p-3.5 text-xs shadow-2xs ${
        isApprove
          ? "bg-emerald-50/70 border-emerald-300"
          : isManual
          ? "bg-amber-50/70 border-amber-300"
          : "bg-rose-50/70 border-rose-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isApprove ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          )}
          <div>
            <span className="font-bold text-gray-900 tracking-wide uppercase">
              12-Rule Policy Engine Evaluation
            </span>
            <span className="text-[10px] text-gray-500 ml-2">
              {new Date(event.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
              isApprove
                ? "bg-emerald-200 text-emerald-900"
                : isManual
                ? "bg-amber-200 text-amber-900"
                : "bg-rose-200 text-rose-900"
            }`}
          >
            DECISION: {decision}
          </span>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-800 p-1"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <p className="mt-2 text-gray-800 font-medium leading-relaxed">{event.message}</p>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-gray-200 space-y-1.5 font-mono text-[11px]">
          {parsedOutput && (
            <pre className="bg-white/80 border border-gray-200 rounded p-2 overflow-x-auto text-gray-800">
              {JSON.stringify(parsedOutput, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
