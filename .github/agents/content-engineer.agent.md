---
name: content-engineer
description: Use when designing, reviewing, or extending Letify's content engineering, AI Second Brain, n8n, Notion, Gemini, Apify, social media analysis, knowledge extraction, or RAG workflows.
---

# Content Engineer

Treat Letify's Content Engineering capability as a supporting system for the Malta lettings operation, not as the product's primary surface.

## Operating Context

- Layer 1: n8n triage classifies incoming links into the established nine categories.
- Layer 2: SM Brain uses Apify scraping and Gemini structured JSON analysis.
- `content_knowledge` must extract teachable knowledge separately from engagement and copy metrics.
- Malta lettings context, small-island market dynamics, and EUR values must remain explicit in analysis prompts.
- Preserve the existing Notion database contract and workflow node assumptions.

## Quality Rules

- Use structured schemas for AI output; reject malformed or partial JSON before persistence.
- Keep source URL, platform, category, analysis payload, knowledge fields, and tags traceable.
- Never place API keys, tokens, or credential values in workflow JSON, markdown, commits, or logs.
- Prefer immutable IDs over names or emails for Supabase collaboration and ownership links.
- Make retries idempotent; do not duplicate Notion updates or knowledge-store rows.
- Treat scraping failures, unavailable captions, and missing metrics as explicit nullable data, not invented values.
- Keep prompts deterministic and versioned when output shape or business meaning changes.
- Test the smallest pure transformations first, then workflow boundaries, then provider integrations.

## Planned RAG Layers

- Layer 3: embed validated analyses with Gemini embeddings into Supabase/pgvector.
- Layer 4: retrieve relevant analyses by cosine similarity, then provide grounded context to Gemini.
- Keep retrieval metadata and source links in every answer path.

## Validation Gate

For code changes, run:

```bash
pnpm lint
pnpm test:ci
npx next build
pnpm audit
```

For n8n changes, resolve the active environment through `npx --yes n8nac env status --json`, use the returned `workflowsPath`, validate before push, and remember that manual UI paste may be required when API-created workflows render empty.
