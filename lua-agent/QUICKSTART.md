# Voice Platform Lua Agent — Quick Start

## 1. Install and build

```bash
cd lua-agent
npm install
npm run build
```

## 2. Set environment variables

```bash
npx lua-cli env sandbox -k POSTGRES_URL -v "<your-postgres-url>"
npx lua-cli env sandbox -k RESEND_API_KEY -v "<your-resend-key>"   # optional
```

## 3. Chat with the agent

```bash
npx lua-cli chat -e sandbox
```

Try: `"Run discovery for disability rights in Ireland with keywords accessibility, advocacy"`

## 4. Test a specific tool

```bash
npx lua-cli test skill --name discover_case_leads \
  --input '{"topic":"refugee support Ireland","keywords":["asylum","integration"]}'
```

## 5. Deploy to production

```bash
npx lua-cli push all --force
npx lua-cli deploy all --force
```

## Typical workflow

```
run_discovery_pipeline         # topic → discover → verify → enrich → safety → match
  └─ cases appear in Next.js dashboard
       └─ editor approves case
            └─ send_approved_invite    # drafts + sends consent-first email
```

Safety rules are enforced in code: safety screening cannot be skipped, minors auto-route to human review, no outreach without editor approval.

See `README.md` for full documentation and known limitations.
