// /app/confidentialite/page.tsx
// Loi 25 / LPRPDE privacy policy. Bilingual FR/EN.
//
// IMPORTANT: when materially editing this page, bump CURRENT_POLICY_VERSION
// in lib/consent.ts. Existing consent records become invalid and the user
// is re-prompted at next checkout.

"use client";

import { useState } from "react";

const POLICY_VERSION = "2026-06-11-v1";
const POLICY_EFFECTIVE_DATE = "11 juin 2026";
const POLICY_EFFECTIVE_DATE_EN = "June 11, 2026";

export default function PrivacyPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [menuOpen, setMenuOpen] = useState(false);
  const fr = lang === "fr";

  return (
    <main className="min-h-screen bg-[#fdfbf7] text-[#2a2419]">
      {/* Brand nav — matches the v6 landing and the other legal pages */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#efe7d8] bg-[#faf8f4]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
          <a
            href="/"
            aria-label="buildfi.ca"
            className="text-[22px] font-extrabold text-[#252d39]"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            build<span className="text-[#c4944a]">fi</span>
          </a>
          <ul className="hidden list-none items-center gap-7 p-0 text-sm md:flex">
            <li><a href="/#outils" className="text-[#5c5346] transition hover:text-[#252d39]">{fr ? "Outils gratuits" : "Free tools"}</a></li>
            <li><a href="/#tarifs" className="text-[#5c5346] transition hover:text-[#252d39]">{fr ? "Prix" : "Pricing"}</a></li>
            <li><a href="/#faq" className="text-[#5c5346] transition hover:text-[#252d39]">FAQ</a></li>
          </ul>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(fr ? "en" : "fr")}
              className="rounded-lg border border-[#e4dac8] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#857a6a] transition hover:border-[#c4944a] hover:text-[#c4944a]"
            >
              {fr ? "English" : "Français"}
            </button>
            <a
              href="/#tarifs"
              className="hidden rounded-[10px] bg-[#c4944a] px-5 py-2 text-[13px] font-bold text-white transition hover:bg-[#b0823a] md:inline-block"
            >
              {fr ? "Commencer" : "Get started"}
            </a>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 flex-col justify-center gap-[5px] p-1.5 md:hidden"
            >
              <span className={`block h-0.5 w-full rounded bg-[#252d39] transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`block h-0.5 w-full rounded bg-[#252d39] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-full rounded bg-[#252d39] transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
        <div className={`overflow-hidden border-t border-[#efe7d8] bg-[#fdfbf7] transition-all md:hidden ${menuOpen ? "max-h-80" : "max-h-0"}`}>
          <div className="flex flex-col px-6 py-1">
            <a href="/#outils" onClick={() => setMenuOpen(false)} className="border-b border-[#efe7d8] py-2.5 text-[15px] text-[#5c5346]">{fr ? "Outils gratuits" : "Free tools"}</a>
            <a href="/#tarifs" onClick={() => setMenuOpen(false)} className="border-b border-[#efe7d8] py-2.5 text-[15px] text-[#5c5346]">{fr ? "Prix" : "Pricing"}</a>
            <a href="/#faq" onClick={() => setMenuOpen(false)} className="border-b border-[#efe7d8] py-2.5 text-[15px] text-[#5c5346]">FAQ</a>
            <a href="/#tarifs" onClick={() => setMenuOpen(false)} className="mb-1 mt-2 rounded-[10px] bg-[#c4944a] py-3 text-center text-[13px] font-bold text-white">{fr ? "Commencer" : "Get started"}</a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pb-16 pt-28">

        <header className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-[#c4944a] mb-3">
            {fr ? "Politique de confidentialité" : "Privacy policy"}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight mb-2">
            buildfi.ca
          </h1>
          <p className="text-sm text-[#706558]">
            {fr ? "Version" : "Version"} {POLICY_VERSION} ·{" "}
            {fr ? "En vigueur le" : "Effective"}{" "}
            {fr ? POLICY_EFFECTIVE_DATE : POLICY_EFFECTIVE_DATE_EN}
          </p>
        </header>

        <article className="space-y-8 text-[15px] leading-relaxed">
          {fr ? <FrenchPolicy /> : <EnglishPolicy />}
        </article>

        <footer className="mt-16 pt-8 border-t border-[#e4dac8] text-xs text-[#857a6a]">
          <p>
            {fr
              ? "Toute question ou demande relative à vos renseignements personnels :"
              : "For any question or request regarding your personal information:"}{" "}
            <a
              href="mailto:support@buildfi.ca"
              className="text-[#c4944a] underline"
            >
              support@buildfi.ca
            </a>
          </p>
          <p className="mt-2">
            {fr
              ? "BuildFi Technologies inc. · Québec, Canada"
              : "BuildFi Technologies inc. · Québec, Canada"}
          </p>
        </footer>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-[#1a1610] mb-3">
        <span className="text-[#c4944a] mr-2">{n}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-[#3a3326]">{children}</div>
    </section>
  );
}

// ─── French ───────────────────────────────────────────────────────────
function FrenchPolicy() {
  return (
    <>
      <Section n={1} title="Engagement">
        <p>
          BuildFi Technologies inc. (« BuildFi », « nous ») protège vos
          renseignements personnels conformément à la <strong>Loi sur la
          protection des renseignements personnels et les documents
          électroniques</strong> (LPRPDE, fédéral) et à la <strong>Loi 25 du
          Québec</strong> sur la protection des renseignements personnels dans
          le secteur privé.
        </p>
      </Section>

      <Section n={2} title="Données collectées">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Questionnaire (quiz)</strong> : âge, revenu, épargne,
            province, situation familiale, objectifs financiers — utilisés
            uniquement pour générer votre rapport de planification.
          </li>
          <li>
            <strong>Adresse courriel</strong> : pour livrer votre rapport et
            communiquer sur votre achat.
          </li>
          <li>
            <strong>Paiement</strong> : traité par Stripe Inc. BuildFi ne
            stocke aucune donnée de carte de crédit.
          </li>
          <li>
            <strong>Consentement</strong> : registre horodaté de votre
            acceptation de cette politique (haché — l&apos;adresse IP n&apos;est
            jamais conservée en clair).
          </li>
          <li>
            <strong>Utilisation</strong> : pages visitées, interactions
            (PostHog) pour améliorer le service.
          </li>
          <li>
            <strong>Brouillon local (navigateur)</strong> : le simulateur et le
            formulaire de planification enregistrent automatiquement vos saisies
            dans le stockage local (« localStorage ») de votre appareil afin de
            restaurer votre travail. Ces données restent sur votre appareil, ne
            sont jamais transmises à nos serveurs, et peuvent être effacées à tout
            moment via le bouton « Effacer les données locales » du planificateur.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Utilisation">
        <p>
          Générer votre rapport, le livrer par courriel, envoyer les
          communications liées à votre achat (livraison, rétroaction,
          renouvellement), améliorer le service. Aucune donnée n&apos;est
          vendue, louée ou partagée à des fins commerciales.
        </p>
      </Section>

      <Section n={4} title="Sous-traitants (sous-processeurs)">
        <p>
          Pour fournir le service, BuildFi confie certains traitements à des
          sous-traitants tenus à des obligations contractuelles équivalentes :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Vercel Inc.</strong> — hébergement, fonctions serveur,
            stockage des rapports (Blob Storage, AWS us-east-1).
          </li>
          <li>
            <strong>Upstash Inc.</strong> — base de données Redis (profil
            client, jetons), chiffrée au repos.
          </li>
          <li>
            <strong>Stripe Inc.</strong> — traitement des paiements et
            facturation.
          </li>
          <li>
            <strong>Resend</strong> — livraison des courriels transactionnels
            (rapport, lien magique).
          </li>
          <li>
            <strong>Anthropic, PBC</strong> — modèle d&apos;intelligence
            artificielle utilisé pour rédiger une partie du commentaire de
            votre rapport. Un profil financier pseudonymisé (âge, province,
            montants, sans nom ni coordonnées) est transmis à Anthropic
            sous forme de prompt; Anthropic peut conserver ces prompts jusqu&apos;à
            30 jours pour des fins de sécurité (voir leur politique).
            BuildFi ne contrôle pas cette rétention.
          </li>
          <li>
            <strong>PostHog</strong> — analytique d&apos;utilisation
            anonymisée.
          </li>
        </ul>
      </Section>

      <Section n={5} title="Conservation">
        <ul className="list-disc pl-5 space-y-1">
          <li>Rapports HTML : 30 jours, puis suppression automatique.</li>
          <li>Profils Planner (compte) : durée d&apos;activité + 30 jours après dernière connexion.</li>
          <li>Registre de consentement : 90 jours après le dernier achat.</li>
          <li>Journaux courriel Resend : 30 jours.</li>
          <li>Analytique PostHog : 12 mois.</li>
          <li>
            Données du quiz Bilan ($29.99) : utilisées en mémoire pour générer le
            rapport, puis purgées (sauf le rapport lui-même).
          </li>
        </ul>
      </Section>

      <Section n={6} title="Vos droits (Loi 25 + LPRPDE)">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Droit d&apos;accès</strong> : recevoir une copie de vos
            renseignements. Endpoint :{" "}
            <code className="text-[#c4944a]">/api/data/export</code>{" "}
            (authentification par lien magique).
          </li>
          <li>
            <strong>Droit de rectification</strong> : corriger des
            informations inexactes. Écrire à support@buildfi.ca.
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> : demander la
            suppression. Endpoint :{" "}
            <code className="text-[#c4944a]">/api/data/delete</code>. La
            suppression est traitée dans les 30 jours.
          </li>
          <li>
            <strong>Droit à la portabilité</strong> : recevoir vos
            données dans un format structuré (JSON).
          </li>
          <li>
            <strong>Droit au remboursement</strong> : remboursement intégral
            sur demande sous <strong>30 jours</strong>, sans justification.
            Endpoint : <code className="text-[#c4944a]">/api/refund</code> (le
            remboursement déclenche automatiquement la suppression complète
            de vos données).
          </li>
          <li>Délai de réponse : 30 jours.</li>
          <li>
            <strong>Plainte à la CAI</strong> : vous pouvez déposer une
            plainte auprès de la <strong>Commission d&apos;accès à
            l&apos;information du Québec</strong> ({" "}
            <a
              href="https://www.cai.gouv.qc.ca"
              className="text-[#c4944a] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              cai.gouv.qc.ca
            </a>
            ) si vous estimez que vos droits ont été violés.
          </li>
        </ul>
      </Section>

      <Section n={7} title="Sécurité">
        <p>
          Données chiffrées en transit (TLS 1.2+) et au repos. Accès aux
          données limité aux personnes autorisées par BuildFi. Les adresses
          IP et les courriels apparaissant dans les journaux d&apos;audit sont
          hachés (SHA-256) avant stockage.
        </p>
      </Section>

      <Section n={8} title="Transferts internationaux">
        <p>
          Vos données sont traitées sur des serveurs situés aux États-Unis
          (AWS via Vercel, Upstash, Resend, Anthropic, Stripe). Ce transfert
          est nécessaire au fonctionnement du service. Les sous-traitants
          appliquent des engagements contractuels conformes aux lois
          canadiennes.
        </p>
      </Section>

      <Section n={9} title="Mineurs">
        <p>
          Le service est destiné aux personnes de 18 ans et plus. BuildFi ne
          collecte sciemment aucune donnée de mineurs.
        </p>
      </Section>

      <Section n={10} title="Cookies et traceurs">
        <p>
          PostHog pour l&apos;analytique d&apos;utilisation, sans aucun cookie
          publicitaire. Aucun pixel Meta / Google Ads / TikTok au moment de
          cette publication.
        </p>
      </Section>

      <Section n={11} title="Modifications">
        <p>
          Les modifications importantes (catégories de données, sous-traitants,
          rétention) sont communiquées par courriel et déclenchent une
          nouvelle demande de consentement à votre prochain achat. La version
          en vigueur est affichée en tête de cette page.
        </p>
      </Section>

      <Section n={12} title="Contact">
        <p>
          <a href="mailto:support@buildfi.ca" className="text-[#c4944a] underline">
            support@buildfi.ca
          </a>
          {" "}— BuildFi Technologies inc., Québec, Canada.
        </p>
      </Section>
    </>
  );
}

// ─── English ──────────────────────────────────────────────────────────
function EnglishPolicy() {
  return (
    <>
      <Section n={1} title="Commitment">
        <p>
          BuildFi Technologies inc. (&quot;BuildFi&quot;, &quot;we&quot;)
          protects your personal information in accordance with the{" "}
          <strong>Personal Information Protection and Electronic Documents
          Act</strong> (PIPEDA, federal) and{" "}
          <strong>Quebec&apos;s Law 25</strong> on the protection of personal
          information in the private sector.
        </p>
      </Section>

      <Section n={2} title="Data collected">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Quiz</strong>: age, income, savings, province, family
            situation, financial goals — used only to generate your planning
            report.
          </li>
          <li>
            <strong>Email</strong>: to deliver your report and communicate
            about your purchase.
          </li>
          <li>
            <strong>Payment</strong>: processed by Stripe Inc. BuildFi does
            not store any credit card data.
          </li>
          <li>
            <strong>Consent</strong>: timestamped record of your acceptance of
            this policy (hashed — your IP address is never stored in plain
            text).
          </li>
          <li>
            <strong>Usage</strong>: pages visited, interactions (PostHog) to
            improve the service.
          </li>
          <li>
            <strong>Local draft (browser)</strong>: the simulator and planning
            form automatically save your entries to your device&apos;s local
            storage (&quot;localStorage&quot;) so your work can be restored. This
            data stays on your device, is never transmitted to our servers, and
            can be erased at any time via the &quot;Clear local data&quot; button
            in the planner.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Use">
        <p>
          Generate your report, deliver it by email, send communications
          related to your purchase (delivery, feedback, renewal), improve the
          service. No data is sold, rented, or shared for commercial purposes.
        </p>
      </Section>

      <Section n={4} title="Sub-processors">
        <p>
          To provide the service, BuildFi entrusts certain processing to
          sub-processors bound by equivalent contractual obligations:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Vercel Inc.</strong> — hosting, server functions, report
            storage (Blob Storage, AWS us-east-1).
          </li>
          <li>
            <strong>Upstash Inc.</strong> — Redis database (customer profile,
            tokens), encrypted at rest.
          </li>
          <li>
            <strong>Stripe Inc.</strong> — payment processing and billing.
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery (report,
            magic link).
          </li>
          <li>
            <strong>Anthropic, PBC</strong> — AI model used to write part of
            your report&apos;s commentary. A pseudonymized financial profile
            (age, province, amounts, without name or contact details) is
            transmitted to Anthropic as a prompt; Anthropic may retain these prompts for
            up to 30 days for safety purposes (see their policy). BuildFi
            does not control this retention.
          </li>
          <li>
            <strong>PostHog</strong> — anonymized usage analytics.
          </li>
        </ul>
      </Section>

      <Section n={5} title="Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>HTML reports: 30 days, then automatically deleted.</li>
          <li>Planner profiles (account): subscription duration + 30 days after last login.</li>
          <li>Consent record: 90 days after last purchase.</li>
          <li>Resend email logs: 30 days.</li>
          <li>PostHog analytics: 12 months.</li>
          <li>
            Bilan ($29.99) quiz data: used in memory to generate the report,
            then purged (except the report itself).
          </li>
        </ul>
      </Section>

      <Section n={6} title="Your rights (Law 25 + PIPEDA)">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Right of access</strong>: receive a copy of your
            information. Endpoint:{" "}
            <code className="text-[#c4944a]">/api/data/export</code> (magic
            link authentication).
          </li>
          <li>
            <strong>Right of rectification</strong>: correct inaccurate
            information. Email support@buildfi.ca.
          </li>
          <li>
            <strong>Right to erasure</strong>: request deletion. Endpoint:{" "}
            <code className="text-[#c4944a]">/api/data/delete</code>. Deletion
            is processed within 30 days.
          </li>
          <li>
            <strong>Right to portability</strong>: receive your data in a
            structured format (JSON).
          </li>
          <li>
            <strong>Right to refund</strong>: full refund on request within{" "}
            <strong>30 days</strong>, no justification needed. Endpoint:{" "}
            <code className="text-[#c4944a]">/api/refund</code> (the refund
            automatically triggers complete deletion of your data).
          </li>
          <li>Response time: 30 days.</li>
          <li>
            <strong>Complaint to the CAI</strong>: you may file a complaint
            with the <strong>Commission d&apos;accès à l&apos;information du
            Québec</strong> (
            <a
              href="https://www.cai.gouv.qc.ca"
              className="text-[#c4944a] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              cai.gouv.qc.ca
            </a>
            ) if you believe your rights have been violated.
          </li>
        </ul>
      </Section>

      <Section n={7} title="Security">
        <p>
          Data encrypted in transit (TLS 1.2+) and at rest. Access is limited
          to BuildFi-authorized personnel. IP addresses and emails appearing
          in audit logs are hashed (SHA-256) before storage.
        </p>
      </Section>

      <Section n={8} title="International transfers">
        <p>
          Your data is processed on servers in the United States (AWS via
          Vercel, Upstash, Resend, Anthropic, Stripe). This transfer is
          necessary for service operation. Sub-processors apply contractual
          commitments compliant with Canadian law.
        </p>
      </Section>

      <Section n={9} title="Minors">
        <p>
          The service is intended for people 18 years and older. BuildFi does
          not knowingly collect any data from minors.
        </p>
      </Section>

      <Section n={10} title="Cookies and trackers">
        <p>
          PostHog for usage analytics, no advertising cookies. No Meta /
          Google Ads / TikTok pixel at the time of this publication.
        </p>
      </Section>

      <Section n={11} title="Changes">
        <p>
          Material changes (data categories, sub-processors, retention) are
          communicated by email and trigger a new consent request at your
          next purchase. The current version is displayed at the top of this
          page.
        </p>
      </Section>

      <Section n={12} title="Contact">
        <p>
          <a href="mailto:support@buildfi.ca" className="text-[#c4944a] underline">
            support@buildfi.ca
          </a>
          {" "}— BuildFi Technologies inc., Québec, Canada.
        </p>
      </Section>
    </>
  );
}
