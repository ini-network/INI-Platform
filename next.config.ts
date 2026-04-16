import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*' // Local Python server
            : '/api/', // The trailing slash is the magic key for Vercel + FastAPI
      },
    ]
  },
};

export default nextConfig;