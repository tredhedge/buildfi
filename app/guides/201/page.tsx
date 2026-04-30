"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEditorialPalette } from "@/lib/design/editorial.tokens";
import {
  Section,
  ToolCard,
  Note,
  useEditorialBody,
  useEditorialRailScrollSpy,
} from "@/lib/design/editorial-components";

// Palette: shared Editorial system. Guide 201 follows the gold + ink + cream
// restraint rule — no purple/red/green/blue accents. See docs/DESIGN-SYSTEM.md.
const CL = getEditorialPalette();

/**
 * Local Callout — preserves the existing `<Callout color="X">` call sites
 * by mapping legacy color names to the editorial Note tones:
 *   red → caution, green → check, gold → rule, blue → info.
 * New code should use Note directly with a kicker.
 */
function Callout({ color, children }: { color: "red" | "green" | "gold" | "blue"; children: React.ReactNode }) {
  const tone = color === "red" ? "caution" : color === "green" ? "check" : color === "gold" ? "rule" : "info";
  return <Note tone={tone}>{children}</Note>;
}

const fCAD = (v: number, fr: boolean) =>
  new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
    .format(Math.round(v)).replace(/[\u00A0\u202F]/g, " ");
/* ═══════════════════════════════════════════════════════
   Combined federal + provincial marginal rates (2026 est.)
   Derived from PROV_TAX in /app/outils/dettes/page.jsx
   Converted from "income → cumulative bracket top" into
   rates displayed at 5 key retirement-income bracket bands.
   ═══════════════════════════════════════════════════════ */
const BRACKET_BANDS_2026: Array<{ lo: number; hi: number | null }> = [
  { lo: 0, hi: 57375 },
  { lo: 57375, hi: 114750 },
  { lo: 114750, hi: 177882 },
  { lo: 177882, hi: 253414 },
  { lo: 253414, hi: null },
];

// Rate at the TOP of each band (since brackets are progressive, this is the marginal
// rate someone earning in that band pays on the next dollar within the band).
// Values sourced from province tax table in /app/outils/dettes/page.jsx (combined fed+prov).
const PROV_BRACKET_RATES: Record<string, number[]> = {
  AB: [0.25, 0.305, 0.36, 0.41, 0.48],
  BC: [0.2272, 0.315, 0.408, 0.497, 0.535],
  MB: [0.278, 0.383, 0.438, 0.504, 0.504],
  NB: [0.2782, 0.3582, 0.4282, 0.5182, 0.533],
  NL: [0.295, 0.375, 0.455, 0.51, 0.548],
  NS: [0.2987, 0.385, 0.485, 0.5, 0.54],
  ON: [0.2415, 0.3148, 0.3748, 0.4798, 0.5353],
  PE: [0.285, 0.375, 0.445, 0.487, 0.51],
  QC: [0.3753, 0.4753, 0.5053, 0.5253, 0.5353],
  SK: [0.275, 0.355, 0.435, 0.445, 0.479],
  NT: [0.245, 0.355, 0.435, 0.445, 0.479],
  NU: [0.23, 0.33, 0.4, 0.44, 0.46],
  YT: [0.204, 0.284, 0.334, 0.434, 0.48],
};

const PROV_NAMES_FR: Record<string, string> = {
  AB: "Alberta", BC: "Colombie-Britannique", MB: "Manitoba", NB: "Nouveau-Brunswick",
  NL: "Terre-Neuve-et-Labrador", NS: "Nouvelle-Écosse", ON: "Ontario", PE: "Île-du-Prince-Édouard",
  QC: "Québec", SK: "Saskatchewan", NT: "Territoires du Nord-Ouest", NU: "Nunavut", YT: "Yukon",
};
const PROV_NAMES_EN: Record<string, string> = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island",
  QC: "Quebec", SK: "Saskatchewan", NT: "Northwest Territories", NU: "Nunavut", YT: "Yukon",
};

function fBandLabel(lo: number, hi: number | null, fr: boolean) {
  const f = (n: number) => fCAD(n, fr).replace(/\s?\$/, " $");
  if (hi === null) return `${f(lo)}+`;
  return `${f(lo)} – ${f(hi)}`;
}

/* ═══════════════════════════════════════════════════════
   Copy (bilingual)
   ═══════════════════════════════════════════════════════ */
