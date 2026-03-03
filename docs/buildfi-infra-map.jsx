import { useState, useRef, useEffect } from "react";

const MARINE = "#1a2744";
const OR = "#b8860b";
const CREME = "#faf8f4";
const SABLE = "#e8e4db";
const FORET = "#1a7a4c";
const BRIQUE = "#b91c1c";
const SOFT_MARINE = "#2a3a5c";
const LIGHT_OR = "#d4a843";

const CATEGORIES = {
  client: { label: "Client-Facing", color: OR, bg: "#fdf6e3" },
  payment: { label: "Payments & Commerce", color: "#6366f1", bg: "#eef2ff" },
  engine: { label: "Computation Engine", color: BRIQUE, bg: "#fef2f2" },
  delivery: { label: "Delivery & Storage", color: FORET, bg: "#ecfdf5" },
  retention: { label: "Retention & Growth", color: "#8b5cf6", bg: "#f5f3ff" },
  infra: { label: "Infrastructure", color: SOFT_MARINE, bg: "#f0f4ff" },
  legal: { label: "Legal & Compliance", color: "#64748b", bg: "#f8fafc" },
};

const NODES = [
  // Client-Facing
  { id: "landing", label: "Landing Page", sub: "buildfi.ca", cat: "client", tier: "all", x: 100, y: 80 },
  { id: "quiz_ess", label: "Quiz Essentiel", sub: "7 écrans · thin client", cat: "client", tier: "ess", x: 300, y: 80 },
  { id: "quiz_inter", label: "Quiz Intermédiaire", sub: "80+ champs · 8 étapes", cat: "client", tier: "inter", x: 500, y: 80 },
  { id: "quiz_expert", label: "Quiz Expert", sub: "Inter + bloc H", cat: "client", tier: "expert", x: 700, y: 80 },
  { id: "simulateur", label: "Simulateur Expert", sub: "Illimité · 3 workflows", cat: "client", tier: "expert", x: 900, y: 80 },
  { id: "merci", label: "Page /merci", sub: "Skeleton loader · grade live", cat: "client", tier: "all", x: 500, y: 210 },
  { id: "portail", label: "Portail /expert", sub: "Dashboard · profils · exports", cat: "client", tier: "expert", x: 900, y: 210 },
  { id: "debt_tool", label: "Outil Dettes", sub: "Bonus · 6 tabs · 200 tests", cat: "client", tier: "ess", x: 100, y: 210 },

  // Payments
  { id: "stripe", label: "Stripe Checkout", sub: "$29/$59/$129 · coupons", cat: "payment", tier: "all", x: 350, y: 340 },
  { id: "webhook", label: "Webhook Stripe", sub: "/api/webhook · signature", cat: "payment", tier: "all", x: 550, y: 340 },
  { id: "upgrade", label: "Upgrade Path", sub: "Crédit Ess→Inter→Expert", cat: "payment", tier: "all", x: 150, y: 340 },
  { id: "referral", label: "Programme Referral", sub: "50% off · 15% off · paliers", cat: "payment", tier: "all", x: 750, y: 340 },
  { id: "second50", label: "2e Rapport 50%", sub: "Coupon SECOND50 · 90 jours", cat: "payment", tier: "all", x: 950, y: 340 },

  // Engine
  { id: "mc_engine", label: "Moteur Monte Carlo", sub: "5,000 sims · 2.3s · 190 params", cat: "engine", tier: "all", x: 350, y: 470 },
  { id: "tax_engine", label: "Moteur Fiscal", sub: "13 provinces · 173 constantes", cat: "engine", tier: "all", x: 150, y: 470 },
  { id: "optimizer", label: "Optimiseur", sub: "8 axes · screening + full MC", cat: "engine", tier: "expert", x: 550, y: 470 },
  { id: "ai_narration", label: "AI Narration", sub: "Claude Sonnet · 12 slots JSON", cat: "engine", tier: "all", x: 750, y: 470 },
  { id: "amf_lint", label: "Lint AMF", sub: "3 couches · build+runtime+design", cat: "engine", tier: "all", x: 950, y: 470 },

  // Delivery
  { id: "report_ess", label: "Rapport Essentiel", sub: "v6 · 8 sections · grade ring", cat: "delivery", tier: "ess", x: 150, y: 600 },
  { id: "report_inter", label: "Rapport Inter", sub: "16 sections · couple · immo", cat: "delivery", tier: "inter", x: 350, y: 600 },
  { id: "report_expert", label: "Rapport Expert", sub: "12-25 sections · adaptatif", cat: "delivery", tier: "expert", x: 550, y: 600 },
  { id: "resume_1p", label: "Résumé 1 Page", sub: "Illimité · PNG · print", cat: "delivery", tier: "expert", x: 750, y: 600 },
  { id: "bilan_annuel", label: "Bilan Annuel", sub: "Janvier · 7 champs · comparatif", cat: "delivery", tier: "expert", x: 950, y: 600 },

  // Retention & Growth
  { id: "feedback", label: "Pipeline Feedback", sub: "J+0 étoiles · J+3 email · J+7 NPS", cat: "retention", tier: "all", x: 150, y: 730 },
  { id: "testimonials", label: "Témoignages Auto", sub: "J+7 si rating ≥4 + NPS Oui", cat: "retention", tier: "all", x: 350, y: 730 },
  { id: "ab_testing", label: "A/B Testing", sub: "PostHog · feature flags · 4 tests", cat: "retention", tier: "all", x: 550, y: 730 },
  { id: "cron_remind", label: "Cron Rappels", sub: "6 mois · J-30 renouvellement", cat: "retention", tier: "expert", x: 750, y: 730 },
  { id: "veille_regl", label: "Veille Réglementaire", sub: "RSS → SEO + bannière in-app", cat: "retention", tier: "expert", x: 950, y: 730 },

  // Infrastructure
  { id: "vercel", label: "Vercel", sub: "Hosting · serverless · crons", cat: "infra", tier: "all", x: 150, y: 860 },
  { id: "kv", label: "Vercel KV", sub: "Profils · feedback · referral", cat: "infra", tier: "all", x: 350, y: 860 },
  { id: "blob", label: "Vercel Blob", sub: "Rapports HTML · ⚠️ public", cat: "infra", tier: "all", x: 550, y: 860 },
  { id: "resend", label: "Resend", sub: "Emails · ⚠️ DKIM à corriger", cat: "infra", tier: "all", x: 750, y: 860 },
  { id: "posthog", label: "PostHog", sub: "Analytics · A/B · feature flags", cat: "infra", tier: "all", x: 950, y: 860 },

  // Legal
  { id: "cgu", label: "CGU", sub: "/conditions", cat: "legal", tier: "all", x: 250, y: 970 },
  { id: "privacy", label: "Confidentialité", sub: "LPRPDE + Loi 25", cat: "legal", tier: "all", x: 450, y: 970 },
  { id: "amf_avis", label: "Avis AMF", sub: "/avis-legal · disclaimer", cat: "legal", tier: "all", x: 650, y: 970 },
  { id: "constantes", label: "Constantes Fiscales", sub: "173 valeurs · JSON versionné", cat: "legal", tier: "all", x: 850, y: 970 },
];

