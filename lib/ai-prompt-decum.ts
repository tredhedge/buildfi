// lib/ai-prompt-decum.ts — Décaissement tier AI narration prompt
// 10 slots, DerivedProfile signals, plain-language guardrails, AMF/OSFI compliant

import { FORBIDDEN_TERMS } from "@/lib/ai-constants";

// ── Plain-language replacements (banned jargon) ───────────────────────────
// Never appear in section headers or AI narration
const PLAIN_LANG_NOTE = `
JARGON INTERDIT (jamais dans le texte visible) :
- "Guyton-Klinger" → "règles de flexibilité des dépenses" ou "ajustements automatiques des retraits"
- "Monte Carlo" → "simulations" ou "scénarios"
- "séquence de rendements" → "l'ordre dans lequel les rendements arrivent"
- "volatilité" → "fluctuations" ou "variations"
- "allocation d'actifs" → "répartition entre actions et obligations"
- "duration" → "durée moyenne des obligations"
- "alpha / beta / Sharpe" → bannir sans équivalent grand public
- "drawdown" → "ponctions" ou "retraits"
- "decumulation" → bannir entièrement dans le texte client
TERMES AMF/OSFI INTERDITS (tolérance zéro) :
- devriez, recommandons, vous devez, il faut, assurez-vous
- plan d'action, recommandation(s), priorisez, optimisez, considérez
TEMPS VERBAL : conditionnel pour toutes les projections (pourrait, serait, atteindrait).
Présent acceptable uniquement pour des faits tirés des données.
`;

// ── Voice matrix ──────────────────────────────────────────────────────────
// Derived from quiz signals: age, successPct, spendingFlex, estatePref, couple

function deriveVoice(D: Record<string, any>, params: Record<string, any>, quiz: Record<string, any>): {
  tone: "reassuring" | "candid" | "analytical";
  urgency: "low" | "medium" | "high";
  horizon: "near" | "medium" | "long";
} {
  const successPct = Number(D.successPct ?? 50);
  const age = Number(params.age ?? 65);
  const flex = quiz.spendingFlex || "moderate";

  const tone =
    successPct >= 80 ? "reassuring" :
    successPct >= 60 ? "analytical" :
    "candid";

  const urgency =
    successPct < 55 ? "high" :
    successPct < 70 ? "medium" :
    "low";

  const yearsLeft = Math.max(0, 95 - age);
  const horizon =
    yearsLeft > 25 ? "long" :
    yearsLeft > 15 ? "medium" :
    "near";

  return { tone, urgency, horizon };
}

// ── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(voice: ReturnType<typeof deriveVoice>): string {
  const toneGuide = {
    reassuring: "Le ton est chaleureux et ancré dans les données. Valoriser ce qui est solide avant d'aborder les zones de vigilance.",
    candid: "Le ton est direct et factuel. Présenter les chiffres tels qu'ils sont sans dramatiser, tout en identifiant les leviers concrets.",
    analytical: "Le ton est précis et structuré. Chaque observation s'appuie directement sur un chiffre du rapport.",
  }[voice.tone];

  const urgencyGuide = {
    low: "La situation est généralement saine. Les observations portent sur l'optimisation et la résilience à long terme.",
    medium: "La situation est viable mais comporte des zones de sensibilité. Identifier les facteurs de risque sans alarmisme.",
    high: "La situation requiert une attention particulière. Présenter les données avec clarté et sans ambiguïté — ni dramatisation ni minimisation.",
  }[voice.urgency];

  return `Tu es l'auteur de la narration d'un bilan de décaissement produit par BuildFi Technologies inc.

RÔLE : Rédiger 10 courts paragraphes d'observation analytique (max 500 caractères chacun, sauf exceptions notées).
Chaque paragraphe remplit exactement un slot JSON. Aucun commentaire hors JSON. Aucune balise HTML.

CONFORMITÉ AMF/OSFI (non négociable) :
- Conditionnel pour toutes les projections : pourrait, serait, atteindrait, représenterait
- Présent uniquement pour des faits mesurés : "Le taux de réussite est 72 %"
- Langage observationnel uniquement : "Les données indiquent", "Cette analyse suggère", "Le portrait montre"
- AUCUN impératif, aucune prescription, aucun conseil
${PLAIN_LANG_NOTE}

STYLE :
- Grade 10 de lecture (grand public, non-expert)
- Phrases courtes, actives, directes
- Chaque observation ancrée dans un chiffre précis du rapport
- Aucun remplissage, aucune introduction générique

VOIX : ${toneGuide}
URGENCE : ${urgencyGuide}

FORMAT DE RÉPONSE : JSON strict uniquement, sans aucun texte hors de l'objet.
{
  "snapshot_intro": "...",
  "longevity_context": "...",
  "spending_flex_obs": "...",
  "income_mix_obs": "...",
  "meltdown_obs": "...",
  "cpp_timing_obs": "...",
  "sequence_obs": "...",
  "estate_obs": "...",
  "obs_1": "...",
  "obs_2": "..."
}`;
}

