import { LegalPage } from "@/components/LegalPage";

export default function CookiesPage() {
  return <LegalPage title="Cookie Notice">
    <section><h2>Current use</h2><p>We currently use only strictly necessary cookies and similar storage for authentication, session security, request integrity, and essential preferences. The site does not currently use advertising or behavioral analytics cookies.</p></section>
    <section><h2>Your choices</h2><p>Necessary cookies cannot be disabled through the site because the authenticated service would not function. You can remove them in browser settings, which may sign you out. If optional analytics or advertising tools are introduced, they will remain off until the required consent is obtained and this notice is updated.</p></section>
    <section><h2>Retention</h2><p>Session cookies expire according to authentication settings or when invalidated. Security records may remain longer as described in the Privacy Policy.</p></section>
  </LegalPage>;
}
