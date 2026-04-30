"use client";
/* Article SEO — RRQ à 60, 65 ou 70 ans. FR only. */
/* eslint-disable react/no-unescaped-entities */

import { getEditorialPalette } from "@/lib/design/editorial.tokens";
import { Note, useEditorialBody, useEditorialRailScrollSpy } from "@/lib/design/editorial-components";
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

// Palette + components: shared Editorial system. See docs/DESIGN-SYSTEM.md.
const CL = getEditorialPalette();

/*
  Plan v2.2 / Phase 6a (2026-04-29): explicit section IDs + rail TOC.
  RAIL_TOC is the source of truth for the sticky rail; each entry's id
  must match the corresponding <h2 id="...">.
*/
const RAIL_TOC: { id: string; label: string }[] = [
  { id: "sec-chiffres", label: "Les chiffres exacts" },
  { id: "sec-equilibre", label: "Point d'équilibre : ~82 ans" },
  { id: "sec-prendre-60", label: "Prendre à 60 malgré la pénalité" },
  { id: "sec-bonification", label: "La bonification RRQ depuis 2019" },
  { id: "sec-arbitrage-psv", label: "Arbitrage avec la PSV" },
  { id: "sec-rpc", label: "Et la RPC ?" },
  { id: "sec-decider", label: "Comment décider : 3 étapes" },
];

const articleHeading: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: CL.ink,
  margin: "44px 0 14px",
  fontFamily: 'var(--font-playfair),Georgia,serif',
  lineHeight: 1.2,
  scrollMarginTop: 28,
};

const subHeading: React.CSSProperties = {
  fontSize: 19,
  fontWeight: 700,
  color: CL.ink,
  margin: "22px 0 10px",
  fontFamily: 'var(--font-playfair),Georgia,serif',
};

