"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";

/* ═══════════════════════════════════════════════════════════
   Palette — planner_v3 verbatim
   ═══════════════════════════════════════════════════════════ */
const CL_DARK = { bg: "#252d39", cd: "#2d3748", s2: "#344155", bd: "#4d5d75", bd2: "#677b98", tx: "#d7e2ef", al: "#f2f7fd", dm: "#bccbe0", ac: "#d2a764", bl: "#6aa6de", gn: "#48a66d", rd: "#cf6060", or: "#cf9850" };
// CL_LIGHT: bumped `dm` from #5d7085 (~3.5:1 on #f5f8fc) to #4a5a6e (~5.4:1) for WCAG AA compliance.
const CL_LIGHT = { bg: "#f5f8fc", cd: "#fcfdff", s2: "#eef3f9", bd: "#d6e0ec", bd2: "#c2cfde", tx: "#2a3442", al: "#172332", dm: "#4a5a6e", ac: "#8f6d2f", bl: "#3b79b6", gn: "#2f8a4a", rd: "#b93f43", or: "#b5772f" };
const acBg = (c: typeof CL_DARK) => c.ac + "18";
const acBgStrong = (c: typeof CL_DARK) => c.ac + "30";

/* ═══════════════════════════════════════════════════════════
   Bilingual copy
   ═══════════════════════════════════════════════════════════ */