const EDGES = [
  // Client flow
  { from: "landing", to: "quiz_ess", label: "CTA $29", type: "flow" },
  { from: "landing", to: "quiz_inter", label: "CTA $59", type: "flow" },
  { from: "landing", to: "quiz_expert", label: "CTA $129", type: "flow" },
  { from: "quiz_ess", to: "stripe", label: "Checkout", type: "flow" },
  { from: "quiz_inter", to: "stripe", label: "Checkout", type: "flow" },
  { from: "quiz_expert", to: "stripe", label: "Checkout", type: "flow" },
  { from: "stripe", to: "webhook", label: "Event", type: "flow" },
  { from: "webhook", to: "mc_engine", label: "Trigger MC", type: "flow" },
  { from: "webhook", to: "merci", label: "Redirect", type: "flow" },

  // Engine
  { from: "mc_engine", to: "tax_engine", label: "Fiscalité", type: "data" },
  { from: "mc_engine", to: "ai_narration", label: "Résultats MC", type: "data" },
  { from: "mc_engine", to: "optimizer", label: "Screening", type: "data" },
  { from: "ai_narration", to: "amf_lint", label: "Sanitize", type: "data" },
  { from: "constantes", to: "tax_engine", label: "JSON annuel", type: "data" },

  // Delivery
  { from: "mc_engine", to: "report_ess", label: "Render", type: "flow" },
  { from: "mc_engine", to: "report_inter", label: "Render", type: "flow" },
  { from: "mc_engine", to: "report_expert", label: "Render", type: "flow" },
  { from: "ai_narration", to: "report_ess", label: "12 slots", type: "data" },
  { from: "ai_narration", to: "report_inter", label: "12 slots", type: "data" },
  { from: "ai_narration", to: "report_expert", label: "12+ slots", type: "data" },
  { from: "report_ess", to: "blob", label: "Upload HTML", type: "infra" },
  { from: "report_inter", to: "blob", label: "Upload HTML", type: "infra" },
  { from: "report_expert", to: "blob", label: "Upload HTML", type: "infra" },
  { from: "blob", to: "resend", label: "Lien rapport", type: "infra" },
  { from: "resend", to: "merci", label: "Email livraison", type: "flow" },

  // Expert-specific
  { from: "simulateur", to: "mc_engine", label: "Recalcul async", type: "data" },
  { from: "simulateur", to: "optimizer", label: "Workflow Optimiser", type: "data" },
  { from: "simulateur", to: "resume_1p", label: "Snapshot", type: "flow" },
  { from: "simulateur", to: "portail", label: "Historique", type: "flow" },
  { from: "portail", to: "kv", label: "Profils · crédits", type: "infra" },
  { from: "bilan_annuel", to: "mc_engine", label: "MC annuel", type: "data" },
  { from: "cron_remind", to: "resend", label: "Email auto", type: "infra" },

  // Retention
  { from: "report_ess", to: "feedback", label: "Bloc étoiles", type: "retention" },
  { from: "report_inter", to: "feedback", label: "Bloc étoiles", type: "retention" },
  { from: "report_expert", to: "feedback", label: "Bloc étoiles", type: "retention" },
  { from: "feedback", to: "kv", label: "feedback:{email}", type: "infra" },
  { from: "feedback", to: "testimonials", label: "Si ≥4 étoiles", type: "retention" },
  { from: "feedback", to: "second50", label: "Débloque coupon", type: "retention" },
  { from: "testimonials", to: "landing", label: "Social proof", type: "retention" },
  { from: "referral", to: "kv", label: "referral:{code}", type: "infra" },
  { from: "merci", to: "referral", label: "Lien unique", type: "retention" },
  { from: "ab_testing", to: "posthog", label: "Feature flags", type: "infra" },
  { from: "veille_regl", to: "constantes", label: "Mise à jour", type: "data" },

  // Upgrade
  { from: "upgrade", to: "stripe", label: "Crédit appliqué", type: "flow" },
  { from: "report_ess", to: "upgrade", label: "Upsell Inter", type: "retention" },
  { from: "report_inter", to: "upgrade", label: "Upsell Expert", type: "retention" },

  // Legal
  { from: "amf_lint", to: "report_ess", label: "Scan", type: "legal" },
  { from: "amf_lint", to: "report_inter", label: "Scan", type: "legal" },
  { from: "amf_lint", to: "report_expert", label: "Scan", type: "legal" },
  { from: "amf_lint", to: "ai_narration", label: "Forbidden terms", type: "legal" },
];

