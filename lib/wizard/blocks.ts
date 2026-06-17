/**
 * /lib/wizard/blocks.ts
 * Adaptive Wizard — block registry + Mode 1 classifier logic.
 *
 * Mode 1 = 8 routing questions (classifier, not data entry).
 * Mode 2 = blocks filtered by Mode 1 profile. Only relevant blocks shown.
 * Mode 3 = advanced overlay for Planner users (return/inflation/tax overrides).
 *
 * Block registry is the single source of truth. Do not hardcode fields in components.
 */

export type Phase = "pre-retire" | "transition" | "retired";
export type Lang = "fr" | "en";

export interface Mode1Profile {
  phase: Phase;
  hasSpouse: boolean;
  employmentStatus: "employed" | "self-employed" | "not-working" | "retired";
  hasDebt: boolean;
  homeOwner: boolean;
  rentalCount: 0 | 1 | 2;
  hasCCPC: boolean;
  hasDBPension: boolean;
  hasLIRA: boolean;
  hasInsurance: boolean;
  hasEstateGoals: boolean;
}

export const MODE1_DEFAULT: Mode1Profile = {
  phase: "pre-retire",
  hasSpouse: false,
  employmentStatus: "employed",
  hasDebt: false,
  homeOwner: false,
  rentalCount: 0,
  hasCCPC: false,
  hasDBPension: false,
  hasLIRA: false,
  hasInsurance: false,
  hasEstateGoals: false,
};

export interface Mode1Question {
  id: keyof Mode1Profile;
  labelFr: string;
  labelEn: string;
  helpFr?: string;
  helpEn?: string;
  type: "choice" | "bool" | "number";
  options?: Array<{ value: string | number | boolean; labelFr: string; labelEn: string }>;
  min?: number;
  max?: number;
}

export const MODE1_QUESTIONS: Mode1Question[] = [
  {
    id: "phase",
    type: "choice",
    labelFr: "Où en êtes-vous dans votre parcours ?",
    labelEn: "Where are you in your journey?",
    helpFr: "Détermine l'ordre et le détail des questions sur les revenus de retraite, le décaissement, etc.",
    helpEn: "Determines order and depth of questions on retirement income, decumulation, etc.",
    options: [
      { value: "pre-retire", labelFr: "En accumulation (5+ ans avant la retraite)", labelEn: "Accumulating (5+ years before retirement)" },
      { value: "transition", labelFr: "Proche de la retraite (0-5 ans)", labelEn: "Near retirement (0-5 years)" },
      { value: "retired", labelFr: "Déjà à la retraite", labelEn: "Already retired" },
    ],
  },
  {
    id: "hasSpouse",
    type: "bool",
    labelFr: "Êtes-vous en couple ?",
    labelEn: "Are you part of a couple?",
    helpFr: "Si oui, nous modélisons votre conjoint·e séparément (15 champs additionnels).",
    helpEn: "If yes, we model your spouse separately (15 additional fields).",
  },
  {
    id: "employmentStatus",
    type: "choice",
    labelFr: "Quel est votre statut d'emploi actuel ?",
    labelEn: "What is your current employment status?",
    helpFr: "Détermine les sections sur les avantages employeur, revenus, cotisations.",
    helpEn: "Determines the sections on employer benefits, income, contributions.",
    options: [
      { value: "employed", labelFr: "Salarié (employé)", labelEn: "Employed (salaried)" },
      { value: "self-employed", labelFr: "Travailleur autonome / pigiste", labelEn: "Self-employed / freelance" },
      { value: "not-working", labelFr: "Entre deux emplois / études / parent au foyer", labelEn: "Between jobs / studying / stay-at-home" },
      { value: "retired", labelFr: "Déjà à la retraite", labelEn: "Already retired" },
    ],
  },
  {
    id: "hasDebt",
    type: "bool",
    labelFr: "Avez-vous des dettes significatives ?",
    labelEn: "Do you have significant debt?",
    helpFr: "Cartes de crédit, prêt auto, marge, étudiant, etc. (hors hypothèque résidence principale).",
    helpEn: "Credit cards, car loan, LOC, student loans, etc. (excluding primary home mortgage).",
  },
  {
    id: "homeOwner",
    type: "bool",
    labelFr: "Êtes-vous propriétaire de votre résidence principale ?",
    labelEn: "Do you own your primary residence?",
  },
  {
    id: "rentalCount",
    type: "choice",
    labelFr: "Avez-vous des propriétés à revenus ?",
    labelEn: "Do you own rental properties?",
    helpFr: "Pour 3 propriétés ou plus, le Planner est mieux adapté (modélisation détaillée illimitée).",
    helpEn: "For 3+ properties, the Planner is better suited (unlimited detailed modeling).",
    options: [
      { value: 0, labelFr: "Aucune", labelEn: "None" },
      { value: 1, labelFr: "Une propriété", labelEn: "One property" },
      { value: 2, labelFr: "Deux propriétés", labelEn: "Two properties" },
    ],
  },
  {
    id: "hasDBPension",
    type: "bool",
    labelFr: "Avez-vous (ou aurez-vous) une pension à prestations définies (PD) ?",
    labelEn: "Do you have (or will you have) a defined-benefit pension?",
    helpFr: "Pensions gouvernementales, enseignants, militaire, etc. Pas les REER/CELI.",
    helpEn: "Government, teacher, military pensions, etc. Not RRSP/TFSA.",
  },
  {
    id: "hasLIRA",
    type: "bool",
    labelFr: "Avez-vous un compte de retraite immobilisé (CRI / LIRA) ?",
    labelEn: "Do you have a locked-in retirement account (LIRA / CRI)?",
    helpFr: "Habituellement provient d'un ancien employeur.",
    helpEn: "Typically from a former employer.",
  },
];

