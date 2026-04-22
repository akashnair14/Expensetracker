\# SpendSense — Agent Context



\## Stack

\- Next.js 14 App Router, TypeScript, Tailwind CSS

\- Supabase (Postgres, Auth, Storage, Edge Functions)

\- Gemini Flash 2.0 API for all AI calls (free tier)

\- Upstash Redis for merchant name cache

\- Vercel deployment



\## Architecture Rules

\- NO separate backend server. All API logic lives in /app/api/ route handlers.

\- Bank parsers are plugin classes: each bank = one file in /lib/parsers/

\- All parsers implement: parse(file: File): Promise<Transaction\[]>

\- NEVER call Gemini directly from components. Always via /api/ai/ routes.

\- Merchant cache check BEFORE any Gemini call. Cache in Redis, key = merchant\_name\_hash.



\## Folder Structure

/app          → Next.js pages + API routes

/lib/parsers  → Bank statement parsers (one per bank)

/lib/ai       → Gemini integration, prompts

/lib/db       → Supabase client + query helpers

/components   → Reusable UI components

/types        → Shared TypeScript interfaces



\## DB Schema (Supabase Postgres)

\- users (id, email, created\_at)

\- accounts (id, user\_id, bank\_name, account\_number\_last4)

\- transactions (id, account\_id, date, amount, description, category, merchant, is\_debit)

\- merchant\_categories (merchant\_hash, category) ← the cache table

\- budgets (id, user\_id, category, amount, month)

