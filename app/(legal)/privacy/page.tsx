'use client'

import React from 'react'
import LegalLayout from '@/components/legal/LegalLayout'
import LegalCallout from '@/components/legal/LegalCallout'

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="We take your financial privacy seriously. This policy explains exactly how we handle your sensitive data."
      lastUpdated="1 April 2026"
      effectiveDate="1 April 2026"
    >
      <section id="who-we-are">
        <h2>Who We Are</h2>
        <p>
          SpendSense is a personal finance intelligence platform. For the purposes of the <span className="term">Digital Personal Data Protection Act 2023</span> (India), SpendSense is the Data Fiduciary responsible for processing your personal data.
        </p>
        <p>
          <strong>Contact our Data Protection Officer:</strong> privacy@spendsense.in
        </p>
      </section>

      <section id="data-collected">
        <h2>What Data We Collect</h2>
        <p>We only collect the data necessary to provide you with a high-quality finance tracking experience:</p>
        
        <table>
          <thead>
            <tr>
              <th>Data Type</th>
              <th>Specific Data</th>
              <th>Purpose</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account Data</td>
              <td>Name, email address, profile picture</td>
              <td>Account creation, personalisation</td>
              <td>Until account deleted</td>
            </tr>
            <tr>
              <td>Bank Statements</td>
              <td>PDF / CSV / Excel files</td>
              <td>Transaction extraction</td>
              <td>Deleted immediately after parsing</td>
            </tr>
            <tr>
              <td>Transaction Records</td>
              <td>Date, amount, merchant, category</td>
              <td>Core app functionality</td>
              <td>Until you delete them</td>
            </tr>
            <tr>
              <td>Budget & Goal Data</td>
              <td>Limits, goal names, deadlines</td>
              <td>Budget and goal tracking</td>
              <td>Until account deleted</td>
            </tr>
            <tr>
              <td>Upload Count</td>
              <td>Number of statements uploaded</td>
              <td>Free plan limit enforcement</td>
              <td>Until account deleted</td>
            </tr>
            <tr>
              <td>Device & Browser</td>
              <td>Browser type, OS, IP address</td>
              <td>Security, debugging</td>
              <td>90 days</td>
            </tr>
            <tr>
              <td>Payment Ref</td>
              <td>Confirmation ID</td>
              <td>Subscription record</td>
              <td>7 years (legal)</td>
            </tr>
          </tbody>
        </table>

        <LegalCallout variant="english">
          The most sensitive thing we touch is your bank statement file — and we delete it the moment we&apos;ve extracted your transactions. We never store the original file.
        </LegalCallout>

        <h3>What we do NOT collect:</h3>
        <ul className="not-collected">
          <li className="red-x">Full bank account numbers or login credentials</li>
          <li className="red-x">Aadhaar, PAN, or other government ID numbers</li>
          <li className="red-x">Credit score or bureau data</li>
          <li className="red-x">Real-time location (GPS)</li>
          <li className="red-x">Contacts, camera, or microphone data</li>
        </ul>

        <style jsx>{`
          .red-x::before {
            content: "×" !important;
            color: #FF5C7A !important;
            font-weight: bold;
            font-size: 18px;
            top: 0.5rem !important;
          }
        `}</style>
      </section>

      <section id="data-use">
        <h2>How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Provide the SpendSense service — parsing statements, showing spending, tracking budgets</li>
          <li>Improve categorisation accuracy over time</li>
          <li>Send notifications you have opted into</li>
          <li>Enforce plan limits</li>
          <li>Debug technical issues and prevent fraudulent use</li>
          <li>Comply with legal obligations under Indian law</li>
        </ul>

        <h3>We do NOT use your data to:</h3>
        <ul>
          <li>Sell to advertisers or data brokers — ever</li>
          <li>Build advertising profiles or target you with ads</li>
          <li>Share with banks, lenders, or insurance companies</li>
          <li>Train AI models on your personal financial data</li>
        </ul>

        <LegalCallout variant="english">
          Your data helps us run the app for you. That&apos;s it. We don&apos;t make money from your data — we make money from subscriptions.
        </LegalCallout>
      </section>

      <section id="ai-and-data">
        <h2>The AI and Your Data</h2>
        <p>
          When you upload a bank statement, we extract transaction descriptions (e.g. &quot;ZOMATO ORDER 12345&quot;) and send them to <span className="term">Google Gemini AI</span> to determine the spending category.
        </p>
        <p>
          <strong>What we send to Gemini:</strong> merchant name strings only — short text like &quot;SWIGGY&quot; or &quot;NETFLIX&quot;. Not your name, email, account number, or full transaction amounts.
        </p>
        <p>
          <strong>What we do NOT send to Gemini:</strong> your identity, your full account data, your name, any personally identifying information.
        </p>
        <p>
          Google processes this data under its API Terms of Service. Google states that data submitted through the API is not used to train their models.
        </p>

        <LegalCallout variant="important">
          Our AI sees &apos;ZOMATO&apos; — not &apos;Akash spent ₹450 on Zomato on Tuesday.&apos; The AI gets merchant names to categorise. Your identity stays with us.
        </LegalCallout>
      </section>

      <section id="security">
        <h2>How We Protect Your Data</h2>
        <p>
          <strong>Infrastructure:</strong> hosted on Supabase using AWS ap-south-1 (Mumbai) — your data stays in India.
        </p>
        <p>Security measures in place:</p>
        <ul>
          <li><strong>Row Level Security (RLS):</strong> every table enforces that you can only access your own rows.</li>
          <li><strong>Transport encryption:</strong> all data transmitted using HTTPS / TLS 1.3.</li>
          <li><strong>Database encryption:</strong> Supabase encrypts all data at rest using AES-256.</li>
          <li><strong>Short-lived Tokens:</strong> JWT tokens with 15-minute expiry and secure refresh rotation.</li>
          <li><strong>File Deletion:</strong> Statement files are deleted immediately after the parsing operation.</li>
        </ul>

        <p>
          <strong>What happens if there&apos;s a breach:</strong> We will notify affected users within 72 hours of becoming aware of any data breach that poses risk to your rights, as required under DPDPA 2023.
        </p>

        <LegalCallout variant="english">
          We&apos;ve built this with security as a first principle — not as an afterthought. Your bank data is encrypted, isolated per user, and the original files are never kept.
        </LegalCallout>
      </section>

      <section id="third-parties">
        <h2>Third-Party Services</h2>
        <p>We work with a limited number of trusted service providers to run SpendSense:</p>

        <div className="flex flex-col gap-4 my-6">
          <div className="bg-[#141720] border border-[#252A3A] rounded-xl p-5">
            <h4 className="font-ui font-bold text-white mb-2">SUPABASE (Supabase Inc.)</h4>
            <p className="text-sm font-lora text-[#c8d0e8] mb-3">Receives: all your stored data. Why: database, auth, and storage provider. Location: Mumbai, India.</p>
            <a href="https://supabase.com/privacy" className="text-xs font-mono text-[#00E5A0] hover:underline">Privacy Policy</a>
          </div>

          <div className="bg-[#141720] border border-[#252A3A] rounded-xl p-5">
            <h4 className="font-ui font-bold text-white mb-2">GOOGLE GEMINI API (Google LLC)</h4>
            <p className="text-sm font-lora text-[#c8d0e8] mb-3">Receives: merchant name strings only. Why: AI categorisation. Does NOT receive identifying info.</p>
            <a href="https://policies.google.com/privacy" className="text-xs font-mono text-[#00E5A0] hover:underline">Privacy Policy</a>
          </div>

          <div className="bg-[#141720] border border-[#252A3A] rounded-xl p-5">
            <h4 className="font-ui font-bold text-white mb-2">VERCEL (Vercel Inc.)</h4>
            <p className="text-sm font-lora text-[#c8d0e8] mb-3">Receives: HTTP request logs. Why: web hosting and deployment platform. Retention: 30 days.</p>
            <a href="https://vercel.com/legal/privacy-policy" className="text-xs font-mono text-[#00E5A0] hover:underline">Privacy Policy</a>
          </div>

          <div className="bg-[#141720] border border-[#252A3A] rounded-xl p-5">
            <h4 className="font-ui font-bold text-white mb-2">RESEND (Resend Inc.)</h4>
            <p className="text-sm font-lora text-[#c8d0e8] mb-3">Receives: email address. Why: transactional email delivery (notifications, resets).</p>
            <a href="https://resend.com/privacy" className="text-xs font-mono text-[#00E5A0] hover:underline">Privacy Policy</a>
          </div>
        </div>

        <LegalCallout variant="english">
          These are the only companies our infrastructure touches. No advertising networks, no data brokers, no analytics companies with questionable privacy practices.
        </LegalCallout>
      </section>

      <section id="your-rights">
        <h2>Your Rights Under DPDPA 2023</h2>
        <p>Under India&apos;s Digital Personal Data Protection Act 2023, you have these rights:</p>

        <div className="flex flex-col gap-6 my-8">
          <div className="border-b border-[#252A3A] pb-4">
            <h4 className="font-ui font-bold text-white mb-1">Right to Access</h4>
            <p className="text-sm font-lora text-[#c8d0e8]">Obtain information about what data we process. How: export via Settings or email privacy@spendsense.in.</p>
          </div>
          <div className="border-b border-[#252A3A] pb-4">
            <h4 className="font-ui font-bold text-white mb-1">Right to Correction</h4>
            <p className="text-sm font-lora text-[#c8d0e8]">Correct inaccurate or incomplete data. How: update directly in Profile settings.</p>
          </div>
          <div className="border-b border-[#252A3A] pb-4">
            <h4 className="font-ui font-bold text-white mb-1">Right to Erasure</h4>
            <p className="text-sm font-lora text-[#c8d0e8]">Have your data deleted. How: use Settings → Danger Zone → Delete Account.</p>
          </div>
          <div className="border-b border-[#252A3A] pb-4">
            <h4 className="font-ui font-bold text-white mb-1">Right to Withdraw Consent</h4>
            <p className="text-sm font-lora text-[#c8d0e8]">Withdraw consent for processing. Consequence: core AI features will cease to function.</p>
          </div>
          <div className="pb-4">
            <h4 className="font-ui font-bold text-white mb-1">Right to Nominate</h4>
            <p className="text-sm font-lora text-[#c8d0e8]">Nominate an individual to exercise your rights in case of death or incapacity.</p>
          </div>
        </div>

        <LegalCallout variant="english">
          These aren&apos;t just legal checkboxes — they&apos;re real tools you can use. The most powerful: you can take your entire financial history out of SpendSense in one click.
        </LegalCallout>
      </section>

      <section id="cookies">
        <h2>Cookies and Local Storage</h2>
        <p>We only use essential cookies for the app to function:</p>
        <ul>
          <li><strong>supabase-auth-token:</strong> stores your encrypted login session.</li>
          <li><strong>csrf-token:</strong> prevents cross-site request forgery attacks.</li>
        </ul>
        <p><strong>We do NOT use advertising or tracking cookies.</strong></p>
      </section>

      <section id="data-transfers">
        <h2>Data Transfers Outside India</h2>
        <p>
          Your personal data is primarily stored in India (Supabase Mumbai region). The only data that leaves India is merchant name strings sent to Google Gemini for categorisation. These strings contain no personally identifying information.
        </p>
      </section>

      <section id="children">
        <h2>Children&apos;s Privacy</h2>
        <p>
          SpendSense is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, email privacy@spendsense.in and we will delete the account within 48 hours.
        </p>
      </section>

      <section id="contact">
        <h2>Contact and Grievance Officer</h2>
        <p>
          <strong>Data Protection / Grievance Officer:</strong> SpendSense<br />
          <strong>Email:</strong> privacy@spendsense.in<br />
          <strong>Response time:</strong> within 7 business days.
        </p>
      </section>
    </LegalLayout>
  )
}
