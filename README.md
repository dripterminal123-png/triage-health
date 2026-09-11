# Triage Health

A private health education prototype rebuilt from the supplied Streamlit conversation. It is not a validated clinical triage tool or medical device.

## What works

- Responsive chat workspace, streaming Gemini responses, and complete conversational context (up to 40 messages).
- Account-scoped saved conversations and health profiles in D1, with optimistic concurrency checks.
- 20 indexed public-health resources from CDC, NIH institutes, MedlinePlus, and FDA, including five original downloadable PDFs. 101 text passages with source provenance and PDF page numbers.
- Keyword-based retrieval with synonym expansion; up to seven passages per question. This is retrieval augmentation, not fine-tuning, semantic embeddings, exhaustive medical knowledge, or live web search.
- Up to three PDF/TXT attachments totaling 4 MB. Attachments remain in page memory and are sent to Gemini with each message while attached. They are cleared on conversation change or reload and are not stored in the database.
- Model discovery against the user's Gemini API account; no guessed model ID or embedded API key.
- Source citations, searchable resource catalog, conversation export, deletion, provider error handling, and response cancellation.

## Connect AI

Open **Connect AI**, paste a fresh Gemini API key from Google AI Studio, and select an available model. The key remains in browser memory for the current page session and passes through the authenticated server route to Google. It is not saved to the database, a file, or browser storage. Reconnect after a reload. The exposed key in the supplied conversation was not reused or copied into this repository.

Messages, selected reference passages, profile information, and attachments are processed by Google under the applicable API terms. Use fictional or de-identified information. Do not present this prototype as HIPAA compliant or suitable for clinical deployment.

## Architecture

React/Vinext on Cloudflare Workers. Private Sites authentication supplies server-verified user identity. `/api/state` scopes every query to that identity. `/api/connect` validates the Gemini connection and lists supported text models. `/api/chat` validates bounded requests, retrieves supporting source passages, and relays generated text as NDJSON. The model is instructed to avoid diagnosis, ask for missing context, prioritize emergency help, distinguish uploaded material from authoritative references, and cite only supplied evidence. These instructions reduce risk but cannot guarantee safe or accurate model output.

## Source maintenance

`python scripts/ingest-knowledge.py` fetches an explicit allowlist of government health resources, extracts article and PDF text using `pdftotext`, records SHA-256 checksums and retrieval dates, and rebuilds the corpus. Original PDFs are under `public/references`. Dates mean retrieval dates, not clinical review. This build was retrieved September 9, 2026. The collection is not automatically refreshed. Review changed sources and clinical behavior before publishing an update. Failed sources are reported by the script and should be investigated before using a refreshed corpus.

## Validation performed

`node scripts/check-core.mjs` checks retrieval relevance, no-match behavior, access and origin controls, invalid PDF rejection, complete history in the provider request, source injection, stream handling, quota errors, blocked responses, and source asset integrity. Provider responses are mocked; this is not a live model evaluation. The generated D1 migration and revision/user-isolation behavior were tested with SQLite. TypeScript and production builds were checked.

No browser end-to-end testing or clinical validation has been performed. A fresh valid key is required for live model verification. Future clinical use would require expert review, evaluated red-flag scenarios, privacy/security assessment, monitoring, and explicit governance.

## Development

Use the existing lockfile and Sites build scripts. `npm run dev`, `npm run build`, `npx tsc --noEmit`, and `npm run db:generate` are the project commands. `.openai/hosting.json` owns the site's identity and D1 binding. Do not overwrite it when continuing this project. Never commit API keys or user health records.