export default function RRQArticle() {
  useEditorialBody();
  useEditorialRailScrollSpy();
  return (
    <>
      <EditorialHeader lang="fr" eyebrow="Guide · 8 min de lecture" />
      <div className="bfe-shell bfe-shell--guide" style={{ maxWidth: 1340, padding: "12px 24px 80px" }}>
        <aside className="bfe-rail">
          <div className="bfe-kicker" style={{ marginBottom: 14 }}>Plan</div>
          <nav className="bfe-nav" aria-label="Table des matières">
            {RAIL_TOC.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono),monospace', fontSize: 11, color: CL.gold, fontWeight: 700, marginRight: 8, letterSpacing: "0.04em" }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>{s.label}</span>
              </a>
            ))}
          </nav>
        </aside>
        <main style={{ minWidth: 0, maxWidth: 880 }}>
          <article style={{ lineHeight: 1.75 }}>
            <section className="bfe-cover" style={{ padding: "40px 36px" }}>
              <div className="bfe-kicker">Guide · 8 min de lecture</div>
              <h1 className="bfe-title-cover" style={{ fontSize: "clamp(34px, 5vw, 54px)" }}>RRQ à 60, 65 ou 70 ans : l'analyse complète</h1>
              <p style={{ fontSize: 18, color: CL.text, lineHeight: 1.55, margin: 0, maxWidth: 720 }}>
                La décision d'âge pour la RRQ est <strong>irréversible</strong>. Ce guide couvre le calcul, le point d'équilibre, les exceptions, et les cas où les règles normales ne s'appliquent pas.
              </p>
              <div style={{ fontSize: 13, color: CL.muted, fontStyle: "italic" }}>Mis à jour : 24 avril 2026 · Chiffres 2026</div>
            </section>

            <Note tone="rule" kicker="TL;DR">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, lineHeight: 1.7 }}>
                <li>60 ans : <strong style={{ color: CL.red }}>−36 %</strong> pour la vie. Choix rationnel si santé précaire.</li>
                <li>65 ans : rente de référence. Option par défaut par manque de réflexion.</li>
                <li>70 ans : <strong style={{ color: CL.green }}>+42 %</strong> pour la vie. Point d'équilibre ≈ 82 ans.</li>
                <li>Pour la plupart des Canadiens en santé, <strong>différer jusqu'à 70 ans est mathématiquement gagnant</strong>.</li>
              </ul>
            </Note>

            <h2 id="sec-chiffres" style={articleHeading}>Les chiffres exacts</h2>

            <p>La RRQ applique un ajustement actuariel permanent selon l'âge de début :</p>

            <div style={{ overflow: "auto", margin: "18px 0", border: `1px solid ${CL.line}`, borderRadius: 12 }}>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse", minWidth: 420 }}>
                <thead>
                  <tr style={{ background: CL.s2 }}>
                    <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>Âge de début</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>Ajustement</th>
                    <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>Max 2026 ($/mois)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${CL.line}` }}>
                    <td style={{ padding: "10px 14px", color: CL.text, fontWeight: 600 }}>60</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: CL.red, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>−36 %</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: CL.text, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>965 $</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${CL.line}`, background: CL.s2 }}>
                    <td style={{ padding: "10px 14px", color: CL.ink, fontWeight: 700 }}>65 (référence)</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: CL.muted, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>0 %</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: CL.ink, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>1 508 $</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 14px", color: CL.text, fontWeight: 600 }}>70</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: CL.green, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>+42 %</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: CL.text, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>2 141 $</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 12, color: CL.muted, fontStyle: "italic", margin: "-8px 0 18px" }}>
              Entre 60 et 65 : −0,6 % par mois. Entre 65 et 70 : +0,7 % par mois. Valeurs capées à ces bornes.
            </div>

            <p>
              <strong>La moyenne réelle des nouvelles rentes est ~900 $/mois</strong> (Retraite Québec, 2025). Le 1 508 $ est atteint seulement par ceux qui ont cotisé au maximum pendant 40 ans.
            </p>

            <h2 id="sec-equilibre" style={articleHeading}>Le point d'équilibre : ~82 ans</h2>

            <p>
              Différer de 65 à 70 ans coûte 5 ans de rente non reçue (~90 000 $ cumulatifs au max). En échange, chaque paiement mensuel à partir de 70 ans est 42 % plus élevé pour le reste de la vie.
            </p>

            <p>
              Le point d'équilibre — l'âge où le total cumulatif différé rattrape le total cumulatif pris à 65 — est <strong>environ 82 ans</strong>.
            </p>

            <Note tone="info" kicker="Espérance de vie à 65 ans · Canadiens 2023">
              Hommes : <strong>87,2 ans</strong> (83 % dépassent 82 ans)
              <br />
              Femmes : <strong>89,7 ans</strong> (88 % dépassent 82 ans)
              <div style={{ fontSize: 12, color: CL.muted, marginTop: 8, fontStyle: "italic" }}>
                Source : Statistique Canada, Table 13-10-0114-01.
              </div>
            </Note>

            <p>
              <strong>Pour la majorité des Canadiens en bonne santé, différer est gagnant.</strong> La RRQ est aussi indexée à l'inflation, donc chaque dollar additionnel à 70 ans est protégé contre la hausse du coût de la vie.
            </p>

            <h2 id="sec-prendre-60" style={articleHeading}>Quand prendre à 60 ans malgré la pénalité</h2>

            <p>Trois cas où prendre la RRQ à 60 ans est rationnel :</p>

            <h3 style={subHeading}>1. Problèmes de santé significatifs</h3>
            <p>
              Si votre espérance de vie est réduite (diagnostic, antécédents familiaux), le point d'équilibre de 82 ans devient improbable. Dans ce cas, recevoir moins mais plus tôt a plus de valeur.
            </p>

            <h3 style={subHeading}>2. Besoin de liquidités immédiat, aucune autre source</h3>
            <p>
              Perte d'emploi sans épargne, absence de pension, pas de CELI/REER suffisant. La RRQ à 60 ans couvre les dépenses essentielles sans avoir à s'endetter ou à liquider des actifs à perte.
            </p>

            <h3 style={subHeading}>3. Conjoint survivant à faible revenu</h3>
            <p>
              La rente de survivant est basée sur votre rente. Si vous prenez à 65 ans, le conjoint reçoit 60 % de votre rente à 65 (si 65+) après votre décès. <strong>Mais</strong> si vous prenez à 60 ans, ce 60 % est calculé sur une rente plus basse — paradoxalement, le conjoint peut être désavantagé.
            </p>

            <Note tone="rule" kicker="Nuance fiscale">
              La rente de survivant est capée à un plafond combiné (~1 508 $/mois pour un couple). Au-delà, les calculs se complexifient. Consulter un planificateur pour les cas à haut revenu.
            </Note>

            <h2 id="sec-bonification" style={articleHeading}>La bonification RRQ depuis 2019</h2>

            <p>
              Depuis 2019, la RRQ calcule la rente sur <strong>33,3 % des revenus admissibles</strong> (contre 25 % avant). Cette bonification s'accumule graduellement, donc les nouvelles cohortes toucheront progressivement plus.
            </p>

            <p>
              Pour une personne cotisant au maximum depuis 2019 pendant 40 ans, la rente pleine atteindra éventuellement ~50 % de revenu admissible (vs 33 % pour les cohortes plus âgées). Les pourcentages de +/- pour 60/65/70 restent inchangés : l'ajustement est actuariel et purement mathématique.
            </p>

            <h2 id="sec-arbitrage-psv" style={articleHeading}>L'arbitrage avec la PSV (récupération)</h2>

            <p>
              Si votre revenu à la retraite dépasse 95 323 $ (seuil 2026), la PSV est progressivement récupérée à 15 ¢/$. <strong>Reporter la RRQ à 70 ans peut paradoxalement augmenter la récupération PSV</strong> entre 70 et 72 ans, puisque RRQ + OAS + retraits FERR forcés s'additionnent.
            </p>

            <p>
              L'arbitrage optimal dépend de votre REER. <a href="/guides/201" style={{ color: CL.gold, fontWeight: 700 }}>Guide 201 — chapitre 3 couvre la récupération PSV en détail</a>.
            </p>

            <h2 id="sec-rpc" style={articleHeading}>Et la RPC (Canada hors Québec) ?</h2>

            <p>
              Les règles du Régime de pensions du Canada (RPC) sont essentiellement identiques. Mêmes pourcentages, même point d'équilibre. Les différences portent sur le calcul de la rente maximale et certains détails techniques. Si vous avez cotisé aux deux régimes, vos contributions sont consolidées automatiquement.
            </p>

            <h2 id="sec-decider" style={articleHeading}>Comment décider : 3 étapes</h2>

            <ol style={{ paddingLeft: 20, fontSize: 15, lineHeight: 1.7 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Évaluez votre espérance de vie honnêtement.</strong> Si raisonnable (&gt; 82 ans), différer gagne.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Vérifiez votre besoin de liquidités.</strong> Si vous avez CELI, NE, REER et aucune dette à 20 %, vous pouvez différer sans souci.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Simulez votre situation complète.</strong> Les 11 combinaisons RRQ × PSV (60/65/70 × 65/70) donnent 11 scénarios différents. Un bon planificateur teste les 11 et choisit celui qui maximise votre plan.
              </li>
            </ol>

            <section className="bfe-section" style={{ background: CL.ink, color: "#fff", borderColor: CL.ink, marginTop: 36 }}>
              <div className="bfe-kicker" style={{ color: CL.gold, marginBottom: 8 }}>Bilan 360</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px", color: "#fff", fontFamily: 'var(--font-playfair),Georgia,serif', lineHeight: 1.25 }}>
                Votre décision optimale, pour votre situation
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", margin: "0 0 18px", lineHeight: 1.55 }}>
                Bilan 360 teste les 11 combinaisons RRQ × PSV sur 5 000 trajectoires Monte Carlo et retourne le couple optimal pour <strong>votre</strong> plan — revenus, épargne, conjoint, horizon. 29,99 $, paiement unique.
              </p>
              <a href="/wizard" className="bfe-btn-gold">Commencer mon Bilan →</a>
            </section>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CL.accentLine}`, fontSize: 12, color: CL.muted, lineHeight: 1.7 }}>
              <strong>Sources :</strong> Retraite Québec — Guide du Régime de rentes 2026 · Statistique Canada — Tables de mortalité 2020-2022 · Loi sur le Régime de rentes du Québec (RLRQ c. R-9) · Service Canada — Prestation de la Sécurité de la vieillesse (T4A-OAS).
              <br />
              <br />
              <em>Cet article est fourni à titre informatif et éducatif seulement. Il ne constitue pas un conseil financier personnalisé. Pour toute décision importante, consultez un planificateur financier certifié (Pl. Fin.).</em>
            </div>
          </article>
        </main>
      </div>
      <EditorialFooter lang="fr" hideObservational />
    </>
  );
}
