import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return [
      {
        // When you call /api/something, it routes to the Python server in development
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*' // Your local Python server
            : '/api/', // Vercel's production path
      },
    ]
  },
};

export default nextConfig;