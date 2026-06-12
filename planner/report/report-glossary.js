// report-glossary.js — Bilingual glossary + hover/click definition tooltips.
//
// Provides:
//   1. window.BFGlossary.terms — single source of truth (FR + EN entries)
//   2. window.BFGlossary.renderAppendix(lang) — full appendix HTML for end of report
//   3. Auto-attaches hover/click tooltips to elements with class="bf-term"
//      and data-term="key" (or just the term text, lowercased, if no data-term).
//
// Markup pattern in renderers:
//   <span class="bf-term" data-term="p50">scénario typique</span>
//
// Print: tooltips hidden in print (popup card uses class .bf-glossary-tip
// which is display:none in @media print).

(function() {
  "use strict";

  // ─── Single source of truth: bilingual Canadian retirement / fiscal /
  // CCPC / decum dictionary. The list is open-ended — every term that a
  // typical reader of these reports might not know goes here. The
  // appendix renders ALL entries server-side, then a runtime filter
  // (_filterAppendixToUsedTerms) hides the ones that don't appear in
  // THIS report's body. Each report ends up with its own curated subset:
  // a CCPC owner sees DPE / CDC / IMRTDD; a low-income retiree sees SRG /
  // crédit en raison de l'âge / récupération PSV; a couple sees
  // fractionnement de pension / partage RRQ. So the dictionary grows
  // freely without bloating any individual report.
  //
  // Each entry: { fr: { label, def }, en: { label, def } }
  // `label` is the headword used in the appendix; `def` is 1-3 sentences.
  var TERMS = {
    p25: {
      fr: { label: 'P25 — Scénario prudent', def: '25 % des simulations Monte Carlo terminent sous ce niveau, 75 % au-dessus. Représente une issue défavorable mais plausible.' },
      en: { label: 'P25 — Cautious scenario', def: '25% of Monte Carlo simulations end below this level, 75% above. Represents an unfavourable but plausible outcome.' }
    },
    p50: {
      fr: { label: 'P50 — Médiane', def: 'La trajectoire centrale : autant de simulations terminent au-dessus qu\'en-dessous. Souvent appelée « scénario typique ».' },
      en: { label: 'P50 — Median', def: 'The central trajectory: as many simulations end above as below. Often called the "typical scenario".' }
    },
    p75: {
      fr: { label: 'P75 — Scénario favorable', def: '75 % des simulations terminent sous ce niveau, 25 % au-dessus. Représente une issue meilleure que la moyenne.' },
      en: { label: 'P75 — Favourable scenario', def: '75% of simulations end below this level, 25% above. Represents a better-than-average outcome.' }
    },
    monte_carlo: {
      fr: { label: 'Monte Carlo', def: 'Méthode de simulation qui rejoue le plan des milliers de fois avec des rendements et inflations aléatoires (mais réalistes), pour mesurer la robustesse face à l\'incertitude.' },
      en: { label: 'Monte Carlo', def: 'Simulation method that replays the plan thousands of times with randomized but realistic returns and inflation, to measure robustness against uncertainty.' }
    },
    succ_rate: {
      fr: { label: 'Taux de succès', def: 'Pourcentage des simulations Monte Carlo où l\'épargne ne s\'épuise pas avant l\'âge de décès projeté. 90 %+ = très solide, 60-89 % = à surveiller, sous 60 % = ajustements requis.' },
      en: { label: 'Success rate', def: 'Percentage of Monte Carlo simulations where savings do not run out before projected death age. 90%+ = very solid, 60-89% = monitor closely, under 60% = adjustments needed.' }
    },
    rrsp: {
      fr: { label: 'REER (Régime enregistré d\'épargne-retraite)', def: 'Compte d\'épargne-retraite avec déduction fiscale à la cotisation et imposition au retrait. Conversion obligatoire en FERR au plus tard à 71 ans.' },
      en: { label: 'RRSP (Registered Retirement Savings Plan)', def: 'Retirement savings account with tax deduction on contributions and tax on withdrawals. Mandatory conversion to RRIF by age 71.' }
    },
    rrif: {
      fr: { label: 'FERR (Fonds enregistré de revenu de retraite)', def: 'Compte de décaissement obligatoire après le REER (au plus tard à 71 ans). Retraits minimaux annuels prescrits selon l\'âge.' },
      en: { label: 'RRIF (Registered Retirement Income Fund)', def: 'Mandatory drawdown account after the RRSP (no later than age 71). Annual minimum withdrawals prescribed by age.' }
    },
    tfsa: {
      fr: { label: 'CELI (Compte d\'épargne libre d\'impôt)', def: 'Compte d\'épargne où les gains et retraits sont libres d\'impôt. Les cotisations ne sont pas déductibles. Plafond cumulatif : jusqu\'à 109 000 $ en 2026 pour qui avait 18 ans en 2009 (sinon moindre).' },
      en: { label: 'TFSA (Tax-Free Savings Account)', def: 'Savings account where gains and withdrawals are tax-free. Contributions are not deductible. Cumulative room: up to $109,000 in 2026 for those who turned 18 in 2009 (lower otherwise).' }
    },
    cpp: {
      fr: { label: 'RPC / RRQ', def: 'Régime de pensions du Canada (RPC) ou Régime de rentes du Québec (RRQ). Rente mensuelle indexée à vie. Démarrage flexible 60-70 ans (réduction 7,2 %/an avant 65 ans, bonification 8,4 %/an après).' },
      en: { label: 'CPP / QPP', def: 'Canada Pension Plan or Quebec Pension Plan. Indexed monthly pension for life. Flexible start age 60-70 (7.2%/yr reduction before 65, 8.4%/yr boost after).' }
    },
    oas: {
      fr: { label: 'PSV (Pension de la sécurité de la vieillesse)', def: 'Rente fédérale universelle dès 65 ans (report possible jusqu\'à 70 ans, +0,6 %/mois). Récupération progressive si revenu net imposable > 95 323 $ (seuil 2026).' },
      en: { label: 'OAS (Old Age Security)', def: 'Universal federal pension from age 65 (deferral possible to 70, +0.6%/month). Progressive clawback if net taxable income exceeds $95,323 (2026 threshold).' }
    },
    oas_clawback: {
      fr: { label: 'Récupération PSV', def: 'Réduction progressive de la PSV au-delà du seuil de revenu (~95 K$ en 2026), au taux de 15¢ par dollar excédentaire. Disparaît complètement vers 154 K$.' },
      en: { label: 'OAS clawback', def: 'Progressive reduction of OAS above the income threshold (~$95K in 2026), at 15¢ per excess dollar. Fully phased out around $154K.' }
    },
    gis: {
      fr: { label: 'SRG (Supplément de revenu garanti)', def: 'Prestation fédérale ciblant les retraités à faible revenu (au-delà de la PSV). Récupération à 50¢ par dollar de revenu autre que PSV — un piège fiscal important.' },
      en: { label: 'GIS (Guaranteed Income Supplement)', def: 'Federal benefit for low-income retirees (on top of OAS). Clawed back at 50¢ per dollar of non-OAS income — a significant tax trap.' }
    },
    mer: {
      fr: { label: 'MER / FGP (Frais de gestion de placement)', def: 'Frais annuels du fonds, exprimés en % de l\'actif. Réduisent directement le rendement net. Voir le tableau d\'impact des frais selon le type de placement.' },
      en: { label: 'MER (Management Expense Ratio)', def: 'Annual fund fee, expressed as % of assets. Directly reduces net return. See the fee impact table by placement type.' }
    },
    drawdown: {
      fr: { label: 'Décaissement', def: 'Phase où l\'épargne accumulée finance les dépenses. Ordre des retraits (REER, CELI, non-enregistré) influence l\'impôt total payé sur le viager.' },
      en: { label: 'Drawdown', def: 'Phase where accumulated savings fund expenses. Withdrawal order (RRSP, TFSA, non-registered) influences total lifetime tax paid.' }
    },
    meltdown: {
      fr: { label: 'Décaissement anticipé du REER', def: 'Stratégie de retraits volontaires accélérés du REER avant 72 ans pour lisser l\'impôt et réduire le solde converti en FERR (donc les retraits minimums imposés plus tard).' },
      en: { label: 'RRSP meltdown', def: 'Strategy of voluntary accelerated RRSP withdrawals before 72 to smooth taxes and reduce the balance converted to RRIF (and therefore mandatory minimum withdrawals later).' }
    },
    seq_ret: {
      fr: { label: 'Risque de séquence de rendements', def: 'Risque qu\'une chute de marché survienne tôt en retraite, lorsque les retraits cristallisent les pertes. Les premières années comptent plus que les dernières.' },
      en: { label: 'Sequence-of-returns risk', def: 'Risk that a market drop occurs early in retirement, when withdrawals crystallize losses. The first years matter more than the last.' }
    },
    inf: {
      fr: { label: 'Inflation', def: 'Hausse générale du coût de la vie. Réduit le pouvoir d\'achat de l\'épargne. Hypothèse modèle : ~2,1 % par année (Banque du Canada à long terme).' },
      en: { label: 'Inflation', def: 'General rise in cost of living. Reduces savings purchasing power. Model assumption: ~2.1% per year (Bank of Canada long-term).' }
    },
    real_dollars: {
      fr: { label: 'Dollars réels', def: 'Montants exprimés en pouvoir d\'achat constant (hors effet d\'inflation). Permet de comparer des montants à différentes années sans illusion monétaire.' },
      en: { label: 'Real dollars', def: 'Amounts expressed in constant purchasing power (inflation removed). Allows comparison across years without money illusion.' }
    },
    nominal_dollars: {
      fr: { label: 'Dollars nominaux', def: 'Montants exprimés en dollars de l\'année où ils surviennent (avec inflation). Le 100 000 $ d\'aujourd\'hui équivaut à beaucoup plus en dollars nominaux dans 30 ans.' },
      en: { label: 'Nominal dollars', def: 'Amounts in the dollars of the year they occur (with inflation). $100,000 today is much larger in nominal dollars 30 years out.' }
    },
    eff_rate: {
      fr: { label: 'Taux d\'imposition effectif', def: 'Impôt total payé divisé par le revenu imposable, exprimé en %. Différent du taux marginal (qui s\'applique au prochain dollar gagné).' },
      en: { label: 'Effective tax rate', def: 'Total tax paid divided by taxable income, in %. Different from marginal rate (which applies to the next dollar earned).' }
    },
    pension_split: {
      fr: { label: 'Fractionnement de revenus de pension', def: 'Mécanisme fiscal permettant de transférer jusqu\'à 50 % de certains revenus de pension au conjoint à des fins fiscales, pour réduire l\'impôt du couple.' },
      en: { label: 'Pension income splitting', def: 'Tax mechanism allowing up to 50% of certain pension income to be transferred to a spouse for tax purposes, to reduce the couple\'s combined tax.' }
    },
    estate: {
      fr: { label: 'Succession (héritage net)', def: 'Patrimoine restant au décès, après paiement des impôts dus à ce moment (notamment sur les soldes REER/FERR). Inclut résidence, placements et dettes.' },
      en: { label: 'Estate (net inheritance)', def: 'Wealth remaining at death, after taxes due at that point (notably on RRSP/RRIF balances). Includes residence, investments and debts.' }
    },
    withdrawal_rate: {
      fr: { label: 'Taux de retrait initial', def: 'Pourcentage du capital prélevé la première année de retraite. Règle « 4 % » classique, à moduler selon âge, longévité et tolérance au risque.' },
      en: { label: 'Initial withdrawal rate', def: 'Percentage of capital withdrawn in the first year of retirement. Classic "4% rule", to be moderated by age, longevity and risk tolerance.' }
    },
    fat_tail: {
      fr: { label: 'Distribution à queues épaisses', def: 'Modèle statistique qui donne plus de probabilité aux événements extrêmes (krachs, années exceptionnelles) qu\'une distribution normale. Plus réaliste pour les rendements boursiers.' },
      en: { label: 'Fat-tailed distribution', def: 'Statistical model giving more probability to extreme events (crashes, exceptional years) than a normal distribution. More realistic for stock returns.' }
    },
    ccpc: {
      fr: { label: 'SPCC (Société privée sous contrôle canadien)', def: 'Société active admissible à la déduction pour petites entreprises (DPE). Combinaison salaire/dividendes ajustable selon le revenu d\'entreprise et personnel.' },
      en: { label: 'CCPC (Canadian-Controlled Private Corporation)', def: 'Active corporation eligible for the small business deduction (SBD). Salary/dividend mix adjustable based on corporate and personal income.' }
    },
    integrated_rate: {
      fr: { label: 'Taux intégré', def: 'Taux d\'imposition combiné corporation + actionnaire sur un dollar gagné par la société puis distribué. Mesure si le revenu est mieux extrait via salaire ou dividende.' },
      en: { label: 'Integrated rate', def: 'Combined corporate + shareholder tax rate on a dollar earned by the corp and then distributed. Measures whether income is better extracted as salary or dividend.' }
    },
    longevity: {
      fr: { label: 'Longévité (CPM-2023)', def: 'Tables canadiennes d\'espérance de vie projetée publiées par l\'Institut canadien des actuaires en 2023. Tiennent compte des améliorations futures de mortalité.' },
      en: { label: 'Longevity (CPM-2023)', def: 'Canadian projected life expectancy tables published by the Canadian Institute of Actuaries in 2023. Account for future mortality improvements.' }
    },
    ruin: {
      fr: { label: 'Épuisement de l\'épargne', def: 'Moment où le capital tombe à zéro avant le décès projeté. Le plan dépend alors uniquement des prestations publiques (RPC/RRQ, PSV, SRG).' },
      en: { label: 'Savings depletion', def: 'Moment when capital reaches zero before projected death. The plan then relies solely on public benefits (CPP/QPP, OAS, GIS).' }
    },
    lira: {
      fr: { label: 'CRI (Compte de retraite immobilisé)', def: 'Compte créé lorsqu\'un employé quitte un régime de pension et transfère ses droits accumulés. Règles de retrait plus restrictives qu\'un REER.' },
      en: { label: 'LIRA (Locked-In Retirement Account)', def: 'Account created when an employee leaves a pension plan and transfers accrued benefits. Withdrawal rules more restrictive than an RRSP.' }
    },
    allocation: {
      fr: { label: 'Allocation d\'actifs', def: 'Répartition entre actions, obligations et autres classes. Détermine simultanément le rendement attendu et la volatilité du portefeuille.' },
      en: { label: 'Asset allocation', def: 'Split between equities, bonds and other classes. Simultaneously determines expected return and portfolio volatility.' }
    },
    fhsa: {
      fr: { label: 'CELIAPP (Compte d\'épargne libre d\'impôt pour l\'achat d\'une première propriété)', def: 'Combine la déduction fiscale du REER et les retraits libres d\'impôt du CELI, pour l\'achat d\'une première habitation. 8 000 $/an, 40 000 $ à vie.' },
      en: { label: 'FHSA (First Home Savings Account)', def: 'Combines RRSP-style tax deduction with TFSA-style tax-free withdrawals, for a first home purchase. $8,000/year, $40,000 lifetime.' }
    },
    cca: {
      fr: { label: 'DPA (Déduction pour amortissement)', def: 'Amortissement fiscal d\'un bien locatif (typiquement 4 % du solde décroissant pour catégorie 1). Réduit le revenu imposable chaque année, mais déclenche une « récupération » à la vente.' },
      en: { label: 'CCA (Capital Cost Allowance)', def: 'Tax depreciation of a rental property (typically 4% declining balance for Class 1). Reduces taxable income each year but triggers "recapture" on sale.' }
    },
    recapture: {
      fr: { label: 'Récupération de la DPA', def: 'À la vente d\'un bien locatif, toute la DPA réclamée doit être réintégrée au revenu imposable de l\'année — à 100 %, au taux marginal complet, pas comme un gain en capital.' },
      en: { label: 'CCA recapture', def: 'On sale of a rental property, all CCA previously claimed must be added back to taxable income that year — at 100% inclusion, full marginal rate, not as capital gain.' }
    },
    smith_manoeuvre: {
      fr: { label: 'Manoeuvre Smith', def: 'Transformation graduelle d\'une hypothèque non déductible en intérêts déductibles : chaque paiement libère une marge HELOC ré-empruntée pour investir. Comporte un effet de levier réel.' },
      en: { label: 'Smith Manoeuvre', def: 'Gradual conversion of a non-deductible mortgage into deductible interest: each payment frees HELOC room re-borrowed to invest. Carries real leverage exposure.' }
    },
    sbd: {
      fr: { label: 'DPE (Déduction pour petites entreprises)', def: 'Réduit le taux d\'impôt corporatif sur les premiers 500 000 $ de revenu actif d\'une SPCC. Diminuée si le revenu de placement passif dépasse 50 000 $/an, éliminée à 150 000 $.' },
      en: { label: 'SBD (Small Business Deduction)', def: 'Reduces corporate tax rate on the first $500,000 of active income for a CCPC. Ground down if passive investment income exceeds $50,000/yr, eliminated at $150,000.' }
    },
    lcge: {
      fr: { label: 'DGCC (Déduction pour gains en capital cumulatifs)', def: 'Exonération à vie d\'environ 1,25 M$ sur la vente d\'actions admissibles d\'une petite entreprise (AAPE) ou de bien agricole/pêche. Critère de détention exigé.' },
      en: { label: 'LCGE (Lifetime Capital Gains Exemption)', def: 'Roughly $1.25M lifetime exemption on the sale of qualified small business corporation (QSBC) shares or qualified farm/fishing property. Holding-period rules apply.' }
    },
    eligible_div: {
      fr: { label: 'Dividende déterminé', def: 'Dividende versé à partir de revenu corporatif imposé au taux général (non DPE). Bénéficie d\'une majoration plus élevée et d\'un crédit d\'impôt plus généreux que les dividendes ordinaires.' },
      en: { label: 'Eligible dividend', def: 'Dividend paid from corporate income taxed at the general (non-SBD) rate. Receives a higher gross-up and a more generous tax credit than non-eligible dividends.' }
    },
    non_elig_div: {
      fr: { label: 'Dividende ordinaire (non déterminé)', def: 'Dividende versé à partir de revenu corporatif imposé au taux des petites entreprises. Majoration et crédit moindres que les dividendes déterminés.' },
      en: { label: 'Non-eligible dividend', def: 'Dividend paid from corporate income taxed at the small-business rate. Lower gross-up and tax credit than eligible dividends.' }
    },
    gross_up: {
      fr: { label: 'Majoration des dividendes', def: 'Hausse fiscale appliquée au dividende encaissé pour calculer le revenu imposable (38 % éligibles, 15 % ordinaires). Gonfle le revenu net — peut déclencher la récupération PSV même sans impôt réel additionnel.' },
      en: { label: 'Dividend gross-up', def: 'Tax markup applied to dividends received when computing taxable income (38% eligible, 15% non-eligible). Inflates net income — can trigger OAS clawback even without extra real tax.' }
    },
    rdtoh: {
      fr: { label: 'IMRTDD (Impôt en main remboursable au titre de dividendes déterminés)', def: 'Compte fiscal corporatif qui accumule l\'impôt remboursable sur le revenu de placement passif. La société récupère 1 $ d\'IMRTDD pour chaque 2,61 $ de dividende déterminé versé.' },
      en: { label: 'RDTOH (Refundable Dividend Tax on Hand)', def: 'Corporate tax account accumulating refundable tax on passive investment income. The corporation recovers $1 of RDTOH per $2.61 of eligible dividend paid.' }
    },
    cda: {
      fr: { label: 'CDC (Compte de dividendes en capital)', def: 'Compte corporatif qui accumule la portion non imposable des gains en capital (50 %). Distribuable au propriétaire en franchise d\'impôt via dividende en capital.' },
      en: { label: 'CDA (Capital Dividend Account)', def: 'Corporate account accumulating the non-taxable portion of capital gains (50%). Distributable to the owner tax-free as a capital dividend.' }
    },
    var5: {
      fr: { label: 'VaR 5 % (perte attendue dans le pire centile)', def: 'Patrimoine au 5ᵉ percentile des simulations Monte Carlo : 95 % des scénarios font mieux, 5 % font pire. Mesure le risque de queue, pas le scénario typique.' },
      en: { label: 'VaR 5% (worst-percentile expected loss)', def: 'Wealth at the 5th percentile of Monte Carlo simulations: 95% of scenarios do better, 5% do worse. A tail-risk measure, not a central scenario.' }
    },
    p5: {
      fr: { label: 'P5 — Scénario défavorable', def: '5 % des simulations Monte Carlo terminent sous ce niveau. Représente la queue défavorable de la distribution — plan de stress, pas plan de base.' },
      en: { label: 'P5 — Adverse scenario', def: '5% of Monte Carlo simulations end below this level. Represents the adverse tail of the distribution — stress case, not base case.' }
    },
    p95: {
      fr: { label: 'P95 — Scénario très favorable', def: '95 % des simulations terminent sous ce niveau, 5 % au-dessus. Représente une issue exceptionnellement bonne — utile pour le sizing de la succession, pas pour la planification courante.' },
      en: { label: 'P95 — Very favourable scenario', def: '95% of simulations end below this level, 5% above. Represents an exceptionally good outcome — useful for estate sizing, not for routine planning.' }
    },
    coverage_ratio: {
      fr: { label: 'Taux de couverture (revenus garantis)', def: 'Part des dépenses cibles couverte par les revenus garantis à vie (RPC/RRQ + PSV + rentes PD). Plus le taux est élevé, moins le plan dépend des marchés.' },
      en: { label: 'Coverage ratio (guaranteed income)', def: 'Share of target spending covered by lifetime guaranteed income (CPP/QPP + OAS + DB pensions). The higher the ratio, the less the plan relies on markets.' }
    },
    eff_marg_rate: {
      fr: { label: 'Taux marginal effectif', def: 'Taux réel payé sur le prochain dollar de revenu, incluant les récupérations (PSV, SRG, crédits). Peut dépasser 70 % dans certaines plages — bien au-delà du taux marginal nominal.' },
      en: { label: 'Effective marginal rate', def: 'Real rate paid on the next dollar of income, including clawbacks (OAS, GIS, credits). Can exceed 70% in certain ranges — well above the nominal marginal rate.' }
    },
    bridge_income: {
      fr: { label: 'Revenu pont', def: 'Revenu temporaire (souvent d\'un régime PD ou d\'une rente privée) versé entre la retraite hâtive et l\'âge d\'admissibilité aux prestations publiques (60-65 ans typiquement).' },
      en: { label: 'Bridge income', def: 'Temporary income (often from a DB plan or private annuity) paid between an early retirement and the age of eligibility for public benefits (typically 60-65).' }
    },
    qpp_sharing: {
      fr: { label: 'Partage de la rente RRQ/RPC', def: 'Mécanisme distinct du fractionnement de pension : un couple peut demander que les rentes RRQ/RPC soient partagées entre les deux conjoints sur leurs déclarations. Permanent et formel.' },
      en: { label: 'CPP/QPP benefit sharing', def: 'Distinct from pension splitting: a couple can request that CPP/QPP benefits be shared between spouses on their tax returns. Permanent and formal.' }
    },
    pension_credit: {
      fr: { label: 'Crédit pour revenu de pension', def: 'Crédit fédéral de 15 % sur les premiers 2 000 $ de revenu de pension admissible (FERR, rente PD) à partir de 65 ans. Crédit provincial s\'ajoute (~300 $ d\'économies au Québec).' },
      en: { label: 'Pension income credit', def: '15% federal credit on the first $2,000 of eligible pension income (RRIF, DB annuity) starting at age 65. Provincial credit stacks (~$300 savings in Quebec).' }
    },
    age_credit: {
      fr: { label: 'Crédit en raison de l\'âge', def: 'Crédit non remboursable applicable à 65+ ans. Récupéré progressivement au-delà d\'un seuil de revenu (44 325 $ fédéral en 2026), éliminé bien plus haut.' },
      en: { label: 'Age credit', def: 'Non-refundable credit for those 65+. Phased out progressively above an income threshold (federal $44,325 in 2026), eliminated much higher.' }
    },
    glide_path: {
      fr: { label: 'Trajectoire d\'allocation (glide path)', def: 'Réduction graduelle du % en actions à mesure que la retraite approche, puis durant la retraite. Réduit la volatilité au moment où une chute de marché ferait le plus mal.' },
      en: { label: 'Glide path', def: 'Gradual reduction of equity allocation as retirement approaches, and during retirement. Reduces volatility at the point a market drop would hurt most.' }
    },
    cushion: {
      fr: { label: 'Coussin de décaissement', def: '2 à 3 ans de dépenses gardées en liquidités ou obligations courtes. Évite d\'avoir à vendre des actions en pleine baisse — protection directe contre le risque de séquence.' },
      en: { label: 'Withdrawal cushion', def: '2 to 3 years of spending held in cash or short bonds. Avoids forced equity sales during a drawdown — direct protection against sequence-of-returns risk.' }
    },
    ipp: {
      fr: { label: 'RRI (Régime de retraite individuel)', def: 'Régime de pension à prestations déterminées pour un actionnaire ou cadre supérieur d\'une société. Cotisations déductibles plus élevées qu\'un REER après 50 ans.' },
      en: { label: 'IPP (Individual Pension Plan)', def: 'DB-style pension plan for a corporate shareholder or senior executive. Higher deductible contributions than an RRSP after age 50.' }
    },
    db_pension: {
      fr: { label: 'Régime à prestations déterminées (PD)', def: 'Régime de pension où le montant de la rente est défini à l\'avance (formule sur années de service × salaire moyen). Le risque actuariel reste avec l\'employeur.' },
      en: { label: 'Defined-benefit (DB) pension', def: 'Pension plan where the pension amount is defined in advance (formula over years of service × average salary). Actuarial risk stays with the employer.' }
    },
    dc_pension: {
      fr: { label: 'Régime à cotisations déterminées (CD)', def: 'Régime où l\'employeur et l\'employé cotisent des montants définis ; la rente finale dépend du rendement accumulé. Le risque de marché reste avec l\'employé.' },
      en: { label: 'Defined-contribution (DC) pension', def: 'Plan where employer and employee contribute defined amounts; the final pension depends on accumulated returns. Market risk stays with the employee.' }
    },
    lif: {
      fr: { label: 'FRV (Fonds de revenu viager)', def: 'Compte de décaissement créé à partir d\'un CRI (LIRA). Retraits encadrés par un minimum (comme un FERR) ET un maximum (contrairement au FERR).' },
      en: { label: 'LIF (Life Income Fund)', def: 'Drawdown account created from a LIRA. Withdrawals bounded by a minimum (like a RRIF) AND a maximum (unlike a RRIF).' }
    },
    resp: {
      fr: { label: 'REEE (Régime enregistré d\'épargne-études)', def: 'Compte d\'épargne pour les études postsecondaires d\'un enfant. Reçoit la SCEE (20 % de subvention fédérale, max 7 200 $/enfant à vie) et au Québec l\'IQEE.' },
      en: { label: 'RESP (Registered Education Savings Plan)', def: 'Savings account for a child\'s post-secondary education. Receives the CESG (20% federal grant, $7,200/child lifetime cap) and in Quebec the QESI.' }
    },
    cesg: {
      fr: { label: 'SCEE (Subvention canadienne pour l\'épargne-études)', def: 'Subvention fédérale équivalant à 20 % des cotisations REEE (max 500 $/an, 7 200 $ à vie par enfant). Versée directement au REEE.' },
      en: { label: 'CESG (Canada Education Savings Grant)', def: 'Federal grant equal to 20% of RESP contributions (max $500/year, $7,200 lifetime per child). Deposited directly into the RESP.' }
    },
    real_marg_rate: {
      fr: { label: 'Taux marginal nominal', def: 'Taux d\'imposition fédéral + provincial appliqué au prochain dollar gagné, par tranche. Ne tient pas compte des récupérations sur les prestations gouvernementales.' },
      en: { label: 'Nominal marginal rate', def: 'Federal + provincial tax rate applied to the next dollar earned, by bracket. Excludes clawbacks on government benefits.' }
    },
    var_at_risk: {
      fr: { label: 'Variance des rendements', def: 'Mesure de la dispersion des rendements simulés autour de leur moyenne. Une variance élevée = trajectoires possibles très étalées = plus d\'incertitude sur le résultat final.' },
      en: { label: 'Return variance', def: 'Measure of how simulated returns spread around their mean. High variance = widely spread possible paths = more uncertainty about the final outcome.' }
    },
    stoch_mort: {
      fr: { label: 'Mortalité stochastique', def: 'Plutôt qu\'un âge de décès fixe, le moteur tire l\'âge de décès dans la table CPM-2023 à chaque simulation. Reflète l\'incertitude réelle sur la durée de vie.' },
      en: { label: 'Stochastic mortality', def: 'Rather than a fixed death age, the engine draws the death age from the CPM-2023 table on each simulation. Captures the real uncertainty about lifespan.' }
    },
    amf: {
      fr: { label: 'AMF (Autorité des marchés financiers)', def: 'Régulateur financier du Québec. Encadre les conseillers en sécurité financière, les planificateurs financiers et la conformité du langage utilisé dans les rapports financiers.' },
      en: { label: 'AMF (Autorité des marchés financiers)', def: 'Quebec financial regulator. Oversees financial security advisors, financial planners, and compliance of the language used in financial reports.' }
    }
  };

  // ─── Tooltip rendering ────────────────────────────────────────────────
  if (typeof window === 'undefined') return;

  var isFR = !!(window.__BUILDFI__ && window.__BUILDFI__.meta && window.__BUILDFI__.meta.fr);
  var lang = isFR ? 'fr' : 'en';

  var tipEl = null;
  function _ensureTip() {
    if (tipEl) return tipEl;
    if (typeof document === 'undefined') return null;
    tipEl = document.createElement('div');
    tipEl.className = 'bf-glossary-tip';
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function _show(el, x, y) {
    var key = el.getAttribute('data-term');
    if (!key) return;
    var entry = TERMS[key];
    if (!entry || !entry[lang]) return;
    var tip = _ensureTip();
    if (!tip) return;
    tip.innerHTML = '<div class="bf-glossary-tip-label">' + entry[lang].label + '</div>' +
      '<div class="bf-glossary-tip-def">' + entry[lang].def + '</div>';
    tip.style.left = '0px'; tip.style.top = '0px';
    tip.classList.add('visible');
    var r = tip.getBoundingClientRect();
    var fx = x + 14, fy = y + 14;
    if (fx + r.width > window.innerWidth - 10) fx = x - r.width - 14;
    if (fy + r.height > window.innerHeight - 10) fy = y - r.height - 14;
    tip.style.left = (fx + window.scrollX) + 'px';
    tip.style.top = (fy + window.scrollY) + 'px';
  }
  function _hide() { if (tipEl) tipEl.classList.remove('visible'); }

  function _wire() {
    if (typeof document === 'undefined') return;
    if (typeof document.querySelectorAll !== 'function') return;
    var nodes = document.querySelectorAll('.bf-term[data-term]');
    for (var i = 0; i < nodes.length; i++) {
      (function(n) {
        n.addEventListener('mouseenter', function(e) { _show(n, e.clientX, e.clientY); });
        n.addEventListener('mousemove', function(e) { _show(n, e.clientX, e.clientY); });
        n.addEventListener('mouseleave', _hide);
        n.addEventListener('click', function(e) {
          // Mobile/touch: tap toggles
          var visible = tipEl && tipEl.classList.contains('visible') && tipEl.getAttribute('data-current') === n.getAttribute('data-term');
          if (visible) { _hide(); return; }
          _show(n, e.clientX, e.clientY);
          if (tipEl) tipEl.setAttribute('data-current', n.getAttribute('data-term'));
        });
      })(nodes[i]);
    }
  }

  // ─── Appendix renderer (server-side from buildReport) ─────────────────
  // Renders ALL terms server-side. Runtime filter (_filterAppendixToUsedTerms)
  // hides terms that don't appear anywhere in the report body. The
  // server-side render keeps the static HTML self-describing (anyone
  // reading the raw file gets the full bilingual reference); the runtime
  // pass surfaces only what's actually relevant to THIS report.
  function renderAppendix(language) {
    var L = (language === 'fr') ? 'fr' : 'en';
    var keys = Object.keys(TERMS).sort(function(a, b) {
      return TERMS[a][L].label.localeCompare(TERMS[b][L].label);
    });
    var h = '<div class="glossary-appendix" data-bf-glossary-root>';
    h += '<dl class="glossary-list">';
    keys.forEach(function(k) {
      var e = TERMS[k][L];
      // Each term carries data-bf-term-key so the runtime filter can
      // hide it without affecting siblings.
      h += '<dt id="gl-' + k + '" class="glossary-term" data-bf-term-key="' + k + '">' + e.label + '</dt>';
      h += '<dd class="glossary-def" data-bf-term-key="' + k + '">' + e.def + '</dd>';
    });
    h += '</dl>';
    // Curation footer — populated by the runtime filter ("Glossaire
    // personnalisé — N termes utilisés dans ce rapport"). Shown only
    // after filtering completes (server-side render emits empty span).
    h += '<div class="glossary-footer" data-bf-glossary-footer style="display:none;font-size:9.5px;color:#888;font-style:italic;margin-top:10px;border-top:1px solid #e8e0d4;padding-top:8px"></div>';
    h += '</div>';
    return h;
  }

  // ─── Runtime filter — hides terms not used elsewhere in the report ────
  // Two signals indicate a term is "used":
  //   1. <span class="bf-term" data-term="key"> markup elsewhere on the page
  //   2. The term's label or a known acronym appears in the body text
  // Anything not matched is hidden. Footer surfaces the curated count.
  function _filterAppendixToUsedTerms() {
    // Node-side stubs of `document` are partial — only the browser has
    // querySelector / cloneNode / textContent. Bail cleanly if any of
    // these are missing so the build-time eval doesn't throw.
    if (typeof document === 'undefined') return;
    if (typeof document.querySelector !== 'function') return;
    if (typeof document.querySelectorAll !== 'function') return;
    var root = document.querySelector('[data-bf-glossary-root]');
    if (!root) return;
    var lang = (document.documentElement.lang || 'fr').toLowerCase().slice(0, 2);
    var L = lang === 'fr' ? 'fr' : 'en';
    // Collect explicit data-term references first.
    var used = {};
    var explicit = document.querySelectorAll('.bf-term[data-term]');
    for (var i = 0; i < explicit.length; i++) {
      used[explicit[i].getAttribute('data-term')] = true;
    }
    // Body-text scan: every term key, plus its localized label, against
    // the report body MINUS the appendix itself (avoid self-matching).
    var appendixId = root.id || '';
    var bodyClone = document.body.cloneNode(true);
    var dropAppendix = bodyClone.querySelector('[data-bf-glossary-root]');
    if (dropAppendix && dropAppendix.parentNode) dropAppendix.parentNode.removeChild(dropAppendix);
    var bodyText = (bodyClone.textContent || '').toLowerCase();
    Object.keys(TERMS).forEach(function(k) {
      if (used[k]) return;
      // Match by key (e.g. "RRSP") or by translated label.
      var label = (TERMS[k][L] && TERMS[k][L].label || '').toLowerCase();
      if (k && bodyText.indexOf(k.toLowerCase()) >= 0) used[k] = true;
      else if (label && label.length > 3 && bodyText.indexOf(label) >= 0) used[k] = true;
    });
    // Hide unused entries.
    var entries = root.querySelectorAll('[data-bf-term-key]');
    var totalShown = 0;
    var seenKeys = {};
    for (var j = 0; j < entries.length; j++) {
      var k2 = entries[j].getAttribute('data-bf-term-key');
      if (!used[k2]) {
        entries[j].style.display = 'none';
      } else if (!seenKeys[k2]) {
        seenKeys[k2] = true;
        totalShown += 1;
      }
    }
    // Footer with the curated count.
    var foot = root.querySelector('[data-bf-glossary-footer]');
    if (foot) {
      foot.textContent = (L === 'fr')
        ? 'Glossaire personnalisé — ' + totalShown + ' terme' + (totalShown > 1 ? 's' : '') + ' utilisé' + (totalShown > 1 ? 's' : '') + ' dans ce rapport.'
        : 'Personalized glossary — ' + totalShown + ' term' + (totalShown > 1 ? 's' : '') + ' used in this report.';
      foot.style.display = '';
    }
  }

  // Boot: wire tooltip handlers + filter the appendix to terms-used.
  function _boot() { _wire(); _filterAppendixToUsedTerms(); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _boot);
    } else {
      _boot();
    }
  }

  window.BFGlossary = {
    terms: TERMS,
    renderAppendix: renderAppendix,
    rebind: _wire,
    refilterAppendix: _filterAppendixToUsedTerms
  };
})();
