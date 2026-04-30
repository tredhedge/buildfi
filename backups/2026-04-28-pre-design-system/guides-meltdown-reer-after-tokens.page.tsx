/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { getEditorialPalette } from "@/lib/design/editorial.tokens";

// Palette: shared Editorial system. See docs/DESIGN-SYSTEM.md.
const CL = getEditorialPalette();

export default function MeltdownArticle() {
  return (
    <div style={{ background: CL.bg, color: CL.text, fontFamily: 'var(--font-inter),"Segoe UI",Arial,sans-serif', minHeight: "100vh" }}>
      <header style={{ background: CL.card, borderBottom: `1px solid ${CL.line}`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Link href="/" style={{ color: CL.gold, fontWeight: 900, fontSize: 20, textDecoration: "none", letterSpacing: -0.5 }}>BuildFi</Link>
        </div>
      </header>

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px", lineHeight: 1.7 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          Guide avancé · 10 minutes de lecture
        </div>
        <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: CL.ink, margin: "0 0 16px", lineHeight: 1.15, letterSpacing: -0.8 }}>
          Meltdown REER : calcul, exemples et pièges
        </h1>
        <div style={{ fontSize: 16, color: CL.dim, marginBottom: 32, lineHeight: 1.5 }}>
          Retirer du REER <strong>avant</strong> 72 ans peut économiser 40 000 $ à 120 000 $ sur 25 ans. Contre-intuitif, mais mathématiquement imparable pour certains profils. Voici le calcul, les exemples chiffrés, et les 4 cas où c'est une mauvaise idée.
          <br />
          <span style={{ fontSize: 13, color: CL.dim, fontStyle: "italic" }}>Mis à jour : 24 avril 2026 · Chiffres 2026</span>
        </div>

        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <strong style={{ color: CL.ink, display: "block", marginBottom: 8 }}>TL;DR</strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
            <li>À 72 ans, conversion en FERR obligatoire. Retraits minimums forcés = peut dépasser seuil PSV (95 323 $).</li>
            <li><strong>Stratégie :</strong> retirer le REER petit à petit entre 60 et 72 ans, à taux bas (27-32 %).</li>
            <li>Zone dorée : 60-65 ans (avant RRQ + PSV).</li>
            <li><strong>Économies typiques : 40 k$ à 120 k$</strong> pour un REER de 500 k$+ sur 25 ans de retraite.</li>
            <li>Pas pour tous : si REER &lt; 200 k$, ça ne vaut pas la complexité.</li>
          </ul>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Le problème : les retraits FERR obligatoires
        </h2>

        <p>
          À 72 ans, votre REER est converti en FERR (fonds enregistré de revenu de retraite). Chaque année, vous devez retirer un <strong>minimum obligatoire</strong> calculé en % du solde :
        </p>

        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 12, padding: 20, margin: "16px 0", overflow: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${CL.line}` }}>
                <th style={{ padding: "6px 6px", textAlign: "left" }}>Âge</th>
                <th style={{ padding: "6px 6px", textAlign: "center" }}>% min.</th>
                <th style={{ padding: "6px 6px", textAlign: "right" }}>Sur REER 2 M$</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: "6px 6px" }}>72</td><td style={{ padding: "6px 6px", textAlign: "center" }}>5,4 %</td><td style={{ padding: "6px 6px", textAlign: "right" }}>108 000 $</td></tr>
              <tr><td style={{ padding: "6px 6px" }}>75</td><td style={{ padding: "6px 6px", textAlign: "center" }}>5,8 %</td><td style={{ padding: "6px 6px", textAlign: "right" }}>116 000 $</td></tr>
              <tr><td style={{ padding: "6px 6px" }}>80</td><td style={{ padding: "6px 6px", textAlign: "center" }}>6,8 %</td><td style={{ padding: "6px 6px", textAlign: "right" }}>136 000 $</td></tr>
              <tr><td style={{ padding: "6px 6px" }}>85</td><td style={{ padding: "6px 6px", textAlign: "center" }}>8,5 %</td><td style={{ padding: "6px 6px", textAlign: "right" }}>170 000 $</td></tr>
              <tr><td style={{ padding: "6px 6px" }}>90</td><td style={{ padding: "6px 6px", textAlign: "center" }}>11,9 %</td><td style={{ padding: "6px 6px", textAlign: "right" }}>238 000 $</td></tr>
            </tbody>
          </table>
        </div>

        <p>
          Un REER de 2 M$ à 72 ans force un retrait de 108 000 $ la première année, entièrement imposable. Combiné à la RRQ (~18 000 $) et à la PSV (~8 900 $), le revenu total atteint ~135 000 $ — <strong>bien au-dessus du seuil de récupération PSV de 95 323 $</strong>.
        </p>

        <p>
          Résultat : l'excédent de 40 000 $ cause une récupération PSV de <strong>6 000 $/an</strong> (15 % de 40 000 $), en plus de payer l'impôt au taux marginal maximal. Sur 20 ans, c'est 120 000 $ de PSV perdue, plus peut-être 300 000 $ en impôt supplémentaire.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
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

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Exemple chiffré
        </h2>

        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 12, padding: 20, margin: "16px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Profil
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            <li>Retraité célibataire au Québec, 62 ans</li>
            <li>REER : 800 000 $</li>
            <li>CELI : 90 000 $ (place cumulative disponible : 19 000 $)</li>
            <li>Retraite anticipée : aucun revenu d'emploi</li>
            <li>RRQ prévue à 70 ans (différée pour maximiser)</li>
            <li>PSV prévue à 70 ans</li>
          </ul>
        </div>

        <div style={{ background: CL.red + "18", border: `1px solid ${CL.red}`, borderRadius: 10, padding: 16, margin: "16px 0" }}>
          <strong style={{ color: CL.red, display: "block", marginBottom: 6 }}>Sans meltdown (scénario conventionnel)</strong>
          <p style={{ fontSize: 14, margin: 0 }}>
            REER laissé intact jusqu'à 72 ans, croît à 5 %/an réel → ~1,35 M$. Retraits FERR à 72 = ~73 000 $/an + RRQ 25 000 $ + PSV 10 000 $ = 108 000 $/an. Récupération PSV : <strong>1 900 $/an</strong>. Taux marginal : 45 %.
          </p>
          <p style={{ fontSize: 14, margin: "8px 0 0" }}>
            <strong>Impôt + PSV récupérée sur 25 ans : ~195 000 $.</strong>
          </p>
        </div>

        <div style={{ background: CL.green + "18", border: `1px solid ${CL.green}`, borderRadius: 10, padding: 16, margin: "16px 0" }}>
          <strong style={{ color: CL.green, display: "block", marginBottom: 6 }}>Avec meltdown (62-69 ans)</strong>
          <p style={{ fontSize: 14, margin: 0 }}>
            Retraits REER de 55 000 $/an pendant 8 ans (62-69) = 440 000 $ cumulatif, imposé à 28 % → 123 200 $ d'impôt total. Net après impôt : 316 800 $ réparti dans CELI (au fur et à mesure de la place) et NE. À 72 ans, REER restant : ~650 000 $ (croissance compensée par les retraits). Retraits FERR à 72 : ~35 000 $/an seulement. Revenu total à 72 : 35 000 + 35 000 (RRQ) + 14 000 (PSV) = 84 000 $. <strong>Sous le seuil PSV.</strong>
          </p>
          <p style={{ fontSize: 14, margin: "8px 0 0" }}>
            <strong>Impôt total sur 25 ans : ~128 000 $. Économie : ~67 000 $.</strong>
          </p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          La zone dorée : 60-65 ans
        </h2>

        <p>
          Entre la retraite et le début de la RRQ/PSV, votre revenu imposable peut être quasi-nul. C'est la <strong>zone dorée du meltdown</strong> — vous pouvez retirer jusqu'à 50 000 $/an du REER à un taux marginal de 15-20 %, bien inférieur aux 27-32 % normalement appliqués.
        </p>

        <p>
          Pour un retraité entre 60 et 65 ans sans autre revenu, retirer 50 000 $ du REER coûte moins de 9 000 $ d'impôt (taux effectif ~18 %). Les mêmes 50 000 $ retirés à 72+ au taux marginal de 45 % coûtent 22 500 $. <strong>Différence : 13 500 $/an × 5 ans = 67 500 $ de pure économie.</strong>
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
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

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
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

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Meltdown vs fractionnement : lequel est meilleur ?
        </h2>

        <p>
          Si vous êtes en couple et que votre conjoint a un revenu plus bas, le <strong>fractionnement de pension à 65+</strong> peut économiser 3 000-5 000 $/an sans complexité. Pour un couple à revenus très asymétriques, le fractionnement devrait précéder le meltdown.
        </p>

        <p>
          <strong>La combinaison idéale :</strong> meltdown entre 60 et 65 ans (zone dorée, sans fractionnement possible), puis fractionnement à partir de 65 ans pour réduire le coup du FERR restant.
        </p>

        <div style={{ background: CL.ink, color: "#fff", borderRadius: 12, padding: "24px 22px", margin: "36px 0 0" }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: "#fff" }}>
            Votre meltdown optimal, calculé sur votre situation
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)", margin: "0 0 14px" }}>
            Bilan 360 calcule la séquence de retraits optimale — année par année — pour votre REER, votre palier fiscal, votre RRQ/PSV, votre CELI et votre conjoint. 5 000 simulations Monte Carlo testent si le plan survit à un krach durant le meltdown. 29,99 $, paiement unique.
          </p>
          <a href="/wizard" style={{ display: "inline-block", background: CL.gold, color: CL.ink, padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
            Commencer mon Bilan →
          </a>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CL.line}`, fontSize: 12, color: CL.dim, lineHeight: 1.6 }}>
          <strong>Sources :</strong> ARC — Règles FERR et facteurs de retrait minimum (Schedule 7) · Revenu Québec — Paliers fiscaux 2026 · Service Canada — Seuils de récupération PSV Q1 2026 · Loi de l'impôt sur le revenu (LRC 1985 c. 1) articles 146 et 146.3.
          <br />
          <br />
          <em>Cet article est fourni à titre informatif et éducatif seulement. Le meltdown REER est une stratégie fiscale avancée dont l'application dépend de votre situation personnelle, votre province, et les règles fiscales en vigueur. Consultez un planificateur financier (Pl. Fin.) ou un fiscaliste avant d'appliquer.</em>
        </div>
      </article>
    </div>
  );
}