// ── Mode 2 blocks registry ─────────────────────────────────────
export interface WizardField {
  id: string;
  labelFr: string;
  labelEn: string;
  type: "number" | "choice" | "bool" | "currency" | "percent" | "age" | "multi";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; labelFr: string; labelEn: string }>;
  placeholder?: string;
  helpFr?: string;
  helpEn?: string;
}

export interface WizardBlock {
  id: string;
  titleFr: string;
  titleEn: string;
  descFr?: string;
  descEn?: string;
  showIf: (p: Mode1Profile) => boolean;
  fields: WizardField[];
}

const PROVINCES = [
  ["QC", "Québec"], ["ON", "Ontario"], ["BC", "Colombie-Britannique / British Columbia"],
  ["AB", "Alberta"], ["MB", "Manitoba"], ["NB", "Nouveau-Brunswick / New Brunswick"],
  ["NL", "Terre-Neuve / Newfoundland"], ["NS", "Nouvelle-Écosse / Nova Scotia"],
  ["PE", "Île-du-Prince-Édouard / PEI"], ["SK", "Saskatchewan"],
  ["NT", "T.N.-O. / NWT"], ["NU", "Nunavut"], ["YT", "Yukon"],
];

export const BLOCKS: WizardBlock[] = [
  {
    id: "core-you",
    titleFr: "Vous",
    titleEn: "You",
    showIf: () => true,
    fields: [
      { id: "age", type: "age", labelFr: "Âge actuel", labelEn: "Current age", required: true, min: 25, max: 85 },
      {
        id: "sex", type: "choice", labelFr: "Sexe biologique", labelEn: "Biological sex", required: true,
        options: [{ value: "M", labelFr: "Homme", labelEn: "Male" }, { value: "F", labelFr: "Femme", labelEn: "Female" }],
        helpFr: "Utilisé pour les tables de mortalité CPM-2023. Pas pour l'identité.",
        helpEn: "Used for CPM-2023 mortality tables. Not for identity.",
      },
      {
        id: "prov", type: "choice", labelFr: "Province / territoire", labelEn: "Province / territory", required: true,
        options: PROVINCES.map(([v, l]) => ({ value: v, labelFr: l, labelEn: l })),
      },
      { id: "sal", type: "currency", labelFr: "Revenu d'emploi brut annuel", labelEn: "Gross annual employment income", required: true, min: 0, max: 1_000_000 },
    ],
  },
  {
    id: "core-money",
    titleFr: "Votre épargne",
    titleEn: "Your savings",
    showIf: () => true,
    fields: [
      { id: "rrsp", type: "currency", labelFr: "REER (solde actuel)", labelEn: "RRSP (current balance)", min: 0 },
      { id: "tfsa", type: "currency", labelFr: "CELI (solde actuel)", labelEn: "TFSA (current balance)", min: 0 },
      { id: "nr", type: "currency", labelFr: "Compte non-enregistré (solde)", labelEn: "Non-registered account (balance)", min: 0 },
      { id: "monthlyContrib", type: "currency", labelFr: "Cotisation mensuelle totale (REER + CELI + NE)", labelEn: "Total monthly contribution (RRSP + TFSA + NR)", min: 0 },
    ],
  },
  {
    id: "core-spending",
    titleFr: "Vos dépenses actuelles",
    titleEn: "Your current spending",
    descFr: "Base pour comparer avec les dépenses souhaitées à la retraite.",
    descEn: "Baseline to compare against desired retirement spending.",
    showIf: () => true,
    fields: [
      { id: "currentSpM", type: "currency", labelFr: "Dépenses mensuelles totales (actuelles)", labelEn: "Total current monthly spending", required: true, min: 0, helpFr: "Logement, nourriture, transport, loisirs, tout compris.", helpEn: "Housing, food, transport, leisure — everything." },
    ],
  },
  {
    id: "core-retirement",
    titleFr: "Votre retraite",
    titleEn: "Your retirement",
    showIf: () => true,
    fields: [
      { id: "retAge", type: "age", labelFr: "Âge visé pour la retraite", labelEn: "Target retirement age", required: true, placeholder: "65", min: 45, max: 75 },
      { id: "retSpM", type: "currency", labelFr: "Dépenses mensuelles souhaitées à la retraite", labelEn: "Desired monthly spending in retirement", required: true, min: 0, helpFr: "En dollars d'aujourd'hui. Typique : 65-80 % des dépenses actuelles.", helpEn: "In today's dollars. Typical: 65-80% of current spending." },
      { id: "qppAge", type: "age", labelFr: "Âge prévu pour commencer RRQ/RPC", labelEn: "Planned age to start QPP/CPP", placeholder: "65", min: 60, max: 70 },
      { id: "oasAge", type: "age", labelFr: "Âge prévu pour commencer PSV", labelEn: "Planned age to start OAS", placeholder: "65", min: 65, max: 70 },
      { id: "deathAge", type: "age", labelFr: "Âge de fin de plan (horizon)", labelEn: "Plan end age (horizon)", placeholder: "95", min: 85, max: 105, helpFr: "Souvent utilisé : 95. Environ 80 % des Canadiens n'atteignent pas cet âge, ce qui laisse une marge.", helpEn: "Often used: 95. About 80% of Canadians don't reach this age, which leaves a margin." },
    ],
  },
  {
    id: "profile-you",
    titleFr: "À propos de vous",
    titleEn: "About you",
    descFr: "Ces réponses personnalisent l'analyse et le ton de votre rapport — il n'y a pas de mauvaise réponse.",
    descEn: "These answers personalize your report's analysis and tone — there are no wrong answers.",
    showIf: () => true,
    fields: [
      {
        id: "risk", type: "choice", labelFr: "Votre tolérance au risque (marché)", labelEn: "Your market risk tolerance",
        helpFr: "Prudent : baisses rarement au-delà de 5 %. Équilibré : jusqu'à 15 %. Croissance : jusqu'à 30 %.",
        helpEn: "Conservative: rarely drops beyond 5%. Balanced: up to 15%. Growth: up to 30%.",
        options: [
          { value: "conservative", labelFr: "Prudent", labelEn: "Conservative" },
          { value: "balanced", labelFr: "Équilibré", labelEn: "Balanced" },
          { value: "growth", labelFr: "Croissance", labelEn: "Growth" },
        ],
      },
      {
        id: "investStyle", type: "choice", labelFr: "Comment investissez-vous aujourd'hui ?", labelEn: "How do you invest today?",
        helpFr: "Sert à estimer vos frais de gestion (RFG).", helpEn: "Used to estimate your management fees (MER).",
        options: [
          { value: "diy_stocks", labelFr: "Actions en autonomie", labelEn: "DIY individual stocks" },
          { value: "low_fee_etf", labelFr: "FNB à faibles frais", labelEn: "Low-fee ETFs" },
          { value: "high_fee_etf", labelFr: "FNB / fonds à frais plus élevés", labelEn: "Higher-fee ETFs / funds" },
          { value: "mutual_funds", labelFr: "Fonds communs (avec conseiller)", labelEn: "Mutual funds (with advisor)" },
          { value: "unsure", labelFr: "Je ne sais pas", labelEn: "Not sure" },
        ],
      },
      {
        id: "spendingFlex", type: "choice", labelFr: "Vos dépenses à la retraite sont-elles flexibles ?", labelEn: "Is your retirement spending flexible?",
        helpFr: "Détermine si le plan peut ajuster les retraits les mauvaises années (Guyton-Klinger).",
        helpEn: "Determines whether the plan can adjust withdrawals in bad years (Guyton-Klinger).",
        options: [
          { value: "rigid", labelFr: "Fixes (peu de marge)", labelEn: "Rigid (little room)" },
          { value: "moderate", labelFr: "Modérément flexibles", labelEn: "Moderately flexible" },
          { value: "flexible", labelFr: "Très flexibles", labelEn: "Very flexible" },
        ],
      },
      {
        id: "confidence", type: "choice", labelFr: "Votre confiance face à la retraite", labelEn: "Your confidence about retirement",
        options: [
          { value: 2, labelFr: "Peu confiant·e", labelEn: "Not very confident" },
          { value: 3, labelFr: "Modérément confiant·e", labelEn: "Moderately confident" },
          { value: 4, labelFr: "Confiant·e", labelEn: "Confident" },
          { value: 5, labelFr: "Très confiant·e", labelEn: "Very confident" },
        ],
      },
      {
        id: "psychLiteracy", type: "choice", labelFr: "Votre aisance avec les finances", labelEn: "Your comfort with finances",
        helpFr: "Ajuste le niveau de vocabulaire du rapport.", helpEn: "Adjusts the report's vocabulary level.",
        options: [
          { value: "basic", labelFr: "Notions de base", labelEn: "Basics" },
          { value: "medium", labelFr: "À l'aise", labelEn: "Comfortable" },
          { value: "advanced", labelFr: "Avancé", labelEn: "Advanced" },
        ],
      },
      {
        id: "worries", type: "multi", labelFr: "Qu'est-ce qui vous préoccupe le plus ?", labelEn: "What worries you most?",
        helpFr: "Plusieurs choix possibles. Oriente l'analyse du rapport.", helpEn: "Select all that apply. Steers the report's analysis.",
        options: [
          { value: "runout", labelFr: "Manquer d'argent", labelEn: "Running out of money" },
          { value: "market", labelFr: "Un krach boursier", labelEn: "A market crash" },
          { value: "tax", labelFr: "Payer trop d'impôt", labelEn: "Paying too much tax" },
          { value: "health", labelFr: "Les coûts de santé", labelEn: "Health costs" },
          { value: "inflation", labelFr: "L'inflation", labelEn: "Inflation" },
          { value: "legacy", labelFr: "Laisser un héritage", labelEn: "Leaving a legacy" },
        ],
      },
    ],
  },
  {
    id: "debt",
    titleFr: "Vos dettes",
    titleEn: "Your debts",
    descFr: "Hors hypothèque résidence principale (couverte dans la section Résidence).",
    descEn: "Excluding primary home mortgage (covered in Home section).",
    showIf: (p) => p.hasDebt,
    fields: [
      { id: "debtCards", type: "currency", labelFr: "Solde total cartes de crédit", labelEn: "Total credit card balance", min: 0 },
      { id: "debtCardRate", type: "percent", labelFr: "Taux moyen cartes (annuel)", labelEn: "Average card rate (annual)", step: 0.5, min: 0, max: 30 },
      { id: "debtLoc", type: "currency", labelFr: "Marge de crédit (LOC/HELOC)", labelEn: "Line of credit (LOC/HELOC)", min: 0 },
      { id: "debtLocRate", type: "percent", labelFr: "Taux marge", labelEn: "LOC rate", step: 0.25, min: 0, max: 20 },
      { id: "debtAuto", type: "currency", labelFr: "Solde prêt auto", labelEn: "Auto loan balance", min: 0 },
      { id: "debtAutoPay", type: "currency", labelFr: "Paiement mensuel auto", labelEn: "Auto monthly payment", min: 0 },
      { id: "debtStudent", type: "currency", labelFr: "Solde prêt étudiant", labelEn: "Student loan balance", min: 0 },
      { id: "debtOther", type: "currency", labelFr: "Autres dettes (solde total)", labelEn: "Other debts (total balance)", min: 0 },
      { id: "debtExtraMonthly", type: "currency", labelFr: "Paiement supplémentaire mensuel sur les dettes", labelEn: "Extra monthly debt payment", min: 0, helpFr: "Au-delà des paiements minimums.", helpEn: "Above minimum payments." },
    ],
  },
  {
    id: "employer-benefits",
    titleFr: "Avantages employeur",
    titleEn: "Employer benefits",
    descFr: "Ce que votre employeur ajoute à votre plan.",
    descEn: "What your employer adds to your plan.",
    showIf: (p) => p.employmentStatus === "employed",
    fields: [
      { id: "dcBal", type: "currency", labelFr: "REER collectif / régime à cotisation déterminée (solde)", labelEn: "Group RRSP / DC pension (balance)", min: 0, helpFr: "Solde actuel de votre régime collectif. Laissez vide si aucun.", helpEn: "Current balance of your group plan. Leave empty if none." },
    ],
  },
  {
    id: "spouse",
    titleFr: "Votre conjoint·e",
    titleEn: "Your spouse",
    descFr: "Modélisé séparément — pas d'hypothèses sur les actifs, les revenus ou le timing.",
    descEn: "Modeled separately — no assumptions on assets, income or timing.",
    showIf: (p) => p.hasSpouse,
    fields: [
      { id: "cAge", type: "age", labelFr: "Âge du conjoint", labelEn: "Spouse age", required: true, min: 25, max: 95 },
      {
        id: "cSex", type: "choice", labelFr: "Sexe biologique du conjoint", labelEn: "Spouse biological sex", required: true,
        options: [{ value: "M", labelFr: "Homme", labelEn: "Male" }, { value: "F", labelFr: "Femme", labelEn: "Female" }],
      },
      { id: "cIncome", type: "currency", labelFr: "Revenu d'emploi brut annuel (conjoint)", labelEn: "Spouse gross annual income" },
      { id: "cRetAge", type: "age", labelFr: "Âge de retraite visé (conjoint)", labelEn: "Spouse target retirement age", min: 45, max: 75 },
      { id: "cRrsp", type: "currency", labelFr: "REER du conjoint (solde)", labelEn: "Spouse RRSP (balance)", min: 0 },
      { id: "cTfsa", type: "currency", labelFr: "CELI du conjoint (solde)", labelEn: "Spouse TFSA (balance)", min: 0 },
      { id: "cNr", type: "currency", labelFr: "Non-enregistré du conjoint (solde)", labelEn: "Spouse non-registered (balance)", min: 0 },
      { id: "cMonthlyContrib", type: "currency", labelFr: "Cotisation mensuelle totale du conjoint", labelEn: "Spouse total monthly contribution", min: 0 },
    ],
  },
  {
    id: "spouse-2",
    titleFr: "Conjoint·e — retraite et pension",
    titleEn: "Spouse — retirement & pension",
    showIf: (p) => p.hasSpouse,
    fields: [
      { id: "cQppAge", type: "age", labelFr: "Âge RRQ/RPC (conjoint)", labelEn: "Spouse QPP/CPP age", placeholder: "65", min: 60, max: 70 },
      { id: "cOasAge", type: "age", labelFr: "Âge PSV (conjoint)", labelEn: "Spouse OAS age", placeholder: "65", min: 65, max: 70 },
      { id: "cLira", type: "currency", labelFr: "CRI/LIRA du conjoint", labelEn: "Spouse LIRA", min: 0 },
      { id: "cPenM", type: "currency", labelFr: "Rente de pension PD du conjoint ($/mois)", labelEn: "Spouse DB pension ($/month)", min: 0 },
      {
        id: "cPenType", type: "choice", labelFr: "Source de la pension du conjoint", labelEn: "Spouse pension source",
        options: [
          { value: "none", labelFr: "Aucune", labelEn: "None" },
          { value: "rregop", labelFr: "RREGOP (Québec)", labelEn: "RREGOP (Quebec)" },
          { value: "federal", labelFr: "Fédérale", labelEn: "Federal" },
          { value: "private", labelFr: "Privée", labelEn: "Private" },
        ],
      },
      { id: "cPenIdx", type: "bool", labelFr: "Pension conjoint indexée ?", labelEn: "Spouse pension indexed?" },
      { id: "pensionSplitting", type: "bool", labelFr: "Prévoir le fractionnement de pension (65+)", labelEn: "Plan for pension splitting (65+)", helpFr: "Jusqu'à 50 % de la pension admissible transférable au conjoint. T1032 + TP-1012.A.", helpEn: "Up to 50% of eligible pension transferable. T1032 + TP-1012.A." },
    ],
  },
  {
    id: "home",
    titleFr: "Votre résidence principale",
    titleEn: "Your primary residence",
    showIf: (p) => p.homeOwner,
    fields: [
      { id: "homeValue", type: "currency", labelFr: "Valeur estimée de la résidence", labelEn: "Estimated home value", required: true },
      { id: "mortgageBal", type: "currency", labelFr: "Solde hypothécaire actuel", labelEn: "Current mortgage balance", min: 0 },
      { id: "mortgageRate", type: "percent", labelFr: "Taux hypothécaire", labelEn: "Mortgage rate", step: 0.05, min: 0, max: 15 },
      { id: "mortgageAmort", type: "age", labelFr: "Années restantes à l'amortissement", labelEn: "Years left on amortization", min: 0, max: 30 },
      { id: "sellAtRet", type: "bool", labelFr: "Prévoyez-vous vendre votre résidence à la retraite ?", labelEn: "Plan to sell your home in retirement?", helpFr: "L'équité nette serait libérée dans votre portefeuille. Le rachat d'une résidence plus modeste se modélise dans le Planner.", helpEn: "Net equity would be released into your portfolio. Buying a smaller replacement home is modeled in the Planner." },
      { id: "downsizeAge", type: "age", labelFr: "Si oui, âge prévu de vente", labelEn: "If yes, planned age of sale", min: 45, max: 90, helpFr: "Laisser vide = à l'âge de la retraite.", helpEn: "Leave empty = at retirement age." },
    ],
  },
  {
    id: "rentals",
    titleFr: "Propriétés à revenus",
    titleEn: "Rental properties",
    descFr: "Valeur de marché, hypothèque, revenu net annuel (après taxes foncières, entretien, vacance).",
    descEn: "Market value, mortgage, net annual income (after property tax, maintenance, vacancy).",
    showIf: (p) => p.rentalCount > 0,
    fields: [
      { id: "rentalValue1", type: "currency", labelFr: "Propriété 1 — valeur de marché", labelEn: "Property 1 — market value", required: true },
      { id: "rentalIncome1", type: "currency", labelFr: "Propriété 1 — revenu net annuel", labelEn: "Property 1 — net annual income", required: true, helpFr: "Loyers reçus - taxes foncières - entretien - vacance.", helpEn: "Rents received − property tax − maintenance − vacancy." },
      { id: "rentalMortgage1", type: "currency", labelFr: "Propriété 1 — solde hypothécaire", labelEn: "Property 1 — mortgage balance", min: 0 },
      { id: "rentalMortgageRate1", type: "percent", labelFr: "Propriété 1 — taux hypothécaire", labelEn: "Property 1 — mortgage rate", step: 0.05, min: 0, max: 15 },
      { id: "rentalCost1", type: "currency", labelFr: "Propriété 1 — coût d'acquisition (FNACC)", labelEn: "Property 1 — adjusted cost base (ACB)", min: 0, helpFr: "Prix d'achat + améliorations capitales. Sert au calcul du gain en capital à la vente.", helpEn: "Purchase price + capital improvements. Used for capital gains tax on sale." },
      { id: "rentalSell1", type: "age", labelFr: "Propriété 1 — âge prévu de vente (0 = jamais)", labelEn: "Property 1 — planned age of sale (0 = never)", min: 0, max: 100 },
    ],
  },
  {
    id: "rentals-2",
    titleFr: "Propriété à revenus #2",
    titleEn: "Rental property #2",
    showIf: (p) => p.rentalCount >= 2,
    fields: [
      { id: "rentalValue2", type: "currency", labelFr: "Valeur de marché", labelEn: "Market value", required: true },
      { id: "rentalIncome2", type: "currency", labelFr: "Revenu net annuel", labelEn: "Net annual income", required: true },
      { id: "rentalMortgage2", type: "currency", labelFr: "Solde hypothécaire", labelEn: "Mortgage balance", min: 0 },
      { id: "rentalMortgageRate2", type: "percent", labelFr: "Taux hypothécaire", labelEn: "Mortgage rate", step: 0.05, min: 0, max: 15 },
      { id: "rentalCost2", type: "currency", labelFr: "Coût d'acquisition (FNACC)", labelEn: "Adjusted cost base (ACB)", min: 0 },
      { id: "rentalSell2", type: "age", labelFr: "Âge prévu de vente", labelEn: "Planned age of sale", min: 0, max: 100 },
    ],
  },
  {
    id: "db-pension",
    titleFr: "Pension à prestations définies",
    titleEn: "Defined-benefit pension",
    showIf: (p) => p.hasDBPension,
    fields: [
      { id: "penM", type: "currency", labelFr: "Rente mensuelle estimée", labelEn: "Estimated monthly pension" },
      { id: "penIdx", type: "bool", labelFr: "Rente indexée à l'inflation ?", labelEn: "Is the pension indexed to inflation?" },
      { id: "penType", type: "choice", labelFr: "Source", labelEn: "Source",
        options: [
          { value: "rregop", labelFr: "RREGOP (Québec)", labelEn: "RREGOP (Quebec)" },
          { value: "federal", labelFr: "Fédérale", labelEn: "Federal" },
          { value: "private", labelFr: "Privée", labelEn: "Private" },
          { value: "other", labelFr: "Autre", labelEn: "Other" },
        ],
      },
    ],
  },
  {
    id: "lira",
    titleFr: "CRI / LIRA",
    titleEn: "LIRA / CRI",
    showIf: (p) => p.hasLIRA,
    fields: [
      { id: "liraBal", type: "currency", labelFr: "Solde CRI / LIRA actuel", labelEn: "Current LIRA balance" },
    ],
  },
];

export function filterBlocksForProfile(profile: Mode1Profile): WizardBlock[] {
  return BLOCKS.filter((b) => b.showIf(profile));
}

export function countFieldsFor(profile: Mode1Profile): number {
  return filterBlocksForProfile(profile).reduce((sum, b) => sum + b.fields.length, 0);
}
