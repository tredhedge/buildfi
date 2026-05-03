"use client";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { getProductPalette } from "@/lib/design/product.tokens";
import { useProductBody } from "@/lib/design/product-components";
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

const cl = getProductPalette("light");

const TOC: { id: string; label: string }[] = [
  { id: "sec-hook", label: "Le chiffre choc" },
  { id: "sec-formule", label: "La formule du coût d'opportunité" },
  { id: "sec-comparatif", label: "Comparatif par type de dette" },
  { id: "sec-strategies", label: "3 stratégies de remboursement" },
  { id: "sec-pieges", label: "4 pièges à éviter" },
  { id: "sec-faq", label: "Questions fréquentes" },
];

/* ── Inline styles tuned for editorial prose ── */
const h2: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: cl.al,
  letterSpacing: "-0.015em",
  margin: "80px 0 18px",
  scrollMarginTop: 96,
  lineHeight: 1.2,
};

const h3: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: cl.al,
  margin: "36px 0 10px",
  lineHeight: 1.3,
};

const para: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.78,
  color: cl.tx,
  margin: "0 0 20px",
};

const lead: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.55,
  color: cl.dm,
  margin: "0 0 18px",
  fontWeight: 400,
};

const liStyle: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.78,
  color: cl.tx,
  marginBottom: 8,
};

/* small gold rule that sits before each H2, replacing card borders */
function Rule() {
  return <div style={{ width: 40, height: 2, background: cl.ac, marginTop: 80, marginBottom: -60 }} aria-hidden />;
}

/* pull quote: vertical gold bar + italic. NO background, NO border-radius. */
function Pull({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <blockquote style={{ margin: "32px 0", paddingLeft: 22, borderLeft: `2px solid ${cl.ac}` }}>
      {kicker ? (
        <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ fontSize: 18, lineHeight: 1.7, color: cl.al, fontStyle: "italic", fontWeight: 400 }}>
        {children}
      </div>
    </blockquote>
  );
}

