/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  async rewrites() {
    return [
      { source: '/bilan', destination: '/bilan.html' },
      { source: '/bilan-360', destination: '/bilan-360.html' },
      { source: '/horizon', destination: '/horizon.html' },
      { source: '/expert/landing', destination: '/expert-landing.html' },
      { source: '/conditions', destination: '/conditions.html' },
      { source: '/confidentialite', destination: '/confidentialite.html' },
      { source: '/avis-legal', destination: '/avis-legal.html' },
    ];
  },
};

module.exports = nextConfig;