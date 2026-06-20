# My Library

A private digital library web app for collecting books, journaling favorite lines, notes, photos, and drawings.

## Setup

### 1. Supabase

Create a Supabase project and run the SQL migration (see `schema.sql` or the project brief) to create the `books`, `highlights`, and `photos` tables with RLS policies.

Create two storage buckets in the Supabase dashboard:
- **covers** — Public
- **photos** — Private

Add storage policies for authenticated users on both buckets.

Create a user in the Supabase Auth dashboard (email + password).

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install and run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
4. Deploy — Vercel auto-detects Vite.

## Tech stack

- React + Vite
- Supabase (database, auth, file storage)
- React Router
- Framer Motion (page transitions)
- react-sketch-canvas (drawing feature)
- Plain CSS
