import { redirect } from "next/navigation";

// The dedicated income-protection deep-dive is not yet written; the topic is
// covered in Guide 101 (chapter 5, "Protection du revenu"). Until the standalone
// guide ships, route /guides/protection there instead of 404ing. (Audit 6.3 / V-site)
export default function ProtectionGuideRedirect() {
  redirect("/guides/101#protection");
}
