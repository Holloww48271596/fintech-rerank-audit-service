import assert from "node:assert/strict";
import { decidePayment } from "./risk_decision.ts";

const highRisk = { id: "payment-104", text: "Refund requested", riskScore: 0.82 };
assert.equal(decidePayment(highRisk, 0.8), "notify-review");
assert.equal(decidePayment(highRisk, 0.9), "include");
assert.equal(decidePayment({ ...highRisk, riskScore: 0.2 }, 0.7), "include");
console.log("risk decision test passed");
