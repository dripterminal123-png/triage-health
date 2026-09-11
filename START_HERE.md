# Start here — Triage Health source code

This ZIP contains the complete tracked source of the website created for your project, plus this guide and an export manifest. It is the React/TypeScript rebuild, not the earlier Streamlit/Python version.

Live private site: https://triage-health-om.nitinrajkumar.chatgpt.site

## Open and edit

1. Unzip the download.
2. Open the entire `triage-health` folder in VS Code.
3. Read `README.md` for architecture, AI setup, source maintenance, and validation details.

## Find the code

| File or folder | Purpose |
| --- | --- |
| app/page.tsx | Main website: chat, library, profile, connection settings |
| app/globals.css | Colors, typography, layout, responsive styling |
| app/layout.tsx | Page metadata and shared layout |
| app/api/chat/route.ts | Gemini requests, system instructions, documents, streaming |
| app/api/connect/route.ts | Checks your Gemini key and discovers models |
| app/api/state/route.ts | Saves and retrieves chats and profiles |
| app/chatgpt-auth.ts | Signed-in user integration |
| lib/retrieval.ts | Retrieves relevant knowledge passages |
| lib/ai.ts | Shared AI request helpers |
| lib/knowledge/ | Source catalog and 101 indexed text passages |
| public/references/ | Five original reference PDFs |
| db/ and drizzle/ | Database schema and migration |
| components/ui/ | Reused UI components |
| scripts/check-core.mjs | Core automated checks with mocked AI responses |
| scripts/ingest-knowledge.py | Refreshes the allowlisted knowledge sources |
| package.json and package-lock.json | Dependencies and commands |

## Development commands

The project requires Node.js 22.13 or newer and npm. From the unzipped project folder:

```bash
npm ci
npm run dev
```

The development configuration targets port 5173. This is a server-backed application: full local functionality also requires initializing its local D1 database and using the starter's local authentication flow. The ZIP is the exact hosted source, not a separately configured standalone local distribution. The existing private website already has its hosted database and authentication configured. Deploying elsewhere requires configuring equivalent Cloudflare bindings and trusted authentication; never disable authentication checks for a public deployment.

Other project commands:

```bash
npx tsc --noEmit
node scripts/check-core.mjs
npm run build
```

## Gemini and data

Get a fresh key in Google AI Studio and enter it through Connect AI on the website. No real API key, repository credential, conversation data, or patient records are included in this ZIP. Installed dependencies and generated deployment output are not needed in a source submission and are not bundled; install dependencies using the lockfile.

The `.openai/hosting.json` file identifies the existing hosted project and declares its logical database binding. Its project ID is configuration, not a credential. Keep it if continuing this same Site; do not use that identity for an unrelated deployment.

## For your hackathon submission

This project was built with AI assistance and incorporates third-party libraries and public-health references. Describe that assistance accurately and follow your event's rules. Preserve included license notices and source attributions. The knowledge collection is retrieval context, not a trained custom medical model. Automated checks use mocked model responses; live AI behavior and clinical reliability have not been validated.
