/** @type {import('next').NextConfig} */
// Adapted from apps/web/next.config.mjs. Two source-only concerns were dropped:
//   • transpilePackages (the monorepo's @civic-signal/shared workspace dep — the
//     shared types are vendored into lib/shared-types.ts here, so there is none).
//   • the repo-root .env loader. In the monorepo that bridge reads the env file
//     two levels up (apps/web/../..). This standalone app keeps its .env.local at
//     its own root, which Next.js auto-loads into process.env server-side
//     (CIVIC_SIGNAL_API_BASE_URL included), so the bridge is unnecessary — and
//     pointing it at ../.. here would read files outside the app.
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false
};

export default nextConfig;