// ── User prompt ───────────────────────────────────────────────────────────

export function buildAIPromptDecum(
  D: Record<string, any>,
  params: Record<string, any>,
  fr: boolean,
  quiz: Record<string, any>
): { sys: string; usr: string } {
  const voice = deriveVoice(D, params, quiz);
  const sys = buildSystemPrompt(voice);

  const rpt = params._report || {};
  const couple = !!params.cOn;
  const isQC = (params.prov || "QC") === "QC";
  const gkActive = !!params.gkOn;
  const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true";
  const oasAlreadyClaiming = quiz.oasAlreadyClaiming === true || quiz.oasAlreadyClaiming === "true";

  // Format helpers
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-CA");
  const fmtPct = (n: number) => `${Math.round(n * 10) / 10} %`;

  // CPP/QPP label
  const govLabel = isQC ? "RRQ/RPC" : "RPC";
  const oasLabel = "SV"; // Sécurité de la vieillesse

  // Key data points
  const successPct = D.successPct ?? 0;
  const grade = D.grade ?? "C";
  const medWealth = D.medWealth ?? 0;
  const retIncome = params.retIncome ?? 0;
  const govMonthly = rpt.govTotalMonthly ?? 0;
  const govCoveragePct = rpt.govCoveragePct ?? 0;
  const totalWealth = (params.rrspBal ?? 0) + (params.tfsaBal ?? 0) + (params.nrBal ?? 0) +
    (params.cRrspBal ?? 0) + (params.cTfsaBal ?? 0) + (params.cNrBal ?? 0);
  const meltIsBase = rpt.meltIsBase ?? false;
  const deathAge = params.deathAge ?? (params.sex === "F" ? 95 : 93);
  const stochMort = params.stochMort !== false;
  const sex = params.sex ?? "M";
  const age = params.age ?? 65;

  // Meltdown data
  const meltTarget = rpt.meltTarget ?? 58523;
  const meltSuccessPct = D.meltSuccessPct1 ?? null;
  const meltGap = retIncome - meltTarget;

  // CPP timing data (only if not already claiming)
  const mc60SuccessPct = D.mc60SuccessPct ?? null;
  const mc65SuccessPct = D.mc65SuccessPct ?? null;
  const mc70SuccessPct = D.mc70SuccessPct ?? null;

  // GK stats
  const gkCutFreq = D.gkCutFreq ?? null; // % of years with cuts
  const gkAvgCut = D.gkAvgCut ?? null;   // average cut when triggered

  // Estate
  const medEstate = D.medEstate ?? 0;
  const p10Estate = D.p10Estate ?? 0;
  const estatePref = quiz.estatePref || "balanced";

  // Sequence risk
  const p10Wealth = D.p10Wealth ?? 0;
  const p90Wealth = D.p90Wealth ?? 0;
  const wealthSpread = p90Wealth - p10Wealth;

  const usr = `DONNÉES DU BILAN DE DÉCAISSEMENT — ${fr ? "Français" : "English"}

PROFIL
- Âge : ${age} ans | Sexe : ${sex === "F" ? "F" : "H"} | Province : ${params.prov || "QC"}${couple ? ` | Couple (conjoint·e ${params.cAge ?? "?"} ans ${params.cSex === "F" ? "F" : "H"})` : ""}
- Patrimoine total : ${fmt(totalWealth)} $
- Revenu désiré à la retraite : ${fmt(retIncome)} $/an
- Répartition actions/obligations : ${Math.round((params.allocR ?? 0.5) * 100)} % / ${Math.round((1 - (params.allocR ?? 0.5)) * 100)} %
- Glissement annuel : ${params.glideSpd ? `${Math.round(params.glideSpd * 100)} %/an` : "non"}
- Rendement espéré (actions) : ${fmtPct(params.eqRet ?? 0.065)} | (obligations) : ${fmtPct(params.bndRet ?? 0.03)}

RÉSULTATS PRINCIPAUX
- Taux de réussite : ${successPct} % | Note : ${grade}
- Patrimoine médian à ${deathAge} ans : ${fmt(medWealth)} $
- Patrimoine p10 à ${deathAge} ans : ${fmt(p10Wealth)} $
- Patrimoine p90 à ${deathAge} ans : ${fmt(p90Wealth)} $
- Écart p10-p90 : ${fmt(wealthSpread)} $

REVENUS GARANTIS
- ${govLabel} : ${fmt(rpt.qppMonthly ?? 0)} $/mois (${alreadyClaiming ? "déjà en cours" : `prévu à ${params.qppAge ?? 65} ans`})
- ${oasLabel} : ${fmt(rpt.oasMonthly ?? 0)} $/mois (${oasAlreadyClaiming ? "déjà en cours" : `prévu à ${params.oasAge ?? 65} ans`})
${(rpt.penMonthly ?? 0) > 0 ? `- Pension DB : ${fmt(rpt.penMonthly ?? 0)} $/mois${rpt.penIndexed ? " (indexée)" : " (fixe)"}` : "- Pension DB : aucune"}
${couple && (rpt.cPenMonthly ?? 0) > 0 ? `- Pension DB conjoint·e : ${fmt(rpt.cPenMonthly ?? 0)} $/mois` : ""}
- Total revenus garantis : ${fmt(govMonthly)} $/mois | Couverture : ${Math.round(govCoveragePct * 100)} % du revenu désiré

FLEXIBILITÉ DES DÉPENSES (règles d'ajustement automatique)
- Règles actives : ${gkActive ? "oui" : "non — dépenses fixes"}
${gkActive ? `- Seuil de déclenchement hausse : ${fmtPct(params.gkCeil ?? 0.055)} | Seuil de baisse : ${fmtPct(params.gkFloor ?? 0.03)}
- Réduction maximale cumulée : ${fmtPct(params.gkMaxCut ?? 0.20)}
${gkCutFreq !== null ? `- Fréquence des réductions observées : ${fmtPct(gkCutFreq)} des années-simulation
- Réduction moyenne quand déclenchée : ${fmtPct(gkAvgCut ?? 0)}` : ""}` : ""}

SCÉNARIO MELTDOWN (réduction aux revenus imposables minimaux)
- Revenu cible meltdown : ${fmt(meltTarget)} $/an (premier palier fédéral 2026)
- Réduction vs revenu actuel : ${meltGap > 0 ? `-${fmt(meltGap)} $/an` : "N/A (revenu actuel sous le seuil)"}
${meltSuccessPct !== null ? `- Taux de réussite meltdown : ${meltSuccessPct} %` : "- Meltdown non applicable (revenu = meltTarget)"}
- Situation : ${meltIsBase ? "Le revenu désiré est déjà au niveau meltdown" : "Marge de manoeuvre disponible"}

TIMING ${govLabel}${alreadyClaiming ? " (déjà en cours — comparaison non applicable)" : ""}
${!alreadyClaiming && mc60SuccessPct !== null ? `- Taux de réussite si demande à 60 ans : ${mc60SuccessPct} %
- Taux de réussite si demande à 65 ans : ${mc65SuccessPct ?? "n/a"} %
- Taux de réussite si demande à 70 ans : ${mc70SuccessPct ?? "n/a"} %` : "- Comparaison timing non disponible"}

LONGÉVITÉ ET MORTALITÉ STOCHASTIQUE
- Borne déterministe : ${deathAge} ans
- Mortalité stochastique active : ${stochMort ? "oui — tables CPM-2023" : "non"}
- Sexe déclaré : ${sex === "F" ? "féminin (espérance médiane ~88 ans)" : "masculin (espérance médiane ~84 ans)"}

SUCCESSION
- Patrimoine médian à ${deathAge} ans : ${fmt(medEstate)} $
- Patrimoine p10 (scénario pessimiste) : ${fmt(p10Estate)} $
- Préférence successorale : ${estatePref === "maximize" ? "maximiser la transmission" : estatePref === "spenddown" ? "dépenser le capital" : "équilibré"}

${(rpt.debtBal ?? 0) > 0 ? `DETTES À LA RETRAITE
- Solde total : ${fmt(rpt.debtBal)} $
- Impact sur les retraits initiaux : inclus dans les projections` : "DETTES : aucune déclarée"}

INSTRUCTIONS PAR SLOT :
- snapshot_intro (max 600 car.) : taux de réussite + note + couverture des revenus garantis + patrimoine médian. Premier paragraphe d'un rapport — ancré dans les chiffres.
- longevity_context (max 500 car.) : ce que la distribution de longévité révèle pour cet âge/sexe. Mentionner la mortalité stochastique en langage simple ("durée de vie variable selon les simulations").
- spending_flex_obs (max 500 car.) : ${gkActive ? `Ce que les règles d'ajustement automatique impliquent concrètement (fréquence des baisses, amplitude). Ne pas nommer "Guyton-Klinger".` : "Le fait que les dépenses sont fixes et ce que cela implique pour la robustesse."} Omit ce slot si non pertinent → valeur vide "".
- income_mix_obs (max 500 car.) : comment les revenus garantis (${govLabel}, ${oasLabel}${(rpt.penMonthly ?? 0) > 0 ? ", pension DB" : ""}) se combinent avec les retraits du portefeuille. Couverture ${Math.round(govCoveragePct * 100)} %.
- meltdown_obs (max 600 car.) : ${meltIsBase ? "Le revenu est déjà au niveau meltdown. Observer que la marge est nulle et ce que cela implique." : `Scénario où les dépenses sont réduites à ${fmt(meltTarget)} $/an. Mentionner l'écart de ${fmt(meltGap)} $ et le taux de réussite ${meltSuccessPct ?? "similaire"} %.`}
- cpp_timing_obs (max 500 car.) : ${alreadyClaiming ? 'Retourner "" (déjà en cours, comparaison non applicable).' : `Comparer les 3 options de timing (${mc60SuccessPct ?? "?"} % à 60, ${mc65SuccessPct ?? "?"} % à 65, ${mc70SuccessPct ?? "?"} % à 70). Observation factuelle — pas de prescription.`}
- sequence_obs (max 500 car.) : l'ordre dans lequel les rendements arrivent et son impact. Écart p10-p90 : ${fmt(wealthSpread)} $. Expliquer en langage simple sans jargon.
- estate_obs (max 400 car.) : ce que les simulations indiquent pour la succession. Patrimoine médian ${fmt(medEstate)} $, p10 ${fmt(p10Estate)} $. Aligner avec la préférence "${estatePref}".
- obs_1 (max 500 car.) : observation complémentaire la plus pertinente non couverte par les autres slots.
- obs_2 (max 500 car.) : deuxième observation complémentaire. Peut porter sur la répartition actions/obligations et son évolution (glissement ${params.glideSpd ? `${Math.round(params.glideSpd * 100)} %/an` : "non actif"}).

Répondre en ${fr ? "français" : "anglais"} exclusivement. JSON strict. Aucun texte hors de l'objet JSON.`;

  return { sys, usr };
}