const COPY = {
  fr: {
    navTools: "Outils gratuits",
    navGuides: "Guides",
    navPricing: "Prix",
    navFAQ: "FAQ",
    navCTA: "Obtenir mon Bilan",

    heroEyebrow: "Planification retraite · 13 provinces · Bilingue FR/EN · 2026",
    heroTitle: "Votre plan de retraite,",
    heroTitleEm: "testé contre l'adversité.",
    heroSub: "La rigueur d'un conseiller, le prix d'une sortie au restaurant. Bilan 360 modélise votre situation exacte — CPP/RRQ, PSV, REER, CELI, fiscalité fédérale + provinciale (toutes provinces), fractionnement, immobilier — contre des milliers de trajectoires de marché.",
    heroCtaPrimary: "Commencer mon Bilan",
    heroCtaSecondary: "Essayer les outils gratuits",
    heroTrust: "Fiscalité 2026 · 13 provinces et territoires · Bilingue FR/EN · Conformité AMF",

    statsTitle: "Pourquoi nos chiffres sont différents",
    stats: [
      ["2026", "année fiscale à jour (ARC + Revenu Québec)"],
      ["13", "provinces et territoires modélisés"],
      ["190+", "variables disponibles dans le Planner"],
      ["∞", "scénarios « et si ? » dans le Planner"],
    ],

    pricingTitle: "Choisissez votre outil",
    pricingSub: "Deux options claires. Paiement unique. Aucun renouvellement caché.",
    pricingBilanTitle: "Bilan 360",
    pricingBilanPrice: "29,99 $",
    pricingBilanBadge: "Rapport",
    pricingBilanFeatures: [
      "1 rapport HTML interactif bilingue",
      "Plan testé contre krach, inflation, stagflation, longévité",
      "Narration IA Opus (analyse de votre plan)",
      "Timing optimal RRQ/PSV (11 combinaisons testées)",
      "Graphiques interactifs + export PDF",
    ],
    pricingBilanNote: "Un rapport. Pas de régénération. C'est tout.",
    pricingBilanCta: "Choisir le Bilan",

    pricingPlannerTitle: "Planner + Rapports",
    pricingPlannerPrice: "69,99 $",
    pricingPlannerBadge: "Le plus complet",
    pricingPlannerFeatures: [
      "Simulateur complet (190+ variables)",
      "Wizard adaptatif (questions personnalisées selon votre profil)",
      "Monte Carlo configurable (1 000 à 10 000 scénarios)",
      "5 générations de rapport IA incluses",
      "Tests de stress et arbitrages illimités",
      "Export Excel + PDF",
      "Sauvegarde et comparaison de scénarios",
      "Accès à vie, aucun renouvellement",
    ],
    pricingPlannerNote: "Compteur de rapports restants visible dans le Planner. +4 générations supplémentaires : 19,99 $.",
    pricingPlannerCta: "Choisir le Planner",
    pricingFootnote: "Paiement unique. Aucun abonnement. Aucun renouvellement caché.",

    /* Comparison table */
    compareTitle: "Lequel vous convient ?",
    compareFeatureCol: "Ce que vous obtenez",
    compareRows: [
      ["Rapport Bilan (HTML interactif + IA)", "1 rapport", "5 rapports"],
      ["Plan testé contre krach, inflation, longévité", true, true],
      ["Score de préparation + analyse personnalisée", true, true],
      ["Timing optimal RRQ / PSV testé", true, true],
      ["Simulateur 190+ variables (accès à vie)", false, true],
      ["Monte Carlo configurable (1 000 à 10 000 scénarios)", "Non (fixe)", true],
      ["Wizard adaptatif (questions personnalisées)", "Version courte", true],
      ["Scénarios « et si ? » illimités", false, true],
      ["Export Excel complet", false, true],
      ["Sauvegarde et comparaison de scénarios", false, true],
      ["Saisie de données", "~10 min", "~15 min + libre"],
      ["Idéal pour", "« Donne-moi une réponse »", "« Je veux explorer, comparer, ré-évaluer »"],
    ],
    compareYes: "Oui",
    compareNo: "Non",

    /* Sticky bar */
    stickyPrefix: "Prêt ?",
    stickyCta: "Commencer mon Bilan — 29,99 $",
    stickyDismiss: "Fermer",

    /* Sample preview */
    sampleTitle: "Ce à quoi ressemble votre rapport",
    sampleSub: "Un exemple concret avant l'achat. Deux sections sont floutées — c'est ce que vous débloquez en commandant votre rapport.",
    sampleReportTitle: "Rapport Bilan 360",
    sampleReportCaption: "Couple, 58 ans, Ontario — rapport IA généré à partir d'un quiz type",
    sampleReportCta: "Voir l'exemple complet →",
    sampleReportHref: "/samples/bilan-exemple-fr.html",
    samplePlannerTitle: "Planner en action",
    samplePlannerCaption: "Simulateur 190+ variables, Wizard adaptatif, Monte Carlo configurable 1 000-10 000 scénarios",
    samplePlannerComingSoon: "Vidéo de démonstration bientôt disponible",
    sampleLabelBlurred: "Section débloquée après achat",

    /* Quebec callout */
    qcCalloutTitle: "Et le Québec, correctement modélisé",
    qcCalloutBody: "RRQ distincte de la CPP. Revenu Québec traité comme l'ARC (pas comme un réglage tardif). Paliers fiscaux combinés fédéral + provincial. Fractionnement T1032 + TP-1012.A. DPE Québec, CDC. Le Québec n'est pas bâti sur le modèle ontarien avec des exceptions — c'est son propre ensemble de règles, et on le traite comme tel.",

    whatYouGetTitle: "Ce que vous obtenez avec le Bilan 360",
    pillars: [
      {
        t: "Un chiffre qui répond à votre vraie question",
        b: "« Puis-je prendre ma retraite en sécurité ? » Score de 0 à 100 basé sur 5 000 scénarios, pas une moyenne optimiste. Si votre plan tient dans 85 % des crises simulées, c'est solide.",
      },
      {
        t: "Les décisions qui comptent, chiffrées",
        b: "Attendre 2 ans avant de prendre sa retraite vaut combien ? Reporter la RRQ à 70 ans vs 65 ? Meltdown REER ou non ? Chaque lever stratégique est testé sur votre plan, pas sur un cas générique.",
      },
      {
        t: "Narration IA qui explique votre situation",
        b: "Opus 4.6 analyse vos résultats et écrit un briefing personnalisé. Vos forces. Vos points d'attention. Les 3 actions qui changent le plus votre plan. Ton AMF-compliant, aucune promesse.",
      },
    ],

    freeTitle: "Déjà gratuit — aucun courriel requis",
    freeSub: "Jouez avec vos chiffres avant d'acheter. Tout est local, rien n'est envoyé.",
    freeTools: [
      { t: "Guide 101 — Les bases", b: "Valeur nette, budget, dette, REER vs CELI, crédit. 4 calculateurs.", href: "/guides/101", tag: "Gratuit" },
      { t: "Guide 201 — Optimiser la retraite", b: "Retrait optimal, récupération PSV, RRQ/RPC, fractionnement, frais. 5 calculateurs + bonus 301 (CCPC, Smith, meltdown).", href: "/guides/201", tag: "Gratuit" },
      { t: "Calculateur de dettes", b: "Avalanche vs snowball, consolidation, rembourser ou investir. Multi-provinces, couple, hypothèques.", href: "/outils/dettes", tag: "Gratuit" },
      { t: "Simulateur de décaissement", b: "Projection déterministe de votre portefeuille à la retraite. Durabilité, couverture garantie, taux de retrait.", href: "/outils/decaissement", tag: "Gratuit" },
    ],

    howTitle: "Comment ça marche",
    howSteps: [
      { n: "01", t: "Questionnaire adaptatif — 10 minutes", b: "Seulement les questions pertinentes à votre situation (couple, propriétés, CCPC, etc.). Un célibataire locataire ne répond pas aux mêmes questions qu'un couple avec immeubles. Personne d'autre ne voit vos données." },
      { n: "02", t: "Votre plan testé contre l'adversité", b: "Pas une moyenne optimiste — des milliers de trajectoires de marché incluant krach, inflation, stagflation et longévité extrême. Calculs côté serveur en ~30 secondes." },
      { n: "03", t: "Rapport HTML interactif + IA", b: "Score, chiffres clés, actions prioritaires, narration Opus. Interactif : testez des sliders (retraite ±2 ans, RRQ 60/65/70, dépenses). Lien valable à vie." },
    ],

    whyTitle: "Pourquoi BuildFi",
    whys: [
      {
        t: "Vraiment pan-canadien + bilingue",
        b: "CPP et RRQ modélisés distinctement. Paliers fiscaux combinés fédéral + provincial pour les 13 provinces et territoires. Revenu Québec (fractionnement, paliers) traité aussi rigoureusement que l'ARC. Interface FR/EN intégrale. La plupart des planificateurs consumer au Canada défaillent sur l'un ou l'autre — BuildFi sur aucun.",
      },
      {
        t: "Rigueur technique",
        b: "Moteur validé sur les règles fiscales 2026 complètes : fédéral + 13 provinces, ARC, Revenu Québec. CCPC, meltdown REER, manoeuvre Smith, récupération PSV/SRG. Les banques facturent 500 à 2 000 $ pour moins.",
      },
      {
        t: "AMF-compliant",
        b: "Langage conditionnel (« pourrait », « selon vos hypothèses »). Ton observationnel, jamais prescriptif. Aucune promesse de rendement. Les résultats sont des projections, pas des garanties.",
      },
      {
        t: "Aucun conflit d'intérêts",
        b: "Paiement unique. Aucune commission sur placements. Aucun lien avec une institution financière. Vos données restent sur votre appareil ou sont supprimées après livraison (voir politique).",
      },
    ],

    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Est-ce un conseil financier personnalisé ?",
        a: "Non. BuildFi fournit des projections basées sur vos données et des hypothèses de marché. Ce n'est pas un conseil personnalisé au sens de la Loi sur les valeurs mobilières. Pour une recommandation officielle, consultez un planificateur financier (Pl. Fin.) ou un représentant autorisé par l'AMF.",
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Oui. Les simulations tournent côté serveur BuildFi avec vos paramètres, le résultat est encrypté et livré via lien unique. Nous ne vendons ni ne partageons vos données. Vous pouvez demander la suppression à tout moment via votre portail.",
      },
      {
        q: "Que se passe-t-il si je vis plus de 95 ans ?",
        a: "Le moteur utilise la mortalité stochastique (CPM 2023) jusqu'à 105 ans. Votre rapport inclut un test de stress « longévité extrême » qui évalue votre plan si vous dépassez 95 ans.",
      },
      {
        q: "Pourquoi 29,99 $ au lieu de 5 $ ou 200 $ ?",
        a: "Les bilans équivalents chez les banques et firmes de planification coûtent 500 à 2 000 $. Les robos (Wealthsimple, etc.) ne font pas ce type de plan. BuildFi est conçu pour être accessible sans sacrifier la profondeur — 29,99 $ couvre les coûts serveur + IA + maintenance, pas pour s'enrichir sur un seul client.",
      },
      {
        q: "Différence entre Bilan et Planner ?",
        a: "Le Bilan 360 est un rapport fini : une photo interactive de votre situation, avec IA. Le Planner est un simulateur libre : vous jouez avec 190+ variables, sauvegardez des scénarios, testez « et si ? ». Le Bundle donne les deux — idéal si vous aimez explorer vous-même.",
      },
      {
        q: "Puis-je partager avec mon conjoint ou mon planificateur ?",
        a: "Oui. Le rapport est un lien HTML. Vous pouvez le partager par courriel, l'imprimer en PDF, ou l'envoyer à votre Pl. Fin. comme base de discussion.",
      },
    ],

    ctaBottomTitle: "Prêt à voir où vous en êtes ?",
    ctaBottomSub: "10 minutes pour répondre. Rapport livré en 30 secondes.",

    footerLegal: "Informations légales",
    footerPrivacy: "Confidentialité",
    footerTerms: "Conditions",
    footerNotice: "Avis légal",
    footerSupport: "Support",
    footerDisclaimer: "BuildFi fournit des outils éducatifs de planification financière. Les projections sont basées sur vos paramètres et des hypothèses de marché ; les résultats réels peuvent différer. Aucun élément ne constitue un conseil personnalisé au sens de la Loi sur les valeurs mobilières. Pour toute décision importante, consultez un professionnel certifié.",
    footerRights: "Tous droits réservés",
  },
  en: {
    navTools: "Free tools",
    navGuides: "Guides",
    navPricing: "Pricing",
    navFAQ: "FAQ",
    navCTA: "Get my Bilan",

    heroEyebrow: "Retirement planning · 13 provinces · Bilingual EN/FR · 2026",
    heroTitle: "Your retirement plan,",
    heroTitleEm: "stress-tested.",
    heroSub: "The rigor of an advisor, the price of a dinner out. Bilan 360 models your exact situation — CPP/QPP, OAS, RRSP, TFSA, federal + provincial tax (all provinces), splitting, real estate — against thousands of market paths.",
    heroCtaPrimary: "Start my Bilan",
    heroCtaSecondary: "Try the free tools",
    heroTrust: "2026 tax year · 13 provinces & territories · Bilingual EN/FR · AMF-compliant",

    statsTitle: "Why our numbers are different",
    stats: [
      ["2026", "tax year current (CRA + Revenu Québec)"],
      ["13", "provinces & territories modeled"],
      ["190+", "variables available in the Planner"],
      ["∞", "\"what-if?\" scenarios in the Planner"],
    ],

    pricingTitle: "Choose your tool",
    pricingSub: "Two clear options. One-time payment. No hidden renewals.",
    pricingBilanTitle: "Bilan 360",
    pricingBilanPrice: "$29.99",
    pricingBilanBadge: "Report",
    pricingBilanFeatures: [
      "1 interactive bilingual HTML report",
      "Plan stress-tested against crash, inflation, stagflation, longevity",
      "Opus AI narration (analyzes your plan)",
      "Optimal CPP/OAS timing (11 combos tested)",
      "Interactive charts + PDF export",
    ],
    pricingBilanNote: "One report. No regenerations. That's it.",
    pricingBilanCta: "Choose Bilan",

    pricingPlannerTitle: "Planner + Reports",
    pricingPlannerPrice: "$69.99",
    pricingPlannerBadge: "Most complete",
    pricingPlannerFeatures: [
      "Full simulator (190+ variables)",
      "Adaptive Wizard (questions tailored to your profile)",
      "Configurable Monte Carlo (1,000 to 10,000 scenarios)",
      "5 AI report generations included",
      "Unlimited stress tests & tradeoffs",
      "Excel + PDF export",
      "Scenario save & compare",
      "Lifetime access, no renewal",
    ],
    pricingPlannerNote: "Remaining-reports counter visible in the Planner. +4 extra generations: $19.99.",
    pricingPlannerCta: "Choose Planner",
    pricingFootnote: "One-time payment. No subscription. No hidden renewal.",

    compareTitle: "Which one fits you?",
    compareFeatureCol: "What you get",
    compareRows: [
      ["Bilan report (Interactive HTML + AI)", "1 report", "5 reports"],
      ["Plan stress-tested (crash, inflation, longevity)", true, true],
      ["Readiness score + personalized analysis", true, true],
      ["Optimal QPP / OAS timing tested", true, true],
      ["Simulator with 190+ variables (lifetime)", false, true],
      ["Configurable Monte Carlo (1K to 10K scenarios)", "No (fixed)", true],
      ["Adaptive Wizard (tailored questions)", "Short version", true],
      ["Unlimited \"what if?\" scenarios", false, true],
      ["Full Excel export", false, true],
      ["Scenario save & compare", false, true],
      ["Data entry", "~10 min", "~15 min + open"],
      ["Best for", "\"Give me an answer\"", "\"I want to explore, compare, revise\""],
    ],
    compareYes: "Yes",
    compareNo: "No",

    stickyPrefix: "Ready?",
    stickyCta: "Start my Bilan — $29.99",
    stickyDismiss: "Dismiss",

    sampleTitle: "What your report actually looks like",
    sampleSub: "A concrete example before you buy. Two sections are blurred — that's what you unlock when you order.",
    sampleReportTitle: "Bilan 360 report",
    sampleReportCaption: "Couple, 58, Ontario — AI report generated from a sample quiz",
    sampleReportCta: "See the full example →",
    sampleReportHref: "/samples/bilan-sample-en.html",
    samplePlannerTitle: "Planner in action",
    samplePlannerCaption: "190+ variables, adaptive Wizard, configurable Monte Carlo 1,000-10,000 scenarios",
    samplePlannerComingSoon: "Demo video coming soon",
    sampleLabelBlurred: "Unlocked after purchase",

    qcCalloutTitle: "And Quebec, done right",
    qcCalloutBody: "QPP distinct from CPP. Revenu Québec treated with the same rigor as CRA (not as an afterthought). Combined federal + provincial brackets. T1032 + TP-1012.A pension splitting. Quebec SBD, CDA. Quebec isn't the Ontario model with exceptions bolted on — it's its own tax code, and we treat it that way.",

    whatYouGetTitle: "What you get with Bilan 360",
    pillars: [
      {
        t: "A number that answers your real question",
        b: "\"Can I safely retire?\" A 0-100 score based on 5,000 scenarios, not an optimistic average. If your plan survives 85% of simulated crises, it's solid.",
      },
      {
        t: "The decisions that matter, quantified",
        b: "How much is waiting 2 more years to retire worth? Defer CPP to 70 vs 65? Meltdown RRSP or not? Every strategic lever is tested on YOUR plan, not a generic case.",
      },
      {
        t: "AI narration that explains your situation",
        b: "Opus 4.6 analyzes your results and writes a personalized briefing. Your strengths. Your attention points. The 3 actions that change your plan most. AMF-compliant tone, no promises.",
      },
    ],

    freeTitle: "Already free — no email required",
    freeSub: "Play with your numbers before buying. Everything runs locally, nothing is sent.",
    freeTools: [
      { t: "Guide 101 — The basics", b: "Net worth, budget, debt, RRSP vs TFSA, credit. 4 calculators.", href: "/guides/101?lang=en", tag: "Free" },
      { t: "Guide 201 — Optimize retirement", b: "Optimal withdrawal, OAS clawback, QPP/CPP timing, splitting, fees. 5 calculators + bonus 301 (CCPC, Smith, meltdown).", href: "/guides/201?lang=en", tag: "Free" },
      { t: "Debt calculator", b: "Avalanche vs snowball, consolidation, repay or invest. Multi-province, couple, mortgages.", href: "/outils/dettes?lang=en", tag: "Free" },
      { t: "Decumulation simulator", b: "Deterministic projection of your retirement portfolio. Sustainability, guaranteed coverage, withdrawal rate.", href: "/outils/decaissement?lang=en", tag: "Free" },
    ],

    howTitle: "How it works",
    howSteps: [
      { n: "01", t: "Adaptive questionnaire — 10 minutes", b: "Only the questions relevant to YOUR situation (couple, properties, CCPC, etc.). A single renter doesn't answer the same questions as a couple with rental properties. Nobody else sees your data." },
      { n: "02", t: "Your plan stress-tested", b: "Not an optimistic average — thousands of market paths including crashes, inflation, stagflation, and extreme longevity. Server-side compute in ~30 seconds." },
      { n: "03", t: "Interactive HTML report + AI", b: "Score, key numbers, priority actions, Opus narration. Interactive: test sliders (retire ±2 years, CPP 60/65/70, spending). Link valid for life." },
    ],

    whyTitle: "Why BuildFi",
    whys: [
      {
        t: "Truly pan-Canadian + bilingual",
        b: "CPP and QPP modeled separately. Combined federal + provincial tax brackets for all 13 provinces and territories. Revenu Québec (splitting, brackets) handled with the same rigor as CRA. Full EN/FR interface. Most consumer planners in Canada fail on one or the other — BuildFi fails on neither.",
      },
      {
        t: "Technical rigor",
        b: "Engine validated against full 2026 tax rules: federal + 13 provinces, CRA, Revenu Québec. CCPC, RRSP meltdown, Smith Manoeuvre, OAS/GIS clawback. Banks charge $500-2,000 for less.",
      },
      {
        t: "AMF-compliant",
        b: "Conditional language (\"could\", \"based on your assumptions\"). Observational tone, never prescriptive. No return promises. Results are projections, not guarantees.",
      },
      {
        t: "Zero conflicts of interest",
        b: "One-time payment. No investment commissions. No ties to any financial institution. Your data stays on your device or is deleted after delivery (see policy).",
      },
    ],

    faqTitle: "Frequently asked",
    faq: [
      {
        q: "Is this personalized financial advice?",
        a: "No. BuildFi provides projections based on your inputs and market assumptions. This is not personalized advice under securities law. For an official recommendation, consult a certified financial planner (CFP) or an AMF-authorized representative.",
      },
      {
        q: "Is my data protected?",
        a: "Yes. Simulations run on BuildFi servers with your parameters, the result is encrypted and delivered via a unique link. We do not sell or share your data. You can request deletion at any time via your portal.",
      },
      {
        q: "What if I live past 95?",
        a: "The engine uses stochastic mortality (CPM 2023) up to 105. Your report includes an \"extreme longevity\" stress test evaluating your plan beyond 95.",
      },
      {
        q: "Why $29.99 instead of $5 or $200?",
        a: "Equivalent assessments at banks and planning firms cost $500-2,000. Robos (Wealthsimple, etc.) don't do this type of plan. BuildFi is designed to be accessible without sacrificing depth — $29.99 covers server + AI + maintenance, not to get rich off one customer.",
      },
      {
        q: "Difference between Bilan and Planner?",
        a: "Bilan 360 is a finished report: an interactive snapshot of your situation with AI. The Planner is a free simulator: you play with 190+ variables, save scenarios, test \"what if?\". The Bundle gives you both — ideal if you like exploring yourself.",
      },
      {
        q: "Can I share with my spouse or planner?",
        a: "Yes. The report is an HTML link. You can email it, print it to PDF, or send it to your CFP as a starting point for discussion.",
      },
    ],

    ctaBottomTitle: "Ready to see where you stand?",
    ctaBottomSub: "10 minutes to answer. Report delivered in 30 seconds. 14-day guarantee.",

    footerLegal: "Legal",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerNotice: "Legal notice",
    footerSupport: "Support",
    footerDisclaimer: "BuildFi provides educational financial planning tools. Projections are based on your inputs and market assumptions; actual results may differ. Nothing constitutes personalized advice under securities law. For important decisions, consult a certified professional.",
    footerRights: "All rights reserved",
  },
} as const;

