"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AgentEventItem } from "@/types";
import { ToolCallCard } from "./ToolCallCard";
import { PolicyCheckCard } from "./PolicyCheckCard";
import { DecisionCard } from "./DecisionCard";
import {
  RefreshCw,
  Filter,
  Search,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Clock,
  Database,
  Radio,
} from "lucide-react";

interface AgentLogPanelProps {
  initialSessionId?: string | null;
}

export function AgentLogPanel({ initialSessionId }: AgentLogPanelProps) {
  const [events, setEvents] = useState<AgentEventItem[]>([]);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || "ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSessionId && selectedSessionId !== "ALL") {
        params.append("sessionId", selectedSessionId);
      }
      if (selectedType && selectedType !== "ALL") {
        params.append("type", selectedType);
      }
      params.append("limit", "150");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();

      setEvents(data.events || []);
      if (data.availableSessions) {
        setAvailableSessions(data.availableSessions);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId, selectedType]);

  // Initial fetch and auto-refresh interval
  useEffect(() => {
    fetchLogs();

    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchLogs, isAutoRefresh]);

  // Update selected session if prop changes
  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // Client-side text filter
  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.message.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      (e.toolName && e.toolName.toLowerCase().includes(q)) ||
      e.sessionId.toLowerCase().includes(q) ||
      (e.input && e.input.toLowerCase().includes(q)) ||
      (e.output && e.output.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Panel Toolbar */}
      <div className="border-b border-gray-200 p-4 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Session Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 font-medium">Session:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-transparent font-mono text-gray-900 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Sessions ({availableSessions.length})</option>
              {availableSessions.map((s) => (
                <option key={s} value={s}>
                  {s.slice(0, 16)}...
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-gray-500 font-medium">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-gray-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Events</option>
              <option value="AGENT_STARTED">AGENT_STARTED</option>
              <option value="CUSTOMER_LOOKUP">CUSTOMER_LOOKUP</option>
              <option value="ORDER_LOOKUP">ORDER_LOOKUP</option>
              <option value="TOOL_CALL">TOOL_CALL</option>
              <option value="POLICY_CHECK">POLICY_CHECK</option>
              <option value="POLICY_RULE_PASSED">POLICY_RULE_PASSED</option>
              <option value="POLICY_RULE_FAILED">POLICY_RULE_FAILED</option>
              <option value="REFUND_PROCESSED">REFUND_PROCESSED</option>
              <option value="REFUND_DENIED">REFUND_DENIED</option>
              <option value="MANUAL_REVIEW_CREATED">MANUAL_REVIEW_CREATED</option>
              <option value="AGENT_COMPLETED">AGENT_COMPLETED</option>
              <option value="AGENT_ERROR">AGENT_ERROR</option>
            </select>
          </div>

          {/* Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search events, orders, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 w-48 lg:w-60"
            />
          </div>
        </div>

        {/* Refresh & Live Polling Toggles */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
              isAutoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isAutoRefresh ? "text-emerald-600 animate-pulse" : "text-gray-400"
              }`}
            />
            <span>{isAutoRefresh ? "Live Auto-Refresh" : "Paused"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 shadow-2xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Events Timeline Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Database className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">No agent audit events found</p>
            <p className="text-xs text-gray-400 mt-1">
              Start a customer chat session or adjust filters to view live event telemetry.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            // Render specialized cards based on event type
            if (evt.type.startsWith("POLICY_")) {
              return <PolicyCheckCard key={evt.id} event={evt} />;
            }

            if (
              evt.type === "REFUND_PROCESSED" ||
              evt.type === "REFUND_DENIED" ||
              evt.type === "MANUAL_REVIEW_CREATED"
            ) {
              return <DecisionCard key={evt.id} event={evt} />;
            }

            if (
              evt.type === "TOOL_CALL" ||
              evt.type === "TOOL_SUCCESS" ||
              evt.type === "TOOL_ERROR"
            ) {
              return <ToolCallCard key={evt.id} event={evt} />;
            }

            // General lifecycle events: AGENT_STARTED, CUSTOMER_LOOKUP, ORDER_LOOKUP, AGENT_COMPLETED
            const isStart = evt.type === "AGENT_STARTED";
            const isCompleted = evt.type === "AGENT_COMPLETED";
            const isError = evt.type === "AGENT_ERROR";
            const isCustomer = evt.type === "CUSTOMER_LOOKUP";
            const isOrder = evt.type === "ORDER_LOOKUP";

            return (
              <div
                key={evt.id}
                className="bg-white border border-gray-200/90 rounded-xl p-3 text-xs shadow-2xs flex items-start gap-3"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isStart
                      ? "bg-blue-100 text-blue-700"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-700"
                      : isError
                      ? "bg-rose-100 text-rose-700"
                      : isCustomer
                      ? "bg-indigo-100 text-indigo-700"
                      : isOrder
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {isStart && <PlayCircle className="w-4 h-4" />}
                  {isCompleted && <CheckCircle className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isCustomer && <span className="font-bold text-[10px]">CRM</span>}
                  {isOrder && <span className="font-bold text-[10px]">ORD</span>}
                  {!isStart && !isCompleted && !isError && !isCustomer && !isOrder && (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-gray-900">{evt.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        {evt.sessionId.slice(0, 12)}...
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mt-1 leading-relaxed">{evt.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="border-t border-gray-200 px-4 py-2 bg-white text-[11px] text-gray-400 flex items-center justify-between">
        <span>Showing {filteredEvents.length} events</span>
        <span>Last synced: {lastRefreshed.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
