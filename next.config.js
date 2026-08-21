/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination:
          (process.env.NEXT_PUBLIC_API_URL ||
            "https://backend-ranking-backend-ranking.p7agvn.easypanel.host") +
          "/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
