// src/app/terms/page.tsx
// Server Component (no "use client")

export const metadata = {
  title: "Terms & Conditions | Wild n' Root",
  description:
    "Terms for using Wild n' Root’s website, making purchases, payment processing via Razorpay, refunds, cancellations, delivery timelines, and grievance redressal.",
};

export default function TermsPage() {
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <main className="text-[var(--wnr-text)]">
      {/* Hero */}
      <section className="h-44 md:h-56 bg-[var(--wnr-berry)] mt-[calc(5rem+var(--offer-strip-height,0px))] text-white flex items-center">
        <div className="wnr-container">
          <h1 className="text-3xl md:text-4xl font-bold">Terms &amp; Conditions</h1>
          <p className="mt-2 text-white/80 text-sm">Last updated: {updated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="wnr-container py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-4 text-sm lg:sticky lg:top-28 lg:max-h-[70vh] lg:overflow-auto">
              <p className="font-semibold mb-2">On this page</p>
              <ul className="space-y-2">
                <li><a className="hover:text-[var(--wnr-berry)]" href="#intro">Introduction</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#merchant">Merchant Identity &amp; Support</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#use">Use of the Site</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#account">Accounts</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#pricing">Pricing, Taxes &amp; Invoicing</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#orders">Orders &amp; Acceptance</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#payments">Payments via Razorpay</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#tokenisation">Tokenisation &amp; No Card Storage</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#delivery">Shipping / Delivery Timelines</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#cancellations">Cancellations &amp; Refunds (Timelines)</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#chargebacks">Chargebacks, Fraud &amp; Disputes</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#subscriptions">Subscriptions &amp; e-Mandates</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#prohibited">Prohibited Products / Uses</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#compliance">KYC, AML/CFT &amp; Sanctions</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#security">Payment Data &amp; Security Incidents</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#modifications">Modifications to These Terms</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#law">Governing Law &amp; Jurisdiction</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#grievance">Customer Grievance Redressal</a></li>
                <li><a className="hover:text-[var(--wnr-berry)]" href="#contact">Contact</a></li>
              </ul>
            </div>
          </nav>

          {/* Body */}
          <article className="lg:col-span-3 space-y-8">
            <Section id="intro" title="Introduction">
              <p>
                These Terms &amp; Conditions (“Terms”) govern your use of the Wild n' Root website and
                related services (“Services”). Online payments are processed by our payment partner
                <strong> Razorpay Software Private Limited</strong>. By using the Services, you agree to these Terms.
              </p>
              <p className="text-sm text-neutral-600">
                For our Privacy Policy and cookies, see <a className="underline" href="/privacy">Privacy Policy</a>.
              </p>
            </Section>

            <Section id="merchant" title="Merchant Identity &amp; Support">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Legal name:</strong> Wild n' Root</li>
                <li><strong>Primary contact email:</strong> <a className="underline hover:text-[var(--wnr-berry)]" href="mailto:info@wildnroot.com">info@wildnroot.com</a></li>
                <li><strong>Primary contact phone:</strong> +91 7777 966 944</li>
                <li><strong>Business address:</strong> (Provide your full postal address here)</li>
                <li><strong>Customer support hours:</strong> Mon–Fri, 10:00–18:00 IST (excluding holidays)</li>
              </ul>
              <p className="text-sm text-neutral-600">
                Razorpay may review merchant identity &amp; support details as part of onboarding / periodic compliance checks.
              </p>
            </Section>

            <Section id="use" title="Use of the Site">
              <p>
                Use the Services only for lawful purposes and in accordance with these Terms. We may
                suspend or terminate access for violations of law, these Terms, or rights of others.
              </p>
            </Section>

            <Section id="account" title="Accounts &amp; Security">
              <p>
                You are responsible for safeguarding your credentials and for all activity under your
                account. Notify us immediately of any unauthorized use or security concerns.
              </p>
            </Section>

            <Section id="pricing" title="Pricing, Taxes &amp; Invoicing">
              <ul className="list-disc list-inside space-y-2">
                <li>Prices shown at checkout include/exclude applicable taxes as indicated on the order page.</li>
                <li>Shipping fees (if any) and promotions/discounts are displayed before payment.</li>
                <li>Invoices are provided digitally to your registered email after successful payment.</li>
              </ul>
            </Section>

            <Section id="orders" title="Orders &amp; Acceptance">
              <ul className="list-disc list-inside space-y-2">
                <li>Placing an order constitutes an offer to purchase. We may verify information before acceptance.</li>
                <li>Obvious pricing or availability errors may be corrected; affected orders may be cancelled and refunded.</li>
                <li>We clearly display our refund/cancellation policy and these Terms prior to checkout.</li>
              </ul>
            </Section>

            <Section id="payments" title="Payments via Razorpay">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Payments are processed by <strong>Razorpay</strong> in line with RBI’s Payment Aggregator guidelines.
                  Settlements are made net of fees and adjustments and are subject to receipt of funds and bank timelines.
                </li>
                <li>
                  Reasonable transaction limits, holds, delays, or reversals may apply as required by law, banks, card networks,
                  or risk controls.
                </li>
                <li>
                  If a payment is late-authorized but not captured, Razorpay may initiate an auto-refund to the customer (e.g., within 5 days).
                </li>
              </ul>
            </Section>

            <Section id="tokenisation" title="Tokenisation &amp; No Card Storage">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  We do not store full card data (such as PAN/CVV) on our systems. Do not share payment credentials via email, chat, or phone.
                </li>
                <li>
                  Saved-card experiences use RBI-compliant tokenisation with explicit customer consent, managed by network / issuer / payment partners.
                </li>
              </ul>
            </Section>

            <Section id="delivery" title="Shipping / Delivery Timelines">
              <ul className="list-disc list-inside space-y-2">
                <li>Estimated delivery timelines are displayed on product or checkout pages.</li>
                <li>Delays may occur due to courier constraints, unforeseen events, or address issues; we’ll keep you updated via email/SMS.</li>
                <li>Risk of loss passes upon delivery to the carrier where permitted by law.</li>
              </ul>
            </Section>

            <Section id="cancellations" title="Cancellations &amp; Refunds (Timelines)">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  You can request a cancellation before dispatch (where offered). Post-dispatch, please refer to our Returns Policy.
                </li>
                <li>
                  Approved refunds are initiated to the original payment method. Typical credit timelines: Cards/Netbanking 5–10 business days, UPI 2–5 business days, Wallets 1–3 business days (bank/network dependent).
                </li>
                <li>
                  Shipping fees may be non-refundable unless the return is due to our error or a defective item (see Returns Policy for specifics).
                </li>
              </ul>
            </Section>

            <Section id="chargebacks" title="Chargebacks, Fraud &amp; Disputes">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Chargebacks are raised by issuing banks or instrument providers. We cooperate with Razorpay, banks, and networks during dispute resolution.
                </li>
                <li>
                  Where a chargeback is received, liability may rest with the merchant per applicable network/RBI rules. Razorpay may suspend settlements during investigation.
                </li>
                <li>
                  Suspected fraud or unauthorized transactions may result in holds/limits while we or partners investigate.
                </li>
              </ul>
            </Section>

            <Section id="subscriptions" title="Subscriptions &amp; e-Mandates (If Applicable)">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  For auto-renewing subscriptions, you will be shown the amount/frequency and cancellation method before you opt in.
                </li>
                <li>
                  You can cancel recurring mandates via your account or by contacting support before the renewal charge date/time as displayed.
                </li>
                <li>
                  Free trials convert to paid plans unless cancelled within the trial period as communicated at signup.
                </li>
              </ul>
            </Section>

            <Section id="prohibited" title="Prohibited Products / Uses">
              <p className="mb-2">
                You must not use our payment processing for products/services that are illegal or restricted under law, card-network rules, or Razorpay policies.
                Illustrative examples include (non-exhaustive): adult content/services, alcohol (where prohibited), human body parts, illicit drugs, illegal gambling, malware/spam tools, cable descramblers/black boxes, counterfeit goods, and any content involving child sexual abuse material.
              </p>
            </Section>

            <Section id="compliance" title="KYC, AML/CFT &amp; Sanctions Compliance">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  We comply with KYC and AML/CFT obligations as applicable and may request additional information to verify identity or transaction legitimacy.
                </li>
                <li>
                  We do not support transactions involving sanctioned persons/entities or restricted jurisdictions per applicable law.
                </li>
              </ul>
            </Section>

            <Section id="security" title="Payment Data &amp; Security Incidents">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Payment processing is aligned to PCI-DSS/PA-DSS standards as applicable. We and our partners apply reasonable administrative, technical, and physical safeguards.
                </li>
                <li>
                  If you suspect a payment-data security incident, contact us immediately. You may also report payment-data concerns via Razorpay’s grievance channel:&nbsp;
                  <a
                    href="https://razorpay.com/grievances/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--wnr-berry)]"
                  >
                    https://razorpay.com/grievances/
                  </a>.
                </li>
              </ul>
            </Section>

            <Section id="modifications" title="Modifications to These Terms">
              <p>
                We may update these Terms by posting a revised version on this page; continued use of the Services after posting signifies acceptance of the updated Terms.
              </p>
            </Section>

            <Section id="law" title="Governing Law &amp; Jurisdiction">
              <p>
                These Terms are governed by the laws of India, subject to applicable consumer protection laws.
                Subject to those protections, courts having jurisdiction in India may adjudicate disputes.
              </p>
            </Section>

            <Section id="grievance" title="Customer Grievance Redressal">
              <p className="mb-2">
                For order/product issues, contact us via{" "}
                <a href="/contact" className="underline hover:text-[var(--wnr-berry)]">Contact</a>{" "}
                or email{" "}
                <a href="mailto:info@wildnroot.com" className="underline hover:text-[var(--wnr-berry)]">
                  info@wildnroot.com
                </a>.
                We aim to acknowledge within <strong>5 business days</strong> and strive to resolve within a reasonable time.
              </p>
              <p className="text-sm">
                For payment-data security incidents, you may also use Razorpay’s{" "}
                <a
                  href="https://razorpay.com/grievances/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[var(--wnr-berry)]"
                >
                  grievance portal
                </a>.
              </p>
            </Section>

            <Section id="contact" title="Contact">
              <p>
                Questions about these Terms? Write to{" "}
                <a href="mailto:info@wildnroot.com" className="underline hover:text-[var(--wnr-berry)]">
                  info@wildnroot.com
                </a>{" "}
                or see our{" "}
                <a href="/contact" className="underline hover:text-[var(--wnr-berry)]">
                  Contact
                </a>{" "}
                page.
              </p>
            </Section>
          </article>
        </div>
      </section>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold mb-3">{title}</h2>
      <div className="prose prose-sm max-w-none text-neutral-800">{children}</div>
    </section>
  );
}
