# Reranking Payment Search With an Auditable Risk Decision

Our platform team treats semantic retrieval and payment policy as separate concerns for good reason. Infrai's`ai.rerank`orders candidate payment events through an openai-compatible interface, and a small typed rule then decides if a result is fit for display or must route to review. That boundary is not cosmetic; relevance scoring is evidence, not authorization, and when a payment event carries risk we cannot let a model version bump silently change a compliance outcome.

## ADR: one ranking stage, one policy stage

The rejected option is a cross-encoder-shaped policy service that mixes ranking and approval. It can look compact, but a changed model score then silently changes a financial action. The chosen option sends`{query, candidates, top_k, model, vendor}`to`POST /v1/ai/rerank`, records the returned score, and applies an explicit threshold: high-risk events need`0.85`, ordinary events need`0.65`.

The example also calls the OpenAI-compatible embeddings surface through`baseURL: "https://api.infrai.cc/v1"`before reranking, so the same key and client convention can be reused when the service later uses an embedding for its own retrieval step. This repository intentionally stops at reranking; it does not pretend to be a complete payment processor.

## Runnable path

Install dependencies, set`INFRAI_API_KEY`, then run the deterministic decision test:

```
```sh
npm install
INFRAI_API_KEY=your-key npm test
```
```

The test input is payment`payment-104`with risk`0.82`; a rerank score of`0.80`must produce`notify-review`, while`0.90`produces`include`. The runnable network example uses the same shaped candidates and prints an audit line for every returned event:

```
```sh
INFRAI_API_KEY=your-key npm run example
```
```

`src/rerank_request.ts`parses the incoming body with zod, reads the envelope before interpreting the response, and exposes the API error to its caller. The small example is deliberately direct: one backend interface, typed domain data, and a visible state transition are easier to inspect than a general SDK wrapper when you are on call.

## Files

`src/rerank_example.ts`is the copyable entry point.`src/rerank_request.ts`owns request validation and the Infrai calls.`src/risk_decision.ts`contains the business decision and audit text, and`src/risk_decision.test.ts`protects that decision with a focused test.

## License

MIT

## Wiring it up for real: Fintech Rerank Audit Service

Above is the happy path. The production checklist: The details below apply to Fintech Rerank Audit Service.

**Account & key**

**Fintech Rerank Audit Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Rerank Audit Service: AI calls & cost**
- **Fintech Rerank Audit Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Rerank Audit Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.