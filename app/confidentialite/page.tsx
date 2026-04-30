// /app/confidentialite/page.tsx
// Loi 25 / LPRPDE privacy policy. Bilingual FR/EN.
//
// IMPORTANT: when materially editing this page, bump CURRENT_POLICY_VERSION
// in lib/consent.ts. Existing consent records become invalid and the user
// is re-prompted at next checkout.

"use client";

import { useState } from "react";
import Link from "next/link";

const POLICY_VERSION = "2026-04-26-v1";
const POLICY_EFFECTIVE_DATE = "26 avril 2026";
const POLICY_EFFECTIVE_DATE_EN = "April 26, 2026";

export default function PrivacyPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const fr = lang === "fr";

  return (
    <main className="min-h-screen bg-[#0e1420] text-[#e8e0d4]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#bccbe0] hover:text-[#c4944a] transition"
          >
            ← {fr ? "Retour à BuildFi" : "Back to BuildFi"}
          </Link>
          <button
            onClick={() => setLang(fr ? "en" : "fr")}
            className="text-xs uppercase tracking-wide text-[#c4944a] border border-[#c4944a]/40 rounded px-3 py-1 hover:bg-[#c4944a]/10 transition"
          >
            {fr ? "English" : "Français"}
          </button>
        </div>

        <header className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-[#c4944a] mb-3">
            {fr ? "Politique de confidentialité" : "Privacy policy"}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight mb-2">
            buildfi.ca
          </h1>
          <p className="text-sm text-[#9aaab8]">
            {fr ? "Version" : "Version"} {POLICY_VERSION} ·{" "}
            {fr ? "En vigueur le" : "Effective"}{" "}
            {fr ? POLICY_EFFECTIVE_DATE : POLICY_EFFECTIVE_DATE_EN}
          </p>
        </header>

        <article className="space-y-8 text-[15px] leading-relaxed">
          {fr ? <FrenchPolicy /> : <EnglishPolicy />}
        </article>

        <footer className="mt-16 pt-8 border-t border-[#2a3548] text-xs text-[#7a8a98]">
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
      <h2 className="font-serif text-xl font-semibold text-[#faf8f4] mb-3">
        <span className="text-[#c4944a] mr-2">{n}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-[#bccbe0]">{children}</div>
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
            votre rapport. Vos réponses au quiz sont transmises à Anthropic
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
          <li>Rapports HTML : 12 mois.</li>
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
            your report&apos;s commentary. Your quiz answers are transmitted
            to Anthropic as a prompt; Anthropic may retain these prompts for
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
          <li>HTML reports: 12 months.</li>
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
