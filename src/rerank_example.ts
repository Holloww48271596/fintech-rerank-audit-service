import { rerankPayments } from "./rerank_request.ts";
import { auditMessage } from "./risk_decision.ts";

const result = await rerankPayments({
  query: "merchant refund after a card payment",
  candidates: [
    { id: "payment-104", text: "Refund requested after card payment at Northstar Market", riskScore: 0.82 },
    { id: "payment-219", text: "Completed card payment for a recurring subscription", riskScore: 0.18 }
  ]
});

for (const item of result) console.log(auditMessage(item.candidate, item.score));
