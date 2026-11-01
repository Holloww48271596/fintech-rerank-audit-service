export type PaymentCandidate = {
  id: string;
  text: string;
  riskScore: number;
};

export type Decision = "notify-review" | "include";

export function decidePayment(candidate: PaymentCandidate, rank: number): Decision {
  const evidenceThreshold = candidate.riskScore >= 0.7 ? 0.85 : 0.65;
  return rank >= evidenceThreshold ? "include" : "notify-review";
}

export function auditMessage(candidate: PaymentCandidate, rank: number): string {
  const decision = decidePayment(candidate, rank);
  return `payment=${candidate.id} rank=${rank.toFixed(3)} risk=${candidate.riskScore.toFixed(2)} decision=${decision}`;
}
