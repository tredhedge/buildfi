"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEditorialPalette } from "@/lib/design/editorial.tokens";

/* Palette: shared Editorial system. See docs/DESIGN-SYSTEM.md. */
const CL = getEditorialPalette();

const fCAD = (v: number, fr: boolean) =>
  new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  })
    .format(Math.round(v))
    .replace(/[\u00A0\u202F]/g, " ");

/* ═══════════════════════════════════════════════════════
   Copy — bilingual strings centralized
   ═══════════════════════════════════════════════════════ */
const COPY = {
  fr: {
    eyebrow: "Guide 101",
    title: "Les bases de vos finances",
    tagline: "Tout ce qu'un Canadien devrait savoir — en langage clair.",
    intro:
      "Budget. Dette. Épargne. Retraite. Dans le bon ordre. Ce guide vous donne les outils pour décider par vous-même. Sans jargon. Sans argumentaire de vente caché. Juste ce qu'il faut savoir, avec des exemples chiffrés.",
    langSwitch: "English",
    pdfLabel: "Télécharger le PDF",
    pdfHref: "/guide-101-les-bases-de-vos-finances.pdf",
    tocTitle: "Dans ce guide",
    toc: [
      { n: 1, t: "Votre portrait financier", s: "Savoir où vous en êtes" },
      { n: 2, t: "Le budget", s: "Votre plan de match" },
      { n: 3, t: "La dette", s: "Le mur avant l'épargne" },
      { n: 4, t: "Le crédit", s: "Le score invisible" },
      { n: 5, t: "L'épargne", s: "La cascade pour vos dollars" },
      { n: 6, t: "Vos comptes expliqués", s: "REER, CELI, CELIAPP" },
      { n: 7, t: "Le gouvernement et vous", s: "RRQ, PSV, SRG" },
      { n: 8, t: "Protéger votre plan", s: "Les assurances essentielles" },
      { n: 9, t: "Votre prochaine étape", s: "5 actions concrètes" },
    ],
    whereStart: "Où commencer ?",
    whereStartBody:
      "Dette à taux élevé ? → Chapitre 3. Déjà en épargne ? → Chapitre 5. Près de la retraite ? → Chapitres 6-7. Partir de zéro ? → Lisez en ordre.",
    disclaimer:
      "Ce guide est fourni à des fins d'information et d'éducation seulement. Il ne constitue pas un conseil financier, fiscal, juridique ou de placement personnalisé. Les stratégies et exemples présentés sont de nature générale. Consultez un professionnel certifié avant toute décision.",
    quote:
      "« Seulement 31 % des Canadiens ont un plan financier écrit. Ce guide vous donne les outils pour faire partie de ce groupe. »",
    quoteAttr: "— FP Canada, Financial Planning Survey, 2023",

    ch1Title: "Votre portrait financier",
    ch1Sub: "Savoir où vous en êtes — en 5 minutes",
    ch1Body:
      "Avant de parler de budget ou de retraite, une question : où en êtes-vous aujourd'hui ? Pas en termes de salaire — en termes de valeur nette. Tout ce que vous possédez, moins tout ce que vous devez. C'est le seul chiffre qui mesure votre véritable santé financière.",
    ch1Tool: "Calculateur — votre valeur nette",
    ch1Note:
      "Une valeur nette négative en début de carrière (prêts étudiants, hypothèque récente) est normale. Ce qui compte : la tendance. Monte-t-elle chaque année ?",

    ch2Title: "Le budget — votre plan de match",
    ch2Sub: "Pas une punition. Un outil de liberté.",
    ch2Body:
      "Le mot « budget » n'emballe personne. Mais un budget n'est pas une liste de restrictions — c'est un plan qui vous permet de choisir consciemment où va votre argent. La méthode la plus simple : diviser votre revenu net en trois catégories.",
    ch2Tool: "Calculateur — répartition 50/30/20",
    ch2Caution:
      "ATTENTION — La fuite silencieuse : Le Canadien moyen paie 100 à 200 $/mois en abonnements récurrents (streaming, gym, apps, cloud). C'est 1 200 à 2 400 $/an — l'équivalent de vacances ou d'une année de contribution CELI.",

    ch3Title: "La dette — le mur avant l'épargne",
    ch3Sub: "Chaque dollar sur la carte coûte double",
    ch3Body:
      "Il n'y a pas de logique à parler d'épargne-retraite si vous payez 19,99 % d'intérêt sur une carte de crédit. Rembourser une dette à 20 % équivaut à un rendement garanti de 20 % — difficile à battre sur les marchés.",
    ch3Tool: "Calculateur — le piège du paiement minimum",
    ch3Rule:
      "La règle des 7 % : en règle générale, toute dette au-dessus de 7 % devrait être remboursée avant d'épargner pour la retraite. Exception : la contribution équivalente de votre employeur au REER (rendement instantané de 50-100 %).",
    ch3StratTitle: "Deux stratégies de remboursement",
    ch3StratBody:
      "Avalanche — payer le minimum partout, puis jeter chaque dollar supplémentaire sur la dette au taux le plus élevé. Minimise l'intérêt total payé. Snowball — même principe, mais viser le plus petit solde d'abord. Les victoires rapides créent une dynamique psychologique puissante.",
    ch3Avalanche: "Avalanche (taux élevé d'abord)",
    ch3Snowball: "Snowball (petit solde d'abord)",
    ch3Min: "Paiement minimum (aucune stratégie)",
    ch3AvalancheSub: "Coûte le moins cher",
    ch3SnowballSub: "Victoires rapides",
    ch3MinSub: "Le plus cher",
    ch3Scenario: "3 dettes (carte 19,99 %, auto 6,5 %, marge 9 %) — remboursé sur 3 ans",

    ch4Title: "Le crédit — le score invisible",
    ch4Sub: "Celui qui décide si vous obtenez cette hypothèque",
    ch4Body:
      "Votre cote de crédit (300-900) résume votre historique d'emprunt. Vous ne la voyez jamais, mais elle affecte votre taux hypothécaire, votre capacité de louer, vos primes d'assurance, et parfois vos perspectives d'emploi.",
    ch4Impact:
      "L'impact en dollars : une différence de cote entre 650 et 760 sur une hypothèque de 400 000 $ peut signifier 0,5 % de plus — soit plus de 45 000 $ en intérêts sur 25 ans.",
    ch4FactorsTitle: "Ce qui fait monter (ou descendre) votre score",
    ch4F1T: "Historique de paiement (~35 %)",
    ch4F1B: "Payer à temps, toujours. Un retard de 30+ jours peut coûter 50 à 100 points et rester au dossier jusqu'à 6 ans.",
    ch4F2T: "Utilisation du crédit (~30 %)",
    ch4F2B: "Gardez les soldes sous 30 % de la limite. Carte 10 000 $ → solde sous 3 000 $.",
    ch4F3T: "Autres facteurs (~35 %)",
    ch4F3B: "Âge des comptes (ne fermez pas vos plus vieilles cartes), diversité du crédit, enquêtes récentes.",
    ch4Myth: "MYTHE COMMUN — « Maintenir un solde améliore le score. » FAUX. Vous n'avez jamais besoin de payer de l'intérêt pour bâtir du crédit. Payez en entier chaque mois — c'est la meilleure stratégie.",

    ch5Title: "L'épargne — la cascade pour vos dollars",
    ch5Sub: "Chaque dollar a une maison optimale",
    ch5Body:
      "Vous avez un surplus mensuel. La question : où devrait-il aller en premier ? Voici l'ordre logique, du plus urgent au moins urgent.",
    ch5Tool: "Calculateur — le pouvoir des intérêts composés",
    ch5Cascade: [
      "1. Fonds d'urgence (3 mois)",
      "2. Contribution équivalente de l'employeur",
      "3. Dette au-dessus de 7 %",
      "4. CELIAPP (si premier logement)",
      "5. CELI",
      "6. REER",
      "7. Compte non-enregistré",
    ],
    ch5Emergency:
      "Étape 1 — le fonds d'urgence est la fondation : 3 mois de dépenses essentielles dans un compte facilement accessible (CELI à intérêt élevé). Ce n'est pas un placement — c'est un filet de sécurité qui vous empêche de retomber dans la dette à 20 % quand un imprévu frappe.",
    ch5Stat:
      "LE SAVIEZ-VOUS ? La moitié des Canadiens (51 %) disent ne pas pouvoir couvrir une dépense imprévue de 1 000 $ sans emprunter (Angus Reid, 2022). Le fonds d'urgence est ce qui sépare la stabilité d'une spirale vers le bas.",

    ch6Title: "Vos comptes expliqués",
    ch6Sub: "REER, CELI, CELIAPP — sans jargon",
    ch6Rrsp:
      "REER — Chaque dollar cotisé réduit votre impôt cette année. Votre argent croît à l'abri de l'impôt. Mais chaque dollar retiré est imposable. Avantageux si votre taux actuel est plus élevé que celui prévu à la retraite.",
    ch6Tfsa:
      "CELI — Pas de déduction à l'entrée, mais tout ce qui sort est 100 % libre d'impôt. Les retraits ne comptent pas comme revenu — ils n'affectent pas votre PSV, votre SRG, ni vos prestations gouvernementales.",
    ch6Fhsa:
      "CELIAPP — Combine les avantages du REER et du CELI pour une première maison. Déduction fiscale comme le REER + retraits libres d'impôt comme le CELI. 8 000 $/an, 40 000 $ à vie.",
    ch6TableTitle: "REER vs CELI vs CELIAPP — l'essentiel",
    ch6TH: ["", "REER", "CELI", "CELIAPP"],
    ch6Rows: [
      ["Cotisation déductible ?", "Oui", "Non", "Oui"],
      ["Retraits imposables ?", "Oui", "Non", "Non*"],
      ["Max annuel 2026", "33 810 $", "7 000 $", "8 000 $"],
      ["Droit cumulatif", "Varie", "109 000 $", "40 000 $"],
      ["Limite d'âge", "71", "Aucune", "71 / 15 ans"],
      ["Affecte PSV/SRG ?", "Oui (retrait)", "Non", "Non*"],
      ["Idéal pour", "Revenu élevé maintenant → plus bas à la retraite", "Flexibilité libre d'impôt", "Première maison"],
    ],
    ch6TableNote: "* Retraits CELIAPP libres d'impôt seulement pour l'achat d'une première maison admissible.",
    ch6QTitle: "REER ou CELI en premier ?",
    ch6QBody:
      "La réponse dépend d'une seule variable : votre taux d'imposition maintenant vs à la retraite.",
    ch6Scenarios: [
      { label: "Taux BAISSE à la retraite (45 % → 30 %)", winner: "REER gagne", color: "blue" },
      { label: "Taux STABLE (35 % → 35 %)", winner: "Match nul", color: "gold" },
      { label: "Taux MONTE à la retraite (30 % → 45 %)", winner: "CELI gagne", color: "green" },
    ],
    ch6Practice:
      "En pratique : si vous gagnez plus de ~55 000 $/an, le REER est généralement avantageux. Sous ce seuil, le CELI est souvent préférable. En cas de doute, le CELI est un bon point de départ — sa flexibilité (retraits libres d'impôt, aucun impact sur les prestations gouvernementales) en fait le compte le plus polyvalent.",
    ch6Trap:
      "ATTENTION — Le piège du REER démesuré : un REER de 2 M$ à 71 ans = retraits FERR obligatoires d'environ 106 000 $/an. Ce revenu peut déclencher la récupération de la PSV et vous pousser dans un palier fiscal élevé. Le Guide 201 couvre les stratégies pour éviter ce piège.",

    ch7Title: "Le gouvernement et vous",
    ch7Sub: "Ce que vous recevrez — et quand",
    ch7Body:
      "Le système de retraite canadien repose sur trois piliers : le gouvernement, votre employeur (s'il y a lieu), et vous. Commençons par le premier — celui que tout le monde reçoit mais que peu comprennent.",
    ch7Qpp: "RRQ/RPC — À 60 ans : 640 $/mois. À 65 ans : 1 000 $/mois. À 70 ans : 1 420 $/mois. Le choix est permanent.",
    ch7Oas: "PSV — Universelle à 65 ans (742 $/mois en 2026). Indexée. Récupérée si le revenu dépasse 95 323 $.",
    ch7Gis: "SRG — Supplément non imposable pour retraités à faible revenu (jusqu'à 1 109 $/mois). Les retraits CELI ne l'affectent pas. Les retraits REER le réduisent.",
    ch7Quebec:
      "QUÉBEC vs RESTE DU CANADA — Au Québec : Régime de rentes du Québec (RRQ). Ailleurs : Régime de pensions du Canada (RPC). Les règles sont similaires, mais les montants et les calculs diffèrent légèrement. Si vous avez cotisé dans les deux, vos contributions sont consolidées.",
    ch7Nuance:
      "Le maximum en 2026 à 65 ans est 1 508 $/mois. Mais la moyenne réelle pour les nouveaux retraités est d'environ 900 $/mois. Le choix 60/65/70 est permanent — il affecte votre revenu pour le reste de votre vie. Depuis 2019, le RRQ/RPC est bonifié graduellement — les cohortes plus jeunes recevront davantage.",
    ch7OasCaution:
      "ATTENTION — Récupération de la PSV : revenu net au-delà de 95 323 $ en 2026 ? Le gouvernement récupère 15 ¢ par dollar excédentaire. À ~152 000 $, votre PSV tombe à zéro. Sur 20-25 ans = potentiellement 100 000 $+ en prestations perdues. Le Guide 201 couvre les stratégies de protection.",

    ch8Title: "Protéger votre plan",
    ch8Sub: "L'assurance qu'on ne peut ignorer",
    ch8Body:
      "Un plan financier sans protection est un château de cartes. Si votre revenu disparaissait demain, tout s'effondre. Un Canadien sur trois sera invalide 90 jours ou plus avant 65 ans. L'invalidité est le risque le plus sous-estimé.",
    ch8DisT: "1. Assurance invalidité",
    ch8DisB: "Remplace une portion de votre revenu si vous ne pouvez plus travailler. Vérifiez la couverture de votre employeur. Si vous êtes travailleur autonome : priorité absolue.",
    ch8LifeT: "2. Assurance vie",
    ch8LifeB: "Essentielle si quelqu'un dépend de votre revenu (conjoint, enfants). Assurance temporaire simple (10 ou 20 ans) = abordable et suffisante pour la plupart des familles. Exemple : homme non-fumeur de 35 ans, 500 000 $ sur 20 ans ≈ 30-45 $/mois.",
    ch8CritT: "3. Maladies graves",
    ch8CritB: "Somme forfaitaire si diagnostiqué avec une condition couverte (cancer, AVC, infarctus). Couvre les dépenses non-médicales : hypothèque, épicerie, transport durant le rétablissement.",
    ch8Check:
      "BON À SAVOIR — Vérifiez avant d'acheter : de nombreux Canadiens sont déjà couverts par leur employeur sans le savoir. Avant d'acheter une assurance individuelle, vérifiez votre couverture collective — elle pourrait couvrir 60-70 % de votre salaire en cas d'invalidité.",

    /* 5 costliest mistakes */
    mistakesTitle: "Les 5 erreurs les plus coûteuses",
    mistakesIntro: "Communes, coûteuses et évitables. Si vous ne retenez qu'une chose de ce guide, retenez cette liste.",
    mistakes: [
      {
        t: "1. Ignorer la contribution équivalente de l'employeur",
        b: "Si votre employeur offre 50 % d'équivalence sur votre REER, ne pas cotiser c'est abandonner un rendement instantané de 50 %. Un des rares avantages financiers sans risque de marché.",
      },
      {
        t: "2. Payer seulement le minimum sur la carte de crédit",
        b: "Sur 5 000 $ à 19,99 %, le paiement minimum coûte 12 000 $ en intérêts et 30 ans. Un 200 $/mois fixe : 1 500 $ en intérêts et 2 ans 8 mois. L'écart est énorme.",
      },
      {
        t: "3. Attendre « le bon moment » pour investir",
        b: "Le meilleur moment était il y a 20 ans. Le deuxième meilleur moment, c'est aujourd'hui. Chronométrer le bas du marché est impossible — même les pros n'y arrivent pas. Un virement automatique mensuel élimine la décision.",
      },
      {
        t: "4. Oublier les abonnements récurrents",
        b: "Le Canadien moyen dépense plus de 200 $/mois en abonnements. Parcourez vos 3 derniers relevés. Chaque 15 $/mois éliminé = 180 $/an → investi 30 ans à 7 % = 17 000 $.",
      },
      {
        t: "5. Garder un fonds à 2,2 % de frais pendant 30 ans",
        b: "Sur 200 000 $, l'écart entre 0,25 % (FNB indiciel) et 2,20 % (fonds commun) sur 30 ans représente plus de 200 000 $. Vos frais de gestion sont le facteur le plus prévisible de votre rendement à long terme — et le seul que vous contrôlez entièrement.",
      },
    ],

    ctaTitle: "Vous connaissez les règles. Comment s'appliquent-elles à votre situation ?",
    ctaBody:
      "Votre Bilan BuildFi calcule tout — pour vous, votre province, votre foyer. Score de préparation, observations personnalisées, 5 000 simulations Monte Carlo testées sur votre plan.",
    ctaBtn: "Obtenir mon Bilan 360 — 29,99 $",
    ctaHref: "/bilan-360",

    actionsTitle: "Vos 5 actions — cette semaine",
    actions: [
      "Calculez votre valeur nette. 5 minutes. Écrivez le chiffre.",
      "Faites l'audit de vos abonnements. 3 derniers relevés. Décidez ce qui reste.",
      "Automatisez un virement. Même 50 $/paie vers un CELI ou CELIAPP.",
      "Vérifiez vos avantages employeur. Contribution équivalente REER ? Assurance invalidité ?",
      "Vérifiez votre cote de crédit. Borrowell ou Credit Karma. Gratuit.",
    ],

    quote2: "« Personne ne regrette d'avoir commencé trop tôt. Tout le monde regrette d'avoir attendu. »",

    principlesTitle: "Les 3 principes BuildFi",
    principles: [
      "Sécurité avant rendement. Un bon fonds d'urgence vaut plus qu'un rendement de 12 % sur un portefeuille fragile.",
      "Liquidité avant optimisation fiscale. L'argent accessible en cas d'urgence passe avant la stratégie fiscale parfaite.",
      "Simplicité avant sophistication. Un plan simple que vous suivez bat un plan complexe que vous abandonnez.",
    ],

    /* tool labels */
    tNetWorth: "Valeur nette",
    tAssets: "Actifs (ce que vous possédez)",
    tLiab: "Passifs (ce que vous devez)",
    tBank: "Compte bancaire",
    tSavings: "CELI / épargne",
    tRRSP: "REER",
    tHome: "Résidence",
    tOther: "Autres actifs",
    tMortgage: "Hypothèque",
    tCards: "Cartes de crédit",
    tLoans: "Prêts auto / étudiant",
    tOtherDebt: "Autres dettes",

    t5030Title: "Répartition 50/30/20",
    tMonthly: "Revenu net mensuel",
    tNeeds: "Besoins — 50 %",
    tWants: "Envies — 30 %",
    tFuture: "Futur — 20 %",
    tNeedsD: "Logement, épicerie, transport, assurances, paiements minimaux",
    tWantsD: "Restaurants, divertissement, abonnements, loisirs",
    tFutureD: "Remboursement accéléré, épargne, investissements",

    tCardTitle: "Le piège du paiement minimum",
    tCardBal: "Solde de la carte",
    tCardRate: "Taux annuel",
    tCardMin: "% paiement minimum",
    tCardFixed: "Paiement fixe mensuel",
    tMinimum: "Si je paie le minimum",
    tFixed: "Si je paie un montant fixe",
    tYears: "ans",
    tMonths: "mois",
    tInterest: "en intérêts",
    tCardNote: "Modèle : amortissement standard avec taux constant. Les règles réelles de paiement minimum varient selon l'émetteur (souvent le plus élevé entre un % du solde et « intérêt + 1 % »). Ignore les frais, pénalités et changements de taux.",

    tCompoundTitle: "Le pouvoir des intérêts composés",
    tStartAge: "Âge de départ",
    tRetAge: "Âge cible",
    tStartBal: "Solde de départ",
    tMonthly2: "Cotisation mensuelle",
    tReturn: "Rendement annuel",
    tYou: "Vous aurez",
    tOfWhich: "dont",
    tContribs: "en cotisations",
    tGrowth: "en croissance",
    tInitial: "en solde initial",
    tCompNote: "Modèle : rendement constant en ligne droite. Ignore l'impôt, les frais de gestion et l'inflation. Les rendements réels fluctuent — un portefeuille de type marché à 6 % de moyenne passera par des années à +20 % et -15 %. Le résultat final peut différer matériellement.",

    sources:
      "Sources : ARC (plafonds REER/CELI/CELIAPP 2026), Service Canada (PSV/SRG Q1 2026), Retraite Québec / RPC (montants 2026), FP Canada (2023), Angus Reid (2022), ACCAP (statistiques d'invalidité), Equifax Canada / TransUnion.",
  },
  en: {
    eyebrow: "Guide 101",
    title: "Your Financial Basics",
    tagline: "What every Canadian should know — in plain language.",
    intro:
      "Budget. Debt. Savings. Retirement. In the right order. This guide gives you the tools to decide for yourself. No jargon. No hidden sales pitch. Just what you need to know, with real dollar examples.",
    langSwitch: "Français",
    pdfLabel: "Download PDF",
    pdfHref: "/guide-101-your-financial-basics.pdf",
    tocTitle: "In this guide",
    toc: [
      { n: 1, t: "Your financial portrait", s: "Knowing where you stand" },
      { n: 2, t: "The budget", s: "Your game plan" },
      { n: 3, t: "Debt", s: "The wall before savings" },
      { n: 4, t: "Credit", s: "The invisible score" },
      { n: 5, t: "Savings", s: "The cascade for your dollars" },
      { n: 6, t: "Your accounts explained", s: "RRSP, TFSA, FHSA" },
      { n: 7, t: "The government and you", s: "CPP, OAS, GIS" },
      { n: 8, t: "Protecting your plan", s: "Insurance you can't ignore" },
      { n: 9, t: "Your next step", s: "5 concrete actions" },
    ],
    whereStart: "Where to start?",
    whereStartBody:
      "High-interest debt? → Chapter 3. Already saving? → Chapter 5. Close to retirement? → Chapters 6-7. Starting from scratch? → Read in order.",
    disclaimer:
      "This guide is provided for informational and educational purposes only. It does not constitute personalized financial, tax, legal, or investment advice. The strategies and examples are general in nature. Consult a certified professional before making any decision.",
    quote:
      "\"Only 31% of Canadians have a written financial plan. This guide gives you the tools to be part of that group.\"",
    quoteAttr: "— FP Canada, Financial Planning Survey, 2023",

    ch1Title: "Your financial portrait",
    ch1Sub: "Knowing where you stand — in 5 minutes",
    ch1Body:
      "Before talking about budgets or retirement, one question: where do you stand today? Not in terms of salary — in terms of net worth. Everything you own, minus everything you owe. It's the only number that measures your true financial health.",
    ch1Tool: "Calculator — your net worth",
    ch1Note:
      "A negative net worth early in your career (student loans, recent mortgage) is normal. What matters is the trend: is it going up every year?",

    ch2Title: "The budget — your game plan",
    ch2Sub: "Not a punishment. A freedom tool.",
    ch2Body:
      "The word 'budget' doesn't excite anyone. But a budget isn't a list of restrictions — it's a plan that lets you consciously choose where your money goes. The simplest method: split your net income into three categories.",
    ch2Tool: "Calculator — 50/30/20 allocation",
    ch2Caution:
      "CAUTION — The silent leak: The average Canadian pays $100 to $200/month in recurring subscriptions. That's $1,200 to $2,400/year — the equivalent of a vacation or a year of TFSA contributions.",

    ch3Title: "Debt — the wall before savings",
    ch3Sub: "Every dollar on your card costs double",
    ch3Body:
      "There's no point talking about retirement savings if you're paying 19.99% interest on a credit card. Paying off a 20% debt is like getting a guaranteed 20% return — hard to beat that on the markets.",
    ch3Tool: "Calculator — the minimum payment trap",
    ch3Rule:
      "The 7% rule: As a general rule, any debt above 7% should be paid off before saving for retirement. Exception: your employer's RRSP match (instant 50-100% return).",
    ch3StratTitle: "Two repayment strategies",
    ch3StratBody:
      "Avalanche — pay the minimum everywhere, then throw every extra dollar at the highest-rate debt. Minimizes total interest paid. Snowball — same principle, but target the smallest balance first. Quick wins create powerful psychological momentum.",
    ch3Avalanche: "Avalanche (highest rate first)",
    ch3Snowball: "Snowball (smallest balance first)",
    ch3Min: "Minimum payment (no strategy)",
    ch3AvalancheSub: "Costs the least",
    ch3SnowballSub: "Quick wins",
    ch3MinSub: "Most expensive",
    ch3Scenario: "3 debts (card 19.99%, car 6.5%, LOC 9%) — repaid over 3 years",

    ch4Title: "Credit — the invisible score",
    ch4Sub: "The one that decides if you get that mortgage",
    ch4Body:
      "Your credit score (300-900) summarizes your borrowing history. You never see it, but it affects your mortgage rate, your ability to rent, your insurance premiums, and sometimes your job prospects.",
    ch4Impact:
      "The dollar impact: a score difference between 650 and 760 on a $400,000 mortgage can mean 0.5% higher rate — over $45,000 in extra interest over 25 years.",
    ch4FactorsTitle: "What makes your score go up (or down)",
    ch4F1T: "Payment history (~35%)",
    ch4F1B: "Pay on time, always. A 30+ day late payment can cost 50-100 points and stay on file for up to 6 years.",
    ch4F2T: "Credit utilization (~30%)",
    ch4F2B: "Keep balances under 30% of the limit. $10,000 card → keep balance under $3,000.",
    ch4F3T: "Other factors (~35%)",
    ch4F3B: "Account age (don't close your oldest cards), credit mix, number of recent inquiries.",
    ch4Myth: "COMMON MYTH — \"Carrying a balance improves your score.\" FALSE. You never need to pay interest to build credit. Pay your balance in full every month — that's the best strategy.",

    ch5Title: "Savings — the cascade for your dollars",
    ch5Sub: "Every dollar has an optimal home",
    ch5Body:
      "You have a monthly surplus. The question: where should it go first? Here's the logical order, from most urgent to least urgent.",
    ch5Tool: "Calculator — the power of compound interest",
    ch5Cascade: [
      "1. Emergency fund (3 months)",
      "2. Employer RRSP match",
      "3. Debt above 7% interest",
      "4. FHSA (if first home)",
      "5. TFSA",
      "6. RRSP",
      "7. Non-registered account",
    ],
    ch5Emergency:
      "Step 1 — the emergency fund is the foundation: 3 months of essential expenses in a readily accessible account (TFSA high-interest savings). This isn't an investment — it's a safety net that keeps you from falling back into 20% debt when an emergency hits.",
    ch5Stat:
      "DID YOU KNOW? Half of Canadians (51%) say they can't cover an unexpected $1,000 expense without borrowing (Angus Reid, 2022). The emergency fund is what separates stability from a downward spiral.",

    ch6Title: "Your accounts explained",
    ch6Sub: "RRSP, TFSA, FHSA — no jargon",
    ch6Rrsp:
      "RRSP — Every dollar contributed reduces your tax this year. Your money grows tax-sheltered. But every dollar withdrawn is taxable. Advantageous if your current tax rate is higher than the one expected at retirement.",
    ch6Tfsa:
      "TFSA — No tax deduction going in, but everything that comes out is 100% tax-free. Withdrawals don't count as income — they don't affect your OAS, your GIS, or your government benefits.",
    ch6Fhsa:
      "FHSA — Combines the advantages of the RRSP and TFSA for a first home. Tax deduction like the RRSP + tax-free withdrawals like the TFSA. $8,000/year, $40,000 lifetime.",
    ch6TableTitle: "RRSP vs TFSA vs FHSA — the essentials",
    ch6TH: ["", "RRSP", "TFSA", "FHSA"],
    ch6Rows: [
      ["Contribution deductible?", "Yes", "No", "Yes"],
      ["Withdrawals taxable?", "Yes", "No", "No*"],
      ["Annual max 2026", "$33,810", "$7,000", "$8,000"],
      ["Cumulative room", "Varies", "$109,000", "$40,000"],
      ["Age limit", "71", "None", "71 / 15 yrs"],
      ["Affects OAS/GIS?", "Yes (withdrawal)", "No", "No*"],
      ["Ideal for", "High income now → lower at retirement", "Flexibility tax-free", "First home"],
    ],
    ch6TableNote: "* FHSA withdrawals are tax-free only for the purchase of a qualifying first home.",
    ch6QTitle: "RRSP or TFSA first?",
    ch6QBody:
      "The answer depends on a single variable: your tax rate now vs at retirement.",
    ch6Scenarios: [
      { label: "Rate DROPS at retirement (45% → 30%)", winner: "RRSP wins", color: "blue" },
      { label: "Rate STABLE (35% → 35%)", winner: "Tie", color: "gold" },
      { label: "Rate RISES at retirement (30% → 45%)", winner: "TFSA wins", color: "green" },
    ],
    ch6Practice:
      "In practice: if you earn more than ~$55,000/year, the RRSP is generally advantageous. Below that, the TFSA is often preferable. When in doubt: the TFSA is often a good starting point — its flexibility (tax-free withdrawals, no impact on government benefits) makes it the most versatile account.",
    ch6Trap:
      "CAUTION — The oversized RRSP trap: a $2M RRSP at age 71 = mandatory RRIF withdrawals of ~$106,000/year. This income can trigger OAS clawback and push you into a high tax bracket. Guide 201 covers strategies to avoid this trap.",

    ch7Title: "The government and you",
    ch7Sub: "What you'll receive — and when",
    ch7Body:
      "Canada's retirement system rests on three pillars: the government, your employer (if applicable), and you. Let's start with the first — the one everyone receives but few understand.",
    ch7Qpp: "QPP/CPP — At 60: $640/mo. At 65: $1,000/mo. At 70: $1,420/mo. The choice is permanent.",
    ch7Oas: "OAS — Universal at 65 ($742/month in 2026). Indexed. Clawed back if income exceeds $95,323.",
    ch7Gis: "GIS — Non-taxable supplement for low-income retirees (up to $1,109/month). TFSA withdrawals don't affect it. RRSP withdrawals reduce it.",
    ch7Quebec:
      "QUEBEC vs REST OF CANADA — In Quebec: Quebec Pension Plan (QPP). Elsewhere: Canada Pension Plan (CPP). The rules are similar, but amounts and calculations differ slightly. If you've worked in both places, your contributions are consolidated.",
    ch7Nuance:
      "The maximum pension in 2026 at age 65 is $1,508/month. But the actual average for new retirees is about $900/month. The choice of 60/65/70 is permanent — it affects your income for the rest of your life. Since 2019, the QPP/CPP has been gradually enhanced — younger generations will receive more.",
    ch7OasCaution:
      "CAUTION — OAS clawback: Net income above $95,323 in 2026? The government claws back 15¢ per dollar above. Around $152,000, your OAS drops to zero. Over 20-25 years = potentially $100,000+ in lost benefits. Guide 201 covers protection strategies.",

    ch8Title: "Protecting your plan",
    ch8Sub: "The insurance you can't ignore",
    ch8Body:
      "A financial plan without protection is a house of cards. If your income disappeared tomorrow, everything collapses. One in three Canadians will be disabled for 90 days or more before age 65. Disability is the most underestimated risk.",
    ch8DisT: "1. Disability insurance",
    ch8DisB: "Replaces part of your income if you can no longer work. Check your employer coverage. If you're self-employed: this should be a top priority.",
    ch8LifeT: "2. Life insurance",
    ch8LifeB: "Essential if someone depends on your income (spouse, children). Simple term (10 or 20 years) = affordable and sufficient for most families. Example: 35-year-old non-smoking male, $500,000 over 20 years ≈ $30-45/month.",
    ch8CritT: "3. Critical illness",
    ch8CritB: "Lump sum if diagnosed with a covered condition (cancer, stroke, heart attack). Covers non-medical expenses: mortgage, groceries, transportation during recovery.",
    ch8Check:
      "GOOD TO KNOW — Check before you buy: many Canadians are already covered by their employer without knowing. Before buying individual insurance, check your group coverage — it could cover 60-70% of your salary in case of disability.",

    mistakesTitle: "The 5 most costly mistakes",
    mistakesIntro: "Common, expensive, avoidable. If you remember just one thing from this guide, make it this list.",
    mistakes: [
      {
        t: "1. Ignoring the employer match",
        b: "If your employer offers 50% match on your RRSP contributions, not contributing means giving up an instant 50% return. One of the few financial advantages with zero market risk.",
      },
      {
        t: "2. Paying only the minimum on credit cards",
        b: "On $5,000 at 19.99%, the minimum payment costs you $12,000 in interest and 30 years. A fixed $200/month: $1,500 in interest and 2 years 8 months. The difference is enormous.",
      },
      {
        t: "3. Waiting for \"the right time\" to invest",
        b: "The best time to invest was 20 years ago. The second best time is today. Timing the market bottom is impossible — even professionals can't do it. An automatic monthly transfer eliminates the decision.",
      },
      {
        t: "4. Forgetting recurring subscriptions",
        b: "The average Canadian spends over $200/month on subscriptions. Go through your last 3 statements. Every $15/month eliminated = $180/year → invested 30 years at 7% = $17,000.",
      },
      {
        t: "5. Keeping a 2.2% fee portfolio for 30 years",
        b: "On $200,000, the difference between 0.25% (index ETF) and 2.20% (mutual fund) over 30 years represents over $200,000. Your management fees are the most predictable factor in your long-term return — and the only one you fully control.",
      },
    ],

    ctaTitle: "You know the rules. How do they apply to YOUR situation?",
    ctaBody:
      "Your BuildFi Report calculates everything — for you, your province, your household. Readiness score, personalized observations, 5,000 Monte Carlo simulations tested on your plan.",
    ctaBtn: "Get my Bilan 360 — $29.99",
    ctaHref: "/bilan-360",

    actionsTitle: "Your 5 actions — this week",
    actions: [
      "Calculate your net worth. 5 minutes. Write the number down.",
      "Audit your subscriptions. Last 3 statements. Decide what stays.",
      "Automate a transfer. Even $50/paycheque into a TFSA or FHSA.",
      "Check your employer benefits. RRSP match? Disability insurance?",
      "Check your credit score. Borrowell or Credit Karma. Free.",
    ],

    quote2: "\"Nobody regrets starting too early. Everyone regrets waiting.\"",

    principlesTitle: "The 3 BuildFi principles",
    principles: [
      "Safety before returns. A solid emergency fund is worth more than a 12% return on a fragile portfolio.",
      "Liquidity before tax optimization. Cash you can access in an emergency comes before the perfect tax strategy.",
      "Simplicity before sophistication. A simple plan you follow beats a complex plan you abandon.",
    ],

    tNetWorth: "Net worth",
    tAssets: "Assets (what you own)",
    tLiab: "Liabilities (what you owe)",
    tBank: "Bank account",
    tSavings: "TFSA / savings",
    tRRSP: "RRSP",
    tHome: "Home",
    tOther: "Other assets",
    tMortgage: "Mortgage",
    tCards: "Credit cards",
    tLoans: "Auto / student loans",
    tOtherDebt: "Other debts",

    t5030Title: "50/30/20 allocation",
    tMonthly: "Monthly net income",
    tNeeds: "Needs — 50%",
    tWants: "Wants — 30%",
    tFuture: "Future — 20%",
    tNeedsD: "Housing, groceries, transport, insurance, minimum payments",
    tWantsD: "Restaurants, entertainment, subscriptions, hobbies",
    tFutureD: "Accelerated repayment, savings, investments",

    tCardTitle: "The minimum payment trap",
    tCardBal: "Card balance",
    tCardRate: "Annual rate",
    tCardMin: "Minimum payment %",
    tCardFixed: "Fixed monthly payment",
    tMinimum: "If I pay the minimum",
    tFixed: "If I pay a fixed amount",
    tYears: "years",
    tMonths: "months",
    tInterest: "in interest",
    tCardNote: "Model: standard amortization at constant rate. Real minimum-payment rules vary by issuer (often the higher of a % of balance or \"interest + 1%\"). Ignores fees, penalties, and rate changes.",

    tCompoundTitle: "The power of compound interest",
    tStartAge: "Starting age",
    tRetAge: "Target age",
    tStartBal: "Starting balance",
    tMonthly2: "Monthly contribution",
    tReturn: "Annual return",
    tYou: "You will have",
    tOfWhich: "of which",
    tContribs: "in contributions",
    tGrowth: "in growth",
    tInitial: "initial balance",
    tCompNote: "Model: constant straight-line return. Ignores tax, management fees, and inflation. Real returns vary — a market-type portfolio averaging 6% will have years at +20% and -15%. Final result may differ materially.",

    sources:
      "Sources: CRA (RRSP/TFSA/FHSA limits 2026), Service Canada (OAS/GIS Q1 2026), Retraite Québec / CPP (2026 amounts), FP Canada (2023), Angus Reid (2022), CLHIA (disability statistics), Equifax Canada / TransUnion.",
  },
} as const;

