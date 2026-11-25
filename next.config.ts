import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Citation.js and citeproc are Node libraries; keep them out of the server bundle.
  serverExternalPackages: ["@citation-js/core", "@citation-js/plugin-csl", "citeproc"],
  poweredByHeader: false,
  devIndicators: false,
  // Baseline headers for a public HTTPS host. No CSP yet: it needs testing against Next's inline scripts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
