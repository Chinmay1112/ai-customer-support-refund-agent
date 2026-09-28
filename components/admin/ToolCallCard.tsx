"use client";

import React, { useState } from "react";
import { Wrench, CheckCircle, XCircle, ChevronDown, ChevronUp, Code } from "lucide-react";
import { AgentEventItem } from "@/types";

interface ToolCallCardProps {
  event: AgentEventItem;
}

export function ToolCallCard({ event }: ToolCallCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isSuccess = event.status === "SUCCESS";
  const isFailed = event.status === "FAILED";

  const parseSafe = (str?: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const parsedInput = parseSafe(event.input);
  const parsedOutput = parseSafe(event.output);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-2xs hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isSuccess
                ? "bg-emerald-100 text-emerald-700"
                : isFailed
                ? "bg-rose-100 text-rose-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : isFailed ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <Wrench className="w-3.5 h-3.5" />
            )}
          </div>

          <div>
            <span className="font-mono font-bold text-gray-900">{event.toolName}()</span>
            <span className="text-[10px] text-gray-400 ml-2">
              {new Date(event.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
              isSuccess
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : isFailed
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {event.status}
          </span>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-1.5 text-gray-700 font-sans">{event.message}</div>

      {showDetails && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-2 font-mono text-[11px]">
          {parsedInput && (
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-1">
                <Code className="w-3 h-3" /> Input Arguments
              </div>
              <pre className="bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto text-slate-800">
                {typeof parsedInput === "object"
                  ? JSON.stringify(parsedInput, null, 2)
                  : parsedInput}
              </pre>
            </div>
          )}

          {parsedOutput && (
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-1">
                <Code className="w-3 h-3" /> Output Payload
              </div>
              <pre className="bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto text-slate-800">
                {typeof parsedOutput === "object"
                  ? JSON.stringify(parsedOutput, null, 2)
                  : parsedOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