const COPY = {
  fr: {
    eyebrow: "Guide 201 · Bonus 301",
    title: "Optimiser votre retraite",
    tagline: "Décaissement, stratégie fiscale et optimisation — pour portefeuilles établis.",
    intro:
      "Ce guide s'adresse aux foyers qui ont construit un patrimoine significatif (REER, CELI, immobilier ou société par actions). Il transforme votre connaissance en décisions concrètes. Taxes. Retrait. Frais. Les leviers qui changent tout.",
    langSwitch: "English",
    pdfLabel: "Télécharger le PDF",
    pdfHref: "/guide-201-optimiser-votre-retraite.pdf",
    prereq:
      "PRÉALABLE : ce guide suppose que vous êtes familier avec le REER, le CELI, la PSV et la RRQ/RPC. Si ces termes sont inconnus, commencez par le Guide 101.",
    prereqLink: "Voir le Guide 101 →",

    tocTitle: "Dans ce guide",
    toc201: "Partie 201 — Stratégies intermédiaires",
    toc301: "Bonus 301 — Stratégies avancées",
    toc: [
      { n: 1, t: "Quand et comment retirer", s: "L'ordre qui minimise vos impôts" },
      { n: 2, t: "Les impôts à la retraite", s: "Paliers, crédits et pièges" },
      { n: 3, t: "Protéger votre PSV", s: "La récupération et comment l'éviter" },
      { n: 4, t: "Choisir votre âge RRQ/RPC", s: "60, 65 ou 70 — l'analyse complète" },
      { n: 5, t: "Fractionnement de revenu", s: "Diviser pour économiser" },
      { n: 6, t: "Frais de gestion", s: "Le coût invisible qui ronge votre patrimoine" },
      { n: 7, t: "Les risques qu'on ne mentionne pas", s: "Longévité, inflation, séquence" },
    ],
    toc2: [
      { n: 8, t: "Le meltdown REER en détail", s: "Décaissement stratégique avant 72 ans" },
      { n: 9, t: "Guardrails — dépenser sans tomber", s: "Ajuster vos retraits au marché" },
      { n: 10, t: "L'immobilier dans le plan", s: "DPA, Smith et timing de vente" },
      { n: 11, t: "La société et la retraite", s: "CCPC, extraction et optimisation" },
    ],

    whereStart: "Où commencer ?",
    where: [
      ["Je prends ma retraite bientôt", "Ch. 1 — Retrait", "Ch. 4 → Ch. 3"],
      ["Gros REER (500 k$+)", "Ch. 8 — Meltdown", "Ch. 3 → Ch. 2"],
      ["En couple", "Ch. 5 — Fractionnement", "Ch. 1 → Ch. 4"],
      ["Je paie trop de frais", "Ch. 6 — Frais", "Ch. 7"],
      ["Propriétés à revenus", "Ch. 10 — Immobilier", "Ch. 3 → Ch. 2"],
      ["Société par actions", "Ch. 11 — Société", "Ch. 8 → Ch. 9"],
      ["Tout comprendre", "Ch. 1 — page 1", "Lire en ordre"],
    ],

    ch1Title: "Quand et comment retirer",
    ch1Sub: "L'ordre qui minimise vos impôts à vie",
    ch1Body:
      "Accumuler de l'épargne est une chose. La retirer intelligemment en est une autre. L'ordre dans lequel vous videz vos comptes peut représenter 50 000 à 150 000 $ d'économies d'impôt sur 25 ans de retraite. C'est probablement la décision financière la plus importante — et la moins discutée.",
    ch1Order: "Ordre de retrait optimal — minimiser les impôts à vie",
    ch1OrderList: [
      "1. Compte non enregistré (NE)",
      "2. REER / FERR (meltdown contrôlé)",
      "3. Pension / rentes",
      "4. CELI (en dernier recours)",
    ],
    ch1PhasesTitle: "Les quatre phases de retrait",
    ch1Phases: [
      ["Pré-retraite", "55-60", "NE + meltdown REER", "Remplir palier 1 avant RRQ"],
      ["Transition", "60-65", "RRQ (si différée) + NE + REER", "Arbitrage fiscal pré-PSV"],
      ["Croisière", "65-72", "PSV + RRQ + REER résiduel", "Protéger le seuil PSV"],
      ["FERR obligatoire", "72+", "FERR (retraits min.) + CELI", "CELI en dernier"],
    ],
    ch1Example:
      "EXEMPLE — Couple 65 ans, REER 400 k$, CELI 200 k$, NE 100 k$. Retrait conventionnel (REER en premier) : impôt total estimé sur 25 ans ≈ 185 k$. Retrait optimisé (meltdown + NE d'abord + CELI préservé) : 112 k$. Différence : jusqu'à 73 k$ d'économies fiscales potentielles.",

    ch2Title: "Les impôts à la retraite",
    ch2Sub: "Ce que le gouvernement reprend — et comment limiter les dégâts",
    ch2Body:
      "À la retraite, la nature de votre revenu change : le salaire est remplacé par les pensions, retraits FERR, RRQ/RPC et PSV. Chaque source est imposée différemment. Comprendre les paliers fiscaux et les crédits disponibles, c'est comprendre pourquoi certaines décisions valent des milliers de dollars.",
    ch2BracketsTitle: "Taux marginal combiné — 2026",
    ch2ProvLabel: "Province",
    ch2BandLabel: "Tranche de revenu",
    ch2RateLabel: "Taux marginal",
    ch2Sources:
      "FERR/REER — 100 % imposable. RRQ/RPC — imposable, mais admissible au crédit pour revenu de pension (2 000 $ à 65+). PSV — imposable, avec taux marginal effectif jusqu'à 15 % plus élevé (récupération). CELI — jamais imposable. Gains en capital — imposés à 50 % d'inclusion. Dividendes canadiens — crédit attrayant, mais la majoration gonfle le revenu net (affecte la PSV).",
    ch2Dividend:
      "ATTENTION — Le piège de la majoration : un dividende éligible de 50 000 $ devient 69 000 $ en revenu imposable après majoration. Même si le crédit réduit l'impôt réel, ce revenu majoré peut déclencher la récupération PSV.",
    ch2Credit:
      "Crédit pour revenu de pension : à partir de 65 ans, les premiers 2 000 $ de revenu de pension admissible (FERR, rente à PD) donnent droit à un crédit fédéral de 15 % + crédit provincial. Au Québec, environ 300 $ d'économies par personne. Pour un couple, ça double.",
    ch2Effective:
      "Le taux marginal effectif — la vraie facture : chaque dollar de revenu additionnel peut aussi réduire votre PSV, votre SRG, votre crédit TPS/TVH et votre crédit d'âge. Ces récupérations s'empilent. Dans certaines plages de revenus, le taux marginal effectif peut dépasser 70 %.",
    ch2GISTrap:
      "Zone SRG = piège fiscal : un retraité recevant le SRG qui retire 1 000 $ de son FERR perd ~150 $ d'impôt + 500 $ de SRG récupéré + ~50 $ de crédit TPS = 700 $ de déductions sur 1 000 $. Taux effectif : 70 %. Le CELI est crucial pour les revenus modestes.",

    ch3Title: "Protéger votre PSV",
    ch3Sub: "La récupération — et comment l'éviter",
    ch3Body:
      "La Pension de la sécurité de la vieillesse (PSV) vaut 742 $/mois en 2026 (65-74 ans) ou 817 $/mois (75+). Sur 25 ans, c'est plus de 220 000 $. Mais si votre revenu net dépasse 95 323 $, le gouvernement récupère 15 ¢ par dollar excédentaire. Autour de 155 000 $, votre PSV tombe à zéro.",
    ch3Tool: "Calculateur — combien la récupération PSV vous coûte",
    ch3Strategies: "Cinq stratégies pour protéger votre PSV",
    ch3S1: "1. Meltdown REER avant 72 ans — retirez graduellement entre 60 et 72 ans pour éviter les retraits FERR forcés qui gonflent le revenu après 72 ans.",
    ch3S2: "2. Prioriser le CELI — les retraits CELI ne comptent pas dans le revenu net pour la PSV. Choix stratégique pendant l'accumulation.",
    ch3S3: "3. Fractionner le revenu de pension — jusqu'à 50 % du revenu de pension admissible au conjoint. Deux revenus de 70 k$ valent mieux qu'un seul 140 k$.",
    ch3S4: "4. Reporter la PSV à 70 ans — +36 % à vie, et permet de compléter le meltdown REER avant que la PSV s'ajoute au revenu imposable.",
    ch3S5: "5. Attention aux dividendes — la majoration gonfle le revenu net. Dans la zone de récupération, les gains en capital (50 % d'inclusion) sont souvent préférables.",

    ch4Title: "Choisir votre âge RRQ/RPC",
    ch4Sub: "60, 65 ou 70 — une décision permanente",
    ch4Body:
      "La décision est irréversible. À 60 ans, vous recevez 36 % de moins qu'à 65. À 70 ans, vous recevez 42 % de plus. La bonne réponse dépend de votre santé, vos autres revenus et votre espérance de vie.",
    ch4Tool: "Calculateur — point d'équilibre RRQ/RPC",
    ch4Break:
      "Si vous différez de 65 à 70, vous renoncez à 5 ans de pension (~90 k$ cumulatif au max). En échange, chaque paiement mensuel est 42 % plus élevé. Le point d'équilibre est autour de 82 ans. Espérance de vie d'un Canadien de 65 ans : ~87 (hommes) / ~89 (femmes). La probabilité de dépasser 82 ans est élevée.",
    ch4Early:
      "Quand réclamer tôt a du sens : problèmes de santé qui réduisent l'espérance de vie, besoin de liquidité immédiat sans autres sources, conjoint survivant à faible revenu (la rente de survivant est basée sur votre rente, pas le maximum).",

    ch5Title: "Fractionnement de revenu",
    ch5Sub: "Diviser pour économiser — pour couples",
    ch5Body:
      "À partir de 65 ans, vous pouvez transférer jusqu'à 50 % de votre revenu de pension admissible à votre conjoint sur vos déclarations. Revenu admissible : retraits FERR, rentes de pension à PD, certaines rentes viagères. RRQ/RPC, PSV et retraits REER (avant conversion en FERR) ne sont pas admissibles.",
    ch5Tool: "Calculateur — économie du fractionnement de pension",
    ch5Why:
      "Pourquoi c'est puissant : le système canadien est progressif. Si un conjoint est à 45 % et l'autre à 27 %, transférer 50 % de la pension du premier fait passer chaque dollar transféré d'un palier à 45 % à un palier à 27 % — soit 18 ¢ économisés par dollar. Sur 60 000 $ de pension, le fractionnement de 30 000 $ peut économiser 3 000 à 5 000 $ par année.",
    ch5Quebec:
      "QUÉBEC — Le fractionnement fonctionne au provincial aussi : Revenu Québec accepte le fractionnement de pension aux mêmes conditions. Formulaires T1032 (fédéral) + TP-1012.A (provincial). L'économie est donc double.",
    ch5NoSplit:
      "Ce qu'on NE PEUT PAS fractionner : la RRQ/RPC n'est pas admissible au fractionnement de pension (un partage RRQ distinct existe mais c'est un mécanisme différent et permanent). Les retraits REER avant 65 ans ne sont pas admissibles non plus.",

    ch6Title: "Frais de gestion",
    ch6Sub: "Le coût invisible qui ronge votre patrimoine",
    ch6Body:
      "Les frais de gestion (MER — Management Expense Ratio) sont le prédateur silencieux de votre retraite. Un fonds commun canadien moyen charge environ 2,2 % par an. Ça paraît petit. Sur 30 ans, c'est la différence entre prendre sa retraite à 60 ans ou à 67 ans.",
    ch6Tool: "Calculateur — impact des frais sur 30 ans",
    ch6Why:
      "Pourquoi 2 % détruit votre patrimoine : les frais sont chargés sur le solde total, chaque année, peu importe la performance. Si le marché rend 7 % et vos frais sont 2,2 %, votre rendement net est 4,8 %. Sur 200 000 $ investis pendant 30 ans à 6 % brut : un FNB à 0,20 % produit 578 000 $, un fonds à 2,20 % produit 349 000 $. Différence : 229 000 $.",
    ch6Options:
      "Options à faibles frais au Canada : FNB indiciels (~0,05 à 0,25 % de RFG selon l'émetteur). Portefeuilles tout-en-un (FNB d'allocation) ~0,20 à 0,25 % — un seul FNB, rééquilibrage automatique. Robots-conseillers ~0,5 % tout inclus, sans toucher aux placements vous-même.",

    ch7Title: "Les risques qu'on ne mentionne pas",
    ch7Sub: "Longévité, inflation, séquence — les trois ennemis invisibles",
    ch7Body:
      "Les plans financiers échouent rarement à cause d'un seul krach. Ils échouent à cause de risques lents, cumulatifs et souvent ignorés.",
    ch7Longevity:
      "1. Risque de longévité — un Canadien de 65 ans a ~30 % de chance d'atteindre 90 ans et ~10 % de dépasser 95. Pour un couple, la probabilité qu'au moins un dépasse 90 ans est de 50 %+. Reporter la RRQ à 70 ans est une forme d'assurance longévité.",
    ch7Inflation:
      "2. Risque d'inflation — à 3 % par an, votre pouvoir d'achat est coupé en deux en 24 ans. Les soins de santé augmentent typiquement plus vite que l'inflation générale. PSV et RRQ sont indexés. Vos retraits REER, CELI et NE ne le sont pas.",
    ch7Sequence:
      "3. Risque de séquence des rendements — un krach de 30 % l'année de votre retraite est catastrophique. Le même krach 10 ans plus tard, beaucoup moins. Pourquoi ? Les retraits en début de retraite amplifient les pertes.",
    ch7Protect:
      "Protection : conservez 2 à 3 ans de dépenses en liquidités ou obligations court terme — pour ne jamais avoir à vendre en krach. C'est votre « coussin de décaissement ».",

    bonus301Title: "Bonus 301 — Stratégies avancées",
    bonus301Sub: "Pour ceux qui veulent chaque dollar d'optimisation",
    bonus301Body:
      "Les chapitres 8 à 11 sont pour les situations complexes : REER de 500 k$+, société par actions (CCPC), propriétés à revenus, ou manoeuvre Smith. Si ce n'est pas votre cas, les chapitres 1 à 7 couvrent l'essentiel.",

    ch8Title: "Le meltdown REER en détail",
    ch8Sub: "Décaissement stratégique — le levier le plus puissant",
    ch8Body:
      "Le « meltdown » REER consiste à retirer volontairement de votre REER avant 72 ans pour rester dans un palier d'imposition bas et éviter les retraits FERR forcés qui pourraient déclencher la récupération PSV. Contre-intuitif — on vous a dit toute votre vie de ne pas toucher au REER. Mais en décaissement, les règles changent.",
    ch8Tool: "Calculateur — votre fenêtre de meltdown REER",
    ch8Steps: [
      ["Étape 1", "Identifiez votre palier fiscal cible. Au Québec 2026, le premier palier fédéral se termine à 57 375 $. Le taux marginal combiné reste autour de 27-32 % sous ce seuil."],
      ["Étape 2", "Calculez votre revenu fixe (RRQ/RPC, rente à PD, travail à temps partiel). La place restante dans le palier cible est votre « budget meltdown » annuel."],
      ["Étape 3", "Retirez ce montant de votre REER chaque année. Déposez le net dans votre CELI (si place) ou dans un NE."],
      ["Étape 4", "À 72 ans, votre REER converti en FERR sera beaucoup plus petit — les retraits minimums ne gonfleront plus votre revenu au-dessus du seuil PSV."],
    ],
    ch8Golden:
      "STRATÉGIE AVANCÉE — Meltdown pré-RRQ agressif : si vous prenez votre retraite avant 60 ans et que votre revenu est très bas, vous pouvez remplir les paliers fiscaux bas avec de gros retraits REER à un taux de 15-20 %. C'est la « zone dorée du meltdown » — entre la retraite et 65 ans.",
    ch8NotOptimal:
      "ATTENTION — Quand le meltdown n'est pas optimal : si votre REER est modeste (moins de 200 k$), les retraits FERR obligatoires à 72 ans ne dépasseront probablement pas le seuil PSV. Le meltdown ne vaut alors pas la complexité.",

    ch9Title: "Guardrails — dépenser sans tomber",
    ch9Sub: "Ajuster vos retraits au marché",
    ch9Body:
      "La règle du 4 % est connue : retirer 4 % du portefeuille la première année, puis ajuster à l'inflation. Simple mais rigide. Basée sur des données américaines (1926-1995) — des décennies où les taux obligataires étaient plus élevés et les valorisations boursières plus basses. Plusieurs chercheurs estiment le taux sécuritaire actuel à 3,3-3,8 %. Si le marché chute de 40 % et que vous retirez le même montant, vous épuisez votre portefeuille plus vite.",
    ch9Principle:
      "Le principe des guardrails : une bande autour du taux de retrait cible. Par exemple cible 4,5 %, plancher 3,5 %, plafond 5,5 %. Si le portefeuille performe bien et que le taux effectif tombe sous 3,5 %, les retraits peuvent augmenter. S'il dépasse 5,5 %, ils peuvent être réduits temporairement. La méthode reste flexible : aucun seuil n'est imposé.",
    ch9Example:
      "EXEMPLE — Portefeuille 800 k$. Retrait initial 36 k$/an (4,5 %). Après krach de 25 %, portefeuille à 600 k$. Taux effectif : 6,0 % (au-dessus du plafond). Action : réduire à 33 k$/an. Quand le portefeuille remonte à 800 k$+, retour à la normale.",

    ch10Title: "L'immobilier dans le plan de retraite",
    ch10Sub: "DPA, manoeuvre Smith et timing de vente",
    ch10Body:
      "Une propriété à revenus est un actif puissant — revenu passif, appréciation, avantages fiscaux. Mais c'est aussi complexe au décaissement. La déduction pour amortissement (DPA) que vous avez réclamée doit être « remboursée » au fisc à la vente. Le timing de votre vente peut facilement représenter 15 à 40 k$ de différence d'impôt — pour la même propriété.",
    ch10DPA:
      "DPA — Avantage à double tranchant : la DPA réduit votre revenu imposable chaque année, typiquement 4 % du solde déclinant (catégorie 1). Mais à la vente, toute la DPA accumulée est « récupérée » et imposée comme revenu ordinaire — pas comme gain en capital. 100 % d'inclusion, à votre taux marginal complet.",
    ch10Timing:
      "Vendre avant la retraite (salaire comme seul revenu) garde le gain dans un palier prévisible. Vendre après, quand RRQ + PSV + FERR s'empilent, pousse le revenu dans les plus hauts paliers et peut déclencher la récupération PSV. Une avenue qui minimise typiquement la facture fiscale : une vente cadrée dans une année « creuse fiscale » — entre la fin de l'emploi et le début de la RRQ/RPC, ou durant la fenêtre de meltdown REER.",
    ch10Capital:
      "À NOTER — Taux d'inclusion des gains en capital : depuis juin 2024, le taux passe de 50 % à 66,67 % au-delà de 250 000 $ de gains annuels pour les particuliers. Pour les sociétés, 66,67 % dès le premier dollar.",
    ch10Smith:
      "La manoeuvre Smith — transformer un prêt hypothécaire en déduction. Mécanique : l'hypothèque est remboursée normalement. Chaque paiement libère de la place sur la marge de crédit hypothécaire (HELOC). Le même montant est immédiatement réemprunté sur la HELOC et investi dans des placements produisant un revenu imposable. L'intérêt HELOC devient alors déductible. RISQUES : levier financier, dépendance aux marchés, possible contestation ARC si le lien revenu-emprunt n'est pas clair.",

    ch11Title: "La société par actions et la retraite",
    ch11Sub: "CCPC, extraction et optimisation",
    ch11Body:
      "Votre société privée sous contrôle canadien (CCPC) est un véhicule de report fiscal pendant vos années actives. Mais à la retraite, chaque dollar doit sortir — et la façon de l'extraire détermine combien le gouvernement garde. C'est un jeu d'échecs entre le taux corporatif, le taux personnel, la RRQ/RPC, la PSV et l'intégration fiscale.",
    ch11SBD:
      "Le grind de la DPE — le piège de 50 000 $ : si votre société génère plus de 50 000 $ de revenu de placement passif annuel (intérêts, dividendes, gains en capital), la DPE est progressivement réduite. À 150 000 $ de revenu passif, la DPE tombe à zéro — votre taux corporatif saute de ~12 % à ~26 % sur le revenu actif.",
    ch11Extract:
      "Extraction à 3 couches : (1) Salaire minimal (~15 000 $) pour cotiser à la RRQ et protéger vos droits. Crée ~2 700 $ de place REER. (2) Dividendes en capital (CDC) — entièrement libres d'impôt. Votre CDC se bâtit chaque fois que la société réalise un gain en capital. (3) Dividendes imposables pour couvrir le reste, en visant le seuil PSV de 95 323 $.",
    ch11RDTOH:
      "Le compte IMRTDD — l'impôt remboursable caché : quand votre société gagne du revenu de placement, elle paie un impôt plus élevé (~50 %), dont une partie est « remboursable » lors du paiement de dividendes. Pour chaque 2,61 $ de dividende éligible versé, la société récupère 1 $ de l'IMRTDD.",

    mistakesTitle: "Les 5 erreurs de décaissement les plus coûteuses",
    mistakes: [
      ["1. Réclamer la RRQ à 60 ans sans analyse", "La réduction de 36 % est permanente. Si vous vivez jusqu'à 85 ans, différer à 65 ou 70 peut représenter plus de 100 000 $ de revenu à vie supplémentaire."],
      ["2. Ignorer la récupération PSV", "Chaque dollar au-dessus de 95 323 $ coûte 15 ¢ en PSV récupérée — en plus de l'impôt régulier. Sur 20 ans, la perte peut dépasser 85 000 $."],
      ["3. Retirer du CELI en premier", "Le CELI est votre compte de retraite le plus précieux — les retraits n'affectent ni impôt, ni PSV, ni SRG. Retirer en premier est presque toujours sous-optimal."],
      ["4. Garder un portefeuille à 2 % de frais pendant 30 ans de retraite", "Sur 500 000 $, l'écart entre 0,25 % et 2,20 % représente plus de 350 000 $ sur 30 ans — l'équivalent de 5 années complètes de dépenses perdues en frais invisibles."],
      ["5. Ne pas fractionner le revenu de pension", "Un couple où un seul conjoint a une rente peut économiser 3 000 à 5 000 $ d'impôt par an en transférant jusqu'à 50 %. T1032 + TP-1012.A. Zéro coût. Zéro risque. Juste un formulaire à remplir."],
    ],

    simTitle: "Bonus — Simulateur interactif de décaissement",
    simBody:
      "Testez votre plan de décaissement avec un simulateur complet : retraits par compte, impact PSV, meltdown, timing RRQ. Gratuit, aucun compte requis.",
    simBtn: "Ouvrir le simulateur →",
    simHref: "/outils/decaissement",

    ctaTitle: "Votre Bilan 360 applique ces stratégies automatiquement",
    ctaBody:
      "Ce guide vous a donné le cadre conceptuel. Votre Rapport transforme ça en plan numéroté, adapté à votre province, vos comptes, votre couple et vos propriétés. Retrait optimisé, timing RRQ/PSV, impact des frais, tests de stress, 5 000 simulations Monte Carlo.",
    ctaBtn: "Obtenir mon Bilan 360 — 29,99 $",
    ctaHref: "/bilan-360",
    ctaPlanner: "Planner + 5 rapports — 69,99 $",
    ctaPlannerHref: "/acheter-planner",

    quote:
      "« Optimiser, ce n'est pas spéculer. C'est payer le juste impôt — pas un dollar de plus. »",

    /* calculator labels */
    cOASIncome: "Votre revenu net estimé",
    cOASAge: "Âge",
    cOASYears: "Horizon (années)",
    cOASThreshold: "Seuil 2026 : 95 323 $",
    cOASBase: "PSV de base (avant récupération)",
    cOASBaseNote65: "65-74 ans : 742 $/mois × 12",
    cOASBaseNote75: "75+ ans : 817 $/mois × 12",
    cOASLost: "PSV récupérée par année",
    cOASNet: "PSV nette par année",
    cOASTotal: "Perte cumulée",
    cOASRate: "Taux marginal effectif ajouté",
    cOASZero: "PSV complètement récupérée",
    cOASNote: "Modèle : utilise la base PSV de votre âge actuel, multipliée par l'horizon. Ne modélise pas la transition 75+ pendant l'horizon (base plus élevée à 75+), l'indexation trimestrielle de la PSV, ni la croissance de votre revenu net. Matériel seulement si revenu > 155 000 $ (où la base devient la contrainte).",

    cQPPMax: "Rente estimée à 65 ans ($/mois)",
    cQPPLife: "Espérance de vie (années)",
    cQPPAt60: "À 60 ans",
    cQPPAt65: "À 65 ans",
    cQPPAt70: "À 70 ans",
    cQPPCumul: "Cumulatif à l'espérance de vie",
    cQPPMonthly: "Mensuel",
    cQPPNote: "Comparaison simple en dollars nominaux, non actualisés. Ignore l'indexation et l'effet fiscal. Le point d'équilibre vs 65 ans est d'environ 82 ans.",

    cISpouseA: "Revenu pension conjoint A ($/an)",
    cIRateA: "Taux marginal A",
    cIRateB: "Taux marginal B",
    cISplit: "% transféré à B (max 50 %)",
    cIWithout: "Impôt SANS fractionnement",
    cIWith: "Impôt AVEC fractionnement",
    cISaving: "Économie annuelle",
    cINote: "Modèle simplifié : applique le taux marginal de chaque conjoint sur sa portion. Ignore les crédits personnels, le gross-up des dividendes, la récupération PSV/SRG et les paliers progressifs. Les économies réelles peuvent différer.",

    cMBal: "Solde actuel",
    cMContrib: "Cotisation mensuelle",
    cMYears: "Horizon (années)",
    cMGross: "Rendement brut",
    cMLow: "MER faible (FNB)",
    cMHigh: "MER élevé (fonds commun)",
    cMLowFV: "Résultat FNB",
    cMHighFV: "Résultat fonds commun",
    cMDelta: "Différence cumulée",
    cMNote: "Modèle : rendement constant en ligne droite, composition mensuelle. L'écart montre l'impact pur des frais de gestion, à rendement brut identique. Suppose que les choix d'investissement sont équivalents — différent d'une comparaison fonds gérés vs indiciels.",

    cMDAge: "Âge actuel",
    cMDRRSP: "Solde REER actuel",
    cMDFixed: "Autre revenu prévu ($/an)",
    cMDTarget: "Plafond du palier visé ($/an)",
    cMDBudget: "Budget meltdown annuel",
    cMDYears: "Années disponibles (jusqu'à 72)",
    cMDTotal: "Meltdown total possible",
    cMDRemain: "REER restant à 72 ans",
    cMDFeasible: "REER suffit à soutenir ce meltdown",
    cMDNotFeasible: "REER épuisé avant 72 ans",
    cMDNote: "Hypothèse : croissance réelle de 3 %/an pendant le meltdown. Montants en dollars d'aujourd'hui.",

    sources:
      "Sources : ARC (paliers fédéraux 2026, crédit pour revenu de pension, règles FERR, DPA catégorie 1, IMRTDD, seuils DPE, taux d'inclusion gains en capital), Service Canada (PSV Q1 2026, récupération), Retraite Québec (RRQ 60/65/70, max 2026), Revenu Québec (paliers provinciaux, taux corporatif DPE, majoration dividendes), Morningstar Canada (MER moyens), Vanguard Canada (FNB), Guyton-Klinger (2006), Fraser Smith (2002), ACCAP (CPM 2023).",
    disclaimer:
      "Ce guide est fourni à des fins d'information et d'éducation seulement. Il ne constitue aucunement un conseil financier, fiscal, juridique ou de placement personnalisé. Les stratégies décrites (meltdown REER, fractionnement, manoeuvre Smith, DPA, extraction corporative, pipeline) comportent des risques et implications fiscales qui varient selon votre situation. Les chiffres et seuils sont basés sur les données disponibles pour l'année fiscale 2026 et peuvent changer. Consultez un planificateur financier (Pl. Fin.), fiscaliste ou CPA avant toute stratégie avancée.",
  },
  en: {
    eyebrow: "Guide 201 · Bonus 301",
    title: "Optimize Your Retirement",
    tagline: "Withdrawal, tax strategy and optimization — for established portfolios.",
    intro:
      "This guide is for households that have built significant wealth (RRSP, TFSA, real estate or incorporated business). It turns your knowledge into concrete decisions. Taxes. Withdrawal. Fees. The levers that change everything.",
    langSwitch: "Français",
    pdfLabel: "Download PDF",
    pdfHref: "/guide-201-optimize-your-retirement.pdf",
    prereq: "PREREQUISITE: this guide assumes you are familiar with RRSP, TFSA, OAS and QPP/CPP. If these are unfamiliar, start with Guide 101.",
    prereqLink: "See Guide 101 →",

    tocTitle: "In this guide",
    toc201: "Part 201 — Intermediate Strategies",
    toc301: "Bonus 301 — Advanced Strategies",
    toc: [
      { n: 1, t: "When and how to withdraw", s: "The order that minimizes your lifetime taxes" },
      { n: 2, t: "Taxes in retirement", s: "Brackets, credits and traps" },
      { n: 3, t: "Protecting your OAS", s: "The clawback and how to avoid it" },
      { n: 4, t: "Choosing your QPP/CPP age", s: "60, 65 or 70 — full analysis" },
      { n: 5, t: "Income splitting", s: "Divide to save" },
      { n: 6, t: "Management fees", s: "The invisible cost eating your wealth" },
      { n: 7, t: "The risks nobody mentions", s: "Longevity, inflation, sequence" },
    ],
    toc2: [
      { n: 8, t: "The RRSP meltdown in detail", s: "Strategic drawdown before age 72" },
      { n: 9, t: "Guardrails — spend without falling", s: "Adjusting withdrawals to the market" },
      { n: 10, t: "Real estate in the retirement plan", s: "CCA, Smith and sale timing" },
      { n: 11, t: "The incorporated business", s: "CCPC, extraction and optimization" },
    ],

    whereStart: "Where to start?",
    where: [
      ["Retiring soon", "Ch. 1 — Withdrawal", "Ch. 4 → Ch. 3"],
      ["Large RRSP ($500K+)", "Ch. 8 — Meltdown", "Ch. 3 → Ch. 2"],
      ["As a couple", "Ch. 5 — Splitting", "Ch. 1 → Ch. 4"],
      ["Paying too much in fees", "Ch. 6 — Fees", "Ch. 7"],
      ["Own rental properties", "Ch. 10 — Real estate", "Ch. 3 → Ch. 2"],
      ["Incorporated business", "Ch. 11 — Business", "Ch. 8 → Ch. 9"],
      ["Understand everything", "Ch. 1 — page 1", "Read in order"],
    ],

    ch1Title: "When and how to withdraw",
    ch1Sub: "The order that minimizes your lifetime taxes",
    ch1Body:
      "Accumulating savings is one thing. Withdrawing them intelligently is another. The order in which you draw down your accounts can easily represent $50,000 to $150,000 in tax savings over 25 years of retirement. It's probably the most important financial decision — and the least discussed.",
    ch1Order: "Optimal withdrawal order — minimize lifetime taxes",
    ch1OrderList: [
      "1. Non-registered account (NR)",
      "2. RRSP / RRIF (controlled meltdown)",
      "3. Pension / annuities",
      "4. TFSA (last resort)",
    ],
    ch1PhasesTitle: "The four phases of withdrawal",
    ch1Phases: [
      ["Pre-retirement", "55-60", "NR + RRSP meltdown", "Fill bracket 1 before QPP"],
      ["Transition", "60-65", "QPP (if deferred) + NR + RRSP", "Tax arbitrage pre-OAS"],
      ["Cruising", "65-72", "OAS + QPP + residual RRSP", "Protect OAS threshold"],
      ["Mandatory RRIF", "72+", "RRIF (min. withdrawals) + TFSA", "TFSA = last resort"],
    ],
    ch1Example:
      "EXAMPLE — Couple age 65, RRSP $400K, TFSA $200K, NR $100K. Conventional withdrawal (RRSP first): estimated total tax over 25 years ≈ $185K. Optimized withdrawal (meltdown + NR first + TFSA preserved): $112K. Difference: up to $73K in potential tax savings.",

    ch2Title: "Taxes in retirement",
    ch2Sub: "What the government takes back — and how to limit the damage",
    ch2Body:
      "In retirement, the nature of your income changes: salary replaced by pensions, RRIF withdrawals, QPP/CPP and OAS. Each source is taxed differently. Understanding the brackets and available credits is understanding why certain decisions are worth thousands.",
    ch2BracketsTitle: "Combined marginal rate — 2026",
    ch2ProvLabel: "Province",
    ch2BandLabel: "Income band",
    ch2RateLabel: "Marginal rate",
    ch2Sources:
      "RRIF/RRSP — 100% taxable. QPP/CPP — taxable, eligible for pension income credit ($2,000 at 65+). OAS — taxable, with effective marginal rate up to 15% higher (clawback). TFSA — never taxable. Capital gains — 50% inclusion. Canadian dividends — attractive credit, but the gross-up inflates net income (affects OAS).",
    ch2Dividend:
      "CAUTION — The gross-up trap: a $50,000 eligible dividend becomes $69,000 in taxable income after gross-up. Even though the credit reduces actual tax, this grossed-up income can trigger OAS clawback.",
    ch2Credit:
      "Pension income credit: starting at age 65, the first $2,000 of eligible pension income (RRIF, DB pension annuity) qualifies for a 15% federal credit + provincial credit. In Quebec, about $300 in savings per person. For a couple, it doubles.",
    ch2Effective:
      "True effective marginal rate — the real bill: every additional dollar can also reduce your OAS, GIS, GST/HST credit and age credit. These clawbacks stack. In certain income ranges, the effective marginal rate can exceed 70%.",
    ch2GISTrap:
      "GIS zone = tax trap: a retiree receiving GIS who withdraws $1,000 from their RRIF loses ~$150 tax + $500 GIS clawback + ~$50 GST credit = $700 in deductions on $1,000. Effective rate: 70%. TFSA is crucial for modest incomes.",

    ch3Title: "Protecting your OAS",
    ch3Sub: "The clawback — and how to avoid it",
    ch3Body:
      "Old Age Security (OAS) is worth $742/month in 2026 (ages 65-74) or $817/month (75+). Over 25 years, that's more than $220,000. But if your net income exceeds $95,323, the government claws back 15¢ per dollar above. Around $155,000, your OAS drops to zero.",
    ch3Tool: "Calculator — how much OAS clawback costs you",
    ch3Strategies: "Five strategies to protect your OAS",
    ch3S1: "1. RRSP meltdown before 72 — gradually withdraw between 60 and 72 to avoid forced RRIF withdrawals that inflate income after 72.",
    ch3S2: "2. Prioritize the TFSA — TFSA withdrawals don't count toward net income for OAS. Strategic choice during accumulation.",
    ch3S3: "3. Split pension income — up to 50% of eligible pension to spouse. Two $70K incomes beat a single $140K.",
    ch3S4: "4. Defer OAS to 70 — +36% for life, and lets you complete the RRSP meltdown before OAS adds to taxable income.",
    ch3S5: "5. Watch dividends — gross-up inflates net income. In the clawback zone, capital gains (50% inclusion) are often preferable.",

    ch4Title: "Choosing your QPP/CPP age",
    ch4Sub: "60, 65 or 70 — a permanent decision",
    ch4Body:
      "The decision is irreversible. At 60, you receive 36% less than at 65. At 70, you receive 42% more. The right answer depends on your health, other income and life expectancy.",
    ch4Tool: "Calculator — QPP/CPP break-even point",
    ch4Break:
      "If you defer from 65 to 70, you forgo 5 years of pension (~$90K cumulative at max). In exchange, every monthly payment is 42% higher. Break-even is around age 82. Life expectancy for a 65-year-old Canadian: ~87 (men) / ~89 (women). Probability of exceeding 82 is high.",
    ch4Early:
      "When claiming early makes sense: health issues reducing life expectancy, immediate liquidity need with no other sources, surviving spouse with low income (survivor benefit based on your pension, not the max).",

    ch5Title: "Income splitting",
    ch5Sub: "Divide to save — for couples",
    ch5Body:
      "Starting at age 65, you can transfer up to 50% of your eligible pension income to your spouse on your tax returns. Eligible income: RRIF withdrawals, DB pension annuities, certain life annuities. QPP/CPP, OAS and RRSP withdrawals (before conversion to RRIF) are not eligible.",
    ch5Tool: "Calculator — pension splitting savings",
    ch5Why:
      "Why it's powerful: the Canadian system is progressive. If one spouse is at 45% and the other at 27%, transferring 50% moves every dollar from a 45% bracket to a 27% bracket — saving 18¢ per dollar. On $60,000 of pension, splitting $30,000 can save $3,000 to $5,000 per year.",
    ch5Quebec:
      "QUEBEC — Splitting works provincially too: Revenu Québec accepts pension splitting under the same conditions. Forms T1032 (federal) + TP-1012.A (provincial). Savings are doubled.",
    ch5NoSplit:
      "What you CANNOT split: QPP/CPP is not eligible (a separate QPP sharing exists but it's a different and permanent mechanism). RRSP withdrawals before 65 are not eligible either.",

    ch6Title: "Management fees",
    ch6Sub: "The invisible cost eating your wealth",
    ch6Body:
      "Management fees (MER) are the silent predator of your retirement. An average Canadian mutual fund charges about 2.2% per year. It seems small. Over 30 years, it's the difference between retiring at 60 or at 67.",
    ch6Tool: "Calculator — fee impact over 30 years",
    ch6Why:
      "Why 2% destroys your wealth: fees are charged on the total balance, every year, regardless of performance. If the market returns 7% and your fees are 2.2%, your net return is 4.8%. On $200,000 invested for 30 years at 6% gross: ETF at 0.20% produces $578,000, fund at 2.20% produces $349,000. Difference: $229,000.",
    ch6Options:
      "Low-fee options in Canada: Index ETFs (~0.05-0.25% MER depending on issuer). All-in-one asset-allocation ETFs ~0.20-0.25% — one ETF, automatic rebalancing. Robo-advisors ~0.5% all-in, hands-off investing.",

    ch7Title: "The risks nobody mentions",
    ch7Sub: "Longevity, inflation, sequence — three invisible enemies",
    ch7Body:
      "Financial plans rarely fail because of a single crash. They fail because of slow, cumulative, often ignored risks.",
    ch7Longevity:
      "1. Longevity risk — a 65-year-old Canadian has ~30% chance of reaching 90 and ~10% of exceeding 95. For a couple, probability that at least one exceeds 90 is 50%+. Deferring QPP to 70 is a form of longevity insurance.",
    ch7Inflation:
      "2. Inflation risk — at 3% per year, your purchasing power is halved in 24 years. Healthcare typically rises faster than general inflation. OAS and QPP are indexed. Your RRSP, TFSA and NR withdrawals are not.",
    ch7Sequence:
      "3. Sequence of returns risk — a 30% crash the year you retire is catastrophic. Same crash 10 years later, much less. Early withdrawals from a falling portfolio amplify the loss.",
    ch7Protect:
      "Protection: keep 2 to 3 years of expenses in cash or short-term bonds — to never have to sell during a crash. That's your \"withdrawal cushion\".",

    bonus301Title: "Bonus 301 — Advanced Strategies",
    bonus301Sub: "For those who want every dollar of optimization",
    bonus301Body:
      "Chapters 8 to 11 are for complex wealth situations: RRSP over $500K, incorporated business (CCPC), rental properties or Smith Manoeuvre. If that's not your case, chapters 1 to 7 cover the essentials.",

    ch8Title: "The RRSP meltdown in detail",
    ch8Sub: "Strategic drawdown — the most powerful lever",
    ch8Body:
      "The RRSP \"meltdown\" means voluntarily withdrawing from your RRSP before age 72 to stay in a low tax bracket and avoid forced RRIF withdrawals that could trigger OAS clawback. Counterintuitive — you've been told your whole life not to touch your RRSP. But in drawdown, the rules change.",
    ch8Tool: "Calculator — your RRSP meltdown window",
    ch8Steps: [
      ["Step 1", "Identify your target tax bracket. In Quebec 2026, the first federal bracket ends at $57,375. Combined marginal rate stays around 27-32% below that threshold."],
      ["Step 2", "Calculate your fixed income (QPP/CPP, DB pension, part-time work). The remaining room in the target bracket is your annual \"meltdown budget\"."],
      ["Step 3", "Withdraw that amount from your RRSP each year. Deposit the net into your TFSA (if room) or a non-registered account."],
      ["Step 4", "At 72, your RRSP converted to RRIF will be much smaller — mandatory withdrawals will no longer inflate your income beyond the OAS threshold."],
    ],
    ch8Golden:
      "ADVANCED — Aggressive pre-QPP meltdown: if you retire before 60 and your income is very low, you can fill the lowest tax brackets with massive RRSP withdrawals at a 15-20% rate. This is the \"golden meltdown zone\" — between retirement and 65.",
    ch8NotOptimal:
      "CAUTION — When the meltdown is not optimal: if your RRSP is modest (under $200K), mandatory RRIF withdrawals at 72+ likely won't exceed the OAS threshold. The meltdown isn't worth the complexity.",

    ch9Title: "Guardrails — spend without falling",
    ch9Sub: "Adjusting your withdrawals to the market",
    ch9Body:
      "The 4% rule is well known: withdraw 4% of your portfolio the first year, then adjust for inflation. Simple but rigid. Based on US historical data (1926-1995) — decades when bond yields were higher and stock valuations lower than today. Several researchers estimate a safe current rate at 3.3-3.8%. If the market drops 40% and you withdraw the same amount, you deplete your portfolio faster.",
    ch9Principle:
      "The guardrails principle: a band around the target withdrawal rate. For example, target 4.5%, floor 3.5%, ceiling 5.5%. If the portfolio performs well and the effective rate drops below 3.5%, withdrawals can increase. If it climbs above 5.5%, they can be reduced temporarily. The method stays flexible: no threshold is imposed.",
    ch9Example:
      "EXAMPLE — Portfolio $800K. Initial withdrawal $36K/year (4.5%). After a 25% crash, portfolio at $600K. Effective rate: 6.0% (above ceiling). Action: reduce to $33K/year. When portfolio recovers to $800K+, return to normal.",

    ch10Title: "Real estate in the retirement plan",
    ch10Sub: "CCA, Smith Manoeuvre and sale timing",
    ch10Body:
      "A rental property is a powerful asset — passive income, appreciation, tax advantages. But complex at drawdown. The capital cost allowance (CCA) you've claimed must be \"repaid\" to tax authorities upon sale. Sale timing can easily represent $15-40K difference in tax — for the same property.",
    ch10DPA:
      "CCA — Double-edged tax advantage: CCA reduces your taxable income each year, typically at 4% of declining balance (Class 1). But upon sale, all accumulated CCA is \"recaptured\" and taxed as ordinary income — not capital gain. 100% inclusion, at your full marginal rate.",
    ch10Timing:
      "Selling before retirement (salary as the only income) keeps the gain in a predictable bracket. Selling after, when QPP + OAS + RRIF stack, pushes income into top brackets and can trigger OAS clawback. An avenue that typically minimizes the tax bill: framing the sale in a \"tax-trough\" year — between end of employment and start of QPP/CPP, or during the RRSP meltdown window.",
    ch10Capital:
      "NOTE — Capital gains inclusion rate: since June 2024, the rate rises from 50% to 66.67% above $250,000 in annual gains for individuals. For corporations, 66.67% from the first dollar.",
    ch10Smith:
      "Smith Manoeuvre — converting a mortgage into a deduction. Mechanics: the mortgage is repaid normally. Each payment frees room on the home equity line of credit (HELOC). The same amount is immediately re-borrowed on the HELOC and invested in income-producing investments. HELOC interest then becomes deductible. RISKS: leverage, market dependency, CRA may challenge if the income link isn't clear.",

    ch11Title: "The incorporated business and retirement",
    ch11Sub: "CCPC, extraction and optimization",
    ch11Body:
      "Your Canadian-controlled private corporation (CCPC) is a tax deferral vehicle during your working years. But at retirement, every dollar must come out — and how you extract it determines how much the government keeps. It's a chess game between corporate rate, personal rate, QPP/CPP, OAS and tax integration.",
    ch11SBD:
      "The SBD grind — the $50,000 trap: if your corporation generates more than $50,000 in annual passive investment income, the SBD is gradually reduced. At $150,000 passive, SBD drops to zero — your corporate rate jumps from ~12% to ~26% on active income.",
    ch11Extract:
      "3-layer extraction: (1) Minimal salary (~$15,000) to contribute to QPP/CPP and protect your rights. Creates ~$2,700 RRSP room. (2) Capital dividends (CDA) — entirely tax-free. CDA builds each time the corporation realizes a capital gain. (3) Taxable dividends to cover the rest, targeting OAS threshold of $95,323.",
    ch11RDTOH:
      "RDTOH account — the hidden refundable tax: when your corporation earns investment income, it pays a higher tax (~50%), part of which is \"refundable\" when dividends are paid. For every $2.61 of eligible dividend paid, the corporation recovers $1 of RDTOH.",

    mistakesTitle: "The 5 costliest withdrawal errors",
    mistakes: [
      ["1. Claiming QPP/CPP at 60 without analysis", "The 36% reduction is permanent. If you live to 85, deferring to 65 or 70 can represent $100,000+ in additional lifetime income."],
      ["2. Ignoring OAS clawback", "Every dollar above $95,323 costs 15¢ in clawed-back OAS — on top of regular tax. Over 20 years, the loss can exceed $85,000."],
      ["3. Withdrawing from the TFSA first", "The TFSA is your most valuable retirement account — withdrawals don't affect tax, OAS, or GIS. Touching it first is almost always suboptimal."],
      ["4. Keeping a 2% fee portfolio for 30 years of retirement", "On $500,000, the difference between 0.25% and 2.20% over 30 years is $350,000+ — equivalent of 5 full years of spending lost in invisible fees."],
      ["5. Not splitting pension income", "A couple where only one spouse has a pension can save $3,000-5,000 in tax per year by transferring up to 50%. T1032 + TP-1012.A. No cost. No risk. Just a form."],
    ],

    simTitle: "Bonus — Interactive withdrawal simulator",
    simBody:
      "Test your drawdown plan with a full simulator: withdrawals by account, OAS impact, meltdown, QPP timing. Free, no account required.",
    simBtn: "Open simulator →",
    simHref: "/outils/decaissement",

    ctaTitle: "Your Bilan 360 applies these strategies automatically",
    ctaBody:
      "This guide gave you the conceptual framework. Your Report turns it into a numbered plan, tailored to your province, your accounts, your couple and your properties. Optimized withdrawal, QPP/OAS timing, fee impact, stress tests, 5,000 Monte Carlo simulations.",
    ctaBtn: "Get my Bilan 360 — $29.99",
    ctaHref: "/bilan-360",
    ctaPlanner: "Planner + 5 reports — $69.99",
    ctaPlannerHref: "/acheter-planner",

    quote:
      "\"Optimization isn't speculation. It's paying the right amount of tax — not a dollar more.\"",

    cOASIncome: "Your estimated net income",
    cOASAge: "Age",
    cOASYears: "Horizon (years)",
    cOASThreshold: "Threshold 2026: $95,323",
    cOASBase: "Baseline OAS (before clawback)",
    cOASBaseNote65: "Ages 65-74: $742/mo × 12",
    cOASBaseNote75: "Ages 75+: $817/mo × 12",
    cOASLost: "OAS clawed back per year",
    cOASNet: "Net OAS per year",
    cOASTotal: "Cumulative loss",
    cOASRate: "Added effective marginal rate",
    cOASZero: "OAS fully clawed back",
    cOASNote: "Model: uses the OAS base for your current age × horizon. Does not model the 75+ transition during the horizon (higher base at 75+), quarterly OAS indexation, or growth in your net income. Material only if income > $155,000 (where the base becomes the binding constraint).",

    cQPPMax: "Estimated pension at 65 ($/mo)",
    cQPPLife: "Life expectancy (years)",
    cQPPAt60: "At 60",
    cQPPAt65: "At 65",
    cQPPAt70: "At 70",
    cQPPCumul: "Cumulative to life expectancy",
    cQPPMonthly: "Monthly",
    cQPPNote: "Simple comparison in nominal dollars, undiscounted. Ignores indexation and tax effects. Break-even vs age 65 is around age 82.",

    cISpouseA: "Spouse A pension income ($/yr)",
    cIRateA: "A marginal rate",
    cIRateB: "B marginal rate",
    cISplit: "% transferred to B (max 50%)",
    cIWithout: "Tax WITHOUT splitting",
    cIWith: "Tax WITH splitting",
    cISaving: "Annual savings",
    cINote: "Simplified model: applies each spouse's marginal rate on their portion. Ignores personal credits, dividend gross-up, OAS/GIS clawback, and progressive brackets. Actual savings may differ.",

    cMBal: "Current balance",
    cMContrib: "Monthly contribution",
    cMYears: "Horizon (years)",
    cMGross: "Gross return",
    cMLow: "Low MER (ETF)",
    cMHigh: "High MER (mutual fund)",
    cMLowFV: "ETF result",
    cMHighFV: "Mutual fund result",
    cMDelta: "Cumulative difference",
    cMNote: "Model: constant straight-line return, monthly compounding. Delta shows pure fee impact at identical gross return. Assumes equivalent investment choices — different from a managed vs index-fund comparison.",

    cMDAge: "Current age",
    cMDRRSP: "Current RRSP balance",
    cMDFixed: "Other expected income ($/yr)",
    cMDTarget: "Target bracket ceiling ($/yr)",
    cMDBudget: "Annual meltdown budget",
    cMDYears: "Years available (until 72)",
    cMDTotal: "Total possible meltdown",
    cMDRemain: "RRSP remaining at 72",
    cMDFeasible: "RRSP can sustain this meltdown",
    cMDNotFeasible: "RRSP depleted before age 72",
    cMDNote: "Assumes 3% real growth per year during meltdown. All amounts in today's dollars.",

    sources:
      "Sources: CRA (federal brackets 2026, pension credit, RRIF rules, CCA Class 1, RDTOH, SBD grind thresholds, capital gains rates), Service Canada (OAS Q1 2026, clawback), Retraite Québec (QPP 60/65/70, 2026 max), Revenu Québec (provincial brackets, combined SBD rates, dividend gross-up), Morningstar Canada (average MERs), Vanguard Canada (ETFs), Guyton-Klinger (2006), Fraser Smith (2002), CLHIA (CPM 2023).",
    disclaimer:
      "This guide is provided for informational and educational purposes only. It does not in any way constitute personalized financial, tax, legal, or investment advice. The strategies described (RRSP meltdown, splitting, Smith Manoeuvre, CCA, corporate extraction, pipeline) involve risks and tax implications that vary depending on your situation. Figures and thresholds are based on data available for the 2026 tax year and may change. Consult a certified financial planner (CFP), tax specialist, or CPA before any advanced strategy.",
  },
} as const;