export default function Article() {
  useProductBody("light");
  const [activeId, setActiveId] = useState<string>(TOC[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    TOC.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div suppressHydrationWarning style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: 'var(--font-dm-sans),"Inter","Segoe UI",sans-serif' }}>
      <EditorialHeader lang="fr" eyebrow="Guide pratique · 8 min de lecture" />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 96px", display: "grid", gridTemplateColumns: "minmax(0, 760px) 240px", gap: 96, justifyContent: "center" }}>
        <main style={{ minWidth: 0, paddingTop: 40 }}>
          {/* Cover */}
          <header style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Guide pratique · 8 min
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 56px)", fontWeight: 800, color: cl.al, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
              Le coût réel d'1 $ de dette
            </h1>
            <p style={lead}>
              Une carte de crédit ne « coûte » pas seulement ses intérêts. Elle coûte aussi tout ce que ce dollar aurait pu rapporter s'il avait été investi. Voici le calcul, le comparatif par type de dette, et les stratégies qui marchent vraiment.
            </p>
            <div style={{ fontSize: 13, color: cl.dm, letterSpacing: "0.02em" }}>3 mai 2026 · Chiffres canadiens 2026</div>
          </header>

          {/* L'essentiel — no card, just heading + list */}
          <section style={{ margin: "32px 0 56px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", margin: "0 0 14px" }}>
              L'essentiel
            </h3>
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={liStyle}>Carte de crédit moyenne au Canada : <strong>20,99 % APR</strong> (2026). Sur 1 000 $ porté un an : ~<strong>210 $ d'intérêts</strong>.</li>
              <li style={liStyle}>Coût d'opportunité : le même 1 000 $ en CELI à 6 % réel rapporterait ~<strong>70 $</strong>. Différence nette : ~<strong>280 $/an</strong>.</li>
              <li style={liStyle}>Hiérarchie : <strong>CC 21 % &gt; marge perso 11 % &gt; prêt auto 7-9 % &gt; hypothèque 5-6 %</strong>.</li>
              <li style={liStyle}>Règle simple : taux dette &gt; rendement réel attendu → rembourser. Sinon, investir.</li>
              <li style={{ ...liStyle, marginBottom: 0 }}>Avalanche bat snowball mathématiquement, sauf si la motivation flanche.</li>
            </ul>
          </section>

          <Rule />
          <h2 id="sec-hook" style={h2}>Le chiffre choc</h2>
          <p style={para}>
            La plupart des gens regardent leur solde de carte de crédit comme un chiffre négatif sur un relevé. Ils paient le minimum, parfois un peu plus, et passent à autre chose. Personne ne calcule jamais ce que <em>chaque dollar de dette</em> coûte à la fin de l'année.
          </p>
          <p style={para}>
            Voici la réalité, en chiffres simples, pour une dette de carte de crédit canadienne typique en 2026. Sur 1 000 $ porté pendant 12 mois : intérêts directs ~<strong>210 $</strong>. Coût d'opportunité d'un CELI à 6 % réel ~<strong>60 $</strong>. Coût total réel : <strong>270 $</strong> — soit 27 % du capital, par année, qui s'évapore.
          </p>

          <Pull>
            Une dette de 5 000 $ portée pendant trois ans coûte ~3 200 $ en intérêts et opportunité perdue. Vous remboursez 5 000 $, mais vous payez l'équivalent de 8 200 $. Vous avez littéralement travaillé 64 % de plus pour rien.
          </Pull>

          <Rule />
          <h2 id="sec-formule" style={h2}>La formule du coût d'opportunité</h2>
          <p style={para}>
            Le coût total d'une dette n'est pas seulement le taux d'intérêt — c'est ce taux <strong>plus</strong> ce que l'argent aurait pu rapporter ailleurs. Cette deuxième composante s'appelle le coût d'opportunité.
          </p>
          <p style={{ ...para, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 15, color: cl.al, padding: "16px 0", borderTop: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, margin: "24px 0", lineHeight: 1.8 }}>
            Coût annuel total = Capital × (Taux dette + Rendement opportunité)
            <br />
            <span style={{ color: cl.dm, fontSize: 13 }}>Pour 1 $ de dette CC : 1 × (0,21 + 0,06) = 0,27 $/an</span>
          </p>
          <p style={para}>Le rendement opportunité dépend du compte qui aurait reçu l'argent. Pour un Canadien type :</p>
          <ul style={{ paddingLeft: 22, margin: "0 0 28px" }}>
            <li style={liStyle}><strong>CELI investi 60/40</strong> : ~6 % réel à long terme. Aucun impôt sur la croissance.</li>
            <li style={liStyle}><strong>REER avec retour fiscal</strong> : ~6 % rendement + 30-40 % de retour fiscal immédiat. Imposable au retrait.</li>
            <li style={liStyle}><strong>CELIAPP (premier achat)</strong> : ~6 % + déduction REER + retrait non imposable. Le « cheat code ».</li>
            <li style={liStyle}><strong>Compte non-enregistré</strong> : ~6 % brut, mais imposé annuellement. Net plus proche de 4 %.</li>
          </ul>

          <Rule />
          <h2 id="sec-comparatif" style={h2}>Comparatif par type de dette</h2>
          <p style={para}>
            Toutes les dettes ne se valent pas. Voici le coût annuel par tranche de 1 000 $ pour les types les plus courants au Canada en 2026 :
          </p>

          {/* Borderless table — no rounded corners, no outer border, just row separators */}
          <div style={{ overflow: "auto", margin: "20px 0 8px" }}>
            <table style={{ width: "100%", fontSize: 15, borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 0", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Type</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Taux</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Direct/an</th>
                  <th style={{ padding: "10px 0 10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Total/an*</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Carte de crédit standard", "20,99 %", "210 $", "270 $"],
                  ["Carte de crédit magasin", "28,00 %", "280 $", "340 $"],
                  ["Marge personnelle", "11,00 %", "110 $", "170 $"],
                  ["Prêt auto (5 ans)", "7,50 %", "75 $", "135 $"],
                  ["Marge hypothécaire", "6,50 %", "65 $", "125 $"],
                  ["Hypothèque résidentielle", "5,25 %", "53 $", "113 $"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "12px 0", color: cl.al, fontWeight: 600, borderBottom: `1px solid ${cl.bd}` }}>{row[0]}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: cl.tx, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[1]}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: cl.tx, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[2]}</td>
                    <td style={{ padding: "12px 0 12px 12px", textAlign: "right", color: cl.al, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13, color: cl.dm, fontStyle: "italic", margin: "8px 0 28px" }}>
            * Direct + coût d'opportunité (CELI 6 % réel). Hypothèses simplifiées, sans frais ni effet fiscal du retour REER.
          </p>

          <p style={para}>
            Lecture rapide : <strong>chaque tranche de 1 000 $ sur une carte de crédit coûte ~5× plus qu'une hypothèque.</strong> C'est la raison pour laquelle on rembourse les dettes à haut taux <em>avant</em> d'investir.
          </p>

          <Pull kicker="Cas type · Marie">
            Marie a 4 800 $ sur une carte à 20,99 %. Elle hésite entre rembourser la dette en 18 mois (option A), ou maximiser son CELI 4 800 $ et payer le minimum (option B). Option A : ~900 $ d'intérêts payés. Option B : si la dette traîne 5 ans, ~3 600 $ d'intérêts vs ~1 600 $ de croissance CELI. Net : -2 000 $. Option A bat option B de ~1 100 $.
          </Pull>

          <Rule />
          <h2 id="sec-strategies" style={h2}>3 stratégies de remboursement</h2>

          <h3 style={h3}>1 · Avalanche — taux le plus élevé d'abord</h3>
          <p style={para}>
            Vous payez le minimum sur toutes vos dettes <em>sauf une</em> : celle au taux le plus élevé, sur laquelle vous concentrez tout l'excédent. Quand elle est éteinte, vous transférez le paiement sur la deuxième plus chère, et ainsi de suite.
          </p>
          <p style={para}>
            <strong>Avantage :</strong> minimise mathématiquement les intérêts payés. Pour 4 dettes typiques (CC 21 %, marge 11 %, auto 7 %, hypothèque 5 %), l'avalanche économise généralement 600-1 200 $ vs payer également partout. <strong>Limite :</strong> les premières victoires sont longues à venir si la plus grosse dette est aussi celle au taux le plus haut.
          </p>

          <h3 style={h3}>2 · Snowball — plus petit solde d'abord</h3>
          <p style={para}>
            Vous attaquez la plus petite dette en premier, peu importe le taux. Quand elle disparaît, vous absorbez son paiement dans la suivante. Le « boule de neige » grossit.
          </p>
          <p style={para}>
            <strong>Avantage :</strong> momentum psychologique. Voir une dette disparaître complètement dans les 2-3 premiers mois génère une motivation difficile à reproduire avec avalanche. <strong>Limite :</strong> coûte typiquement 100-400 $ de plus en intérêts. Pour qui : ceux qui ont déjà essayé avalanche et abandonné.
          </p>

          <h3 style={h3}>3 · Consolidation — un seul prêt à taux plus bas</h3>
          <p style={para}>
            Vous regroupez toutes vos dettes à haut taux dans un seul produit à taux plus bas — typiquement une marge personnelle (10-12 %) ou une marge hypothécaire (6-7 %).
          </p>
          <p style={para}>
            <strong>Avantage :</strong> peut faire économiser 800-2 500 $/an sur 10 000 $ de dette CC consolidée vers une marge perso. <strong>Limites :</strong> une marge hypothécaire transforme une dette non garantie en dette garantie sur la maison ; pas une solution si la cause de la dette n'est pas réglée ; vérifier les frais qui peuvent bouffer 6-12 mois d'économies.
          </p>

          <Pull kicker="Comment choisir">
            Discipliné, dettes à taux variés : avalanche. Besoin de momentum visible : snowball 2-3 mois, puis avalanche. 10 000 $+ en CC, revenu stable : consolidation par marge personnelle. Cause sous-jacente non réglée : aucune des trois ne marche — faire le budget d'abord.
          </Pull>

          <Rule />
          <h2 id="sec-pieges" style={h2}>4 pièges courants</h2>

          <h3 style={h3}>1 · Négliger le fonds d'urgence</h3>
          <p style={para}>
            Tout mettre sur la dette sans garder 1 000 $ à 1 mois de dépenses en réserve, c'est garantir que le moindre imprévu repart la dette à la hausse — parfois sur la même carte qu'on vient de payer. Le coussin minimal est non négociable, même pendant un remboursement agressif.
          </p>

          <h3 style={h3}>2 · Fermer les cartes après les avoir remboursées</h3>
          <p style={para}>
            Fermer une vieille carte fait baisser votre score de crédit (réduction de l'historique + augmentation du ratio d'utilisation). À garder ouverte avec solde 0, sauf frais annuels exorbitants. Couper la carte physiquement si la tentation est trop forte, sans fermer le compte.
          </p>

          <h3 style={h3}>3 · Ignorer le paiement minimum sur les autres dettes</h3>
          <p style={para}>
            Avalanche concentre l'excédent sur une seule dette, mais le paiement minimum sur les autres reste dû. Manquer un paiement minimum déclenche pénalités, frais de retard, et baisse de cote — annule des mois d'efforts en quelques jours.
          </p>

          <h3 style={h3}>4 · Refinancer hypothèque sans changer le comportement</h3>
          <p style={para}>
            Refinancer 8 000 $ de dette CC dans une marge hypothécaire à 6 % semble génial sur papier — économies théoriques de ~1 200 $/an. Mais si le mode de vie qui a créé la CC n'est pas changé, la CC se remplit dans les 18-24 mois. Vous avez maintenant <strong>les deux dettes</strong>, plus la maison en garantie.
          </p>

          {/* CTA — flat paragraph + single link, NO box */}
          <Rule />
          <h2 id="sec-cta" style={{ ...h2, fontSize: 22, marginTop: 80, marginBottom: 12 }}>Pour aller plus loin</h2>
          <p style={para}>
            Le calculateur de dettes BuildFi compare avalanche, snowball et consolidation sur vos chiffres réels. Multi-provinces, couple, hypothèques. Aucun courriel requis.
          </p>
          <p style={{ ...para, marginBottom: 0 }}>
            <a href="/outils/dettes" style={{ color: cl.ac, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Ouvrir le calculateur de dettes →
            </a>
          </p>

          <Rule />
          <h2 id="sec-faq" style={h2}>Questions fréquentes</h2>

          <h3 style={h3}>Devrais-je rembourser ma dette ou investir ?</h3>
          <p style={para}>
            Si le taux d'intérêt de la dette est supérieur au rendement réel attendu de votre placement (typiquement 5-7 % réel), remboursez. Pour les dettes à 18-25 % (carte, marge), aucun investissement légal ne bat ce rendement net de risque.
          </p>

          <h3 style={h3}>Et si j'ai une dette « bonne » comme une hypothèque ?</h3>
          <p style={para}>
            Une hypothèque à 5,25 % vs un CELI investi à 6 % réel : l'investissement gagne légèrement (~75 ¢/$/an). Mais la marge est mince, et le risque psychologique d'avoir une dette est réel. Pour beaucoup, accélérer l'hypothèque (quelques paiements/an) bat le placement parce que c'est garanti.
          </p>

          <h3 style={h3}>Faut-il prioriser le CELI ou rembourser le prêt auto ?</h3>
          <p style={para}>
            Prêt auto à 7,5 % vs CELI à 6 % réel : <strong>rembourser le prêt auto d'abord</strong>. Différence nette : ~1,5 %/an gagné sur chaque dollar. Sauf si l'employeur match dans un REER (alors REER d'abord, jusqu'au match, puis prêt auto, puis CELI).
          </p>

          <h3 style={h3}>Combien de temps avant de voir une différence ?</h3>
          <p style={para}>
            Avec avalanche sur 8 000 $ de CC à 21 % et 350 $/mois en plus du minimum, la première carte est généralement éteinte en 8-12 mois. Total dette éteinte en 24-30 mois. Le « clic » psychologique survient typiquement au mois 3-4.
          </p>

          {/* Footer disclaimer — no box, just a thin top border */}
          <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${cl.bd}`, fontSize: 13, color: cl.dm, lineHeight: 1.7 }}>
            <strong style={{ color: cl.al }}>Sources :</strong> Banque du Canada — Taux moyens des cartes de crédit Q1 2026 · Statistique Canada — Endettement des ménages 2025 · ACFC — Lignes directrices crédit à la consommation. Hypothèses de rendement : portefeuille balanced 60/40 ajusté inflation 2 %.
            <br />
            <br />
            <em>Article fourni à titre informatif et éducatif seulement. Les taux mentionnés sont des moyennes 2026 — votre situation peut varier. Cet article ne constitue pas un conseil financier ni juridique. Pour une stratégie sur mesure, consultez un planificateur financier (Pl. Fin.).</em>
          </div>
        </main>

        {/* TOC rail (right) */}
        <aside style={{ paddingTop: 40 }}>
          <div style={{ position: "sticky", top: 96 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Sommaire
            </div>
            <nav aria-label="Table des matières" style={{ borderLeft: `1px solid ${cl.bd}` }}>
              {TOC.map((s) => {
                const active = s.id === activeId;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{
                      display: "block",
                      padding: "9px 0 9px 16px",
                      marginLeft: -1,
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      color: active ? cl.al : cl.dm,
                      fontWeight: active ? 600 : 400,
                      textDecoration: "none",
                      borderLeft: active ? `2px solid ${cl.ac}` : "2px solid transparent",
                      transition: "color 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {s.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
      <EditorialFooter lang="fr" hideObservational />
    </div>
  );
}
