/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  async redirects() {
    return [
      { source: '/quiz-essentiel', destination: '/quiz-360', permanent: true },
      { source: '/quiz-essentiel.html', destination: '/quiz-360.html', permanent: true },
      { source: '/bilan', destination: '/bilan-360', permanent: true },
      { source: '/quiz-intermediaire', destination: '/quiz-360', permanent: true },
      { source: '/quiz-intermediaire.html', destination: '/quiz-360.html', permanent: true },
      { source: '/quiz-decaissement', destination: '/quiz-360', permanent: true },
      { source: '/quiz-decaissement.html', destination: '/quiz-360.html', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/bilan-360', destination: '/bilan-360.html' },
      { source: '/expert/landing', destination: '/expert-landing.html' },
      { source: '/conditions', destination: '/conditions.html' },
      { source: '/confidentialite', destination: '/confidentialite.html' },
      { source: '/avis-legal', destination: '/avis-legal.html' },
      { source: '/quiz-360', destination: '/quiz-360.html' },
    ];
  },
};

module.exports = nextConfig;
