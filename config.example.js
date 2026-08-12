// Copy to config.js (which is gitignored) or generate it during deployment.
// The Supabase anon/publishable key is intentionally public and is safe only
// when Row Level Security remains enabled. Never put a service-role key here.
window.PAWPASS_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "sb_publishable_YOUR_PUBLISHABLE_KEY"
};
