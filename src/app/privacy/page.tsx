import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/legal";

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy">
    <section><h2>Information we collect</h2><p>We collect account credentials, role, contractor profile and attestations, job posts, bids, quotes and acceptance records, messages, reviews, support communications, consent records, approximate request metadata, security logs, and device/browser information. We do not intentionally collect payment card or bank credentials.</p></section>
    <section><h2>How we use information</h2><ul><li>Provide, secure, troubleshoot, and improve the marketplace.</li><li>Authenticate users and enforce permissions and agreements.</li><li>Prevent fraud, investigate abuse, respond to legal requests, and preserve accepted quote records.</li><li>Communicate service and policy notices.</li></ul></section>
    <section><h2>Disclosure</h2><p>Project participants receive information needed to evaluate and perform work. Service providers may process hosting, database, authentication, and support data under contract. We may disclose information for legal process, safety, fraud prevention, corporate transactions, or with your direction. We do not sell personal information or share it for cross-context behavioral advertising.</p></section>
    <section><h2>Retention and security</h2><p>Active account data is retained while needed to provide the service. Accepted agreements, consent and audit records may be retained for disputes and legal obligations; other deleted-account data is removed or deidentified on a reasonable schedule. We use access controls, encryption in transit, password hashing, and audit records, but no system is perfectly secure.</p></section>
    <section><h2>Your US privacy choices</h2><p>You may access/export, correct, or request deletion through Account settings or {legal.email}. Depending on your state, you may also appeal a refusal, opt out of certain processing, or use an authorized agent. We verify requests and will not discriminate for exercising applicable rights.</p></section>
    <section><h2>Children and transfers</h2><p>The service is not directed to anyone under {legal.minimumAge}. Information may be processed in the United States. If you believe a minor provided information, contact us.</p></section>
    <section><h2>Contact</h2><p>Controller/operator: {legal.entity}, {legal.address}. Privacy requests: {legal.email}.</p></section>
  </LegalPage>;
}
