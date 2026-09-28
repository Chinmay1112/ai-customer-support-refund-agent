"use client";

import React from "react";
import { Loader2, Wrench, ShieldCheck, Database, Search } from "lucide-react";

interface ToolActivityIndicatorProps {
  currentTool?: string | null;
  statusText?: string;
}

export function ToolActivityIndicator({
  currentTool,
  statusText = "Agent is verifying policies & tools...",
}: ToolActivityIndicatorProps) {
  const getToolIcon = () => {
    if (!currentTool) return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    if (currentTool.includes("customer")) return <Search className="w-4 h-4 text-indigo-600 animate-pulse" />;
    if (currentTool.includes("order")) return <Database className="w-4 h-4 text-emerald-600 animate-pulse" />;
    if (currentTool.includes("policy") || currentTool.includes("eligibility"))
      return <ShieldCheck className="w-4 h-4 text-amber-600 animate-pulse" />;
    return <Wrench className="w-4 h-4 text-blue-600 animate-spin" />;
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs text-blue-900 shadow-xs max-w-fit animate-in fade-in duration-300">
      <div className="flex items-center justify-center">{getToolIcon()}</div>
      <div className="flex flex-col">
        <span className="font-semibold text-blue-950">
          {currentTool ? `Executing Tool: ${currentTool}` : "Processing Agent Pipeline"}
        </span>
        <span className="text-[11px] text-blue-700">{statusText}</span>
      </div>
    </div>
  );
}