/* ═══════════════════════════════════════════════════════════
   Section components
   ═══════════════════════════════════════════════════════════ */
function BuildFiLogo({ cl, theme, size = "md" }: { cl: any; theme: "dark" | "light"; size?: "sm" | "md" | "lg" }) {
  const isDark = theme === "dark";
  const blockFill = isDark ? "#faf8f4" : "#1a2744";
  const midOpacity = isDark ? 0.4 : 0.5;
  const textFill = isDark ? "#faf8f4" : "#1a2744";
  const goldFill = cl.ac;
  const s = size === "lg" ? 1.4 : size === "md" ? 1.0 : 0.7;
  const w = Math.round(220 * s);
  const h = Math.round(48 * s);
  return (
    <svg width={w} height={h} viewBox="0 0 220 48" style={{ display: "block" }} aria-label="BuildFi">
      <g>
        <rect x="0" y="32" width="28" height="8" rx="2" fill={blockFill} />
        <rect x="4" y="22" width="26" height="8" rx="2" fill={blockFill} opacity={midOpacity} />
        <rect x="8" y="12" width="24" height="8" rx="2" fill={goldFill} />
      </g>
      <text x="40" y="38" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="34" fontWeight={700} letterSpacing="-0.5">
        <tspan fill={textFill}>build</tspan>
        <tspan fill={goldFill}>fi</tspan>
      </text>
    </svg>
  );
}

