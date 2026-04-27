import React from 'react'
import LegalLayout from '@/components/legal/LegalLayout'
import LegalCallout from '@/components/legal/LegalCallout'

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The rules of the road for using SpendSense. We&apos;ve tried to keep this as clear as possible."
      lastUpdated="1 April 2026"
      effectiveDate="1 April 2026"
    >
      <section id="acceptance">
        <h2>Acceptance of Terms</h2>
        <p>
          By creating an account or using <span className="term">SpendSense</span> (&quot;the Service&quot;), you enter into a binding agreement with SpendSense and agree to these Terms of Service in full. If you are using SpendSense on behalf of an organisation, you represent that you have authority to bind that organisation.
        </p>
        <p>
          These Terms apply to all users — Free plan, Pro Monthly, and Pro Annual.
        </p>
        <LegalCallout variant="english">
          By signing up, you agree to follow these rules. If anything here concerns you, email us before using the app — don&apos;t just accept and hope for the best.
        </LegalCallout>
      </section>

      <section id="what-we-are">
        <h2>What SpendSense Is (and Is Not)</h2>
        <p>
          SpendSense is a personal finance management tool that helps you understand where your money goes. Specifically:
        </p>
        <h3>What SpendSense does:</h3>
        <ul>
          <li>Parses bank statements (PDF, CSV, Excel) to extract your transactions</li>
          <li>Uses AI (Google Gemini) to automatically categorise transactions</li>
          <li>Tracks your budgets, savings goals, and spending patterns over time</li>
          <li>Generates written monthly financial review reports using AI</li>
          <li>Lets you query your own spending data in plain English</li>
        </ul>

        <h3>What SpendSense is NOT:</h3>
        <ul>
          <li>Not a bank, NBFC, or regulated financial institution</li>
          <li>Not a SEBI-registered investment advisor</li>
          <li>Not a tax advisor or CA (Chartered Accountant)</li>
          <li>Not a credit bureau or credit scoring service</li>
          <li>Not a payment gateway or wallet</li>
        </ul>

        <LegalCallout variant="english">
          SpendSense is a smart notebook for your money — not a financial advisor. The insights are meant to help you think, not to replace professional advice.
        </LegalCallout>

        <LegalCallout variant="warning">
          All financial reports, AI insights, and category suggestions are for informational purposes only. Before making any significant financial decision — investments, loans, insurance — consult a qualified professional.
        </LegalCallout>
      </section>

      <section id="accounts">
        <h2>Eligibility and Accounts</h2>
        <p>To use SpendSense you must:</p>
        <ul>
          <li>Be at least 18 years of age</li>
          <li>Provide accurate registration information</li>
          <li>Keep your account credentials confidential</li>
          <li>Not share your account with other people</li>
          <li>Have only one account per person</li>
        </ul>
        <p>
          You are responsible for all activity that occurs under your account. SpendSense reserves the right to suspend or terminate accounts that violate these Terms, at our sole discretion, without prior notice in serious cases.
        </p>
        <LegalCallout variant="english">
          One account per person. Keep your password safe. You&apos;re responsible for anything that happens from your login.
        </LegalCallout>
      </section>

      <section id="pricing">
        <h2>Plans and Pricing</h2>
        <p>SpendSense offers three plans tailored to your needs:</p>
        
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Statement Uploads</th>
              <th>AI Features</th>
              <th>Analytics</th>
              <th>Export</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free</td>
              <td>₹0 forever</td>
              <td>5 total (lifetime)</td>
              <td>Categorisation + 3 AI queries/day</td>
              <td>Basic dashboard</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Pro Monthly</td>
              <td>₹69/month</td>
              <td>Unlimited</td>
              <td>Full AI — reports, unlimited queries</td>
              <td>Full suite (8 charts)</td>
              <td>CSV + PDF</td>
            </tr>
            <tr>
              <td>Pro Annual</td>
              <td>₹799/year</td>
              <td>Unlimited</td>
              <td>Full AI</td>
              <td>Full suite</td>
              <td>CSV + PDF</td>
            </tr>
          </tbody>
        </table>

        <p>
          Prices are inclusive of applicable taxes. GST at 18% may be applied to subscription fees as required by Indian tax law. Pricing is subject to change with 30 days notice to existing subscribers.
        </p>

        <LegalCallout variant="english">
          Free plan lets you try the core features with 5 uploads. Upgrading costs ₹69/month or ₹799/year — that&apos;s cheaper than one restaurant meal.
        </LegalCallout>
      </section>

      <section id="billing">
        <h2>Payments and Cancellation</h2>
        <p>
          <strong>Payment processing:</strong> Payments are processed via <span className="term">Razorpay</span>. By subscribing, you authorise us to charge your chosen payment method for the applicable plan amount.
        </p>
        <p>
          <strong>Billing cycle:</strong> Monthly plan renews every 30 days. Annual plan renews every 365 days. You will receive an email reminder 3 days before renewal.
        </p>
        <p>
          <strong>Cancellation:</strong> You may cancel at any time from Settings → Subscription. Your Pro access continues until the end of the current billing period. No partial refunds are provided for unused time.
        </p>
        <p>
          <strong>Refund policy:</strong> Due to the digital nature of the service and immediate access provided upon subscription, we do not offer refunds except where required by applicable Indian consumer protection law. If you experience a technical issue that prevented you from using the service, contact support@spendsense.in within 7 days.
        </p>
        <p>
          <strong>Failed payments:</strong> If your payment fails, we will retry twice over 3 days. If payment remains unsuccessful, your account will revert to the Free plan.
        </p>

        <LegalCallout variant="english">
          Cancel anytime — you keep Pro until your billing period ends. No sneaky charges. If something goes wrong with a payment, email us.
        </LegalCallout>
      </section>

      <section id="acceptable-use">
        <h2>Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload bank statements or financial documents that do not belong to you</li>
          <li>Use SpendSense to process financial data for third parties commercially without our written permission</li>
          <li>Attempt to reverse-engineer or extract SpendSense&apos;s AI prompts, algorithms, or system architecture</li>
          <li>Upload files containing malware, viruses, or any malicious code</li>
          <li>Attempt to bypass Free plan limits through technical means</li>
          <li>Use automated tools, bots, or scrapers to access the service</li>
          <li>Share, sell, or sublicense your account access</li>
          <li>Use the service in any way that violates Indian law</li>
        </ul>
        <p>
          Violation of these rules may result in immediate account suspension without refund and, in serious cases, referral to law enforcement.
        </p>
      </section>

      <section id="your-data">
        <h2>Your Data</h2>
        <p>
          Your bank statement data belongs to you. SpendSense claims no ownership over your financial data. We process it solely to provide the service you signed up for.
        </p>
        <p>You can:</p>
        <ul>
          <li>Export all your data at any time (Settings → Data & Privacy → Export All Data)</li>
          <li>Delete individual transactions, accounts, or your entire account</li>
          <li>Request a copy of all data we hold about you</li>
        </ul>
        <p>
          Our full data practices are described in detail in our Privacy Policy at /privacy.
        </p>
        <LegalCallout variant="english">
          Your money data is yours. We don&apos;t sell it, we don&apos;t use it for anything beyond running the app, and you can take it all with you at any time.
        </LegalCallout>
      </section>

      <section id="ai-disclaimer">
        <h2>AI Disclaimer</h2>
        <p>
          SpendSense uses <span className="term">Google Gemini AI</span> to categorise transactions and generate financial reports. You should understand:
        </p>
        <ul>
          <li>AI categorisation is not always accurate. &quot;AMAZON&quot; could be shopping or a work expense — the AI makes a best guess.</li>
          <li>AI-generated monthly reports are produced automatically without review by human financial experts.</li>
          <li>Spending insights and recommendations are general observations based on your data patterns, not personalised financial advice.</li>
          <li>We are not responsible for financial decisions you make based on AI-generated content.</li>
        </ul>
        <LegalCallout variant="important">
          Our AI is smart but imperfect. If a report says something that surprises you, check the underlying transactions. Never make a major financial decision based solely on an AI-generated report.
        </LegalCallout>
      </section>

      <section id="ip">
        <h2>Intellectual Property</h2>
        <p>
          SpendSense&apos;s software, design system, UI, brand, and original content are owned by SpendSense and protected under the Copyright Act, 1957 (India). You may not copy, reproduce, or redistribute them.
        </p>
        <p>
          The AI-generated reports produced from your data are yours for personal use. You may share them but may not sell them or represent them as professional financial advice.
        </p>
      </section>

      <section id="availability">
        <h2>Service Availability</h2>
        <p>
          We aim for 99%+ uptime but do not guarantee uninterrupted service. We may perform maintenance that temporarily makes the service unavailable — we will provide advance notice where possible. SpendSense is not liable for losses resulting from service downtime.
        </p>
      </section>

      <section id="liability">
        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted under Indian law, SpendSense&apos;s total liability to you for any claim arising from use of the service shall not exceed the total amount you paid us in the 3 months preceding the claim. For free plan users, our liability is nil.
        </p>
        <p>
          SpendSense is not liable for: data loss due to technical failures, financial losses from decisions made based on AI reports, indirect or consequential damages, or losses due to third-party service outages.
        </p>
        <LegalCallout variant="english">
          We&apos;ll do our best to keep things running smoothly. If something goes wrong on our end, our liability is capped at what you paid us recently.
        </LegalCallout>
      </section>

      <section id="governing-law">
        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes shall first be attempted to be resolved informally by emailing <span className="term">legal@spendsense.in</span>. If unresolved within 30 days, disputes shall be subject to the exclusive jurisdiction of the courts in Ahmedabad, Gujarat, India.
        </p>
      </section>

      <section id="changes">
        <h2>Changes to These Terms</h2>
        <p>
          We reserve the right to update these Terms at any time. Significant changes will be communicated via email and an in-app notice at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>Questions about these Terms? Contact us:</p>
        <ul>
          <li>General: support@spendsense.in</li>
          <li>Legal matters: legal@spendsense.in</li>
          <li>Response time: within 5 business days</li>
        </ul>
      </section>
    </LegalLayout>
  )
}
