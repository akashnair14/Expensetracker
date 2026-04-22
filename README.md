# SpendSense

AI-powered personal finance tracker built with Next.js, Supabase, and Gemini Flash 2.0.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fakash%2Fspendsense)

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Next.js API Routes, Supabase (Postgres, Auth, Storage) |
| **AI Engine** | Google Gemini Flash 2.0 API |
| **Caching** | Upstash Redis |
| **Charts** | Recharts |

## ✨ Features

- **Bank Statement Parser**: Direct PDF/CSV upload for HDFC, SBI, ICICI, etc.
- **AI Categorization**: Zero-shot categorization using Gemini with local merchant cache.
- **Natural Language Queries**: Ask "How much did I spend on Zomato in March?" and get instant answers.
- **Budgets**: Set category-level limits with smart suggestions.
- **Monthly Reports**: Auto-generated AI reviews of your financial health.
- **PWA Ready**: Installable on mobile with offline support.

## 🛠️ Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/akash/spendsense.git
   cd spendsense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_key
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🗄️ Supabase Setup

Run the following SQL in your Supabase SQL Editor:
- Create `accounts`, `transactions`, `budgets`, `reports`, and `merchant_categories` tables.
- Enable RLS policies for user-level data isolation.
- Enable Google OAuth in Authentication settings.

---
Built with ❤️ by [Akash](https://github.com/akash)
