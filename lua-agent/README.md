# Voice Platform Lua Agent

Lua project for the Kals/Lucy Voice Platform editorial agent.

## Agent

- Space/org ID: `84cf1ce3-ab08-458d-806f-6a69d077ecd8`
- Agent ID: `baseAgent_agent_1777720573365_wtz7qmfug`
- Skill: `voice-platform-pipeline`

## Tools

- `discover_case_leads`
- `verify_case_leads`
- `enrich_cases`
- `screen_case_safety`
- `match_episode_themes`
- `run_discovery_pipeline`
- `send_approved_invite`

The safety tool must run before matching, approval, or outreach. Cases involving minors or uncertain consent are routed to human review.

## Setup

```bash
npm install
npx lua-cli compile
```

Set environment variables in Lua before running DB-backed tools:

```bash
npx lua-cli env sandbox -k POSTGRES_URL -v "<postgres-url>"
npx lua-cli env production -k POSTGRES_URL -v "<postgres-url>"
```

Optional email delivery:

```bash
npx lua-cli env production -k RESEND_API_KEY -v "<resend-key>"
npx lua-cli env production -k RESEND_FROM -v "Voice Platform <hello@example.com>"
```

If `RESEND_API_KEY` is absent or the contact pathway is not an email address, invite bodies are logged/returned for manual outreach instead of sent.

## Validation

```bash
npm run build
npx lua-cli test skill --name discover_case_leads --input '{"topic":"disability rights in Ireland","keywords":["accessibility","advocacy"]}'
npx lua-cli chat -e sandbox -m "Explain which safety rules you must apply before outreach" -t voice-platform-safety --clear
```

## Deploy

```bash
npx lua-cli push all --force
npx lua-cli deploy all --force
npx lua-cli chat -e production -m "What Voice Platform tools can you use?" -t prod-verify --clear
```
