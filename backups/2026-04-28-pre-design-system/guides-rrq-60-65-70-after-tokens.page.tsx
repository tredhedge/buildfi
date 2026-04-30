/* Article SEO — RRQ à 60, 65 ou 70 ans. Server-rendered page, FR only. */
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { getEditorialPalette } from "@/lib/design/editorial.tokens";

// Palette: shared Editorial system. See docs/DESIGN-SYSTEM.md.
const CL = getEditorialPalette();

export default function RRQArticle() {
  return (
    <div style={{ background: CL.bg, color: CL.text, fontFamily: 'var(--font-inter),"Segoe UI",Arial,sans-serif', minHeight: "100vh" }}>
      {/* Nav link back */}
      <header style={{ background: CL.card, borderBottom: `1px solid ${CL.line}`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Link href="/" style={{ color: CL.gold, fontWeight: 900, fontSize: 20, textDecoration: "none", letterSpacing: -0.5 }}>BuildFi</Link>
        </div>
      </header>

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px", lineHeight: 1.7 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: CL.gold, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          Guide · 8 minutes de lecture
        </div>
        <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: CL.ink, margin: "0 0 16px", lineHeight: 1.15, letterSpacing: -0.8 }}>
          RRQ à 60, 65 ou 70 ans : l'analyse complète
        </h1>
        <div style={{ fontSize: 16, color: CL.dim, marginBottom: 32, lineHeight: 1.5 }}>
          La décision d'âge pour la RRQ est <strong>irréversible</strong>. Ce guide couvre le calcul, le point d'équilibre, les exceptions, et les cas où les règles normales ne s'appliquent pas.
          <br />
          <span style={{ fontSize: 13, color: CL.dim, fontStyle: "italic" }}>Mis à jour : 24 avril 2026 · Chiffres 2026</span>
        </div>

        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <strong style={{ color: CL.ink, display: "block", marginBottom: 8 }}>TL;DR</strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
            <li>60 ans : <strong style={{ color: CL.red }}>-36 %</strong> pour la vie. Choix rationnel si santé précaire.</li>
            <li>65 ans : rente de référence. Option par défaut par manque de réflexion.</li>
            <li>70 ans : <strong style={{ color: CL.green }}>+42 %</strong> pour la vie. Point d'équilibre ≈ 82 ans.</li>
            <li>Pour la plupart des Canadiens en santé, <strong>différer jusqu'à 70 ans est mathématiquement gagnant</strong>.</li>
          </ul>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Les chiffres exacts
        </h2>

        <p>
          La RRQ applique un ajustement actuariel permanent selon l'âge de début :
        </p>

        <div style={{ background: CL.card, border: `1px solid ${CL.line}`, borderRadius: 12, padding: 20, margin: "16px 0" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${CL.line}` }}>
                <th style={{ padding: "8px 6px", textAlign: "left" }}>Âge de début</th>
                <th style={{ padding: "8px 6px", textAlign: "center" }}>Ajustement</th>
                <th style={{ padding: "8px 6px", textAlign: "center" }}>Max 2026 ($/mois)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${CL.line}` }}>
                <td style={{ padding: "10px 6px" }}>60</td>
                <td style={{ padding: "10px 6px", textAlign: "center", color: CL.red, fontWeight: 700 }}>−36 %</td>
                <td style={{ padding: "10px 6px", textAlign: "center" }}>965 $</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${CL.line}`, background: CL.s2 }}>
                <td style={{ padding: "10px 6px" }}><strong>65 (référence)</strong></td>
                <td style={{ padding: "10px 6px", textAlign: "center" }}>0 %</td>
                <td style={{ padding: "10px 6px", textAlign: "center" }}><strong>1 508 $</strong></td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${CL.line}` }}>
                <td style={{ padding: "10px 6px" }}>70</td>
                <td style={{ padding: "10px 6px", textAlign: "center", color: CL.green, fontWeight: 700 }}>+42 %</td>
                <td style={{ padding: "10px 6px", textAlign: "center" }}>2 141 $</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: CL.dim, marginTop: 10, fontStyle: "italic" }}>
            Entre 60 et 65 : −0,6 % par mois. Entre 65 et 70 : +0,7 % par mois. Valeurs capées à ces bornes.
          </div>
        </div>

        <p>
          <strong>La moyenne réelle des nouvelles rentes est ~900 $/mois</strong> (Retraite Québec, 2025). Le 1 508 $ est atteint seulement par ceux qui ont cotisé au maximum pendant 40 ans.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Le point d'équilibre : ~82 ans
        </h2>

        <p>
          Différer de 65 à 70 ans coûte 5 ans de rente non reçue (~90 000 $ cumulatifs au max). En échange, chaque paiement mensuel à partir de 70 ans est 42 % plus élevé pour le reste de la vie.
        </p>

        <p>
          Le point d'équilibre — l'âge où le total cumulatif différé rattrape le total cumulatif pris à 65 — est <strong>environ 82 ans</strong>.
        </p>

        <div style={{ background: CL.s2, border: `1px solid ${CL.line}`, borderRadius: 10, padding: 16, margin: "20px 0", fontSize: 14 }}>
          <strong style={{ color: CL.ink }}>Espérance de vie à 65 ans (Canadiens 2023)</strong>
          <div style={{ marginTop: 8 }}>
            Hommes : <strong>87,2 ans</strong> (83 % dépassent 82 ans)
            <br />
            Femmes : <strong>89,7 ans</strong> (88 % dépassent 82 ans)
          </div>
          <div style={{ fontSize: 12, color: CL.dim, marginTop: 8 }}>
            Source : Statistique Canada, Table 13-10-0114-01.
          </div>
        </div>

        <p>
          <strong>Pour la majorité des Canadiens en bonne santé, différer est gagnant.</strong> La RRQ est aussi indexée à l'inflation, donc chaque dollar additionnel à 70 ans est protégé contre la hausse du coût de la vie.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Quand prendre à 60 ans malgré la pénalité
        </h2>

        <p>Trois cas où prendre la RRQ à 60 ans est rationnel :</p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>
          1. Problèmes de santé significatifs
        </h3>
        <p>
          Si votre espérance de vie est réduite (diagnostic, antécédents familiaux), le point d'équilibre de 82 ans devient improbable. Dans ce cas, recevoir moins mais plus tôt a plus de valeur.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>
          2. Besoin de liquidités immédiat, aucune autre source
        </h3>
        <p>
          Perte d'emploi sans épargne, absence de pension, pas de CELI/REER suffisant. La RRQ à 60 ans couvre les dépenses essentielles sans avoir à s'endetter ou à liquider des actifs à perte.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: CL.ink, margin: "20px 0 10px" }}>
          3. Conjoint survivant à faible revenu
        </h3>
        <p>
          La rente de survivant est basée sur votre rente. Si vous prenez à 65 ans, le conjoint reçoit 60 % de votre rente à 65 (si 65+) après votre décès. <strong>Mais</strong> si vous prenez à 60 ans, ce 60 % est calculé sur une rente plus basse — paradoxalement, le conjoint peut être désavantagé.
        </p>

        <div style={{ background: "#fff4e5", borderLeft: `3px solid ${CL.gold}`, padding: "14px 18px", margin: "16px 0", borderRadius: 6 }}>
          <strong>Nuance fiscale :</strong> la rente de survivant est capée à un plafond combiné (~1 508 $/mois pour un couple). Au-delà, les calculs se complexifient. Consulter un planificateur pour les cas à haut revenu.
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          La bonification RRQ depuis 2019
        </h2>

        <p>
          Depuis 2019, la RRQ calcule la rente sur <strong>33,3 % des revenus admissibles</strong> (contre 25 % avant). Cette bonification s'accumule graduellement, donc les nouvelles cohortes toucheront progressivement plus.
        </p>

        <p>
          Pour une personne cotisant au maximum depuis 2019 pendant 40 ans, la rente pleine atteindra éventuellement ~50 % de revenu admissible (vs 33 % pour les cohortes plus âgées). Les pourcentages de +/- pour 60/65/70 restent inchangés : l'ajustement est actuariel et purement mathématique.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          L'arbitrage avec la PSV (récupération)
        </h2>

        <p>
          Si votre revenu à la retraite dépasse 95 323 $ (seuil 2026), la PSV est progressivement récupérée à 15 ¢/$. <strong>Reporter la RRQ à 70 ans peut paradoxalement augmenter la récupération PSV</strong> entre 70 et 72 ans, puisque RRQ + OAS + retraits FERR forcés s'additionnent.
        </p>

        <p>
          L'arbitrage optimal dépend de votre REER. <a href="/guides/201" style={{ color: CL.gold }}>Guide 201 — chapitre 3 couvre la récupération PSV en détail</a>.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Et la RPC (Canada hors Québec) ?
        </h2>

        <p>
          Les règles du Régime de pensions du Canada (RPC) sont essentiellement identiques. Mêmes pourcentages, même point d'équilibre. Les différences portent sur le calcul de la rente maximale et certains détails techniques. Si vous avez cotisé aux deux régimes, vos contributions sont consolidées automatiquement.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: CL.ink, margin: "36px 0 14px", letterSpacing: -0.3 }}>
          Comment décider : 3 étapes
        </h2>

        <ol style={{ paddingLeft: 20, fontSize: 15 }}>
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

        <div style={{ background: CL.ink, color: "#fff", borderRadius: 12, padding: "24px 22px", margin: "36px 0 0" }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: "#fff" }}>
            Votre décision optimale, pour votre situation
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)", margin: "0 0 14px" }}>
            Bilan 360 teste les 11 combinaisons RRQ × PSV sur 5 000 trajectoires Monte Carlo et retourne le couple optimal pour <strong>votre</strong> plan — revenus, épargne, conjoint, horizon. 29,99 $, paiement unique.
          </p>
          <a href="/wizard" style={{ display: "inline-block", background: CL.gold, color: CL.ink, padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
            Commencer mon Bilan →
          </a>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CL.line}`, fontSize: 12, color: CL.dim, lineHeight: 1.6 }}>
          <strong>Sources :</strong> Retraite Québec — Guide du Régime de rentes 2026 · Statistique Canada — Tables de mortalité 2020-2022 · Loi sur le Régime de rentes du Québec (RLRQ c. R-9) · Service Canada — Prestation de la Sécurité de la vieillesse (T4A-OAS).
          <br />
          <br />
          <em>Cet article est fourni à titre informatif et éducatif seulement. Il ne constitue pas un conseil financier personnalisé. Pour toute décision importante, consultez un planificateur financier certifié (Pl. Fin.).</em>
        </div>
      </article>
    </div>
  );
}
