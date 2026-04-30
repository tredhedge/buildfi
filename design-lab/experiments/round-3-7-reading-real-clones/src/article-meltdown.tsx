"use client";
/* eslint-disable react/no-unescaped-entities */
import type { CSSProperties } from "react";
import Link, { labHref } from "./next-shim";
import { getEditorialPalette } from "./editorial.tokens";
import { Note, useEditorialBody } from "./editorial-components";

// Palette + components: shared Editorial system. See docs/DESIGN-SYSTEM.md.
const CL = getEditorialPalette();

const articleHeading: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: CL.ink,
  margin: "36px 0 14px",
  fontFamily: 'var(--font-playfair),Georgia,serif',
  lineHeight: 1.2,
};

export default function MeltdownArticle() {
  useEditorialBody();
  return (
    <div className="bfe-shell" style={{ maxWidth: 880, padding: "32px 24px 80px" }}>
      <header style={{ marginBottom: 32 }}>
        <Link href="/" className="bfe-kicker" style={{ textDecoration: "none", color: CL.gold }}>← BuildFi</Link>
      </header>

      <article style={{ lineHeight: 1.75 }}>
        {/* Cover */}
        <section className="bfe-cover" style={{ padding: "40px 36px" }}>
          <div className="bfe-kicker">Guide avancé · 10 min de lecture</div>
          <h1 className="bfe-title-cover" style={{ fontSize: "clamp(34px, 5vw, 54px)" }}>Meltdown REER : calcul, exemples et pièges</h1>
          <p style={{ fontSize: 18, color: CL.text, lineHeight: 1.55, margin: 0, maxWidth: 720 }}>
            Retirer du REER <strong>avant</strong> 72 ans peut économiser 40 000 $ à 120 000 $ sur 25 ans. Contre-intuitif, mais mathématiquement imparable pour certains profils. Voici le calcul, les exemples chiffrés, et les 4 cas où c'est une mauvaise idée.
          </p>
          <div style={{ fontSize: 13, color: CL.muted, fontStyle: "italic" }}>Mis à jour : 24 avril 2026 · Chiffres 2026</div>
        </section>

        <Note tone="rule" kicker="TL;DR">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, lineHeight: 1.7 }}>
            <li>À 72 ans, conversion en FERR obligatoire. Retraits minimums forcés = peut dépasser seuil PSV (95 323 $).</li>
            <li><strong>Stratégie :</strong> retirer le REER petit à petit entre 60 et 72 ans, à taux bas (27-32 %).</li>
            <li>Zone dorée : 60-65 ans (avant RRQ + PSV).</li>
            <li><strong>Économies typiques : 40 k$ à 120 k$</strong> pour un REER de 500 k$+ sur 25 ans de retraite.</li>
            <li>Pas pour tous : si REER &lt; 200 k$, ça ne vaut pas la complexité.</li>
          </ul>
        </Note>

        <h2 style={articleHeading}>
          Le problème : les retraits FERR obligatoires
        </h2>

        <p>
          À 72 ans, votre REER est converti en FERR (fonds enregistré de revenu de retraite). Chaque année, vous devez retirer un <strong>minimum obligatoire</strong> calculé en % du solde :
        </p>

        <div style={{ overflow: "auto", margin: "18px 0", border: `1px solid ${CL.line}`, borderRadius: 12 }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse", minWidth: 420 }}>
            <thead>
              <tr style={{ background: CL.s2 }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>Âge</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>% min.</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, color: CL.gold, textTransform: "uppercase", letterSpacing: ".14em", borderBottom: `1px solid ${CL.line}` }}>Sur REER 2 M$</th>
              </tr>
            </thead>
            <tbody>
              {[["72","5,4 %","108 000 $"],["75","5,8 %","116 000 $"],["80","6,8 %","136 000 $"],["85","8,5 %","170 000 $"],["90","11,9 %","238 000 $"]].map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? CL.s2 : CL.card, borderBottom: i < 4 ? `1px solid ${CL.line}` : "none" }}>
                  <td style={{ padding: "10px 14px", color: CL.text, fontWeight: 600 }}>{row[0]}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: CL.text, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{row[1]}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: CL.ink, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          Un REER de 2 M$ à 72 ans force un retrait de 108 000 $ la première année, entièrement imposable. Combiné à la RRQ (~18 000 $) et à la PSV (~8 900 $), le revenu total atteint ~135 000 $ — <strong>bien au-dessus du seuil de récupération PSV de 95 323 $</strong>.
        </p>

        <p>
          Résultat : l'excédent de 40 000 $ cause une récupération PSV de <strong>6 000 $/an</strong> (15 % de 40 000 $), en plus de payer l'impôt au taux marginal maximal. Sur 20 ans, c'est 120 000 $ de PSV perdue, plus peut-être 300 000 $ en impôt supplémentaire.
        </p>

        <h2 style={articleHeading}>
          La solution : retirer plus tôt, à taux bas
        </h2>

        <p>Le meltdown consiste à :</p>

        <ol style={{ paddingLeft: 20, fontSize: 15 }}>
          <li style={{ marginBottom: 12 }}>
            <strong>Identifier votre palier fiscal cible.</strong> Au Québec 2026, le premier palier fédéral se termine à 57 375 $ ; taux marginal combiné ~27-32 % sous ce seuil.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Calculer votre revenu fixe</strong> (RRQ + pension PD + travail à temps partiel). La place restante dans le palier cible est votre <strong>budget meltdown annuel</strong>.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Retirer ce montant</strong> du REER chaque année. Déposer le net dans le CELI (si place) ou dans un compte non-enregistré.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>À 72 ans</strong>, votre REER converti en FERR sera beaucoup plus petit. Les retraits minimums ne poussent plus votre revenu au-dessus du seuil PSV.
          </li>
        </ol>

        <h2 style={articleHeading}>
          Exemple chiffré
        </h2>

        <Note tone="info" kicker="Profil">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>Retraité célibataire au Québec, 62 ans</li>
            <li>REER : 800 000 $</li>
            <li>CELI : 90 000 $ (place cumulative disponible : 19 000 $)</li>
            <li>Retraite anticipée : aucun revenu d'emploi</li>
            <li>RRQ prévue à 70 ans (différée pour maximiser)</li>
            <li>PSV prévue à 70 ans</li>
          </ul>
        </Note>

        <Note tone="caution" kicker="Sans meltdown · scénario conventionnel">
          <p style={{ fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            REER laissé intact jusqu'à 72 ans, croît à 5 %/an réel → ~1,35 M$. Retraits FERR à 72 = ~73 000 $/an + RRQ 25 000 $ + PSV 10 000 $ = 108 000 $/an. Récupération PSV : <strong>1 900 $/an</strong>. Taux marginal : 45 %.
          </p>
          <p style={{ fontSize: 14, margin: "8px 0 0", lineHeight: 1.7 }}>
            <strong>Impôt + PSV récupérée sur 25 ans : ~195 000 $.</strong>
          </p>
        </Note>

        <Note tone="check" kicker="Avec meltdown · 62-69 ans">
          <p style={{ fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            Retraits REER de 55 000 $/an pendant 8 ans (62-69) = 440 000 $ cumulatif, imposé à 28 % → 123 200 $ d'impôt total. Net après impôt : 316 800 $ réparti dans CELI (au fur et à mesure de la place) et NE. À 72 ans, REER restant : ~650 000 $ (croissance compensée par les retraits). Retraits FERR à 72 : ~35 000 $/an seulement. Revenu total à 72 : 35 000 + 35 000 (RRQ) + 14 000 (PSV) = 84 000 $. <strong>Sous le seuil PSV.</strong>
          </p>
          <p style={{ fontSize: 14, margin: "8px 0 0", lineHeight: 1.7 }}>
            <strong>Impôt total sur 25 ans : ~128 000 $. Économie : ~67 000 $.</strong>
          </p>
        </Note>

        <h2 style={articleHeading}>
          La zone dorée : 60-65 ans
        </h2>

        <p>
          Entre la retraite et le début de la RRQ/PSV, votre revenu imposable peut être quasi-nul. C'est la <strong>zone dorée du meltdown</strong> — vous pouvez retirer jusqu'à 50 000 $/an du REER à un taux marginal de 15-20 %, bien inférieur aux 27-32 % normalement appliqués.
        </p>

        <p>
          Pour un retraité entre 60 et 65 ans sans autre revenu, retirer 50 000 $ du REER coûte moins de 9 000 $ d'impôt (taux effectif ~18 %). Les mêmes 50 000 $ retirés à 72+ au taux marginal de 45 % coûtent 22 500 $. <strong>Différence : 13 500 $/an × 5 ans = 67 500 $ de pure économie.</strong>
        </p>

        <h2 style={articleHeading}>
          Quand le meltdown ne vaut PAS la peine
        </h2>

        <ol style={{ paddingLeft: 20, fontSize: 15 }}>
          <li style={{ marginBottom: 12 }}>
            <strong>REER &lt; 200 000 $.</strong> Les retraits FERR obligatoires à 72+ sur un solde modeste ne dépassent pas le seuil PSV. Pas de gain net.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Taux marginal actuel = taux prévu à la retraite.</strong> Si vous êtes déjà à 35 % maintenant et prévoyez rester à 35 %, déplacer l'argent ne change rien fiscalement.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Conjoint à faible revenu.</strong> Dans ce cas, le fractionnement de pension à 65+ (T1032 + TP-1012.A) fait souvent mieux que le meltdown — et il est plus simple.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Aversion au risque de changement fiscal.</strong> Les règles peuvent changer. Retirer tôt « cristallise » l'impôt au taux actuel, ce qui peut être désavantageux si les taux baissent dans l'avenir. (Historiquement, ils ont plutôt monté — cette crainte est rarement justifiée.)
          </li>
        </ol>

        <h2 style={articleHeading}>
          Les 3 pièges courants
        </h2>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>1. Meltdown sans plafond</h3>
        <p>
          Certains veulent vider leur REER le plus vite possible. <strong>Erreur :</strong> ils grimpent dans des paliers à 45 % et perdent plus en impôt immédiat que le gain futur. Toujours respecter le palier cible.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>2. Déposer dans le mauvais compte</h3>
        <p>
          Retirer du REER et redéposer dans un <strong>compte non-enregistré</strong> alors que le CELI a de la place disponible = gaspillage. Toujours prioriser le CELI, puis seulement le NE si le CELI est plein.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>3. Oublier la retenue à la source</h3>
        <p>
          Les retraits REER sont soumis à une <strong>retenue à la source</strong> (10 % sous 5 000 $, 20 % sur 5 001-15 000 $, 30 % au-dessus). Planifier en conséquence pour ne pas être à court de cash. Le gouvernement rembourse l'excès en avril suivant, mais vous êtes privé de liquidités entretemps.
        </p>

        <h2 style={articleHeading}>
          Meltdown vs fractionnement : lequel est meilleur ?
        </h2>

        <p>
          Si vous êtes en couple et que votre conjoint a un revenu plus bas, le <strong>fractionnement de pension à 65+</strong> peut économiser 3 000-5 000 $/an sans complexité. Pour un couple à revenus très asymétriques, le fractionnement devrait précéder le meltdown.
        </p>

        <p>
          <strong>La combinaison idéale :</strong> meltdown entre 60 et 65 ans (zone dorée, sans fractionnement possible), puis fractionnement à partir de 65 ans pour réduire le coup du FERR restant.
        </p>

        <section className="bfe-section" style={{ background: CL.ink, color: "#fff", borderColor: CL.ink, marginTop: 36 }}>
          <div className="bfe-kicker" style={{ color: CL.gold, marginBottom: 8 }}>Bilan 360</div>
          <h3 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px", color: "#fff", fontFamily: 'var(--font-playfair),Georgia,serif', lineHeight: 1.25 }}>
            Votre meltdown optimal, calculé sur votre situation
          </h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", margin: "0 0 18px", lineHeight: 1.55 }}>
            Bilan 360 calcule la séquence de retraits optimale — année par année — pour votre REER, votre palier fiscal, votre RRQ/PSV, votre CELI et votre conjoint. 5 000 simulations Monte Carlo testent si le plan survit à un krach durant le meltdown. 29,99 $, paiement unique.
          </p>
          <a href={labHref("/wizard")} className="bfe-btn-gold">Commencer mon Bilan →</a>
        </section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CL.accentLine}`, fontSize: 12, color: CL.muted, lineHeight: 1.7 }}>
          <strong>Sources :</strong> ARC — Règles FERR et facteurs de retrait minimum (Schedule 7) · Revenu Québec — Paliers fiscaux 2026 · Service Canada — Seuils de récupération PSV Q1 2026 · Loi de l'impôt sur le revenu (LRC 1985 c. 1) articles 146 et 146.3.
          <br />
          <br />
          <em>Cet article est fourni à titre informatif et éducatif seulement. Le meltdown REER est une stratégie fiscale avancée dont l'application dépend de votre situation personnelle, votre province, et les règles fiscales en vigueur. Consultez un planificateur financier (Pl. Fin.) ou un fiscaliste avant d'appliquer.</em>
        </div>
      </article>
    </div>
  );
}
