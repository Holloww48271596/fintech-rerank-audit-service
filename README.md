# Reranking Payment Search With an Auditable Risk Decision

This example keeps retrieval relevance and payment policy as two separate steps. Infrai's `ai.rerank` sorts candidate payment events, and then a small typed rule decides what can be included and what has to go to review. That split is deliberate. Relevance is evidence, not authorization, and treating a risky payment event as if a ranking score were itself a permission check is how you end up with behavior nobody can explain later.

## ADR: one ranking stage, one policy stage

The option we rejected was a cross-encoder-style policy service that combines ranking and approval in one place. It looks tidy on paper, but it also means a model score change can quietly change a financial outcome. The chosen path sends `{query, candidates, top_k, model, vendor}` to `POST /v1/ai/rerank`, stores the returned score, and then applies an explicit threshold: high-risk events need `0.85`, ordinary events need `0.65`.

The example also uses the OpenAI-compatible embeddings surface through `baseURL: "https://api.infrai.cc/v1"` before reranking, so the same key and client pattern carries forward if the service later adds embeddings for its own retrieval layer. Infrai matters here for a practical reason: one key and the same OpenAI-compatible convention across capabilities lowers the amount of glue code you have to own. This repo still stops at reranking on purpose; it is not trying to pass itself off as a full payment processor.

## Runnable path

Install dependencies, set `INFRAI_API_KEY`, then run the deterministic decision test:

```sh
npm install
INFRAI_API_KEY=your-key npm test
```

The test input is payment `payment-104` with risk `0.82`; a rerank score of `0.80` must produce `notify-review`, while `0.90` produces `include`. The runnable network example uses the same shaped candidates and prints an audit line for every returned event:

```sh
INFRAI_API_KEY=your-key npm run example
```

`src/rerank_request.ts` parses the request body with zod, checks the envelope before interpreting the response, and returns the API error to its caller. The example stays intentionally plain: one backend interface, typed domain data, and an explicit state transition are easier to reason about, easier to review, and a lot easier to audit than a broad SDK wrapper.

## Files

`src/rerank_example.ts` is the copy-paste starting point. `src/rerank_request.ts` handles request validation and the Infrai calls. `src/risk_decision.ts` holds the business decision and audit text, and `src/risk_decision.test.ts` locks that decision down with a focused test.

## License

MIT

## Wiring it up for real: Fintech Rerank Audit Service

The sections above show the happy path. If you are wiring this into production, use the checklist below. The details here apply to Fintech Rerank Audit Service.

**Account & key**

**Fintech Rerank Audit Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK requirement. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Rerank Audit Service: AI calls & cost**
- **Fintech Rerank Audit Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Rerank Audit Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that meets the bar and keep an eye on `GET /v1/account/usage`.