/* ═══════════════════════════════════════════════════════
   Net worth calculator
   ═══════════════════════════════════════════════════════ */
function NetWorthCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [bank, setBank] = useState(3200);
  const [savings, setSavings] = useState(12000);
  const [rrsp, setRrsp] = useState(28000);
  const [home, setHome] = useState(385000);
  const [other, setOther] = useState(0);
  const [mortgage, setMortgage] = useState(295000);
  const [cards, setCards] = useState(4800);
  const [loans, setLoans] = useState(18000);
  const [otherDebt, setOtherDebt] = useState(0);

  const assets = bank + savings + rrsp + home + other;
  const liab = mortgage + cards + loans + otherDebt;
  const net = assets - liab;

  const row = (label: string, v: number, setV: (n: number) => void) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>{label}</label>
      <input
        type="number"
        value={v || ""}
        onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))}
        placeholder="0"
        style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }}
      />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: CL.green, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t.tAssets}</div>
        {row(t.tBank, bank, setBank)}
        {row(t.tSavings, savings, setSavings)}
        {row(t.tRRSP, rrsp, setRrsp)}
        {row(t.tHome, home, setHome)}
        {row(t.tOther, other, setOther)}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${CL.line2}`, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: CL.dim }}>Total</span>
          <strong style={{ color: CL.green }}>{fCAD(assets, fr)}</strong>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: CL.red, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t.tLiab}</div>
        {row(t.tMortgage, mortgage, setMortgage)}
        {row(t.tCards, cards, setCards)}
        {row(t.tLoans, loans, setLoans)}
        {row(t.tOtherDebt, otherDebt, setOtherDebt)}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${CL.line2}`, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: CL.dim }}>Total</span>
          <strong style={{ color: CL.red }}>{fCAD(liab, fr)}</strong>
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1", background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, color: CL.ink, fontWeight: 600 }}>{t.tNetWorth}</span>
        <strong style={{ fontSize: 28, color: net >= 0 ? CL.green : CL.red, fontWeight: 800 }}>{fCAD(net, fr)}</strong>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   50/30/20 calculator
   ═══════════════════════════════════════════════════════ */
function BudgetCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [income, setIncome] = useState(4200);
  const needs = income * 0.5;
  const wants = income * 0.3;
  const future = income * 0.2;
  const bar = (label: string, sub: string, v: number, color: string, bg: string) => (
    <div style={{ background: bg, border: `1px solid ${color}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(v, fr)}</div>
      <div style={{ fontSize: 11, color: CL.dim, marginTop: 6, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: CL.text }}>{t.tMonthly}</label>
        <input
          type="number"
          value={income || ""}
          onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
          style={{ padding: "9px 11px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 14, width: "100%", textAlign: "right", background: CL.card }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {bar(t.tNeeds, t.tNeedsD, needs, CL.blue, CL.blueBg)}
        {bar(t.tWants, t.tWantsD, wants, CL.gold, CL.goldBg)}
        {bar(t.tFuture, t.tFutureD, future, CL.green, CL.greenBg)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Credit card trap calculator
   ═══════════════════════════════════════════════════════ */
function CardTrapCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [bal, setBal] = useState(5000);
  const [rate, setRate] = useState(19.99);
  const [minPct, setMinPct] = useState(2);
  const [fixed, setFixed] = useState(200);

  const result = useMemo(() => {
    const mr = rate / 100 / 12;
    // minimum path: floor $10 min
    const simulate = (mode: "min" | "fixed") => {
      let b = bal, months = 0, totInt = 0;
      const maxM = 720;
      while (b > 0.01 && months < maxM) {
        const intAmt = b * mr;
        let pay;
        if (mode === "min") {
          pay = Math.max(10, b * (minPct / 100));
          if (pay <= intAmt + 0.01) pay = intAmt + 10;
        } else {
          pay = fixed;
          if (pay <= intAmt + 0.01) return { months: Infinity, int: Infinity, feasible: false };
        }
        const prin = Math.min(b, pay - intAmt);
        b -= prin;
        totInt += intAmt;
        months++;
      }
      return { months, int: totInt, feasible: true };
    };
    return { min: simulate("min"), fixed: simulate("fixed") };
  }, [bal, rate, minPct, fixed]);

  const fMonths = (m: number) => {
    if (!Number.isFinite(m)) return "∞";
    const y = Math.floor(m / 12), mm = m % 12;
    return y > 0 ? `${y} ${t.tYears}${mm ? ` ${mm} ${t.tMonths}` : ""}` : `${mm} ${t.tMonths}`;
  };

  const row = (label: string, v: number, setV: (n: number) => void, step = 1, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>
        {label}
        {suffix ? <span style={{ color: CL.dim }}> {suffix}</span> : null}
      </label>
      <input
        type="number"
        step={step}
        value={v || ""}
        onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))}
        style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }}
      />
    </div>
  );

  const card = (title: string, data: { months: number; int: number; feasible: boolean }, color: string, bg: string) => (
    <div style={{ background: bg, border: `1px solid ${color}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 6 }}>
        {data.feasible ? fMonths(data.months) : (fr ? "Jamais remboursé" : "Never paid off")}
      </div>
      <div style={{ fontSize: 13, color: CL.dim, marginTop: 4 }}>
        {data.feasible ? `${fCAD(data.int, fr)} ${t.tInterest}` : (fr ? "Le paiement ne couvre pas l'intérêt" : "Payment does not cover interest")}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.tCardBal, bal, setBal, 100, "($)")}
        {row(t.tCardRate, rate, setRate, 0.1, "(%)")}
        {row(t.tCardMin, minPct, setMinPct, 0.5, "(%)")}
        {row(t.tCardFixed, fixed, setFixed, 10, "($)")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {card(t.tMinimum, result.min, CL.red, CL.redBg)}
        {card(t.tFixed, result.fixed, CL.green, CL.greenBg)}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.tCardNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Compound interest calculator
   ═══════════════════════════════════════════════════════ */
function CompoundCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [age, setAge] = useState(25);
  const [retAge, setRetAge] = useState(65);
  const [startBal, setStartBal] = useState(0);
  const [monthly, setMonthly] = useState(300);
  const [ret, setRet] = useState(6);

  const years = Math.max(0, retAge - age);
  const r = ret / 100 / 12;
  const n = years * 12;
  const streamFV = monthly > 0 && r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) : monthly * n;
  const lumpFV = startBal > 0 && r > 0 ? startBal * Math.pow(1 + r, n) : startBal;
  const fv = streamFV + lumpFV;
  const contrib = monthly * n;
  const growth = Math.max(0, fv - contrib - startBal);

  const row = (label: string, v: number, setV: (n: number) => void, step = 1, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>
        {label}
        {suffix ? <span style={{ color: CL.dim }}> {suffix}</span> : null}
      </label>
      <input
        type="number"
        step={step}
        value={v || ""}
        onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))}
        style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.tStartAge, age, setAge)}
        {row(t.tRetAge, retAge, setRetAge)}
        {row(t.tStartBal, startBal, setStartBal, 500, "($)")}
        {row(t.tMonthly2, monthly, setMonthly, 25, "($)")}
        {row(t.tReturn, ret, setRet, 0.5, "(%)")}
      </div>
      <div style={{ background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t.tYou} ({years} {fr ? "ans" : "years"})
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: CL.ink, margin: "6px 0 8px" }}>{fCAD(fv, fr)}</div>
        <div style={{ fontSize: 13, color: CL.dim, lineHeight: 1.7 }}>
          {startBal > 0 ? (<>
            <strong style={{ color: CL.ink }}>{fCAD(startBal, fr)}</strong> {t.tInitial}
            {" + "}
          </>) : null}
          <strong style={{ color: CL.blue }}>{fCAD(contrib, fr)}</strong> {t.tContribs}
          {" + "}
          <strong style={{ color: CL.green }}>{fCAD(growth, fr)}</strong> {t.tGrowth}
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.tCompNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Reusable section
   ═══════════════════════════════════════════════════════ */
