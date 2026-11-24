import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Citation.js and citeproc are Node libraries; keep them out of the server bundle.
  serverExternalPackages: ["@citation-js/core", "@citation-js/plugin-csl", "citeproc"],
  poweredByHeader: false,
};

export default nextConfig;
