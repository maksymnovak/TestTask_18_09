/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    typedRoutes: true,
  },
  // Enable SWC minifier for better performance
  swcMinify: true,

  // Optimize bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;