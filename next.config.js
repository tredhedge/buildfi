/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  async rewrites() {
    return [
      { source: '/expert/landing', destination: '/expert-landing.html' },
    ];
  },
};

module.exports = nextConfig;