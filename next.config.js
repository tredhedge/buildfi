/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  typescript: {
    // Skip TypeScript checking during build because Next 16.1.6's
    // auto-generated .next/types/validator.ts references types that aren't
    // exported from next/types.js + next/server.js. Lint + tsc run in CI.
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Legacy quizzes → adaptive Wizard
      { source: '/quiz-essentiel', destination: '/wizard', permanent: true },
      { source: '/quiz-essentiel.html', destination: '/wizard', permanent: true },
      { source: '/quiz-intermediaire', destination: '/wizard', permanent: true },
      { source: '/quiz-intermediaire.html', destination: '/wizard', permanent: true },
      { source: '/quiz-decaissement', destination: '/wizard', permanent: true },
      { source: '/quiz-decaissement.html', destination: '/wizard', permanent: true },
      { source: '/quiz-360', destination: '/wizard', permanent: true },
      { source: '/quiz-360.html', destination: '/wizard', permanent: true },

      // Legacy product pages → new 2-SKU landing
      { source: '/bilan', destination: '/', permanent: true },
      { source: '/bilan-360.html', destination: '/', permanent: true },
      { source: '/horizon', destination: '/', permanent: true },
      { source: '/horizon.html', destination: '/', permanent: true },

      // Legacy Planner quiz / landing → new direct-checkout
      { source: '/quiz-expert', destination: '/acheter-planner', permanent: true },
      { source: '/quiz-expert.html', destination: '/acheter-planner', permanent: true },
      { source: '/expert-landing.html', destination: '/acheter-planner', permanent: true },

      // Laboratoire naming → Planner
      { source: '/laboratoire', destination: '/acheter-planner', permanent: true },

      // Legacy static homepage → React landing
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Current 2-SKU landing lives at /app/page.tsx (the root)
      // Keep the /bilan-360 shortcut pointing to the landing's pricing anchor
      { source: '/bilan-360', destination: '/#pricing' },

      // Planner portal entry point (post-purchase)
      { source: '/expert/landing', destination: '/expert' },

      // Legal pages served as static HTML
      { source: '/conditions', destination: '/conditions.html' },
      { source: '/confidentialite', destination: '/confidentialite.html' },
      { source: '/avis-legal', destination: '/avis-legal.html' },

      // Bilan quiz is the adaptive Wizard (/wizard) — no rewrite needed, /app/wizard handles it natively
    ];
  },
};

module.exports = nextConfig;
