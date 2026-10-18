import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['wuzzuf.net', 'media.licdn.com', 'indeed.com'],
  },
};

export default nextConfig;
