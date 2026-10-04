import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/legal";

export default function AccessibilityPage() {
  return <LegalPage title="Accessibility Statement">
    <section><h2>Our commitment</h2><p>We aim to make the service perceivable, operable, understandable, and robust, using semantic structure, keyboard access, visible focus, text alternatives, clear errors, and reduced-motion support.</p></section>
    <section><h2>Feedback and assistance</h2><p>If you encounter a barrier or need information in another format, email {legal.email} with the page, problem, assistive technology, and preferred response method. We will make reasonable efforts to assist.</p></section>
  </LegalPage>;
}