function Section({ num, title, sub, children, id }: { num: number; title: string; sub: string; children: React.ReactNode; id: string }) {
  return (
    <section id={id} style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 16, padding: "26px 28px", marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: CL.line2, lineHeight: 1 }}>{num}</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: CL.ink, margin: 0 }}>{title}</h2>
          <div style={{ fontSize: 14, color: CL.dim, fontStyle: "italic", marginTop: 4 }}>{sub}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToolCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CL.s2, border: `1px solid ${CL.line2}`, borderRadius: 14, padding: 18, margin: "16px 0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
function Guide101Inner() {
  const params = useSearchParams();
  const [lang, setLang] = useState<"fr" | "en">(() => {
    const p = params?.get("lang");
    return p === "en" ? "en" : "fr";
  });
  const fr = lang === "fr";
  const t = fr ? COPY.fr : COPY.en;
  const toggleLang = () => setLang(fr ? "en" : "fr");

  return (
    <div style={{ background: CL.bg, minHeight: "100vh", color: CL.text, fontFamily: 'var(--font-inter),"Segoe UI",Arial,sans-serif' }}>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 18px 60px" }}>
        {/* Header / Hero */}
        <div style={{ background: CL.ink, color: "#fff", borderRadius: 20, padding: "30px 32px", position: "relative", overflow: "hidden", marginBottom: 20 }}>
          <div aria-hidden style={{ position: "absolute", right: 24, top: 16, fontSize: 120, fontWeight: 900, color: "rgba(255,255,255,.08)", lineHeight: 1, letterSpacing: -4 }}>101</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>BuildFi · {t.eyebrow}</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, margin: 0, lineHeight: 1.1, maxWidth: 640 }}>{t.title}</h1>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,.72)", marginTop: 10, maxWidth: 600 }}>{t.tagline}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <a href={t.pdfHref} style={{ background: CL.gold, color: CL.ink, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>📄 {t.pdfLabel}</a>
            <button onClick={toggleLang} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.35)", padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🌐 {t.langSwitch}</button>
          </div>
        </div>

        {/* Intro */}
        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 16, padding: "22px 28px", marginBottom: 18 }}>
          <p style={{ fontSize: 16, color: CL.text, lineHeight: 1.6, margin: 0 }}>{t.intro}</p>
        </div>

        {/* TOC */}
        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 16, padding: "22px 28px", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: CL.ink, marginBottom: 14 }}>{t.tocTitle}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
            {t.toc.map((item) => (
              <a key={item.n} href={`#ch${item.n}`} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: CL.text, border: `1px solid ${CL.line}` }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: CL.gold, minWidth: 22 }}>{item.n}</span>
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: CL.ink }}>{item.t}</span>
                  <span style={{ display: "block", fontSize: 12, color: CL.dim }}>{item.s}</span>
                </span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 14, background: CL.blueBg, border: `1px solid ${CL.blue}`, borderRadius: 10, padding: "10px 14px" }}>
            <strong style={{ fontSize: 12, color: CL.blue, textTransform: "uppercase", letterSpacing: 0.7 }}>{t.whereStart}</strong>
            <div style={{ fontSize: 13, color: CL.text, marginTop: 4 }}>{t.whereStartBody}</div>
          </div>
        </div>

        {/* Quote */}
        <div style={{ textAlign: "center", padding: "18px 20px", margin: "14px 0 18px" }}>
          <div style={{ fontSize: 18, fontStyle: "italic", color: CL.ink, maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>{t.quote}</div>
          <div style={{ fontSize: 13, color: CL.dim, marginTop: 8 }}>{t.quoteAttr}</div>
        </div>

        {/* Ch 1 */}
        <Section num={1} id="ch1" title={t.ch1Title} sub={t.ch1Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch1Body}</p>
          <ToolCard title={t.ch1Tool}>
            <NetWorthCalc fr={fr} t={t} />
          </ToolCard>
          <div style={{ background: CL.greenBg, borderLeft: `3px solid ${CL.green}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch1Note}</div>
        </Section>

        {/* Ch 2 */}
        <Section num={2} id="ch2" title={t.ch2Title} sub={t.ch2Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch2Body}</p>
          <ToolCard title={t.ch2Tool}>
            <BudgetCalc fr={fr} t={t} />
          </ToolCard>
          <div style={{ background: CL.redBg, borderLeft: `3px solid ${CL.red}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch2Caution}</div>
        </Section>

        {/* Ch 3 */}
        <Section num={3} id="ch3" title={t.ch3Title} sub={t.ch3Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch3Body}</p>
          <ToolCard title={t.ch3Tool}>
            <CardTrapCalc fr={fr} t={t} />
          </ToolCard>

          {/* Avalanche vs Snowball vs Min comparison */}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: CL.ink, margin: "0 0 6px" }}>{t.ch3StratTitle}</h3>
            <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6, margin: "0 0 12px" }}>{t.ch3StratBody}</p>
            <div style={{ fontSize: 12, color: CL.dim, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>{t.ch3Scenario}</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: CL.greenBg, border: `1px solid ${CL.green}`, borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CL.green }}>{t.ch3Avalanche}</div>
                  <div style={{ fontSize: 11, color: CL.dim }}>{t.ch3AvalancheSub}</div>
                </div>
                <strong style={{ fontSize: 16, color: CL.green }}>3 200 $</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CL.gold }}>{t.ch3Snowball}</div>
                  <div style={{ fontSize: 11, color: CL.dim }}>{t.ch3SnowballSub}</div>
                </div>
                <strong style={{ fontSize: 16, color: CL.gold }}>4 100 $</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: CL.redBg, border: `1px solid ${CL.red}`, borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CL.red }}>{t.ch3Min}</div>
                  <div style={{ fontSize: 11, color: CL.dim }}>{t.ch3MinSub}</div>
                </div>
                <strong style={{ fontSize: 16, color: CL.red }}>4 800 $</strong>
              </div>
            </div>
          </div>

          <div style={{ background: CL.greenBg, borderLeft: `3px solid ${CL.green}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text, marginTop: 16 }}>{t.ch3Rule}</div>
          <div style={{ marginTop: 12 }}>
            <a href={fr ? "/outils/dettes" : "/outils/dettes?lang=en"} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: CL.ink, color: "#fff", padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              {fr ? "Calculateur complet de dettes →" : "Full debt calculator →"}
            </a>
          </div>
        </Section>

        {/* Ch 4 */}
        <Section num={4} id="ch4" title={t.ch4Title} sub={t.ch4Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch4Body}</p>
          <div style={{ background: CL.s2, borderRadius: 12, padding: 14, margin: "14px 0", fontSize: 13, color: CL.text }}>
            <strong>300 — 600 — 650 — 700 — 760 — 900</strong> · Equifax / TransUnion
          </div>

          {/* 3 factors */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: CL.ink, margin: "16px 0 10px" }}>{t.ch4FactorsTitle}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 14 }}>
            <div style={{ background: CL.s2, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch4F1T}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch4F1B}</div>
            </div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch4F2T}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch4F2B}</div>
            </div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch4F3T}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch4F3B}</div>
            </div>
          </div>

          <div style={{ background: CL.redBg, borderLeft: `3px solid ${CL.red}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text, marginBottom: 10 }}>{t.ch4Myth}</div>
          <div style={{ background: CL.goldBg, borderLeft: `3px solid ${CL.gold}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch4Impact}</div>
        </Section>

        {/* Ch 5 */}
        <Section num={5} id="ch5" title={t.ch5Title} sub={t.ch5Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch5Body}</p>
          <div style={{ background: CL.s2, borderRadius: 12, padding: 14, margin: "14px 0" }}>
            {t.ch5Cascade.map((line, i) => (
              <div key={i} style={{ padding: "6px 0", fontSize: 13, color: CL.text, borderBottom: i < t.ch5Cascade.length - 1 ? `1px dashed ${CL.line2}` : "none" }}>{line}</div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6 }}>{t.ch5Emergency}</p>
          <div style={{ background: CL.blueBg, borderLeft: `3px solid ${CL.blue}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text, marginBottom: 14 }}>{t.ch5Stat}</div>
          <ToolCard title={t.ch5Tool}>
            <CompoundCalc fr={fr} t={t} />
          </ToolCard>
        </Section>

        {/* Ch 6 */}
        <Section num={6} id="ch6" title={t.ch6Title} sub={t.ch6Sub}>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14, fontSize: 14, color: CL.text, lineHeight: 1.6 }}><strong style={{ color: CL.ink }}>REER / RRSP</strong> — {t.ch6Rrsp}</div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14, fontSize: 14, color: CL.text, lineHeight: 1.6 }}><strong style={{ color: CL.ink }}>CELI / TFSA</strong> — {t.ch6Tfsa}</div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14, fontSize: 14, color: CL.text, lineHeight: 1.6 }}><strong style={{ color: CL.ink }}>CELIAPP / FHSA</strong> — {t.ch6Fhsa}</div>
          </div>

          {/* Comparison table */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: CL.ink, margin: "18px 0 10px" }}>{t.ch6TableTitle}</h3>
          <div style={{ overflow: "auto", marginBottom: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr style={{ background: CL.ink, color: "#fff" }}>
                  {t.ch6TH.map((h, i) => (
                    <th key={i} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "center", fontWeight: 700, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.ch6Rows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? CL.s2 : CL.card, borderBottom: `1px solid ${CL.line}` }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "9px 12px", textAlign: j === 0 ? "left" : "center", color: j === 0 ? CL.dim : CL.text, fontWeight: j === 0 ? 400 : 600 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: CL.dim, fontStyle: "italic", marginBottom: 18 }}>{t.ch6TableNote}</div>

          {/* RRSP vs TFSA scenarios */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: CL.ink, margin: "18px 0 6px" }}>{t.ch6QTitle}</h3>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6, margin: "0 0 12px" }}>{t.ch6QBody}</p>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {t.ch6Scenarios.map((s, i) => {
              const c = s.color === "blue" ? CL.blue : s.color === "gold" ? CL.gold : CL.green;
              const bg = s.color === "blue" ? CL.blueBg : s.color === "gold" ? CL.goldBg : CL.greenBg;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: bg, border: `1px solid ${c}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, color: CL.text }}>{s.label}</div>
                  <strong style={{ fontSize: 13, color: c }}>{s.winner}</strong>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6 }}>{t.ch6Practice}</p>
          <div style={{ background: CL.redBg, borderLeft: `3px solid ${CL.red}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text, marginTop: 12 }}>{t.ch6Trap}</div>
        </Section>

        {/* Ch 7 */}
        <Section num={7} id="ch7" title={t.ch7Title} sub={t.ch7Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch7Body}</p>

          <div style={{ background: CL.goldBg, borderLeft: `3px solid ${CL.gold}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text, margin: "14px 0" }}>{t.ch7Quebec}</div>

          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <div style={{ background: CL.blueBg, borderLeft: `3px solid ${CL.blue}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch7Qpp}</div>
            <div style={{ background: CL.blueBg, borderLeft: `3px solid ${CL.blue}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch7Oas}</div>
            <div style={{ background: CL.blueBg, borderLeft: `3px solid ${CL.blue}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch7Gis}</div>
          </div>

          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6 }}>{t.ch7Nuance}</p>
          <div style={{ background: CL.redBg, borderLeft: `3px solid ${CL.red}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch7OasCaution}</div>
        </Section>

        {/* Ch 8 */}
        <Section num={8} id="ch8" title={t.ch8Title} sub={t.ch8Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch8Body}</p>

          <div style={{ display: "grid", gap: 10, margin: "14px 0" }}>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch8DisT}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch8DisB}</div>
            </div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch8LifeT}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch8LifeB}</div>
            </div>
            <div style={{ background: CL.s2, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{t.ch8CritT}</div>
              <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.5 }}>{t.ch8CritB}</div>
            </div>
          </div>

          <div style={{ background: CL.greenBg, borderLeft: `3px solid ${CL.green}`, padding: "10px 14px", borderRadius: 6, fontSize: 13, color: CL.text }}>{t.ch8Check}</div>
        </Section>

        {/* 5 costliest mistakes */}
        <section id="mistakes" style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 16, padding: "26px 28px", marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: CL.red, margin: 0 }}>{t.mistakesTitle}</h2>
            <div style={{ fontSize: 14, color: CL.dim, fontStyle: "italic", marginTop: 4 }}>{t.mistakesIntro}</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {t.mistakes.map((m, i) => (
              <div key={i} style={{ background: CL.redBg, borderLeft: `3px solid ${CL.red}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CL.red, marginBottom: 4 }}>{m.t}</div>
                <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.55 }}>{m.b}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Ch 9 — Action + CTA */}
        <Section num={9} id="ch9" title={t.actionsTitle} sub={t.quote2}>
          <ol style={{ paddingLeft: 22, margin: "6px 0 18px", fontSize: 14, color: CL.text, lineHeight: 1.7 }}>
            {t.actions.map((a, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{a}</li>
            ))}
          </ol>
          <div style={{ background: CL.ink, color: "#fff", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Bilan 360</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.3 }}>{t.ctaTitle}</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.78)", margin: "0 0 16px", lineHeight: 1.5 }}>{t.ctaBody}</p>
            <a href={t.ctaHref} style={{ display: "inline-block", background: CL.gold, color: CL.ink, padding: "12px 22px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>{t.ctaBtn}</a>
          </div>
        </Section>

        {/* Principles */}
        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 16, padding: "22px 28px", marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>{t.principlesTitle}</div>
          <ol style={{ paddingLeft: 22, margin: 0, fontSize: 14, color: CL.text, lineHeight: 1.7 }}>
            {t.principles.map((p, i) => (<li key={i} style={{ marginBottom: 6 }}>{p}</li>))}
          </ol>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", fontSize: 11, color: CL.muted, marginTop: 26, padding: "0 20px", lineHeight: 1.6 }}>
          <div style={{ marginBottom: 10 }}>{t.sources}</div>
          <div style={{ marginBottom: 10 }}>{t.disclaimer}</div>
          <div>© 2026 BuildFi · <Link href="/" style={{ color: CL.muted }}>buildfi.ca</Link></div>
        </footer>
      </main>
    </div>
  );
}

export default function Guide101Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: CL.bg }} />}>
      <Guide101Inner />
    </Suspense>
  );
}