function Nav({ cl, lang, setLang, theme, toggleTheme, t }: any) {
  return (
    <header style={{ background: cl.cd, borderBottom: `1px solid ${cl.bd}`, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <a href="#top" style={{ textDecoration: "none", display: "flex", alignItems: "center" }} aria-label="BuildFi home">
          <BuildFiLogo cl={cl} theme={theme} size="md" />
        </a>
        <nav style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 13 }}>
          <a href="#tools" style={{ color: cl.dm, textDecoration: "none", fontWeight: 600 }}>{t.navTools}</a>
          <a href="#pricing" style={{ color: cl.dm, textDecoration: "none", fontWeight: 600 }}>{t.navPricing}</a>
          <a href="#faq" style={{ color: cl.dm, textDecoration: "none", fontWeight: 600 }}>{t.navFAQ}</a>
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={toggleTheme}
            title={lang === "fr" ? "Changer le thème" : "Toggle theme"}
            aria-label={lang === "fr" ? "Changer le thème" : "Toggle theme"}
            style={{ background: cl.s2, border: `1px solid ${cl.bd2}`, color: cl.al, padding: "7px 12px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: 700, lineHeight: 1 }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div style={{ display: "flex", gap: 4, background: cl.s2, borderRadius: 8, padding: 3 }}>
            <button onClick={() => setLang("fr")} style={{ fontSize: 12, fontWeight: 700, color: lang === "fr" ? cl.al : cl.dm, background: lang === "fr" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>FR</button>
            <button onClick={() => setLang("en")} style={{ fontSize: 12, fontWeight: 700, color: lang === "en" ? cl.al : cl.dm, background: lang === "en" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>EN</button>
          </div>
          <a href="#pricing" style={{ background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>{t.navCTA}</a>
        </div>
      </div>
    </header>
  );
}

function Hero({ cl, theme, t }: any) {
  return (
    <section id="top" style={{ background: cl.cd, padding: "72px 20px 88px", textAlign: "center", borderBottom: `1px solid ${cl.bd}`, position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center top, ${cl.ac}15, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: cl.ac, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 16 }}>{t.heroEyebrow}</div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, color: cl.al, margin: "0 0 14px", lineHeight: 1.08, letterSpacing: -1 }}>
          {t.heroTitle}<br />
          <span style={{ color: cl.ac, fontStyle: "italic" }}>{t.heroTitleEm}</span>
        </h1>
        <p style={{ fontSize: "clamp(15px, 1.8vw, 18px)", color: cl.dm, maxWidth: 680, margin: "0 auto 32px", lineHeight: 1.6 }}>{t.heroSub}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <a href="#pricing" style={{ background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "14px 26px", borderRadius: 10, fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: `0 4px 16px ${cl.ac}40` }}>{t.heroCtaPrimary} →</a>
          <a href="#tools" style={{ background: "transparent", color: cl.tx, padding: "14px 26px", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none", border: `1px solid ${cl.bd}` }}>{t.heroCtaSecondary}</a>
        </div>
        <div style={{ fontSize: 12, color: cl.dm, opacity: 0.75 }}>{t.heroTrust}</div>
      </div>
    </section>
  );
}

function StatsBar({ cl, t }: any) {
  return (
    <section style={{ background: cl.bg, padding: "40px 20px", borderBottom: `1px solid ${cl.bd}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>{t.statsTitle}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 18 }}>
          {t.stats.map((s: any, i: number) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: cl.ac, lineHeight: 1, letterSpacing: -1 }}>{s[0]}</div>
              <div style={{ fontSize: 12, color: cl.dm, marginTop: 6 }}>{s[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ cl, theme, t, lang }: any) {
  const CardBase: React.CSSProperties = {
    background: cl.cd,
    border: `1px solid ${cl.bd}`,
    borderRadius: 16,
    padding: 26,
    display: "flex",
    flexDirection: "column",
    position: "relative",
  };
  const bullet = (s: string, key: number) => (
    <li key={key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: cl.tx, marginBottom: 8, lineHeight: 1.5 }}>
      <span style={{ color: cl.gn, fontWeight: 800, marginTop: -1 }}>✓</span>
      <span>{s}</span>
    </li>
  );
  return (
    <section id="pricing" style={{ background: cl.bg, padding: "72px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, color: cl.al, margin: "0 0 10px", letterSpacing: -0.5 }}>{t.pricingTitle}</h2>
          <div style={{ fontSize: 14, color: cl.dm }}>{t.pricingSub}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, alignItems: "stretch", maxWidth: 760, margin: "0 auto" }}>
          {/* Bilan */}
          <div style={CardBase}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t.pricingBilanBadge}</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: cl.al, margin: "0 0 6px" }}>{t.pricingBilanTitle}</h3>
            <div style={{ fontSize: 40, fontWeight: 900, color: cl.al, letterSpacing: -1, marginBottom: 4 }}>{t.pricingBilanPrice}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: cl.dm, fontStyle: "italic", marginBottom: 18 }}>{t.pricingBilanNote}</div>
            <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", flex: 1 }}>
              {t.pricingBilanFeatures.map(bullet)}
            </ul>
            <a href={`/wizard${lang === "en" ? "?lang=en" : ""}`} onClick={() => trackEvent(EVENTS.LANDING_CTA_CLICKED, { cta: "bilan" })} style={{ display: "block", textAlign: "center", background: "transparent", color: cl.ac, border: `1.5px solid ${cl.ac}`, padding: "13px 18px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>{t.pricingBilanCta} →</a>
          </div>
          {/* Planner (featured) */}
          <div style={{ ...CardBase, border: `2px solid ${cl.ac}`, background: theme === "dark" ? `linear-gradient(180deg, ${cl.cd}, ${cl.s2})` : cl.cd, boxShadow: `0 12px 40px ${cl.ac}20` }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 999, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
              {t.pricingPlannerBadge}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Planner</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: cl.al, margin: "0 0 6px" }}>{t.pricingPlannerTitle}</h3>
            <div style={{ fontSize: 40, fontWeight: 900, color: cl.ac, letterSpacing: -1, marginBottom: 4 }}>{t.pricingPlannerPrice}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: cl.dm, fontStyle: "italic", marginBottom: 18 }}>{t.pricingPlannerNote}</div>
            <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", flex: 1 }}>
              {t.pricingPlannerFeatures.map(bullet)}
            </ul>
            <a href={`/acheter-planner${lang === "en" ? "?lang=en" : ""}`} onClick={() => trackEvent(EVENTS.LANDING_CTA_CLICKED, { cta: "planner" })} style={{ display: "block", textAlign: "center", background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "14px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: `0 4px 16px ${cl.ac}40` }}>{t.pricingPlannerCta} →</a>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: cl.dm, marginTop: 20, opacity: 0.8 }}>{t.pricingFootnote}</div>
      </div>
    </section>
  );
}

function ComparisonTable({ cl, t }: any) {
  const Yes = () => <span style={{ color: cl.gn, fontWeight: 800, fontSize: 16 }}>✓</span>;
  const No = () => <span style={{ color: cl.dm, fontSize: 16, opacity: 0.5 }}>—</span>;
  const cell = (v: boolean | string) => {
    if (v === true) return <Yes />;
    if (v === false) return <No />;
    return <span style={{ fontSize: 12, color: cl.tx, fontStyle: "italic" }}>{v}</span>;
  };
  return (
    <section style={{ background: cl.bg, padding: "60px 20px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: cl.al, margin: "0 0 24px", textAlign: "center", letterSpacing: -0.4 }}>{t.compareTitle}</h2>
        <div style={{ overflowX: "auto", border: `1px solid ${cl.bd}`, borderRadius: 14, background: cl.cd }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 13 }}>
            <thead>
              <tr style={{ background: cl.s2, borderBottom: `1px solid ${cl.bd}` }}>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 700, color: cl.dm, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>{t.compareFeatureCol}</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: cl.al }}>
                  {t.pricingBilanTitle}<br /><span style={{ fontSize: 13, color: cl.dm, fontWeight: 700 }}>{t.pricingBilanPrice}</span>
                </th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: cl.ac, background: acBg(cl) }}>
                  {t.pricingPlannerTitle}<br /><span style={{ fontSize: 13, color: cl.ac, fontWeight: 700 }}>{t.pricingPlannerPrice}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {t.compareRows.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: i < t.compareRows.length - 1 ? `1px solid ${cl.bd}` : "none" }}>
                  <td style={{ padding: "12px 16px", color: cl.tx, fontWeight: 500 }}>{row[0]}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{cell(row[1])}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", background: acBg(cl) }}>{cell(row[2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function QuebecCallout({ cl, t }: any) {
  return (
    <section style={{ background: cl.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", background: `linear-gradient(135deg, ${cl.ac}10, ${cl.ac}04)`, border: `2px solid ${cl.ac}`, borderRadius: 16, padding: "28px 32px" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div aria-hidden style={{ fontSize: 44, lineHeight: 1 }}>⚜</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: cl.al, margin: "0 0 8px", letterSpacing: -0.3 }}>{t.qcCalloutTitle}</h3>
            <p style={{ fontSize: 14, color: cl.tx, lineHeight: 1.6, margin: 0 }}>{t.qcCalloutBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyBar({ cl, theme, t, lang }: any) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (dismissed || !visible) return null;
  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: cl.cd, border: `1px solid ${cl.ac}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", gap: 12, maxWidth: "calc(100vw - 32px)", flexWrap: "wrap", justifyContent: "center" }}>
      <span style={{ fontSize: 13, color: cl.tx, fontWeight: 600 }}>{t.stickyPrefix}</span>
      <a href={`/wizard${lang === "en" ? "?lang=en" : ""}`} style={{ background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>{t.stickyCta} →</a>
      <button onClick={() => setDismissed(true)} aria-label={t.stickyDismiss} style={{ background: "transparent", border: "none", color: cl.dm, fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
    </div>
  );
}

function SamplePreview({ cl, theme, t, lang }: any) {
  // Two cards: real sample report (iframe thumbnail + CTA) + Planner demo placeholder
  const cardBase: React.CSSProperties = {
    background: cl.cd,
    border: `1px solid ${cl.bd}`,
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };
  return (
    <section style={{ background: cl.bg, padding: "60px 20px", borderTop: `1px solid ${cl.bd}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 10px", letterSpacing: -0.5 }}>{t.sampleTitle}</h2>
          <div style={{ fontSize: 14, color: cl.dm, maxWidth: 620, margin: "0 auto" }}>{t.sampleSub}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          {/* Sample report card — iframe preview, blurred overlay on portions */}
          <div style={cardBase}>
            <div style={{ position: "relative", height: 280, background: cl.s2, overflow: "hidden" }}>
              <iframe
                src={t.sampleReportHref}
                title={t.sampleReportTitle}
                style={{ width: "200%", height: 560, border: "none", transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none", background: "#fff" }}
                sandbox="allow-scripts"
                loading="lazy"
              />
              {/* Blurred-section mask — covers bottom third to simulate "unlocks after purchase" */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", background: `linear-gradient(to bottom, transparent, ${cl.cd}80 30%, ${cl.cd}ee 70%)`, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
                <div style={{ background: cl.ac + "22", border: `1px solid ${cl.ac}`, color: cl.ac, fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.7 }}>🔒 {t.sampleLabelBlurred}</div>
              </div>
            </div>
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t.sampleReportTitle}</div>
              <div style={{ fontSize: 13, color: cl.tx, lineHeight: 1.5, marginBottom: 12 }}>{t.sampleReportCaption}</div>
              <a href={t.sampleReportHref} target="_blank" rel="noopener" style={{ color: cl.ac, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t.sampleReportCta}</a>
            </div>
          </div>

          {/* Planner demo placeholder */}
          <div style={cardBase}>
            <div style={{ position: "relative", height: 280, background: `linear-gradient(135deg, ${cl.cd}, ${cl.s2})`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${cl.bd}` }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
                <circle cx="32" cy="32" r="30" stroke={cl.ac} strokeWidth="2" opacity="0.35" />
                <path d="M26 22 L44 32 L26 42 Z" fill={cl.ac} />
              </svg>
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, textAlign: "center", fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 0.8 }}>{t.samplePlannerComingSoon}</div>
            </div>
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t.samplePlannerTitle}</div>
              <div style={{ fontSize: 13, color: cl.tx, lineHeight: 1.5 }}>{t.samplePlannerCaption}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarsSection({ cl, t }: any) {
  return (
    <section style={{ background: cl.cd, padding: "72px 20px", borderTop: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 36px", textAlign: "center", letterSpacing: -0.5 }}>{t.whatYouGetTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
          {t.pillars.map((p: any, i: number) => (
            <div key={i} style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: cl.ac, lineHeight: 1, marginBottom: 10 }}>0{i + 1}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: cl.al, margin: "0 0 8px", lineHeight: 1.3 }}>{p.t}</h3>
              <p style={{ fontSize: 14, color: cl.tx, lineHeight: 1.55, margin: 0 }}>{p.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreeTools({ cl, t }: any) {
  return (
    <section id="tools" style={{ background: cl.bg, padding: "72px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 10px", letterSpacing: -0.5 }}>{t.freeTitle}</h2>
          <div style={{ fontSize: 14, color: cl.dm }}>{t.freeSub}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {t.freeTools.map((f: any, i: number) => (
            <a key={i} href={f.href} style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 8, transition: "transform .15s, border-color .15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: cl.gn, background: cl.gn + "18", padding: "3px 8px", borderRadius: 999, letterSpacing: 0.4 }}>{f.tag}</span>
                <span style={{ color: cl.ac, fontSize: 16 }}>→</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: cl.al, margin: 0, lineHeight: 1.3 }}>{f.t}</h3>
              <p style={{ fontSize: 13, color: cl.dm, margin: 0, lineHeight: 1.5 }}>{f.b}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ cl, t }: any) {
  return (
    <section style={{ background: cl.cd, padding: "72px 20px", borderTop: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 36px", textAlign: "center", letterSpacing: -0.5 }}>{t.howTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {t.howSteps.map((s: any, i: number) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: cl.ac, lineHeight: 1, letterSpacing: -2, opacity: 0.35, marginBottom: 4 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: cl.al, margin: "0 0 8px" }}>{s.t}</h3>
              <p style={{ fontSize: 14, color: cl.tx, lineHeight: 1.55, margin: 0 }}>{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyBuildFi({ cl, t }: any) {
  return (
    <section style={{ background: cl.bg, padding: "72px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 36px", textAlign: "center", letterSpacing: -0.5 }}>{t.whyTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {t.whys.map((w: any, i: number) => (
            <div key={i} style={{ borderLeft: `3px solid ${cl.ac}`, padding: "4px 18px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: cl.al, margin: "0 0 8px" }}>{w.t}</h3>
              <p style={{ fontSize: 14, color: cl.tx, lineHeight: 1.55, margin: 0 }}>{w.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ({ cl, t }: any) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" style={{ background: cl.cd, padding: "72px 20px", borderTop: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}` }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: cl.al, margin: "0 0 24px", textAlign: "center", letterSpacing: -0.5 }}>{t.faqTitle}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {t.faq.map((f: any, i: number) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 10, overflow: "hidden" }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{ width: "100%", padding: "14px 18px", background: "transparent", border: "none", color: cl.al, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{f.q}</span>
                  <span style={{ color: cl.ac, fontSize: 18, transform: isOpen ? "rotate(45deg)" : "rotate(0)", transition: "transform .15s", flexShrink: 0 }}>+</span>
                </button>
                {isOpen ? (
                  <div style={{ padding: "0 18px 16px", fontSize: 14, color: cl.tx, lineHeight: 1.6 }}>{f.a}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTABottom({ cl, theme, t, lang }: any) {
  return (
    <section style={{ background: cl.bg, padding: "72px 20px", textAlign: "center" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.2vw, 36px)", fontWeight: 900, color: cl.al, margin: "0 0 12px", letterSpacing: -0.5 }}>{t.ctaBottomTitle}</h2>
        <div style={{ fontSize: 15, color: cl.dm, marginBottom: 28 }}>{t.ctaBottomSub}</div>
        <a href="#pricing" style={{ background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 900, textDecoration: "none", boxShadow: `0 6px 20px ${cl.ac}40`, display: "inline-block" }}>{lang === "fr" ? "Voir les offres" : "See pricing"} →</a>
      </div>
    </section>
  );
}

function Footer({ cl, lang, t }: any) {
  return (
    <footer style={{ background: cl.cd, borderTop: `1px solid ${cl.bd}`, padding: "40px 20px 28px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ color: cl.ac, fontWeight: 900, fontSize: 20, letterSpacing: -0.5, marginBottom: 8 }}>BuildFi</div>
            <div style={{ fontSize: 12, color: cl.dm, lineHeight: 1.6 }}>{lang === "fr" ? "Planification retraite canadienne bilingue. Québec-first." : "Bilingual Canadian retirement planning. Quebec-first."}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{t.footerLegal}</div>
            <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <a href="/confidentialite" style={{ color: cl.tx, textDecoration: "none" }}>{t.footerPrivacy}</a>
              <a href="/conditions" style={{ color: cl.tx, textDecoration: "none" }}>{t.footerTerms}</a>
              <a href="/avis-legal" style={{ color: cl.tx, textDecoration: "none" }}>{t.footerNotice}</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{t.navTools}</div>
            <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <a href={`/guides/101${lang === "en" ? "?lang=en" : ""}`} style={{ color: cl.tx, textDecoration: "none" }}>Guide 101</a>
              <a href={`/guides/201${lang === "en" ? "?lang=en" : ""}`} style={{ color: cl.tx, textDecoration: "none" }}>Guide 201</a>
              <a href={`/outils/dettes${lang === "en" ? "?lang=en" : ""}`} style={{ color: cl.tx, textDecoration: "none" }}>{lang === "fr" ? "Calculateur de dettes" : "Debt calculator"}</a>
              <a href={`/outils/decaissement${lang === "en" ? "?lang=en" : ""}`} style={{ color: cl.tx, textDecoration: "none" }}>{lang === "fr" ? "Simulateur de décaissement" : "Decumulation simulator"}</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{t.footerSupport}</div>
            <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <a href="mailto:support@buildfi.ca" style={{ color: cl.tx, textDecoration: "none" }}>support@buildfi.ca</a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${cl.bd}`, paddingTop: 20, fontSize: 11, color: cl.dm, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 10, maxWidth: 900 }}>{t.footerDisclaimer}</div>
          <div>© {new Date().getFullYear()} BuildFi · {t.footerRights} · <a href="https://buildfi.ca" style={{ color: cl.dm }}>buildfi.ca</a></div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
function HomeInner() {
  const params = useSearchParams();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem("buildfi_theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
      else {
        const nav = typeof navigator !== "undefined" ? (navigator.language || "").toLowerCase() : "";
        if (nav && !nav.startsWith("fr")) setLang("en");
      }
    } catch {}
  }, [params]);
  useEffect(() => { try { localStorage.setItem("buildfi_theme", theme); } catch {} }, [theme]);

  // Default to light palette. Switch to dark only when user explicitly opted in AFTER mount.
  const cl = mounted && theme === "dark" ? CL_DARK : CL_LIGHT;
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div suppressHydrationWarning style={{ background: cl.bg, color: cl.tx, fontFamily: '"Avenir Next","Segoe UI",Arial,sans-serif', minHeight: "100vh" }}>
      <Nav cl={cl} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} t={t} />
      <Hero cl={cl} theme={theme} t={t} />
      <StatsBar cl={cl} t={t} />
      <FreeTools cl={cl} t={t} />
      <SamplePreview cl={cl} theme={theme} t={t} lang={lang} />
      <PricingSection cl={cl} theme={theme} t={t} lang={lang} />
      <ComparisonTable cl={cl} t={t} />
      <PillarsSection cl={cl} t={t} />
      <QuebecCallout cl={cl} t={t} />
      <HowItWorks cl={cl} t={t} />
      <WhyBuildFi cl={cl} t={t} />
      <FAQ cl={cl} t={t} />
      <CTABottom cl={cl} theme={theme} t={t} lang={lang} />
      <Footer cl={cl} lang={lang} t={t} />
      <StickyBar cl={cl} theme={theme} t={t} lang={lang} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: CL_DARK.bg }} />}>
      <HomeInner />
    </Suspense>
  );
}
