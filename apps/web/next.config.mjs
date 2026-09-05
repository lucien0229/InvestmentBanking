const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [{source:"/.well-known/integrity-keys.json",destination:`${apiOrigin}/.well-known/integrity-keys.json`},{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
