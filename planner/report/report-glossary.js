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

  // ─── Single source of truth: 30+ retirement planning terms, bilingual.
  // Each entry: { fr: { label, def }, en: { label, def } }
  // `label` is the headword used in the appendix; `def` is 1-2 sentences.
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
      fr: { label: 'CELI (Compte d\'épargne libre d\'impôt)', def: 'Compte d\'épargne où les gains et retraits sont libres d\'impôt. Les cotisations ne sont pas déductibles. Plafond cumulatif : ~95 000 $ en 2026 pour qui a 18 ans depuis 2009.' },
      en: { label: 'TFSA (Tax-Free Savings Account)', def: 'Savings account where gains and withdrawals are tax-free. Contributions are not deductible. Cumulative limit: ~$95,000 in 2026 for those 18+ since 2009.' }
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
      fr: { label: 'SPCC (Société privée sous contrôle canadien)', def: 'Société active admissible à la déduction pour petites entreprises (DPE). Combinaison salaire/dividendes optimisable selon le revenu d\'entreprise et personnel.' },
      en: { label: 'CCPC (Canadian-Controlled Private Corporation)', def: 'Active corporation eligible for the small business deduction (SBD). Salary/dividend mix optimizable based on corporate and personal income.' }
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
