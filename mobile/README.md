# PawPass Mobile — Phase 1

Native React Native + Expo client for the existing PawPass Supabase backend.

## Setup
1. Copy `.env.example` to `.env`.
2. Add the current Supabase publishable key.
3. Run `npm install`.
4. Run `npm run typecheck`.
5. Run `npx expo start`.

This app uses the same Supabase Auth users, PostgreSQL tables, RLS policies, pet records, photos, and subscription state as the production website. It does not contain or modify website code.
