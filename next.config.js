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

      // Legacy static homepage → static landing (served at root via rewrite below)
      { source: '/index.html', destination: '/', permanent: true },

      // Pricing-section shortcut. Next drops redirects whose destination is a
      // bare hash, so send it to the landing root (pricing is one scroll down).
      { source: '/bilan-360', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // 2-SKU landing is the static bilingual page at public/index.html
      // (v6 design + FR/EN tables in public/landing-i18n.js). Served at root.
      // The previous React landing is preserved at /old-landing.
      { source: '/', destination: '/index.html' },

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
