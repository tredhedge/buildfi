"use client";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { getProductPalette } from "@/lib/design/product.tokens";
import { useProductBody } from "@/lib/design/product-components";
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

const cl = getProductPalette("light");

const TOC: { id: string; label: string }[] = [
  { id: "sec-pourquoi", label: "Pourquoi 90 jours" },
  { id: "sec-quadrant", label: "La matrice effort × impact" },
  { id: "sec-actions", label: "Les 10 actions" },
  { id: "sec-plan", label: "Plan 30 / 60 / 90 jours" },
  { id: "sec-pieges", label: "3 pièges à éviter" },
];

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
  margin: "36px 0 8px",
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

function Rule() {
  return <div style={{ width: 40, height: 2, background: cl.ac, marginTop: 80, marginBottom: -60 }} aria-hidden />;
}

type Action = {
  num: string;
  title: string;
  amount: string;
  effort: string;
  difficulty: "Facile" | "Moyen" | "Plus exigeant";
  steps: string[];
  resource?: string;
};

const ACTIONS: Action[] = [
  {
    num: "01",
    title: "Renégocier l'assurance auto/habitation",
    amount: "20-60 $/mois",
    effort: "1 h",
    difficulty: "Facile",
    steps: [
      "Sortez votre dernier renouvellement.",
      "Demandez 3 soumissions concurrentes en ligne (CAA, Belairdirect, Intact, Promutuel).",
      "Appelez votre courtier actuel avec la meilleure offre — il aligne ou vous partez. Économies typiques : 240-720 $/an.",
    ],
  },
  {
    num: "02",
    title: "Auditer les abonnements ghost",
    amount: "30-80 $/mois",
    effort: "30 min",
    difficulty: "Facile",
    steps: [
      "Listez tous vos prélèvements automatiques sur 90 jours (relevés bancaires + CC).",
      "Marquez ceux que vous n'avez pas utilisés ce trimestre : streaming peu utilisé, gym oublié, services SaaS périmés.",
      "Annulez. La plupart des Canadiens trouvent 4-7 abonnements oubliés totalisant 30-80 $/mois.",
    ],
  },
  {
    num: "03",
    title: "Transférer la dette CC vers une marge personnelle",
    amount: "40-150 $/mois",
    effort: "1-2 h",
    difficulty: "Moyen",
    steps: [
      "Si vous avez 3 000 $+ sur une carte à 21 %, demandez une marge personnelle non garantie (taux typique : 9-12 %).",
      "Transférez la totalité du solde CC sur la marge.",
      "Économies sur 5 000 $ : ~50 $/mois en intérêts. Conservez la CC ouverte mais coupée physiquement.",
    ],
    resource: "/guides/cout-reel-dette",
  },
  {
    num: "04",
    title: "Renégocier internet + cellulaire",
    amount: "20-50 $/mois",
    effort: "45 min",
    difficulty: "Facile",
    steps: [
      "Vérifiez les forfaits chez les compétiteurs (Public Mobile, Fizz, Freedom, Bell, Vidéotron, Rogers).",
      "Appelez le service de rétention (pas le service à la clientèle régulier — demandez « annuler »).",
      "Mentionnez l'offre concurrente. La plupart ajustent. Sinon, transférez. Économies : 25-50 $/mois.",
    ],
  },
  {
    num: "05",
    title: "Augmenter la franchise d'assurance auto",
    amount: "10-25 $/mois",
    effort: "15 min",
    difficulty: "Facile",
    steps: [
      "Si votre franchise actuelle est de 250 $ ou 500 $, demandez 1 000 $.",
      "Économie typique 120-300 $/an pour 500 $ de risque additionnel — favorable si pas de réclamation depuis 3+ ans.",
      "Seuil de rentabilité atteint en 18-24 mois sans réclamation.",
    ],
  },
  {
    num: "06",
    title: "Optimiser REER vs CELI selon le palier",
    amount: "0-50 $/mois",
    effort: "2 h + déclaration",
    difficulty: "Moyen",
    steps: [
      "Si votre revenu est sous 57 375 $ (palier fédéral 1, 2026), votre TMI est ~27 % au QC. Le REER ne donne qu'un retour fiscal modeste.",
      "Au-dessus de 57 375 $ (TMI ~37 % +), le REER devient beaucoup plus avantageux que le CELI.",
      "Réorientez la cotisation vers le bon véhicule. Le retour fiscal du REER peut être réinvesti immédiatement.",
    ],
  },
  {
    num: "07",
    title: "Activer l'arrondi automatique d'épargne",
    amount: "20-40 $/mois",
    effort: "10 min",
    difficulty: "Facile",
    steps: [
      "Plusieurs banques (Tangerine, Wealthsimple, RBC NOMI) offrent l'arrondi des transactions vers un compte d'épargne.",
      "Activer la fonction. Aucun changement de comportement.",
      "Pour 40-60 transactions/mois, accumule 20-40 $/mois sans qu'on s'en aperçoive.",
    ],
  },
  {
    num: "08",
    title: "Cuisiner par lots 1×/semaine",
    amount: "60-120 $/mois",
    effort: "3 h/sem.",
    difficulty: "Moyen",
    steps: [
      "Bloquer 3 h le dimanche. Cuisiner 4-5 portions de 2 plats principaux.",
      "Réduit les commandes de livraison (Uber Eats, DoorDash) de 60-70 %.",
      "Coût livraison ~22 $/repas vs batch ~5 $/portion. Économies : 60-120 $/mois pour 1-2 personnes.",
    ],
  },
  {
    num: "09",
    title: "Vendre les items dormants",
    amount: "300-1 500 $ ponctuel",
    effort: "4-6 h sur 2 sem.",
    difficulty: "Moyen",
    steps: [
      "Photographier 10-20 objets non utilisés depuis 12 mois (vélo, électronique, meubles, sport).",
      "Lister sur Marketplace, Kijiji, LesPAC. Prix réaliste = 30-50 % du neuf.",
      "Verser les recettes directement dans le CELI ou sur la dette à plus haut taux.",
    ],
  },
  {
    num: "10",
    title: "Ajuster les retenues à la source",
    amount: "0-150 $/mois",
    effort: "30 min",
    difficulty: "Plus exigeant",
    steps: [
      "Si vous recevez un retour d'impôt de 2 000 $+, vos retenues sont trop élevées — vous prêtez à 0 % au gouvernement.",
      "Demander à l'employeur d'ajuster (TD1 fédéral + TP-1015.3 provincial QC).",
      "Effet : 100-250 $/mois supplémentaires sur la paie, à rediriger vers CELI ou dette. Attention si situation fiscale instable.",
    ],
  },
];

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
      <EditorialHeader lang="fr" eyebrow="Plan d'action · 12 min de lecture" />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 96px", display: "grid", gridTemplateColumns: "minmax(0, 760px) 240px", gap: 96, justifyContent: "center" }}>
        <main style={{ minWidth: 0, paddingTop: 40 }}>
          {/* Cover */}
          <header style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Plan d'action · 12 min
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 56px)", fontWeight: 800, color: cl.al, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
              10 actions pour libérer 200 $/mois en 90 jours
            </h1>
            <p style={lead}>
              Pas de yoga financier, pas de promesses creuses. 10 actions concrètes classées par effort × impact, avec montants moyens et étapes précises. Plan 30 / 60 / 90 jours pour exécuter sans burnout.
            </p>
            <div style={{ fontSize: 13, color: cl.dm, letterSpacing: "0.02em" }}>3 mai 2026 · Chiffres canadiens 2026</div>
          </header>

          {/* L'essentiel — no card */}
          <section style={{ margin: "32px 0 56px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", margin: "0 0 14px" }}>
              L'essentiel
            </h3>
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={liStyle}>Faire les 10 actions sur 90 jours libère typiquement <strong>200-740 $/mois</strong>, sans changer fondamentalement le mode de vie.</li>
              <li style={liStyle}>Les 4 premières (assurances, abonnements, internet/cell, dette CC) couvrent généralement à elles seules les 200 $/mois cibles.</li>
              <li style={liStyle}>Effort total réaliste : ~12-18 h sur 90 jours (1-2 h/semaine).</li>
              <li style={liStyle}>Erreur classique : tout faire en 1 weekend. Ça flanche après 2 mois. Étalez.</li>
              <li style={{ ...liStyle, marginBottom: 0 }}>200 $/mois × 30 ans à 6 % réel = ~<strong>200 000 $</strong> à la retraite, en partant d'argent gaspillé.</li>
            </ul>
          </section>

          <Rule />
          <h2 id="sec-pourquoi" style={h2}>Pourquoi 90 jours</h2>
          <p style={para}>
            Trois mois est la durée pile pour qu'une nouvelle habitude prenne, mais pas si longue qu'on s'enlise. Les études comportementales (Lally et al. 2010, modèles BJ Fogg) suggèrent qu'une routine simple s'ancre en 60-90 jours. Plus court, l'élan retombe au premier imprévu. Plus long, l'objectif devient flou.
          </p>
          <p style={para}>
            Le 90 jours fait aussi sens financièrement : plusieurs gestes (renégociation d'assurance, refinancement, ajustement de retenues à la source) prennent 3-6 semaines pour produire leur premier dollar économisé. Un délai de 30 jours ne donne pas le temps aux effets de se cumuler.
          </p>
          <p style={para}>
            Surtout, 90 jours est <strong>traçable</strong> : à la fin, on regarde le relevé bancaire de J-90 vs aujourd'hui, on voit clairement la différence de cash-flow.
          </p>

          <Rule />
          <h2 id="sec-quadrant" style={h2}>La matrice effort × impact</h2>
          <p style={para}>
            Toutes les actions ne se valent pas. Certaines libèrent 50 $/mois en 30 minutes (renégocier les assurances), d'autres 100 $/mois mais demandent 12 h de travail récurrent (cuisine batch). On peut classer les 10 actions sur deux axes :
          </p>

          {/* Borderless table */}
          <div style={{ overflow: "auto", margin: "20px 0 8px" }}>
            <table style={{ width: "100%", fontSize: 15, borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 0", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Quadrant</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Caractéristique</th>
                  <th style={{ padding: "10px 0 10px 12px", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Quick wins", "Faible effort, gros impact — à faire en premier", "01, 02, 04, 05, 07"],
                  ["Travail ciblé", "Effort moyen, gros impact — vaut le détour", "03, 06, 10"],
                  ["Long-terme", "Effort récurrent ou ponctuel", "08, 09"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "12px 0", color: cl.al, fontWeight: 700, borderBottom: `1px solid ${cl.bd}` }}>{row[0]}</td>
                    <td style={{ padding: "12px 12px", color: cl.tx, borderBottom: `1px solid ${cl.bd}` }}>{row[1]}</td>
                    <td style={{ padding: "12px 0 12px 12px", color: cl.ac, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ ...para, marginTop: 28 }}>
            <strong>La règle :</strong> quick wins en premier (mois 1), travail ciblé ensuite (mois 2), long-terme à la fin (mois 3). Cet ordre génère du cash-flow tôt, ce qui finance — psychologiquement et littéralement — les actions plus exigeantes après.
          </p>

          <Rule />
          <h2 id="sec-actions" style={h2}>Les 10 actions, en détail</h2>

          {/* Actions: NO CARDS. Each is an H3 with mono number prefix + metadata + ordered steps.
              Hairline rule between actions provides separation without box look. */}
          {ACTIONS.map((a, idx) => (
            <section
              key={a.num}
              style={{
                margin: "0",
                padding: idx === 0 ? "8px 0 36px" : "36px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${cl.bd}`,
              }}
            >
              <h3 style={{ ...h3, margin: "0 0 6px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, color: cl.ac, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {a.num}
                </span>
                <span style={{ flex: 1 }}>{a.title}</span>
              </h3>
              <div style={{ fontSize: 13.5, color: cl.dm, fontStyle: "italic", margin: "0 0 14px" }}>
                <strong style={{ color: cl.al, fontStyle: "normal" }}>{a.amount}</strong> libéré · ~{a.effort} d'effort · {a.difficulty}
              </div>
              <ol style={{ paddingLeft: 22, margin: 0 }}>
                {a.steps.map((step, j) => (
                  <li key={j} style={{ ...liStyle, fontSize: 16.5 }} dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ol>
              {a.resource ? (
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <a href={a.resource} style={{ color: cl.ac, textDecoration: "underline", textUnderlineOffset: 4, fontWeight: 600 }}>
                    Lecture complémentaire →
                  </a>
                </div>
              ) : null}
            </section>
          ))}

          <Rule />
          <h2 id="sec-plan" style={h2}>Plan d'exécution 30 / 60 / 90 jours</h2>
          <p style={para}>
            L'erreur classique est de tout faire en un weekend, puis flancher. Voici le rythme tenable :
          </p>

          <h3 style={h3}>Mois 1 — Quick wins (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Sem. 1 :</strong> action 02 (audit abonnements) + 07 (arrondi épargne) — 1 h.</li>
            <li style={liStyle}><strong>Sem. 2 :</strong> action 04 (internet/cellulaire) — 1 h.</li>
            <li style={liStyle}><strong>Sem. 3 :</strong> action 01 (assurances) — 1-2 h.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Sem. 4 :</strong> action 05 (franchise auto) — 30 min. Bilan : ~80-180 $/mois libérés en 30 jours.</li>
          </ul>

          <h3 style={h3}>Mois 2 — Travail ciblé (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Sem. 5-6 :</strong> action 03 (consolidation dette CC) — 2 h.</li>
            <li style={liStyle}><strong>Sem. 7 :</strong> action 06 (REER vs CELI selon palier) — 2 h.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Sem. 8 :</strong> action 10 (retenues à la source) — 30 min, effet à la prochaine paie. Cumulé : ~140-330 $/mois.</li>
          </ul>

          <h3 style={h3}>Mois 3 — Long-terme + bilan (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Sem. 9 :</strong> action 09 (vendre items dormants) — 4 h sur 2 semaines.</li>
            <li style={liStyle}><strong>Sem. 10-11 :</strong> action 08 (batch cooking) — installer la routine.</li>
            <li style={liStyle}><strong>Sem. 12 :</strong> bilan complet. Comparer relevés J-90 vs aujourd'hui.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Final :</strong> 200-740 $/mois libérés selon profil de départ et engagement.</li>
          </ul>

          <Rule />
          <h2 id="sec-pieges" style={h2}>3 pièges à éviter</h2>

          <h3 style={h3}>1 · Tout faire en un weekend</h3>
          <p style={para}>
            Réflexe classique : voir la liste, bloquer un samedi, attaquer 6 actions. Résultat : burnout après 2 mois, retour à zéro. Les 90 jours étalés sont conçus pour générer des résultats <em>visibles</em> chaque semaine, ce qui maintient l'élan.
          </p>

          <h3 style={h3}>2 · Ne pas réinvestir le cash-flow libéré</h3>
          <p style={para}>
            Si les 200 $/mois économisés se diluent dans le compte courant, ils disparaissent en consommation invisible (la dépense gonfle pour remplir l'espace). <strong>Automatisez le transfert</strong> dès la première paie : virement automatique vers CELI, REER, ou paiement supplémentaire de dette le lendemain de chaque dépôt.
          </p>

          <h3 style={h3}>3 · Sous-estimer l'effet 30 ans</h3>
          <p style={para}>
            200 $/mois sonne modeste. Mais investis à 6 % réel pendant 30 ans, ces 200 $/mois deviennent ~200 000 $ — soit 4-6 ans de dépenses retraite supplémentaires, en partant d'<em>argent que vous gaspilliez</em>. Le calculateur d'épargne BuildFi rend ce chiffre tangible.
          </p>

          {/* CTA — flat paragraph, no box */}
          <Rule />
          <h2 id="sec-cta" style={{ ...h2, fontSize: 22, marginTop: 80, marginBottom: 12 }}>Pour aller plus loin</h2>
          <p style={para}>
            Le calculateur d'épargne BuildFi projette n'importe quelle dépense récurrente coupée jusqu'à votre retraite, en dollars d'aujourd'hui. Multi-fréquence, instantané, aucun courriel requis.
          </p>
          <p style={{ ...para, marginBottom: 0 }}>
            <a href="/outils/coupe-depense" style={{ color: cl.ac, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Ouvrir le calculateur d'épargne →
            </a>
          </p>

          {/* Footer disclaimer */}
          <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${cl.bd}`, fontSize: 13, color: cl.dm, lineHeight: 1.7 }}>
            <strong style={{ color: cl.al }}>Sources :</strong> Statistique Canada — Dépenses des ménages 2024 · Bureau d'assurance du Canada — Primes auto/habitation 2026 · ARC + Revenu Québec — TD1 / TP-1015.3 · Banque du Canada — Taux de référence Q1 2026. Hypothèses : portefeuille balanced 60/40 ajusté inflation 2 %.
            <br />
            <br />
            <em>Article fourni à titre informatif et éducatif seulement. Les montants moyens sont des ordres de grandeur sur des profils canadiens typiques 2026 — votre situation peut varier sensiblement. Cet article ne constitue pas un conseil financier ni juridique. Pour une stratégie sur mesure, consultez un planificateur financier (Pl. Fin.).</em>
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
