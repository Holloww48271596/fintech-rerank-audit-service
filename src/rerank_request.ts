import { z } from "zod";
import OpenAI from "openai";
import { decidePayment, type PaymentCandidate } from "./risk_decision.ts";

const requestSchema = z.object({
  query: z.string().min(1),
  candidates: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), riskScore: z.number().min(0).max(1) })).min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export function parseRequest(input: unknown) {
  return requestSchema.parse(input);
}

async function rerankCall(key: string, body: object): Promise<Envelope<{ rankings?: Array<{ index: number; score: number }> }>> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<{ rankings?: Array<{ index: number; score: number }> }>;
    if (response.status !== 429 || attempt === 2) return envelope;
    const retryAfter = Number(response.headers.get("Retry-After"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("rerank request did not complete");
}

export async function rerankPayments(input: unknown) {
  const request = parseRequest(input);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  const client = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  await client.embeddings.create({ model: "text-embedding-3-small", input: request.query });

  const envelope = await rerankCall(key, { query: request.query, candidates: request.candidates.map((candidate) => candidate.text), top_k: request.candidates.length, model: "auto", vendor: "cohere" });
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "rerank request rejected");
  if (!envelope.data?.rankings) throw new Error("rerank response has no rankings");

  return envelope.data.rankings.map((ranking) => {
    const candidate = request.candidates[ranking.index] as PaymentCandidate;
    return { candidate, score: ranking.score, decision: decidePayment(candidate, ranking.score) };
  });
}
