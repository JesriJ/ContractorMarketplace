import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/legal";

export default function ContactPage() {
  return <LegalPage title="Contact">
    <section><h2>Operator</h2><p>{legal.entity}<br />{legal.address}</p></section>
    <section><h2>Support and legal requests</h2><p>Email <a className="text-blue-700 underline" href={`mailto:${legal.email}`}>{legal.email}</a>. Include the relevant account email and job ID, but never send passwords, payment credentials, or Social Security numbers.</p></section>
    <section><h2>Emergencies</h2><p>This service is not monitored for emergencies. Contact 911 or the appropriate local authority for immediate threats.</p></section>
  </LegalPage>;
}
