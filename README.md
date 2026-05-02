# Voice Platform

A multi-agent podcast platform that helps Irish vulnerable, challenged, and survivor communities share their stories. The platform uses an AI-powered pipeline to discover potential guest cases from verified public sources, screen them for safety, match them to episode themes, and manage consent-first outreach — all under editorial human oversight.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with pgvector for semantic search
- **ORM:** Drizzle ORM
- **AI:** Vercel AI SDK with Tensorix API (DeepSeek-V3.2, DeepSeek-R1, Qwen3-Embedding-8B)
- **Email:** Resend
- **Auth:** NextAuth.js (Credentials provider)
- **CI:** GitHub Actions (lint + typecheck)
- **Deployment:** Vercel

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/voice-platform.git
   cd voice-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Fill in environment variables in `.env.local`:
   ```
   TENSORIX_API_KEY=your-key  # get from your Tensorix dashboard
   POSTGRES_URL=your-postgres-url
   RESEND_API_KEY=your-resend-key
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run database migrations:
   ```bash
   npx drizzle-kit push
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Safety Policy

This platform enforces strict safety rules in code, not just documentation:

- **Safety screening cannot be skipped.** Every case passes through the safety screening agent before it can proceed in the pipeline. The pipeline runner throws an error if this step is bypassed.
- **No invitation without approval.** The outreach agent verifies that a case has been explicitly approved by an editor before sending any communication. Unapproved cases cannot trigger outreach.
- **Minor cases never proceed automatically.** Any case involving a person under 18 is immediately routed to the human review queue regardless of other scores or safety signals.
- **Contact pathways are never invented.** If no verifiable contact method is found in source material, the field is left blank and flagged for manual editorial action.
- **Intermediary pathways preferred.** Direct individual contact is never used when an intermediary organisation pathway exists.