const TIER_COLORS = {
  ess: { border: "#d97706", bg: "#fffbeb", label: "Essentiel" },
  inter: { border: "#2563eb", bg: "#eff6ff", label: "Intermédiaire" },
  expert: { border: "#7c3aed", bg: "#f5f3ff", label: "Expert" },
  all: { border: "#64748b", bg: "#fff", label: "All Tiers" },
};

export default function BuildFiInfraMap() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filterTier, setFilterTier] = useState("all");
  const [filterCat, setFilterCat] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const W = 1120;
  const H = 1050;

  const filteredNodes = NODES.filter((n) => {
    if (filterTier !== "all" && n.tier !== "all" && n.tier !== filterTier) return false;
    if (filterCat && n.cat !== filterCat) return false;
    return true;
  });
  const filteredIds = new Set(filteredNodes.map((n) => n.id));

  const connectedIds = new Set();
  if (hoveredNode || selectedNode) {
    const target = hoveredNode || selectedNode;
    EDGES.forEach((e) => {
      if (e.from === target || e.to === target) {
        connectedIds.add(e.from);
        connectedIds.add(e.to);
      }
    });
  }

  const filteredEdges = EDGES.filter(
    (e) => filteredIds.has(e.from) && filteredIds.has(e.to)
  );

  const nodeMap = {};
  NODES.forEach((n) => (nodeMap[n.id] = n));

  const getEdgePath = (e) => {
    const f = nodeMap[e.from];
    const t = nodeMap[e.to];
    if (!f || !t) return "";
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const cx1 = f.x + dx * 0.3;
    const cy1 = f.y + dy * 0.1;
    const cx2 = t.x - dx * 0.3;
    const cy2 = t.y - dy * 0.1;
    return `M${f.x},${f.y} C${cx1},${cy1} ${cx2},${cy2} ${t.x},${t.y}`;
  };

  const edgeColors = {
    flow: OR,
    data: "#6366f1",
    infra: "#64748b",
    retention: "#8b5cf6",
    legal: BRIQUE,
  };

  const handleMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };
  const handleMouseUp = () => setIsPanning(false);

  const selectedNodeData = selectedNode ? nodeMap[selectedNode] : null;
  const incomingEdges = selectedNode
    ? EDGES.filter((e) => e.to === selectedNode)
    : [];
  const outgoingEdges = selectedNode
    ? EDGES.filter((e) => e.from === selectedNode)
    : [];

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: CREME,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Newsreader:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          background: MARINE,
          color: CREME,
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: "Newsreader, serif",
              fontSize: 22,
              fontWeight: 600,
              color: LIGHT_OR,
            }}
          >
            BuildFi
          </span>
          <span style={{ fontSize: 15, opacity: 0.7 }}>
            Infrastructure Map — {NODES.length} composants · {EDGES.length}{" "}
            connexions
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.5, marginRight: 4 }}>
            Zoom
          </span>
          {[0.6, 0.8, 1, 1.2].map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              style={{
                background: zoom === z ? OR : "rgba(255,255,255,0.1)",
                color: zoom === z ? MARINE : CREME,
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: zoom === z ? 700 : 400,
              }}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: "10px 24px",
          background: "#fff",
          borderBottom: `1px solid ${SABLE}`,
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginRight: 4 }}
          >
            Tier
          </span>
          {["all", "ess", "inter", "expert"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              style={{
                background:
                  filterTier === t ? TIER_COLORS[t].border : "transparent",
                color: filterTier === t ? "#fff" : TIER_COLORS[t].border,
                border: `1.5px solid ${TIER_COLORS[t].border}`,
                borderRadius: 6,
                padding: "3px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {TIER_COLORS[t].label}
            </button>
          ))}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            background: SABLE,
          }}
        />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginRight: 4 }}
          >
            Layer
          </span>
          <button
            onClick={() => setFilterCat(null)}
            style={{
              background: !filterCat ? MARINE : "transparent",
              color: !filterCat ? CREME : MARINE,
              border: `1.5px solid ${MARINE}`,
              borderRadius: 6,
              padding: "3px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterCat(filterCat === k ? null : k)}
              style={{
                background: filterCat === k ? v.color : "transparent",
                color: filterCat === k ? "#fff" : v.color,
                border: `1.5px solid ${v.color}`,
                borderRadius: 6,
                padding: "3px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SVG Canvas */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            cursor: isPanning ? "grabbing" : "grab",
            position: "relative",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: "0 0",
            }}
          >
            <defs>
              <marker
                id="arrow-flow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,2 L10,5 L0,8" fill={OR} />
              </marker>
              <marker
                id="arrow-data"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,2 L10,5 L0,8" fill="#6366f1" />
              </marker>
              <marker
                id="arrow-retention"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,2 L10,5 L0,8" fill="#8b5cf6" />
              </marker>
              <filter id="shadow">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="3"
                  floodOpacity="0.08"
                />
              </filter>
              <filter id="glow">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="6"
                  floodColor={OR}
                  floodOpacity="0.3"
                />
              </filter>
            </defs>

            {/* Category row labels */}
            {[
              { y: 55, label: "CLIENT-FACING" },
              { y: 315, label: "PAYMENTS & COMMERCE" },
              { y: 445, label: "COMPUTATION ENGINE" },
              { y: 575, label: "DELIVERY & STORAGE" },
              { y: 705, label: "RETENTION & GROWTH" },
              { y: 835, label: "INFRASTRUCTURE" },
              { y: 948, label: "LEGAL & COMPLIANCE" },
            ].map((r) => (
              <text
                key={r.y}
                x={12}
                y={r.y}
                fill="#94a3b8"
                fontSize={9}
                fontWeight={700}
                fontFamily="DM Sans"
                letterSpacing="1.5"
              >
                {r.label}
              </text>
            ))}

            {/* Edges */}
            {filteredEdges.map((e, i) => {
              const isHighlighted =
                connectedIds.size === 0 ||
                (connectedIds.has(e.from) && connectedIds.has(e.to) &&
                  (e.from === (hoveredNode || selectedNode) ||
                    e.to === (hoveredNode || selectedNode)));
              const eColor = edgeColors[e.type] || "#94a3b8";
              return (
                <g key={i} style={{ opacity: isHighlighted ? 1 : connectedIds.size > 0 ? 0.08 : 0.2 }}>
                  <path
                    d={getEdgePath(e)}
                    fill="none"
                    stroke={eColor}
                    strokeWidth={isHighlighted && connectedIds.size > 0 ? 2 : 1}
                    strokeDasharray={
                      e.type === "infra"
                        ? "4,3"
                        : e.type === "legal"
                          ? "2,2"
                          : "none"
                    }
                    markerEnd={
                      e.type === "flow"
                        ? "url(#arrow-flow)"
                        : e.type === "data"
                          ? "url(#arrow-data)"
                          : e.type === "retention"
                            ? "url(#arrow-retention)"
                            : "none"
                    }
                  />
                  {isHighlighted && connectedIds.size > 0 && e.label && (
                    <text
                      x={(nodeMap[e.from].x + nodeMap[e.to].x) / 2}
                      y={(nodeMap[e.from].y + nodeMap[e.to].y) / 2 - 6}
                      fill={eColor}
                      fontSize={8}
                      fontFamily="JetBrains Mono"
                      fontWeight={500}
                      textAnchor="middle"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((n) => {
              const cat = CATEGORIES[n.cat];
              const isSelected = selectedNode === n.id;
              const isHovered = hoveredNode === n.id;
              const isConnected = connectedIds.has(n.id);
              const isDimmed =
                connectedIds.size > 0 && !isConnected && !isSelected;
              const nw = 130;
              const nh = 48;

              return (
                <g
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(isSelected ? null : n.id);
                  }}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    cursor: "pointer",
                    opacity: isDimmed ? 0.15 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <rect
                    x={n.x - nw / 2}
                    y={n.y - nh / 2}
                    width={nw}
                    height={nh}
                    rx={8}
                    fill={isSelected ? cat.color : "#fff"}
                    stroke={
                      isHovered
                        ? cat.color
                        : isSelected
                          ? cat.color
                          : SABLE
                    }
                    strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                    filter={
                      isSelected ? "url(#glow)" : isHovered ? "url(#shadow)" : "none"
                    }
                  />
                  <text
                    x={n.x}
                    y={n.y - 5}
                    textAnchor="middle"
                    fill={isSelected ? "#fff" : MARINE}
                    fontSize={11}
                    fontWeight={700}
                    fontFamily="DM Sans"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 10}
                    textAnchor="middle"
                    fill={isSelected ? "rgba(255,255,255,0.7)" : "#94a3b8"}
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                  >
                    {n.sub}
                  </text>
                  {/* Tier badge */}
                  {n.tier !== "all" && (
                    <g>
                      <rect
                        x={n.x + nw / 2 - 18}
                        y={n.y - nh / 2 - 5}
                        width={22}
                        height={12}
                        rx={3}
                        fill={TIER_COLORS[n.tier].border}
                      />
                      <text
                        x={n.x + nw / 2 - 7}
                        y={n.y - nh / 2 + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={7}
                        fontWeight={700}
                        fontFamily="DM Sans"
                      >
                        {n.tier === "ess"
                          ? "E"
                          : n.tier === "inter"
                            ? "I"
                            : "X"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        {selectedNodeData && (
          <div
            style={{
              width: 280,
              background: "#fff",
              borderLeft: `1px solid ${SABLE}`,
              padding: 20,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: CATEGORIES[selectedNodeData.cat].color,
                    marginBottom: 4,
                  }}
                >
                  {CATEGORIES[selectedNodeData.cat].label}
                </div>
                <div
                  style={{
                    fontFamily: "Newsreader, serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: MARINE,
                  }}
                >
                  {selectedNodeData.label}
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>

            <div
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: "#64748b",
                background: CREME,
                padding: "8px 10px",
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              {selectedNodeData.sub}
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                background: TIER_COLORS[selectedNodeData.tier].bg || "#f8fafc",
                color: TIER_COLORS[selectedNodeData.tier].border,
                border: `1px solid ${TIER_COLORS[selectedNodeData.tier].border}40`,
                marginBottom: 20,
              }}
            >
              {TIER_COLORS[selectedNodeData.tier].label}
            </div>

            {incomingEdges.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#94a3b8",
                    marginBottom: 8,
                  }}
                >
                  Receives from
                </div>
                {incomingEdges.map((e, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedNode(e.from)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 4,
                      marginBottom: 3,
                      cursor: "pointer",
                      background: "#f8fafc",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: edgeColors[e.type],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: MARINE }}>
                      {nodeMap[e.from]?.label}
                    </span>
                    {e.label && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#94a3b8",
                          fontFamily: "JetBrains Mono",
                        }}
                      >
                        {e.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {outgoingEdges.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#94a3b8",
                    marginBottom: 8,
                  }}
                >
                  Sends to
                </div>
                {outgoingEdges.map((e, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedNode(e.to)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 4,
                      marginBottom: 3,
                      cursor: "pointer",
                      background: "#f8fafc",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: edgeColors[e.type],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: MARINE }}>
                      {nodeMap[e.to]?.label}
                    </span>
                    {e.label && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#94a3b8",
                          fontFamily: "JetBrains Mono",
                        }}
                      >
                        {e.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edge legend */}
      <div
        style={{
          padding: "8px 24px",
          background: "#fff",
          borderTop: `1px solid ${SABLE}`,
          display: "flex",
          gap: 20,
          alignItems: "center",
          flexShrink: 0,
          fontSize: 11,
          color: "#64748b",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          Connexions:
        </span>
        {[
          { type: "flow", label: "Client Flow", dash: false },
          { type: "data", label: "Data Pipeline", dash: false },
          { type: "retention", label: "Retention Loop", dash: false },
          { type: "infra", label: "Infrastructure", dash: true },
          { type: "legal", label: "Compliance", dash: true },
        ].map((l) => (
          <div
            key={l.type}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <svg width="24" height="8">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke={edgeColors[l.type]}
                strokeWidth="2"
                strokeDasharray={l.dash ? "4,3" : "none"}
              />
            </svg>
            <span>{l.label}</span>
          </div>
        ))}
        <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: 10 }}>
          Click a node to inspect · Drag to pan · Hover to highlight connections
        </span>
      </div>
    </div>
  );
}
