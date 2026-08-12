# PawPass

PawPass is a mobile-first pet-care dashboard with production accounts backed by Supabase and a deliberately separate, browser-only demo. The existing dashboard, multi-pet profiles, health history, schedules, emergency card, and responsive navigation remain available.

## Architecture and security

- **Production mode:** Supabase Auth handles password hashing, sessions, email verification, logout, and password recovery. PostgreSQL stores profiles, pets, the selected pet, health records, schedules, emergency data, and settings.
- **Tenant isolation:** every application table has Row Level Security (RLS). Policies compare `auth.uid()` with the row owner and also validate each child row's pet ownership. The browser never receives a service-role key.
- **Demo mode:** **Explore the demo** explicitly selects local mode and uses the existing `pawpass-data` localStorage content. Demo data is not uploaded and is not an account.
- The Supabase publishable/legacy anon key is safe to expose to a browser **only with RLS enabled**. Treat the service-role key as a secret and never add it to this repository or frontend.

## Supabase setup (production)

1. Create a project at Supabase and save the **Project URL** and **Publishable key** (or legacy `anon` key) from **Project Settings → API**. Do not use the service-role key.
2. Open **SQL Editor**, paste [`supabase/migrations/20260812000000_pawpass_schema.sql`](supabase/migrations/20260812000000_pawpass_schema.sql), and select **Run**. This creates `profiles`, `pets`, `user_settings`, `health_records`, `schedules`, and `emergency_data`, indexes, ownership policies, and the new-user profile trigger.
3. In **Authentication → URL Configuration**, set **Site URL** to the deployed Pages URL, for example `https://OWNER.github.io/PawPass/`.
4. Add that exact URL and the local URL `http://localhost:4173/` to **Redirect URLs**. Password-reset links return to one of these allow-listed URLs.
5. In **Authentication → Providers → Email**, leave Email enabled. For production, keep **Confirm email** enabled and configure a custom SMTP provider under **Authentication → SMTP Settings**; Supabase's default sender is rate-limited and intended only for trials.
6. Customize the confirmation and reset email templates if desired. PawPass calls Supabase's standard secure, expiring recovery flow; it never emails or stores a password itself.

### Local runtime configuration

Create the ignored `config.js` from the template:

```bash
cp config.example.js config.js
```

Replace the two placeholders with the Project URL and publishable/anon key. Then serve the directory:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173/>. A missing `config.js` intentionally disables production account actions while **Explore the demo** continues to work.

## GitHub Pages deployment

The included [Pages workflow](.github/workflows/deploy-pages.yml) generates `config.js` only inside the deployment artifact, so environment-specific values are not committed.

1. In the repository, open **Settings → Secrets and variables → Actions** and create repository secrets named `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Open **Settings → Pages** and select **GitHub Actions** as the source.
3. Push to `main` or manually run **Deploy PawPass to Pages**. The job validates both values, creates the runtime config, and deploys the static artifact.
4. Ensure the final Pages URL is present in Supabase's Site URL and Redirect URLs as described above.

The publishable key is not an authorization boundary—RLS is. Storing it as an Actions secret avoids hard-coding environment configuration and accidental substitution with a privileged key.

## Account behavior

- Registration requires name, email, and a password of at least eight characters. With email confirmation enabled, the user must follow the confirmation email before logging in.
- Login sessions are securely persisted and refreshed by the Supabase client, so a refresh or second browser session shows the same server-backed data after login.
- **Forgot your password?** sends a reset email. The return link opens PawPass's new-password form and updates the password through the authenticated recovery session.
- **Log out** revokes the local Supabase session and returns to the landing page without deleting account data.
- Tasks and health records are attached to the selected pet. Server-side RLS prevents one account from reading or changing another account's rows even if browser requests are modified.

## Verification checklist

Use two private/incognito browser profiles against the configured deployment:

1. Register with a new name, email, and 8+ character password; confirm the email when confirmation is enabled.
2. Log in, create a pet, add a health record and schedule, select that pet, then refresh. Confirm all values and the selected pet remain.
3. Log out and confirm the dashboard is no longer visible.
4. In the second browser profile, log into the same account and confirm the pet and records appear. Then register a different account and confirm the first account's pets do not appear.
5. On Login choose **Forgot your password?**, follow the email link, set a new password, log out, and log in with the new password.
6. Choose **Explore the demo**, edit sample content, refresh, and confirm demo persistence. Confirm **Reset demo data** affects only local demo data.

Automated static checks cannot deliver authentication email or create real accounts without a configured Supabase project. Complete the browser checklist after configuring the deployment; inspect Supabase **Authentication → Users** and Table Editor to confirm persisted ownership.

## Project structure

```text
.
├── index.html                 # Application shell and account/recovery dialogs
├── styles.css                 # Existing responsive design
├── app.js                     # UI state, routing, and interactions
├── backend.js                 # Supabase auth/database adapter and demo separation
├── config.example.js          # Safe runtime configuration template
├── supabase/migrations/       # Database schema, triggers, indexes, and RLS
└── .github/workflows/         # GitHub Pages deployment
```
