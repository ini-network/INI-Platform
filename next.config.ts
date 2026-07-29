import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep development usable from this PC and from an iPhone on the same Wi-Fi.
  // This only affects Next.js development assets; production behavior is unchanged.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.167"],
  rewrites: async () => {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination:
            process.env.NODE_ENV === 'development'
              ? 'http://127.0.0.1:8000/api/:path*' // Local Python server
              : '/api/', // The trailing slash is the magic key for Vercel + FastAPI
        },
      ],
    };
  },
};

export default nextConfig;
