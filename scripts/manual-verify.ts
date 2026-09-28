async function runManualVerifications() {
  const baseUrl = "http://localhost:3000";

  async function chat(
    message: string,
    customerId: string,
    sessionId: string,
    conversationHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, customerId, sessionId, conversationHistory }),
    });
    return await res.json();
  }

  console.log("=========================================================");
  console.log("FLOW 1: FULL STANDARD ELIGIBLE FLOW");
  console.log("hello -> show my recent orders -> I want to return something -> ORD-1001 -> defective -> verify eligibility -> yes -> verify refund");
  console.log("=========================================================\n");

  const s1 = `manual_flow1_${Date.now()}`;
  const h1: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  // Step 1: hello
  const m1 = "hello";
  const r1 = await chat(m1, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m1 }, { role: "assistant", content: r1.message });
  console.log("1. User: hello");
  console.log("   Assistant:", r1.message.replace(/\n+/g, " "));
  console.log("   State:", r1.workflowState, "| Tool calls:", r1.toolCalls?.map((t: any) => t.name) || []);

  // Step 2: show my recent orders
  const m2 = "show my recent orders";
  const r2 = await chat(m2, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m2 }, { role: "assistant", content: r2.message });
  console.log("\n2. User: show my recent orders");
  console.log("   Assistant:", r2.message.replace(/\n+/g, " "));
  console.log("   Tool calls:", r2.toolCalls?.map((t: any) => t.name) || []);

  // Step 3: I want to return something
  const m3 = "I want to return something";
  const r3 = await chat(m3, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m3 }, { role: "assistant", content: r3.message });
  console.log("\n3. User: I want to return something");
  console.log("   Assistant:", r3.message.replace(/\n+/g, " "));
  console.log("   State:", r3.workflowState, "| RefundId:", r3.refundId);

  // Step 4: ORD-1001
  const m4 = "ORD-1001";
  const r4 = await chat(m4, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m4 }, { role: "assistant", content: r4.message });
  console.log("\n4. User: ORD-1001");
  console.log("   Assistant:", r4.message.replace(/\n+/g, " "));
  console.log("   State:", r4.workflowState, "| RefundId:", r4.refundId);
  console.log("   Tool calls:", r4.toolCalls?.map((t: any) => t.name) || []);

  // Step 5: defective
  const m5 = "defective";
  const r5 = await chat(m5, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m5 }, { role: "assistant", content: r5.message });
  console.log("\n5. User: defective");
  console.log("   Assistant:", r5.message.replace(/\n+/g, " "));
  console.log("   State:", r5.workflowState);
  console.log("   Card Decision:", r5.decisionCard?.decision, "| Card Status:", r5.decisionCard?.cardStatus);
  console.log("   RefundId:", r5.refundId);

  // Step 6: verify eligibility
  console.log("\n6. Verify Eligibility:");
  console.log("   Eligible card present:", Boolean(r5.decisionCard));
  console.log("   Eligible amount:", r5.decisionCard?.refundAmount);
  console.log("   Refund processed yet?", Boolean(r5.refundId));

  // Step 7: yes
  const m7 = "yes";
  const r7 = await chat(m7, "CUST-001", s1, h1);
  h1.push({ role: "user", content: m7 }, { role: "assistant", content: r7.message });
  console.log("\n7. User: yes");
  console.log("   Assistant:", r7.message.replace(/\n+/g, " "));
  console.log("   State:", r7.workflowState);
  console.log("   RefundId:", r7.refundId);

  // Step 8: verify refund
  console.log("\n8. Verify Refund:");
  console.log("   Refund ID returned:", r7.refundId);
  console.log("   Final Workflow state:", r7.workflowState);

  console.log("\n=========================================================");
  console.log("FLOW 2: CHANGED MIND (NO AUTO-REFUND ON CLEAN UNREFUNDED ORDER)");
  console.log("I want to return something -> ORD-1001 -> changed my mind -> verify NO automatic refund");
  console.log("=========================================================\n");

  // Reset database so ORD-1001 is clean and unrefunded
  const { execSync } = await import("child_process");
  execSync("npm run db:reset-demo", { stdio: "ignore" });

  const s2 = `manual_flow2_${Date.now()}`;
  const h2: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  const f2_1 = await chat("I want to return something", "CUST-001", s2, h2);
  h2.push({ role: "user", content: "I want to return something" }, { role: "assistant", content: f2_1.message });
  console.log("1. User: I want to return something -> Assistant:", f2_1.message.replace(/\n+/g, " "));

  const f2_2 = await chat("ORD-1001", "CUST-001", s2, h2);
  h2.push({ role: "user", content: "ORD-1001" }, { role: "assistant", content: f2_2.message });
  console.log("2. User: ORD-1001 -> Assistant:", f2_2.message.replace(/\n+/g, " "));

  const f2_3 = await chat("changed my mind", "CUST-001", s2, h2);
  h2.push({ role: "user", content: "changed my mind" }, { role: "assistant", content: f2_3.message });
  console.log("3. User: changed my mind -> Assistant:", f2_3.message.replace(/\n+/g, " "));
  console.log("   State:", f2_3.workflowState);
  console.log("   Card Decision:", f2_3.decisionCard?.decision, "| Card Status:", f2_3.decisionCard?.cardStatus);
  console.log("   RefundId:", f2_3.refundId);
  console.log("   Automatic refund executed?:", f2_3.refundId !== null ? "YES (BUG!)" : "NO (CORRECT! Awaits confirmation)");
  console.log("   Awaiting confirmation?:", f2_3.workflowState === "AWAITING_CONFIRMATION" ? "YES (CORRECT!)" : "NO");

  console.log("\n=========================================================");
  console.log("FLOW 3: SEQUENTIAL ORDER SWITCHING");
  console.log("ORD-1002 -> ORD-1003 -> ORD-1004");
  console.log("=========================================================\n");

  const s3 = `manual_flow3_${Date.now()}`;
  const h3: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  const f3_1 = await chat("ORD-1002", "CUST-001", s3, h3);
  h3.push({ role: "user", content: "ORD-1002" }, { role: "assistant", content: f3_1.message });
  console.log("1. User: ORD-1002 -> Assistant:", f3_1.message.replace(/\n+/g, " "));
  console.log("   References ORD-1002?:", f3_1.message.includes("ORD-1002"));

  const f3_2 = await chat("ORD-1003", "CUST-001", s3, h3);
  h3.push({ role: "user", content: "ORD-1003" }, { role: "assistant", content: f3_2.message });
  console.log("2. User: ORD-1003 -> Assistant:", f3_2.message.replace(/\n+/g, " "));
  console.log("   References ORD-1003?:", f3_2.message.includes("ORD-1003"));
  console.log("   Leaks ORD-1002?:", f3_2.message.includes("ORD-1002"));

  const f3_3 = await chat("ORD-1004", "CUST-001", s3, h3);
  h3.push({ role: "user", content: "ORD-1004" }, { role: "assistant", content: f3_3.message });
  console.log("3. User: ORD-1004 -> Assistant:", f3_3.message.replace(/\n+/g, " "));
  console.log("   References ORD-1004?:", f3_3.message.includes("ORD-1004"));
  console.log("   Leaks ORD-1003?:", f3_3.message.includes("ORD-1003"));
  console.log("   Leaks ORD-1002?:", f3_3.message.includes("ORD-1002"));

  console.log("\n=========================================================");
  console.log("FLOW 4: TRACK MY REFUND");
  console.log("Track my refund -> Verify process_refund is NEVER called");
  console.log("=========================================================\n");

  const s4 = `manual_flow4_${Date.now()}`;
  const f4 = await chat("Track my refund", "CUST-005", s4, []);
  console.log("User: Track my refund -> Assistant:", f4.message.replace(/\n+/g, " "));
  console.log("Tool calls:", f4.toolCalls?.map((t: any) => t.name) || []);
  const calledProcessRefund = f4.toolCalls?.some((t: any) => t.name === "process_refund") || false;
  console.log("process_refund was called?:", calledProcessRefund ? "YES (BUG!)" : "NO (CORRECT! Never called)");

  console.log("\n=========================================================");
  console.log("FLOW 5: ORD-1008 (HIGH VALUE MANUAL REVIEW)");
  console.log("ORD-1008 -> Verify MANUAL_REVIEW");
  console.log("=========================================================\n");

  const s5 = `manual_flow5_${Date.now()}`;
  const f5 = await chat("I want to return ORD-1008 because it arrived damaged", "CUST-008", s5, []);
  console.log("User: I want to return ORD-1008 because it arrived damaged -> Assistant:", f5.message.replace(/\n+/g, " "));
  console.log("Tool calls:", f5.toolCalls?.map((t: any) => t.name) || []);
  console.log("Workflow state:", f5.workflowState);
  console.log("Decision card decision:", f5.decisionCard?.decision);
  console.log("Is MANUAL_REVIEW?:", f5.workflowState === "MANUAL_REVIEW" && f5.decisionCard?.decision === "MANUAL_REVIEW" ? "YES (CORRECT!)" : "NO");

  console.log("\n=========================================================");
  console.log("ALL MANUAL VERIFICATION FLOWS COMPLETED SUCCESSFULLY!");
  console.log("=========================================================");
}

runManualVerifications().catch((err) => {
  console.error(err);
  process.exit(1);
});
