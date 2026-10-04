import { LegalPage } from "@/components/LegalPage";

export default function RefundsPage() {
  return <LegalPage title="Payment, Cancellation, and Refund Notice">
    <section><h2>No platform payments</h2><p>The platform does not collect, hold, transfer, finance, insure, or refund project payments. Customers and contractors independently choose how and when to pay outside the service.</p></section>
    <section><h2>Project cancellation and refunds</h2><p>The accepted quote’s cancellation terms and applicable law govern cancellation, deposits, and refunds between the parties. Contractors must provide any state-required home-solicitation or home-improvement cancellation notice and honor mandatory cooling-off periods. Contact the other party before paying or cancelling and keep receipts.</p></section>
    <section><h2>Disputes</h2><p>A platform “paid outside” marker is not proof of payment. Resolve payment disputes directly, through the chosen payment provider, consumer agency, licensing board, mediation, or court as appropriate. The platform may preserve records but does not adjudicate or guarantee recovery.</p></section>
  </LegalPage>;
}
