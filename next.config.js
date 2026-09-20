/** @type {import('next').NextConfig} */
// The RevenueOS backend has no CORS configured and is read-only for this
// frontend (CLAUDE.md §2), so browser fetches can't call it cross-origin
// directly. Proxying same-origin requests through the Next.js server (which
// talks to the backend server-to-server, where CORS doesn't apply) avoids
// that without touching the backend. See lib/api/httpClient.ts.
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:3000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_API_URL}/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