/* ═══════════════════════════════════════════════════════
   Calculator — OAS Clawback
   ═══════════════════════════════════════════════════════ */
function OASCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [income, setIncome] = useState(115000);
  const [age, setAge] = useState(67);
  const [years, setYears] = useState(20);

  const data = useMemo(() => {
    const threshold = 95323;
    const is75Plus = age >= 75;
    const baseMonthly = is75Plus ? 817 : 742;
    const baseAnnual = baseMonthly * 12;
    const excess = Math.max(0, income - threshold);
    const clawback = Math.min(baseAnnual, excess * 0.15);
    const netOAS = Math.max(0, baseAnnual - clawback);
    const lostTotal = clawback * years;
    const fullyClawed = clawback >= baseAnnual;
    const effRateAdd = income > threshold && !fullyClawed ? 15 : 0;
    return { clawback, netOAS, lostTotal, effRateAdd, baseAnnual, is75Plus, fullyClawed };
  }, [income, age, years]);

  const row = (label: string, v: number, setV: (n: number) => void, step = 1000, suffix = "$") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>
        {label} <span style={{ color: CL.dim }}>({suffix})</span>
      </label>
      <input type="number" step={step} value={v || ""} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }} />
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 11, color: CL.dim, marginBottom: 10, fontStyle: "italic" }}>{t.cOASThreshold}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.cOASIncome, income, setIncome, 1000, "$")}
        {row(t.cOASAge, age, setAge, 1, fr ? "ans" : "yrs")}
        {row(t.cOASYears, years, setYears, 1, fr ? "ans" : "yrs")}
      </div>

      {/* Baseline OAS panel — depends on age, shown FIRST so age effect is visible */}
      <div style={{ background: CL.ink, color: "#fff", borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cOASBase}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>
              {data.is75Plus ? t.cOASBaseNote75 : t.cOASBaseNote65}
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{fCAD(data.baseAnnual, fr)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cOASLost}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(data.clawback, fr)}</div>
          {data.fullyClawed ? <div style={{ fontSize: 11, color: CL.ink, fontWeight: 700, marginTop: 2 }}>{t.cOASZero}</div> : null}
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cOASNet}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(data.netOAS, fr)}</div>
        </div>
        <div style={{ background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cOASTotal}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(data.lostTotal, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cOASRate}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>+{data.effRateAdd}%</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.cOASNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Calculator — QPP/CPP break-even
   ═══════════════════════════════════════════════════════ */
function QPPCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [base, setBase] = useState(1000); // monthly at 65
  const [life, setLife] = useState(87);

  const d = useMemo(() => {
    const at60 = base * 0.64, at65 = base, at70 = base * 1.42;
    const cum = (monthly: number, startAge: number) => monthly * 12 * Math.max(0, life - startAge);
    return {
      m60: at60, m65: at65, m70: at70,
      c60: cum(at60, 60), c65: cum(at65, 65), c70: cum(at70, 70),
    };
  }, [base, life]);

  const row = (label: string, v: number, setV: (n: number) => void, step = 10, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>{label} <span style={{ color: CL.dim }}>{suffix}</span></label>
      <input type="number" step={step} value={v || ""} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }} />
    </div>
  );

  const col = (label: string, mo: number, cum: number, color: string, bg: string) => (
    <div style={{ background: bg, border: `1px solid ${color}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: CL.dim, marginTop: 4 }}>{t.cQPPMonthly}: <strong style={{ color: CL.ink }}>{fCAD(mo, fr)}/mo</strong></div>
      <div style={{ fontSize: 20, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(cum, fr)}</div>
      <div style={{ fontSize: 11, color: CL.dim, marginTop: 2 }}>{t.cQPPCumul}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.cQPPMax, base, setBase, 10, "($)")}
        {row(t.cQPPLife, life, setLife, 1, fr ? "(ans)" : "(yrs)")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {col(t.cQPPAt60, d.m60, d.c60, CL.gold, CL.goldBg)}
        {col(t.cQPPAt65, d.m65, d.c65, CL.gold, CL.goldBg)}
        {col(t.cQPPAt70, d.m70, d.c70, CL.gold, CL.goldBg)}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.cQPPNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Calculator — Pension splitting
   ═══════════════════════════════════════════════════════ */
function SplitCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [pension, setPension] = useState(60000);
  const [rateA, setRateA] = useState(45);
  const [rateB, setRateB] = useState(27);
  const [splitPct, setSplitPct] = useState(50);

  const d = useMemo(() => {
    const withoutTax = pension * (rateA / 100);
    const transferred = pension * (Math.min(50, splitPct) / 100);
    const kept = pension - transferred;
    const withTax = kept * (rateA / 100) + transferred * (rateB / 100);
    const savings = Math.max(0, withoutTax - withTax);
    return { withoutTax, withTax, savings };
  }, [pension, rateA, rateB, splitPct]);

  const row = (label: string, v: number, setV: (n: number) => void, step = 1, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>{label} <span style={{ color: CL.dim }}>{suffix}</span></label>
      <input type="number" step={step} value={v || ""} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }} />
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.cISpouseA, pension, setPension, 1000, "($)")}
        {row(t.cISplit, splitPct, setSplitPct, 5, "(%)")}
        {row(t.cIRateA, rateA, setRateA, 1, "(%)")}
        {row(t.cIRateB, rateB, setRateB, 1, "(%)")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cIWithout}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(d.withoutTax, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cIWith}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(d.withTax, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cISaving}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(d.savings, fr)}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.cINote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Calculator — MER fee impact
   ═══════════════════════════════════════════════════════ */
function MERCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [bal, setBal] = useState(200000);
  const [contrib, setContrib] = useState(0);
  const [years, setYears] = useState(30);
  const [gross, setGross] = useState(6);
  const [low, setLow] = useState(0.2);
  const [high, setHigh] = useState(2.2);

  const fv = (mer: number) => {
    const r = (gross - mer) / 100 / 12;
    const n = years * 12;
    const lump = r !== 0 ? bal * Math.pow(1 + r, n) : bal;
    const stream = r !== 0 ? contrib * ((Math.pow(1 + r, n) - 1) / r) : contrib * n;
    return lump + stream;
  };
  const lowFV = fv(low), highFV = fv(high), delta = lowFV - highFV;

  const row = (label: string, v: number, setV: (n: number) => void, step = 1, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 13, color: CL.text }}>{label} <span style={{ color: CL.dim }}>{suffix}</span></label>
      <input type="number" step={step} value={v || ""} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }} />
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.cMBal, bal, setBal, 10000, "($)")}
        {row(t.cMContrib, contrib, setContrib, 100, "($/mo)")}
        {row(t.cMYears, years, setYears, 1, fr ? "(ans)" : "(yrs)")}
        {row(t.cMGross, gross, setGross, 0.1, "(%)")}
        {row(t.cMLow, low, setLow, 0.05, "(%)")}
        {row(t.cMHigh, high, setHigh, 0.05, "(%)")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMLowFV}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(lowFV, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMHighFV}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(highFV, fr)}</div>
        </div>
        <div style={{ background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMDelta}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.gold, marginTop: 4 }}>{fCAD(delta, fr)}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.cMNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Calculator — RRSP meltdown window
   ═══════════════════════════════════════════════════════ */
function MeltdownCalc({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [age, setAge] = useState(60);
  const [rrsp, setRrsp] = useState(600000);
  const [fixed, setFixed] = useState(20000);
  const [target, setTarget] = useState(57375);

  const years = Math.max(0, 72 - age);
  const budget = Math.max(0, target - fixed);

  // Honest feasibility projection: grow RRSP 3% real, withdraw `budget` each year,
  // stop when balance is depleted or window closes. Total = sum of actual withdrawals.
  const sim = useMemo(() => {
    const r = 0.03; // conservative real growth during the meltdown window
    let bal = rrsp;
    let withdrawn = 0;
    let y = 0;
    for (; y < years; y++) {
      bal = bal * (1 + r);
      const wd = Math.min(bal, budget);
      withdrawn += wd;
      bal -= wd;
      if (bal <= 0.01) { y++; break; }
    }
    return { totalWd: withdrawn, remaining: Math.max(0, bal), yearsUsed: y, feasible: bal > 0 };
  }, [rrsp, budget, years]);

  const row = (label: string, id: string, v: number, setV: (n: number) => void, step = 1, suffix = "") => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, color: CL.text }}>{label} <span style={{ color: CL.dim }}>{suffix}</span></label>
      <input id={id} type="number" step={step} value={v || ""} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} style={{ padding: "7px 9px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, width: "100%", textAlign: "right", background: CL.card }} />
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {row(t.cMDAge, "md-age", age, setAge, 1, fr ? "(ans)" : "(yrs)")}
        {row(t.cMDRRSP, "md-rrsp", rrsp, setRrsp, 10000, "($)")}
        {row(t.cMDFixed, "md-fixed", fixed, setFixed, 1000, "($)")}
        {row(t.cMDTarget, "md-target", target, setTarget, 500, "($)")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMDYears}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{sim.yearsUsed}{sim.yearsUsed < years ? <span style={{ fontSize: 12, fontWeight: 400, color: CL.dim }}> / {years}</span> : null}</div>
        </div>
        <div style={{ background: CL.goldBg, border: `1px solid ${CL.gold}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMDBudget}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(budget, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMDTotal}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(sim.totalWd, fr)}</div>
        </div>
        <div style={{ background: CL.s2, border: `1px solid ${CL.line2}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CL.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.cMDRemain}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: CL.ink, marginTop: 4 }}>{fCAD(sim.remaining, fr)}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "8px 12px", background: CL.panel, borderLeft: `3px solid ${CL.gold}`, borderRadius: 6, fontSize: 12, color: CL.text }}>
        <strong style={{ color: CL.ink }}>{sim.feasible ? t.cMDFeasible : t.cMDNotFeasible}</strong>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: CL.dim, fontStyle: "italic" }}>{t.cMDNote}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Dynamic marginal-rate brackets table (province selector)
   ═══════════════════════════════════════════════════════ */
function BracketsTable({ fr, t }: { fr: boolean; t: typeof COPY.fr }) {
  const [prov, setProv] = useState<string>("QC");
  const rates = PROV_BRACKET_RATES[prov] || PROV_BRACKET_RATES.QC;
  const names = fr ? PROV_NAMES_FR : PROV_NAMES_EN;
  return (
    <div style={{ background: CL.s2, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: CL.ink, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.ch2ProvLabel}</label>
        <select
          value={prov}
          onChange={(e) => setProv(e.target.value)}
          style={{ padding: "8px 10px", border: `1px solid ${CL.line}`, borderRadius: 8, fontSize: 13, background: CL.card, color: CL.ink, fontWeight: 600, width: "100%", maxWidth: 260 }}
        >
          {Object.keys(PROV_BRACKET_RATES).map((code) => (
            <option key={code} value={code}>{code} — {names[code]}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, padding: "4px 0 8px", borderBottom: `1px solid ${CL.line2}`, fontSize: 11, color: CL.dim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
        <span>{t.ch2BandLabel}</span>
        <span style={{ textAlign: "right" }}>{t.ch2RateLabel}</span>
      </div>
      {BRACKET_BANDS_2026.map((band, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", padding: "8px 0", fontSize: 13, color: CL.text, borderBottom: i < BRACKET_BANDS_2026.length - 1 ? `1px dashed ${CL.line2}` : "none" }}>
          <span>{fBandLabel(band.lo, band.hi, fr)}</span>
          <strong style={{ color: CL.gold, textAlign: "right" }}>{(rates[i] * 100).toFixed(rates[i] * 100 >= 10 ? 1 : 2).replace(".", fr ? "," : ".")} %</strong>
        </div>
      ))}
    </div>
  );
}

/* Section, ToolCard, Note imported from editorial-components.
   Callout (local, defined above) delegates to Note for legacy call sites. */

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
function Guide201Inner() {
  const params = useSearchParams();
  const [lang, setLang] = useState<"fr" | "en">(() => {
    const p = params?.get("lang");
    return p === "en" ? "en" : "fr";
  });
  const fr = lang === "fr";
  const t = fr ? COPY.fr : COPY.en;
  const toggleLang = () => setLang(fr ? "en" : "fr");

  useEditorialBody();
  useEditorialRailScrollSpy();

  return (
    <div className="bfe-shell bfe-shell--guide">
      {/* ── Sticky chapter rail ──────────────────────────────── */}
      <aside className="bfe-rail">
        <div className="bfe-kicker">BuildFi · Guide 201</div>
        <h1 className="bfe-title-rail">{fr ? "Optimiser" : "Optimize"}</h1>
        <p>{t.tagline}</p>
        <nav className="bfe-nav">
          <div className="bfe-kicker" style={{ marginTop: 8, marginBottom: 6 }}>{t.toc201}</div>
          {t.toc.map((item) => (
            <a key={item.n} href={`#ch${item.n}`}>{item.n}. {item.t}</a>
          ))}
          <div className="bfe-kicker" style={{ color: CL.gold, marginTop: 14, marginBottom: 6 }}>{t.toc301}</div>
          {t.toc2.map((item) => (
            <a key={item.n} href={`#ch${item.n}`}>{item.n}. {item.t}</a>
          ))}
          <a href="#mistakes" style={{ marginTop: 8 }}>{fr ? "Erreurs courantes" : "Common mistakes"}</a>
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <a className="bfe-btn-glass" href={t.pdfHref}>📄 {t.pdfLabel}</a>
          <button className="bfe-btn-glass" onClick={toggleLang} style={{ cursor: "pointer", border: `1px solid ${CL.accentLine}` }}>🌐 {t.langSwitch}</button>
        </div>
      </aside>

      <main className="bfe-main">
        {/* Cover */}
        <section className="bfe-cover" id="cover">
          <div className="bfe-kicker">BuildFi · {t.eyebrow}</div>
          <h1 className="bfe-title-cover">{t.title}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: CL.muted, maxWidth: 640, margin: 0, fontFamily: 'var(--font-playfair),Georgia,serif', fontStyle: "italic" }}>{t.tagline}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="bfe-btn-gold" href="#ch1">{fr ? "Commencer" : "Start"}</a>
            <a className="bfe-btn-glass" href="#mistakes">{fr ? "Voir les erreurs courantes" : "See common mistakes"}</a>
          </div>
        </section>

        {/* Prereq note pointing back to Guide 101 */}
        <Note tone="info" kicker={fr ? "Prérequis" : "Prerequisite"}>
          {t.prereq} <a href="/guides/101" style={{ color: CL.gold, fontWeight: 700, textDecoration: "underline" }}>{t.prereqLink}</a>
        </Note>

        {/* Where to start — calm table */}
        <section className="bfe-section" id="orientation">
          <div className="bfe-kicker" style={{ marginBottom: 10 }}>{t.whereStart}</div>
          <div style={{ overflow: "auto", border: `1px solid ${CL.line}`, borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <tbody>
                {t.where.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? CL.s2 : CL.card, borderBottom: i < t.where.length - 1 ? `1px solid ${CL.line}` : "none" }}>
                    <td style={{ padding: "10px 14px", color: CL.text }}>{row[0]}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: CL.gold }}>{row[1]}</td>
                    <td style={{ padding: "10px 14px", color: CL.muted }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ch 1 */}
        <Section fr={fr} num={1} id="ch1" title={t.ch1Title} sub={t.ch1Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch1Body}</p>
          <div style={{ fontSize: 13, fontWeight: 700, color: CL.ink, marginTop: 14, marginBottom: 8 }}>{t.ch1Order}</div>
          <div style={{ background: CL.s2, borderRadius: 12, padding: 14, margin: "8px 0" }}>
            {t.ch1OrderList.map((line, i) => (
              <div key={i} style={{ padding: "6px 0", fontSize: 13, color: CL.text, borderBottom: i < t.ch1OrderList.length - 1 ? `1px dashed ${CL.line2}` : "none" }}>{line}</div>
            ))}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: CL.ink, margin: "18px 0 8px" }}>{t.ch1PhasesTitle}</h3>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 560 }}>
              <thead>
                <tr style={{ background: CL.ink, color: "#fff" }}>
                  <th style={{ padding: "9px 10px", textAlign: "left" }}>{fr ? "Phase" : "Phase"}</th>
                  <th style={{ padding: "9px 10px", textAlign: "center" }}>{fr ? "Âge" : "Age"}</th>
                  <th style={{ padding: "9px 10px", textAlign: "left" }}>{fr ? "Action" : "Action"}</th>
                  <th style={{ padding: "9px 10px", textAlign: "left" }}>{fr ? "Raison" : "Rationale"}</th>
                </tr>
              </thead>
              <tbody>
                {t.ch1Phases.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? CL.s2 : CL.card, borderBottom: `1px solid ${CL.line}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: CL.ink }}>{row[0]}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: CL.gold, fontWeight: 700 }}>{row[1]}</td>
                    <td style={{ padding: "8px 10px", color: CL.text }}>{row[2]}</td>
                    <td style={{ padding: "8px 10px", color: CL.dim }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}><Callout color="gold">{t.ch1Example}</Callout></div>
        </Section>

        {/* Ch 2 */}
        <Section fr={fr} num={2} id="ch2" title={t.ch2Title} sub={t.ch2Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch2Body}</p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: CL.ink, margin: "16px 0 8px" }}>{t.ch2BracketsTitle}</h3>
          <BracketsTable fr={fr} t={t} />
          <div style={{ fontSize: 11, color: CL.dim, fontStyle: "italic", marginBottom: 12 }}>
            {fr ? "Taux marginal combiné fédéral + provincial appliqué au dernier dollar gagné dans la tranche. Estimations 2026, hors surtaxes et crédits personnels." : "Combined federal + provincial marginal rate on the last dollar earned in each band. 2026 estimates, excluding surtaxes and personal credits."}
          </div>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6 }}>{t.ch2Sources}</p>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <Note tone="caution" kicker={fr ? "Dividendes — piège de la majoration" : "Dividends — gross-up trap"}>{t.ch2Dividend}</Note>
            <Note tone="check" kicker={fr ? "Crédit pour revenu de pension" : "Pension income credit"}>{t.ch2Credit}</Note>
            <Note tone="rule" kicker={fr ? "Taux marginal effectif" : "Effective marginal rate"}>{t.ch2Effective}</Note>
            <Note tone="caution" kicker={fr ? "Zone SRG — piège fiscal" : "GIS zone — tax trap"}>{t.ch2GISTrap}</Note>
          </div>
        </Section>

        {/* Ch 3 */}
        <Section fr={fr} num={3} id="ch3" title={t.ch3Title} sub={t.ch3Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch3Body}</p>
          <ToolCard title={t.ch3Tool}><OASCalc fr={fr} t={t} /></ToolCard>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: CL.ink, margin: "18px 0 10px" }}>{t.ch3Strategies}</h3>
          {/* Numbered strategy cards — gold mono numerals + body. Replaces
              the prior 5-identical-Callout smear with a list that has
              actual visual rhythm. Strip any leading "N. " from the
              source string since the gold chip already provides the index. */}
          <div style={{ display: "grid", gap: 10 }}>
            {[t.ch3S1, t.ch3S2, t.ch3S3, t.ch3S4, t.ch3S5].map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 14, alignItems: "start", background: CL.panel, borderLeft: `2px solid ${CL.gold}`, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}>
                <div style={{ fontFamily: "var(--bf-font-mono)", fontSize: 22, fontWeight: 800, color: CL.gold, lineHeight: 1, textAlign: "right" }}>{i + 1}</div>
                <div style={{ fontSize: 14, color: CL.text, lineHeight: 1.55 }}>{s.replace(/^\s*\d+\.\s*/, "")}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Ch 4 */}
        <Section fr={fr} num={4} id="ch4" title={t.ch4Title} sub={t.ch4Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch4Body}</p>
          <ToolCard title={t.ch4Tool}><QPPCalc fr={fr} t={t} /></ToolCard>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <Callout color="gold">{t.ch4Break}</Callout>
            <Callout color="blue">{t.ch4Early}</Callout>
          </div>
        </Section>

        {/* Ch 5 */}
        <Section fr={fr} num={5} id="ch5" title={t.ch5Title} sub={t.ch5Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch5Body}</p>
          <ToolCard title={t.ch5Tool}><SplitCalc fr={fr} t={t} /></ToolCard>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6, margin: "12px 0" }}>{t.ch5Why}</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Callout color="blue">{t.ch5Quebec}</Callout>
            <Callout color="red">{t.ch5NoSplit}</Callout>
          </div>
        </Section>

        {/* Ch 6 */}
        <Section fr={fr} num={6} id="ch6" title={t.ch6Title} sub={t.ch6Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch6Body}</p>
          <ToolCard title={t.ch6Tool}><MERCalc fr={fr} t={t} /></ToolCard>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6, margin: "12px 0" }}>{t.ch6Why}</p>
          <Callout color="green">{t.ch6Options}</Callout>
        </Section>

        {/* Ch 7 */}
        <Section fr={fr} num={7} id="ch7" title={t.ch7Title} sub={t.ch7Sub}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch7Body}</p>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: CL.gold, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Trois risques observés" : "Three observed risks"}</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[t.ch7Longevity, t.ch7Inflation, t.ch7Sequence].map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 14, alignItems: "start", background: CL.panel, borderLeft: `2px solid ${CL.gold}`, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}>
                <div style={{ fontFamily: "var(--bf-font-mono)", fontSize: 22, fontWeight: 800, color: CL.gold, lineHeight: 1, textAlign: "right" }}>{i + 1}</div>
                <div style={{ fontSize: 14, color: CL.text, lineHeight: 1.55 }}>{s.replace(/^\s*\d+\.\s*/, "")}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Callout color="green">{t.ch7Protect}</Callout>
          </div>
        </Section>

        {/* Bonus 301 banner — cover-style break, gold kicker (editorial restraint). */}
        <section className="bfe-cover">
          <div className="bfe-kicker" style={{ color: CL.gold }}>BONUS · 301</div>
          <h2 className="bfe-title-cover" style={{ fontSize: 44, color: CL.ink }}>{t.bonus301Title}</h2>
          <div style={{ fontSize: 18, color: CL.muted, fontStyle: "italic", fontFamily: 'var(--font-playfair),Georgia,serif', maxWidth: 720 }}>{t.bonus301Sub}</div>
          <p style={{ fontSize: 16, color: CL.text, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>{t.bonus301Body}</p>
        </section>

        {/* Ch 8 */}
        <Section fr={fr} num={8} id="ch8" title={t.ch8Title} sub={t.ch8Sub} kickerOverride={fr ? `Bonus 301 · Chapitre 8` : `Bonus 301 · Chapter 8`} kickerColor={CL.gold}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch8Body}</p>
          <ToolCard title={t.ch8Tool}><MeltdownCalc fr={fr} t={t} /></ToolCard>
          <div style={{ display: "grid", gap: 10, margin: "14px 0" }}>
            {t.ch8Steps.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, alignItems: "start", background: CL.panel, border: `1px solid ${CL.line}`, borderLeft: `2px solid ${CL.gold}`, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}>
                <strong style={{ fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".18em" }}>{s[0]}</strong>
                <div style={{ fontSize: 14, color: CL.text, lineHeight: 1.55 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <Callout color="gold">{t.ch8Golden}</Callout>
            <Callout color="red">{t.ch8NotOptimal}</Callout>
          </div>
        </Section>

        {/* Ch 9 */}
        <Section fr={fr} num={9} id="ch9" title={t.ch9Title} sub={t.ch9Sub} kickerOverride={fr ? `Bonus 301 · Chapitre 9` : `Bonus 301 · Chapter 9`} kickerColor={CL.gold}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch9Body}</p>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.6, margin: "12px 0" }}>{t.ch9Principle}</p>
          <Callout color="gold">{t.ch9Example}</Callout>
        </Section>

        {/* Ch 10 — kickered Notes for visual rhythm (was 4-Callout smear). */}
        <Section fr={fr} num={10} id="ch10" title={t.ch10Title} sub={t.ch10Sub} kickerOverride={fr ? `Bonus 301 · Chapitre 10` : `Bonus 301 · Chapter 10`} kickerColor={CL.gold}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch10Body}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Note tone="caution" kicker={fr ? "DPA — récupération à la vente" : "CCA — recapture on sale"}>{t.ch10DPA}</Note>
            <Note tone="rule" kicker={fr ? "Timing de vente" : "Sale timing"}>{t.ch10Timing}</Note>
            <Note tone="info" kicker={fr ? "Gains en capital — taux d'inclusion" : "Capital gains — inclusion rate"}>{t.ch10Capital}</Note>
            <Note tone="caution" kicker={fr ? "Manoeuvre Smith — risques" : "Smith Manoeuvre — risks"}>{t.ch10Smith}</Note>
          </div>
        </Section>

        {/* Ch 11 — kickered Notes for visual rhythm. */}
        <Section fr={fr} num={11} id="ch11" title={t.ch11Title} sub={t.ch11Sub} kickerOverride={fr ? `Bonus 301 · Chapitre 11` : `Bonus 301 · Chapter 11`} kickerColor={CL.gold}>
          <p style={{ fontSize: 15, color: CL.text, lineHeight: 1.6 }}>{t.ch11Body}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Note tone="caution" kicker={fr ? "Limite SBD — palier" : "SBD limit — bracket"}>{t.ch11SBD}</Note>
            <Note tone="rule" kicker={fr ? "Extraction — trois couches" : "Extraction — three layers"}>{t.ch11Extract}</Note>
            <Note tone="info" kicker={fr ? "IMRTD — récupération différée" : "RDTOH — deferred refund"}>{t.ch11RDTOH}</Note>
          </div>
        </Section>

        {/* Costliest errors — single voice, paper cards with thin red bar */}
        <section id="mistakes" className="bfe-section">
          <div className="bfe-kicker" style={{ color: CL.gold, marginBottom: 6 }}>{fr ? "Erreurs courantes" : "Common mistakes"}</div>
          <h2 className="bfe-title-section" style={{ color: CL.ink }}>{t.mistakesTitle}</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {t.mistakes.map((m, i) => (
              <div key={i} style={{ background: CL.panel, borderLeft: `2px solid ${CL.gold}`, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CL.ink, marginBottom: 4 }}>{m[0]}</div>
                <div style={{ fontSize: 13, color: CL.text, lineHeight: 1.55 }}>{m[1]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bonus — link to existing decum simulator */}
        <Note tone="rule" kicker="BONUS">
          <div style={{ fontSize: 16, fontWeight: 700, color: CL.ink, marginBottom: 6 }}>{t.simTitle}</div>
          <p style={{ fontSize: 14, color: CL.text, lineHeight: 1.5, margin: "0 0 12px" }}>{t.simBody}</p>
          <a href={t.simHref} className="bfe-btn-glass" style={{ minHeight: 38, padding: "0 16px", fontSize: 13 }}>{t.simBtn}</a>
        </Note>

        {/* Pull quote */}
        <section className="bfe-section" style={{ textAlign: "center", border: "none", boxShadow: "none", background: "transparent", padding: "8px 20px" }}>
          <div style={{ fontSize: 22, fontStyle: "italic", color: CL.ink, maxWidth: 720, margin: "0 auto", lineHeight: 1.5, fontFamily: 'var(--font-playfair),Georgia,serif' }}>{t.quote}</div>
        </section>

        {/* CTA — single dark island */}
        <section className="bfe-section" style={{ background: CL.ink, color: "#fff", borderColor: CL.ink }}>
          <div className="bfe-kicker" style={{ color: CL.gold, marginBottom: 8 }}>Bilan 360</div>
          <h3 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.25, fontFamily: 'var(--font-playfair),Georgia,serif', color: "#fff" }}>{t.ctaTitle}</h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", margin: "0 0 18px", lineHeight: 1.55 }}>{t.ctaBody}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={t.ctaHref} className="bfe-btn-gold">{t.ctaBtn}</a>
            <a href={t.ctaPlannerHref} className="bfe-btn-glass">{t.ctaPlanner}</a>
          </div>
        </section>

        <div style={{ textAlign: "center", fontSize: 11, color: CL.muted, marginTop: 36, padding: "20px 4px 0", lineHeight: 1.6, borderTop: `1px solid ${CL.accentLine}` }}>
          <div style={{ marginBottom: 10, marginTop: 18 }}>{t.sources}</div>
          <div style={{ marginBottom: 10 }}>{t.disclaimer}</div>
          <div>© 2026 BuildFi · <Link href="/" style={{ color: CL.muted }}>buildfi.ca</Link></div>
        </div>
      </main>
    </div>
  );
}

export default function Guide201Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: CL.bg }} />}>
      <Guide201Inner />
    </Suspense>
  );
}
